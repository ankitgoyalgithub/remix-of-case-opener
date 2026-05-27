import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from '@/components/ui/command';
import {
    LayoutDashboard, Inbox as InboxIcon, FileStack, Workflow, ClipboardCheck,
    Plug, Mail, Settings, Sparkles, Wand2, FileCheck, ListChecks,
    Building2, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { mapBackendRequestToListItem } from '@/lib/mappers';

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
                placeholder="Type a command, search a request, or navigate…"
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
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 truncate" title={r.companyName}>{r.companyName}</span>
                                    <span className="text-[11px] text-muted-foreground font-mono">
                                        {r.smartId || r.id.slice(0, 8)}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandSeparator />
                    </>
                )}

                <CommandGroup heading="Navigate">
                    <NavItem icon={LayoutDashboard} label="Dashboard" onSelect={() => go('/dashboard')} shortcut="G D" />
                    <NavItem icon={InboxIcon} label="Requests" onSelect={() => go('/requests')} shortcut="G R" />
                    <NavItem icon={Sparkles} label="AI Studio — Overview" onSelect={() => go('/studio')} shortcut="G S" />
                    <NavItem icon={Workflow} label="Workflows" onSelect={() => go('/studio/workflows')} />
                    <NavItem icon={FileStack} label="Documents" onSelect={() => go('/studio/documents')} />
                    <NavItem icon={ClipboardCheck} label="Checks" onSelect={() => go('/studio/checks')} />
                    <NavItem icon={Plug} label="Integrations" onSelect={() => go('/studio/integrations')} />
                    <NavItem icon={InboxIcon} label="Inbound email" onSelect={() => go('/studio/inbound')} />
                    <NavItem icon={ListChecks} label="Polling jobs" onSelect={() => go('/studio/jobs')} />
                    <NavItem icon={Mail} label="Messages" onSelect={() => go('/studio/messages')} />
                    <NavItem icon={Settings} label="Studio Settings" onSelect={() => go('/studio/settings')} />
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading="Actions">
                    <NavItem icon={Wand2} label="Run setup wizard" onSelect={() => go('/studio/setup')} />
                    <NavItem icon={FileCheck} label="Settings (account)" onSelect={() => go('/settings')} />
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}

function NavItem({
    icon: Icon, label, onSelect, shortcut,
}: { icon: any; label: string; onSelect: () => void; shortcut?: string }) {
    return (
        <CommandItem onSelect={onSelect} className="gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            {shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
        </CommandItem>
    );
}
