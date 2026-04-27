import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, User, Settings, LogOut, ShieldCheck, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/auth';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/requests', label: 'Requests' },
    { to: '/studio', label: 'AI Studio' },
];

export function GlobalHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const { data: user } = useQuery({
        queryKey: ['userMe'],
        queryFn: () => api.user.me(),
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => api.notifications.list(),
    });

    const unreadCount = notifications.filter((n: any) => !n.is_read).length;
    const initials = user?.first_name && user?.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
        : user?.username?.substring(0, 2).toUpperCase() || 'AD';

    const isActive = (to: string) => {
        if (to === '/requests') return location.pathname === '/requests' || location.pathname.startsWith('/request/');
        if (to === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
        return location.pathname.startsWith(to);
    };

    const NavItems = ({ mobile = false }: { mobile?: boolean }) => (
        <>
            {NAV_ITEMS.map(item => {
                const active = isActive(item.to);
                return (
                    <Link key={item.to} to={item.to} onClick={() => setIsMobileMenuOpen(false)} className="relative">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                'font-medium text-sm h-8 px-3 transition-colors',
                                mobile && 'w-full justify-start',
                                active
                                    ? 'text-foreground hover:text-foreground hover:bg-muted/70'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                            )}
                        >
                            {item.label}
                        </Button>
                        {/* Active underline — slides between items because we use the same
                            shared class; keeps the nav feeling crisp without screaming. */}
                        {active && !mobile && (
                            <span className="absolute left-2.5 right-2.5 -bottom-[13px] h-[2px] rounded-t-full bg-gradient-to-r from-primary to-info" />
                        )}
                    </Link>
                );
            })}
        </>
    );

    return (
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 md:px-6 shrink-0 sticky top-0 z-50">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Trigger */}
                <div className="md:hidden">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[260px] p-0">
                            <SheetHeader className="px-5 py-4 border-b border-border">
                                <SheetTitle className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                                        <ShieldCheck className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-base font-semibold">INSUREAUTO</span>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col p-3 gap-1">
                                <NavItems mobile />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <Link to="/dashboard" className="flex items-center gap-2.5 group">
                    <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm shadow-primary/20 group-hover:shadow-md group-hover:shadow-primary/30 transition-shadow">
                        <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <span className="hidden sm:inline text-sm font-semibold tracking-tight text-foreground">
                        InsureAuto
                    </span>
                </Link>

                <nav className="hidden md:flex items-center gap-1 ml-2">
                    <NavItems />
                </nav>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => {
                        // Trigger Cmd+K via synthesised event; CommandPalette listens for it.
                        const isMac = /Mac/i.test(navigator.platform);
                        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac }));
                    }}
                    className="hidden md:inline-flex h-8 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title="Open command palette"
                >
                    <Search className="h-3.5 w-3.5" />
                    <span>Search…</span>
                    <kbd className="ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
                </button>

                <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive"></span>
                    )}
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src="/placeholder-avatar.jpg" />
                                <AvatarFallback className="bg-muted text-foreground text-xs font-medium">{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60 mt-1" align="end">
                        <DropdownMenuLabel className="font-normal px-3 py-2.5">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'Administrator'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {user?.email || 'admin@insureauto.com'}
                            </p>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => navigate('/profile')}>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => navigate('/settings')}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer text-sm" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
