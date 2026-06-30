import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NotificationLike {
    id?: string | number;
    is_read?: boolean;
    title?: string;
    message?: string;
    body?: string;
    text?: string;
    verb?: string;
    description?: string;
    created_at?: string;
    timestamp?: string;
    request_id?: string;
    request?: string;
    url?: string;
    link?: string;
}

function title(n: NotificationLike): string {
    return n.title || n.verb || n.message || n.text || 'Notification';
}
function body(n: NotificationLike): string | undefined {
    const t = title(n);
    const candidates = [n.description, n.body, n.message, n.text].filter(Boolean) as string[];
    return candidates.find(c => c !== t);
}
function when(n: NotificationLike): string {
    const raw = n.created_at || n.timestamp;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    return formatDistanceToNow(d, { addSuffix: true });
}
function linkFor(n: NotificationLike): string | undefined {
    if (n.request_id || n.request) return `/request/${n.request_id || n.request}`;
    if (n.url && n.url.startsWith('/')) return n.url;
    if (n.link && n.link.startsWith('/')) return n.link;
    return undefined;
}

/**
 * Real notifications panel. Lists the latest items from /notifications/, links
 * through to the related request, and marks items read (on open, or all at once)
 * via the mark-read endpoints — with an optimistic unread-count update.
 */
export function NotificationsPanel() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: notifications = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.notifications.list() as Promise<NotificationLike[]>,
    });

    const list = Array.isArray(notifications) ? notifications : [];
    const unreadCount = useMemo(() => list.filter(n => !n.is_read).length, [list]);

    // Optimistically flip is_read in the cache, then persist; re-sync on failure.
    const markReadLocal = (id: string | number) => {
        qc.setQueryData<NotificationLike[]>(['notifications'], (old) =>
            Array.isArray(old) ? old.map(x => (x.id === id ? { ...x, is_read: true } : x)) : old);
    };

    const open_ = (n: NotificationLike) => {
        if (!n.is_read && n.id != null) {
            markReadLocal(n.id);
            api.notifications.markRead(n.id).catch(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
        }
        const to = linkFor(n);
        if (to) {
            setOpen(false);
            navigate(to);
        }
    };

    const markAll = () => {
        qc.setQueryData<NotificationLike[]>(['notifications'], (old) =>
            Array.isArray(old) ? old.map(x => ({ ...x, is_read: true })) : old);
        api.notifications.markAllRead().catch(() => qc.invalidateQueries({ queryKey: ['notifications'] }));
    };

    const bellLabel = unreadCount > 0
        ? `Notifications, ${unreadCount} unread`
        : 'Notifications, none unread';

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={bellLabel}
                >
                    <Bell className="h-4 w-4" aria-hidden />
                    {unreadCount > 0 && (
                        <span
                            className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold leading-[15px] text-center ring-2 ring-background"
                            aria-hidden
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            {/* Announce unread count to screen readers without forcing the panel open */}
            <span className="sr-only" role="status" aria-live="polite">
                {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No unread notifications'}
            </span>

            <PopoverContent align="end" className="w-[340px] p-0">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
                    {unreadCount > 0 && (
                        <button
                            type="button"
                            onClick={markAll}
                            className="text-[11px] font-medium text-primary hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        >
                            Mark all as read
                        </button>
                    )}
                </div>

                <ScrollArea className="max-h-[360px]">
                    {isLoading ? (
                        <div className="px-3.5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : isError ? (
                        <div className="px-3.5 py-8 text-center">
                            <p className="text-sm text-foreground">We couldn't load your notifications.</p>
                            <p className="text-xs text-muted-foreground mt-1">Check your connection and try again.</p>
                            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="px-3.5 py-10 text-center">
                            <BellOff className="h-5 w-5 text-muted-foreground/60 mx-auto mb-2" aria-hidden />
                            <p className="text-sm text-foreground">You're all caught up</p>
                            <p className="text-xs text-muted-foreground mt-1">New alerts about your requests will show up here.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {list.slice(0, 30).map((n, i) => {
                                const to = linkFor(n);
                                const b = body(n);
                                const t = when(n);
                                return (
                                    <li key={n.id ?? i}>
                                        <button
                                            type="button"
                                            onClick={() => open_(n)}
                                            disabled={!to}
                                            className={cn(
                                                'w-full text-left px-3.5 py-2.5 flex gap-2.5 transition-colors',
                                                to ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default',
                                            )}
                                        >
                                            <span
                                                className={cn('mt-1.5 h-1.5 w-1.5 rounded-full shrink-0', n.is_read ? 'bg-transparent' : 'bg-primary')}
                                                aria-hidden
                                            />
                                            <span className="min-w-0 flex-1">
                                                <span className={cn('block text-[13px] leading-snug', n.is_read ? 'text-muted-foreground' : 'text-foreground font-medium')}>
                                                    {title(n)}
                                                    {!n.is_read && <span className="sr-only"> (unread)</span>}
                                                </span>
                                                {b && <span className="block text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{b}</span>}
                                                {t && <span className="block text-[11px] text-muted-foreground/80 mt-1">{t}</span>}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
