import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ShieldCheck, ChevronsLeft, ChevronsRight, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiPref } from '@/hooks/useUiPref';
import { api } from '@/lib/api';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getNavGroups, isItemActive, type NavGroup, type NavItem, type Role } from './navItems';

/**
 * The ONE persistent left nav. Three plain-language groups (Work · Configuration
 * · Account). Replaces the old two-rail split where entering /studio swapped in
 * a second sidebar — Configuration now lives here, role-gated. Desktop only;
 * under `md` the AppLayout renders <MobileNav/> (off-canvas drawer) instead.
 */
export function Sidebar() {
    const location = useLocation();
    const [userCollapsed, setCollapsed] = useUiPref<boolean>('sidebar.collapsed', false);

    const { data: user } = useQuery({ queryKey: ['userMe'], queryFn: () => api.user.me(), staleTime: 5 * 60_000 });
    const role = (user as any)?.role as Role | undefined;
    const groups = getNavGroups(role);

    // The workbench is a focused, full-width review surface — auto-collapse to an
    // icon rail so it gets maximum horizontal room. (No longer collapse on
    // /studio: Configuration is part of this single nav now.)
    const onWorkbench = /^\/request\/[^/]+\/workbench$/.test(location.pathname);
    const collapsed = userCollapsed || onWorkbench;

    const w = collapsed ? 'w-[56px]' : 'w-[240px]';

    return (
        <aside
            className={cn(
                'shrink-0 h-screen sticky top-0 border-r border-border bg-background',
                'hidden md:flex flex-col',
                'transition-[width] duration-200 ease-refined',
                w,
            )}
        >
            {/* Brand row */}
            <div className={cn('h-14 flex items-center border-b border-border', collapsed ? 'justify-center' : 'px-4')}>
                <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="Insure Auto — go to My Dashboard">
                    <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-background" strokeWidth={2.4} aria-hidden />
                    </div>
                    {!collapsed && (
                        <span className="ax-brand text-[15px] leading-none text-foreground truncate">Insure Auto</span>
                    )}
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary">
                {groups.map((group, gi) => (
                    <NavGroupBlock
                        key={group.id}
                        group={group}
                        collapsed={collapsed}
                        pathname={location.pathname}
                        showDivider={gi > 0}
                    />
                ))}
            </nav>

            {/* Collapse toggle */}
            <div className="border-t border-border p-2">
                <button
                    type="button"
                    onClick={() => setCollapsed(c => !c)}
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-pressed={collapsed}
                    className={cn(
                        'w-full h-9 rounded-md flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        collapsed ? 'justify-center px-0' : 'justify-start px-2.5',
                    )}
                >
                    {collapsed
                        ? <ChevronsRight className="h-4 w-4" aria-hidden />
                        : <><ChevronsLeft className="h-4 w-4" aria-hidden /><span className="text-[13px]">Collapse</span></>
                    }
                </button>
            </div>
        </aside>
    );
}

function NavGroupBlock({
    group, collapsed, pathname, showDivider,
}: { group: NavGroup; collapsed: boolean; pathname: string; showDivider: boolean }) {
    const groupActive = group.items.some(i => isItemActive(i, pathname));

    // The Configuration group is long (setup modules). Make it a disclosure that
    // auto-opens whenever you're inside it, so the daily Work nav stays clean.
    const collapsible = group.id === 'configuration';
    const [open, setOpen] = useUiPref<boolean>('sidebar.group.configuration', false);
    const expanded = collapsible ? (open || groupActive) : true;

    if (collapsed) {
        // Icon-only rail: flat icon list, group boundaries via dividers.
        return (
            <>
                {showDivider && <div className="my-2 mx-2 border-t border-border" />}
                <ul className="px-2 space-y-0.5">
                    {group.items.map(item => (
                        <li key={item.to}>
                            <NavRowCollapsed item={item} active={isItemActive(item, pathname)} />
                        </li>
                    ))}
                </ul>
            </>
        );
    }

    return (
        <>
            {showDivider && <div className="my-3 mx-2 border-t border-border" />}
            {collapsible ? (
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-expanded={expanded}
                    className="w-full px-4 mb-1.5 flex items-center justify-between page-eyebrow hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                    <span>{group.label}</span>
                    <ChevronDown className={cn('h-3 w-3 transition-transform', expanded ? '' : '-rotate-90')} aria-hidden />
                </button>
            ) : (
                <p className="px-4 mb-1.5 page-eyebrow">{group.label}</p>
            )}

            {expanded && (
                <ul className="px-2 space-y-0.5">
                    {group.items.map(item => (
                        <li key={item.to}>
                            <NavRow item={item} active={isItemActive(item, pathname)} />
                        </li>
                    ))}
                </ul>
            )}
        </>
    );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            to={item.to}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'relative h-9 flex items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
        >
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary" aria-hidden />}
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} aria-hidden />
            <span className="truncate">{item.label}</span>
        </Link>
    );
}

function NavRowCollapsed({ item, active }: { item: NavItem; active: boolean }) {
    const Icon = item.icon;
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    to={item.to}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                        'relative h-9 flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary" aria-hidden />}
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
    );
}
