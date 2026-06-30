import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Building2, ArrowRight, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { mapBackendRequestToListItem } from '@/lib/mappers';
import { getNavGroups, canSeeConfiguration, type Role } from './layout/navItems';

interface RequestHit {
    id: string;
    smartId?: string;
    companyName: string;
    status: string;
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [requests, setRequests] = useState<RequestHit[]>([]);
    const [loaded, setLoaded] = useState(false);
    const navigate = useNavigate();
    const fetchedAtRef = useRef<number>(0);

    const { data: user } = useQuery({ queryKey: ['userMe'], queryFn: () => api.user.me(), staleTime: 5 * 60_000 });
    const role = (user as any)?.role as Role | undefined;
    // Same vocabulary + role-gating as the sidebar (Work · Configuration · Account).
    const navGroups = getNavGroups(role);

    // Cmd+K / Ctrl+K to open
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen(o => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Lazy-load the request index when the palette first opens, refresh
    // periodically so newly-created requests show up.
    useEffect(() => {
        if (!open) return;
        const fresh = Date.now() - fetchedAtRef.current < 60_000;
        if (loaded && fresh) return;
        (async () => {
            try {
                const data = await api.requests.list();
                const hits = data.map(mapBackendRequestToListItem).map((r: any) => ({
                    id: r.id,
                    smartId: r.smartId,
                    companyName: r.companyName,
                    status: r.status,
                }));
                setRequests(hits);
                setLoaded(true);
                fetchedAtRef.current = Date.now();
            } catch {
                // silent — palette still works for nav
            }
        })();
    }, [open]);

    const go = (path: string) => {
        setOpen(false);
        setQuery('');
        navigate(path);
    };

    const q = query.trim().toLowerCase();
    const matchingRequests = q
        ? requests.filter(r => {
              const hay = `${r.companyName} ${r.smartId || r.id}`.toLowerCase();
              return hay.includes(q);
          }).slice(0, 8)
        : requests.slice(0, 5);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput
                placeholder="Search a request, or jump to a page…"
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>No matches.</CommandEmpty>

                {matchingRequests.length > 0 && (
                    <>
                        <CommandGroup heading={q ? 'Requests' : 'Recent requests'}>
                            {matchingRequests.map(r => (
                                <CommandItem
                                    key={r.id}
                                    value={`request ${r.companyName} ${r.smartId || ''} ${r.id}`}
                                    onSelect={() => go(`/request/${r.id}`)}
                                    className="gap-2"
                                >
                                    <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                                    <span className="flex-1 truncate" title={r.companyName}>{r.companyName}</span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        {r.smartId || r.id.slice(0, 8)}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" aria-hidden />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                    </>
                )}

                {navGroups.map((group, gi) => (
                    <div key={group.id}>
                        <CommandGroup heading={group.label}>
                            {group.items.map(item => {
                                const Icon = item.icon;
                                return (
                                    <CommandItem
                                        key={item.to}
                                        value={`${item.label} ${item.description}`}
                                        onSelect={() => go(item.to)}
                                        className="gap-2"
                                    >
                                        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                                        <span className="flex-1">{item.label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                        {gi < navGroups.length - 1 && <CommandSeparator />}
                    </div>
                ))}

                {canSeeConfiguration(role) && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Actions">
                            <CommandItem value="run setup wizard" onSelect={() => go('/studio/setup')} className="gap-2">
                                <Wand2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                                <span className="flex-1">Run setup</span>
                            </CommandItem>
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}
