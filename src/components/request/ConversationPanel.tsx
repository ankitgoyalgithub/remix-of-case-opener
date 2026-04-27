import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, ChevronDown, ChevronRight, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface InboundEmail {
    id: string;
    thread_id: string;
    from_address: string;
    from_name: string;
    to_addresses: string[];
    subject: string;
    snippet: string;
    body_text: string;
    received_at: string | null;
    status: string;
    attachment_count: number;
    matched_rule_name?: string | null;
}

interface ConversationPanelProps {
    emails: InboundEmail[];
}

/**
 * Hubspot-style conversation thread for a request.
 *
 * Renders the inbound emails associated with the request in chronological
 * order, oldest first. The first message is expanded by default, follow-ups
 * collapse to a one-liner that the user can click to read.
 */
export function ConversationPanel({ emails }: ConversationPanelProps) {
    const sorted = useMemo(
        () => [...emails].sort((a, b) => {
            const ta = a.received_at ? new Date(a.received_at).getTime() : 0;
            const tb = b.received_at ? new Date(b.received_at).getTime() : 0;
            return ta - tb;
        }),
        [emails],
    );

    // First message expanded, follow-ups collapsed by default
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        if (sorted.length === 0) return {};
        return { [sorted[0].id]: true };
    });

    if (emails.length === 0) return null;

    const lastReceived = sorted[sorted.length - 1]?.received_at;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Conversation
                    <Badge variant="outline" className="text-[10px] ml-1">{emails.length}</Badge>
                    {lastReceived && (
                        <span className="text-[11px] text-muted-foreground font-normal ml-2">
                            last reply {format(new Date(lastReceived), 'dd MMM HH:mm')}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative pl-6">
                    {/* Vertical thread line */}
                    <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                    <div className="space-y-3">
                        {sorted.map((em, idx) => {
                            const isOpen = !!expanded[em.id];
                            const initials = (em.from_name || em.from_address || '?')
                                .split(/[\s@.]/)
                                .filter(Boolean)
                                .slice(0, 2)
                                .map(s => s[0])
                                .join('')
                                .toUpperCase();
                            return (
                                <div key={em.id} className="relative">
                                    {/* Avatar dot on the timeline */}
                                    <div className="absolute -left-[18px] top-2 w-4 h-4 rounded-full bg-gradient-to-br from-primary to-primary/70 text-white text-[9px] font-semibold flex items-center justify-center shadow-sm shadow-primary/25 ring-2 ring-background">
                                        {initials.slice(0, 1) || idx + 1}
                                    </div>

                                    <div
                                        className={cn(
                                            'rounded-lg border transition-colors',
                                            isOpen ? 'border-border bg-card' : 'border-border bg-muted/10 hover:bg-muted/30',
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(s => ({ ...s, [em.id]: !s[em.id] }))}
                                            className="w-full flex items-start gap-2.5 px-3 py-2 text-left"
                                        >
                                            {isOpen
                                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-medium truncate">
                                                        {em.from_name || em.from_address}
                                                    </p>
                                                    <span className="text-[11px] text-muted-foreground truncate">
                                                        &lt;{em.from_address}&gt;
                                                    </span>
                                                    {em.attachment_count > 0 && (
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1 shrink-0">
                                                            <Paperclip className="h-2.5 w-2.5" />
                                                            {em.attachment_count}
                                                        </Badge>
                                                    )}
                                                    {em.received_at && (
                                                        <span className="text-[11px] text-muted-foreground ml-auto shrink-0">
                                                            {format(new Date(em.received_at), 'dd MMM yyyy HH:mm')}
                                                        </span>
                                                    )}
                                                </div>
                                                {em.subject && (
                                                    <p className={cn(
                                                        'text-xs mt-0.5 truncate',
                                                        isOpen ? 'text-foreground' : 'text-muted-foreground',
                                                    )}>
                                                        {em.subject}
                                                    </p>
                                                )}
                                                {!isOpen && em.snippet && (
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                        {em.snippet}
                                                    </p>
                                                )}
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="px-3 pb-3 pt-1 border-t border-border/50">
                                                <div className="text-[11px] text-muted-foreground mb-2">
                                                    To: {em.to_addresses.join(', ') || '—'}
                                                </div>
                                                <pre className="text-sm text-foreground whitespace-pre-wrap break-words font-sans leading-relaxed">
                                                    {em.body_text || em.snippet || '(no body)'}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
