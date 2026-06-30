import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getNavGroups, isItemActive, type Role } from './navItems';

/**
 * Off-canvas navigation drawer for screens under `md`, where the persistent
 * Sidebar is hidden. Opened by the TopBar hamburger. Mirrors the same nav
 * groups (Work · Configuration · Account) and role-gating as the desktop rail.
 */
export function MobileNav({
    open, onOpenChange,
}: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const location = useLocation();
    const { data: user } = useQuery({ queryKey: ['userMe'], queryFn: () => api.user.me(), staleTime: 5 * 60_000 });
    const role = (user as any)?.role as Role | undefined;
    const groups = getNavGroups(role);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>

                {/* Brand */}
                <div className="h-14 flex items-center px-4 border-b border-border">
                    <Link
                        to="/dashboard"
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-2.5"
                        aria-label="Insure Auto — go to My Dashboard"
                    >
                        <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-background" strokeWidth={2.4} aria-hidden />
                        </div>
                        <span className="ax-brand text-[15px] leading-none text-foreground">Insure Auto</span>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3" aria-label="Primary">
                    {groups.map((group, gi) => (
                        <div key={group.id}>
                            {gi > 0 && <div className="my-3 mx-2 border-t border-border" />}
                            <p className="px-4 mb-1.5 page-eyebrow">{group.label}</p>
                            <ul className="px-2 space-y-0.5">
                                {group.items.map(item => {
                                    const active = isItemActive(item, location.pathname);
                                    const Icon = item.icon;
                                    return (
                                        <li key={item.to}>
                                            <Link
                                                to={item.to}
                                                onClick={() => onOpenChange(false)}
                                                aria-current={active ? 'page' : undefined}
                                                className={cn(
                                                    'relative flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm transition-colors',
                                                    active
                                                        ? 'bg-muted text-foreground font-medium'
                                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                                                )}
                                            >
                                                {active && <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-primary" aria-hidden />}
                                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                                <span className="min-w-0">
                                                    <span className="block truncate leading-tight">{item.label}</span>
                                                    <span className="block text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{item.description}</span>
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </SheetContent>
        </Sheet>
    );
}
