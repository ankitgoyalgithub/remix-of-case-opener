import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, Settings, LogOut, ShieldCheck, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/auth';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';

export function GlobalHeader() {
    const navigate = useNavigate();
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

    const NavItems = () => (
        <>
            <Link to="/requests" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start md:w-auto font-semibold text-sm">Requests</Button>
            </Link>
            <Link to="/evidence-pack" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start md:w-auto font-semibold text-sm">Evidence Pack</Button>
            </Link>
            <Link to="/studio" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start md:w-auto font-semibold text-sm">AI Studio</Button>
            </Link>
        </>
    );

    return (
        <header className="h-16 border-b border-border/60 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 relative z-50 sticky top-0">
            <div className="flex items-center gap-4 md:gap-6">
                {/* Mobile Menu Trigger */}
                <div className="md:hidden">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0">
                            <SheetHeader className="p-6 border-b border-border/50">
                                <SheetTitle className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-lg font-bold">INSURE<span className="text-primary italic">AUTO</span></span>
                                </SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col p-4 gap-2">
                                <NavItems />
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>

                <Link to="/requests" className="group flex items-center gap-3 md:gap-4 transition-all active:scale-[0.98]">
                    <div className="relative">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-gradient-to-tr from-primary via-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)] overflow-hidden border border-white/20 group-hover:scale-105 transition-transform duration-300">
                            <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-white" />
                        </div>
                        <div className="absolute -inset-1.5 bg-primary/20 blur-lg rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="flex flex-col hidden sm:flex">
                        <span className="text-base md:text-lg font-extrabold tracking-tight text-foreground leading-none">
                            INSURE<span className="text-primary italic">AUTO</span>
                        </span>
                        <span className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-80 mt-1">
                            Enterprise Operations
                        </span>
                    </div>
                </Link>

                <nav className="hidden md:flex items-center gap-1 ml-4 lg:ml-8">
                    <NavItems />
                </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-5">
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all h-9 w-9 md:h-10 md:w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary border-2 border-card"></span>
                    )}
                </Button>

                <div className="hidden sm:block h-6 w-px bg-border/60 mx-1"></div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 md:h-10 md:w-10 p-0 rounded-xl md:rounded-2xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 shadow-sm overflow-hidden group">
                            <Avatar className="h-full w-full rounded-none">
                                <AvatarImage src="/placeholder-avatar.jpg" className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary text-xs md:text-sm font-bold group-hover:bg-primary/10 transition-colors">{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 mt-2 p-1 glass-card border-border/50" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold leading-none text-foreground mb-1 truncate">
                                        {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'System Administrator'}
                                    </p>
                                    <p className="text-[11px] leading-none text-muted-foreground font-medium opacity-80 truncate">
                                        {user?.email || 'admin@insureauto.com'}
                                    </p>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <div className="p-1">
                            <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 px-3 focus:bg-primary/10 group" onClick={() => navigate('/profile')}>
                                <User className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="font-semibold text-xs">Account Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer rounded-lg py-2.5 px-3 focus:bg-primary/10 group text-muted-foreground" onClick={() => navigate('/settings')}>
                                <Settings className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                <span className="font-semibold text-xs">Workspace Settings</span>
                            </DropdownMenuItem>
                        </div>
                        <DropdownMenuSeparator className="bg-border/50" />
                        <div className="p-1">
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg py-2.5 px-3" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span className="font-bold text-xs uppercase tracking-wider">Log out</span>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
