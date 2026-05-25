import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Inbox, Sparkles, User, Settings as SettingsIcon,
    ShieldCheck, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiPref } from '@/hooks/useUiPref';

type NavItem = {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
};

const PRIMARY: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/requests',  label: 'Requests',  icon: Inbox },
    { to: '/studio',    label: 'AI Studio', icon: Sparkles },
];

const SECONDARY: NavItem[] = [
    { to: '/profile',  label: 'Profile',  icon: User },
    { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar() {
    const location = useLocation();
    const [userCollapsed, setCollapsed] = useUiPref<boolean>('sidebar.collapsed', false);

    // Studio is a sub-app with its own sidebar (modules, settings, integrations).
    // Two parallel 240px rails feels broken — force-collapse the global one to
    // an icon rail while inside /studio. User pref restores when they leave.
    const onStudio = location.pathname.startsWith('/studio');
    const collapsed = userCollapsed || onStudio;

    const isActive = (to: string) => {
        if (to === '/dashboard') return location.pathname === '/' || location.pathname.startsWith('/dashboard');
        if (to === '/requests') return location.pathname.startsWith('/requests') || location.pathname.startsWith('/request/');
        return location.pathname.startsWith(to);
    };

    const w = collapsed ? 'w-[56px]' : 'w-[240px]';

    return (
        <aside
            className={cn(
                'shrink-0 h-screen sticky top-0 border-r border-border bg-background flex flex-col',
                'transition-[width] duration-200 ease-refined',
                w,
            )}
        >
            {/* Brand row */}
            <div className={cn('h-14 flex items-center border-b border-border', collapsed ? 'justify-center' : 'px-4')}>
                <Link to="/dashboard" className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-background" strokeWidth={2.4} />
                    </div>
                    {!collapsed && (
                        <div className="flex items-baseline gap-1.5 overflow-hidden">
                            <span className="text-[14px] font-semibold tracking-tight text-foreground">InsureAuto</span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">ops</span>
                        </div>
                    )}
                </Link>
            </div>

            {/* Primary nav */}
            <nav className="flex-1 overflow-y-auto py-3">
                {!collapsed && <p className="px-4 mb-1.5 page-eyebrow">Operations</p>}
                <ul className="px-2 space-y-0.5">
                    {PRIMARY.map(item => (
                        <li key={item.to}>
                            <NavLink item={item} active={isActive(item.to)} collapsed={collapsed} />
                        </li>
                    ))}
                </ul>

                <div className="my-3 mx-2 border-t border-border" />

                {!collapsed && <p className="px-4 mb-1.5 page-eyebrow">Account</p>}
                <ul className="px-2 space-y-0.5">
                    {SECONDARY.map(item => (
                        <li key={item.to}>
                            <NavLink item={item} active={isActive(item.to)} collapsed={collapsed} />
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Collapse toggle — hidden on /studio since it's force-collapsed */}
            {!onStudio && (
                <div className="border-t border-border p-2">
                    <button
                        type="button"
                        onClick={() => setCollapsed(c => !c)}
                        className={cn(
                            'w-full h-9 rounded-md flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
                            collapsed ? 'justify-center px-0' : 'justify-start px-2.5',
                        )}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        {collapsed
                            ? <ChevronsRight className="h-4 w-4" />
                            : <><ChevronsLeft className="h-4 w-4" /><span className="text-[13px]">Collapse</span></>
                        }
                    </button>
                </div>
            )}
        </aside>
    );
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
    const Icon = item.icon;
    return (
        <Link
            to={item.to}
            className={cn(
                'relative h-9 flex items-center gap-2.5 rounded-md text-[13px] transition-colors',
                collapsed ? 'justify-center px-0' : 'px-2.5',
                active
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
            title={collapsed ? item.label : undefined}
        >
            {/* Left accent bar on active */}
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary" />}
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
            {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
    );
}
