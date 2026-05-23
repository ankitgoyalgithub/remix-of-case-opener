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
                    <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                            'relative inline-flex items-center text-[13px] font-medium transition-colors',
                            mobile
                                ? 'w-full h-10 px-3 rounded-md hover:bg-muted'
                                : 'h-14 px-4',
                            !mobile && (active
                                ? 'text-foreground'
                                : 'text-muted-foreground hover:text-foreground'),
                        )}
                    >
                        {item.label}
                        {/* Red underline indicator — Axiom-style active state */}
                        {active && !mobile && (
                            <span className="absolute left-3 right-3 -bottom-px h-[2px] bg-primary" />
                        )}
                    </Link>
                );
            })}
        </>
    );

    return (
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 md:px-5 shrink-0 sticky top-0 z-50">
            <div className="flex items-center h-full">
                {/* Mobile Menu Trigger */}
                <div className="md:hidden mr-2">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Menu className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[260px] p-0">
                            <SheetHeader className="px-5 py-4 border-b border-border">
                                <SheetTitle className="flex items-center gap-2.5">
                                    <Logomark />
                                    <Wordmark />
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col p-2 gap-0.5">
                                <NavItems mobile />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <Link to="/dashboard" className="flex items-center gap-2.5 pr-5 h-full">
                    <Logomark />
                    <Wordmark />
                </Link>

                <nav className="hidden md:flex items-center h-full">
                    <NavItems />
                </nav>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => {
                        const isMac = /Mac/i.test(navigator.platform);
                        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac }));
                    }}
                    className="hidden md:inline-flex h-8 items-center gap-2 border border-border bg-background pl-2.5 pr-1.5 ax-ticker hover:border-foreground/30 hover:text-foreground transition-colors"
                    title="Open command palette"
                >
                    <Search className="h-3 w-3" />
                    <span>SEARCH</span>
                    <kbd className="border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono leading-none tracking-normal">⌘K</kbd>
                </button>

                <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-background" />
                    )}
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 w-9 p-0 rounded-full">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src="/placeholder-avatar.jpg" />
                                <AvatarFallback className="bg-foreground text-background text-[11px] font-mono font-semibold tracking-wider">{initials}</AvatarFallback>
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

function Logomark() {
    return (
        <div className="w-8 h-8 border-2 border-foreground flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-foreground" strokeWidth={2.4} />
        </div>
    );
}

function Wordmark() {
    return (
        <div className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-extrabold tracking-tight text-foreground">INSUREAUTO</span>
            <span className="ax-ticker-strong">OPS</span>
        </div>
    );
}
