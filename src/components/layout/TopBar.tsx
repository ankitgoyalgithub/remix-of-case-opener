import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Menu, User, Settings as SettingsIcon, LogOut, Search, Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/auth';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationsPanel } from './NotificationsPanel';

/**
 * Persistent top bar.
 *  - Left: mobile hamburger (opens the off-canvas nav) + breadcrumbs.
 *  - Right: command-palette search (visible at every breakpoint),
 *    notifications, user menu (with the real theme toggle).
 */
export function TopBar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const openCommandPalette = () => {
        const isMac = /Mac/i.test(navigator.platform);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac }));
    };

    const { data: user } = useQuery({
        queryKey: ['userMe'],
        queryFn: () => api.user.me(),
        staleTime: 5 * 60_000,
    });

    const initials = user?.first_name && user?.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
        : user?.username?.substring(0, 2).toUpperCase() || 'AD';

    return (
        <header className="h-14 border-b border-border bg-background flex items-center justify-between px-3 md:px-4 gap-2 shrink-0">
            {/* Left: hamburger (mobile) + breadcrumbs */}
            <div className="flex items-center gap-2 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    aria-label="Open navigation menu"
                    onClick={onOpenMobileNav}
                >
                    <Menu className="h-5 w-5" aria-hidden />
                </Button>
                <Breadcrumbs />
            </div>

            {/* Right: search + notifications + user */}
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    type="button"
                    onClick={openCommandPalette}
                    className="hidden md:inline-flex h-8 items-center gap-2 rounded-md border border-border bg-muted/40 pl-2.5 pr-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-[220px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Search requests and pages (Command or Control K)"
                >
                    <Search className="h-3.5 w-3.5" aria-hidden />
                    <span className="flex-1 text-left">Search requests, docs…</span>
                    <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono leading-none">⌘K</kbd>
                </button>

                {/* Compact search trigger for small screens */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Search requests and pages"
                    onClick={openCommandPalette}
                >
                    <Search className="h-4 w-4" aria-hidden />
                </Button>

                <NotificationsPanel />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 rounded-full" aria-label="Account menu">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src="/placeholder-avatar.jpg" alt="" />
                                <AvatarFallback className="bg-foreground text-background text-[11px] font-mono font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60 mt-1" align="end">
                        <DropdownMenuLabel className="font-normal px-3 py-2.5">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'Account'}
                            </p>
                            {user?.email && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => navigate('/profile')}>
                            <User className="mr-2 h-4 w-4" aria-hidden />
                            My profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-sm" onClick={() => navigate('/settings')}>
                            <SettingsIcon className="mr-2 h-4 w-4" aria-hidden />
                            Preferences
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="px-3 pb-1 pt-1.5 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
                            Theme
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                            <DropdownMenuRadioItem value="light" className="cursor-pointer text-sm">
                                <Sun className="mr-2 h-4 w-4" aria-hidden />
                                Light
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="dark" className="cursor-pointer text-sm">
                                <Moon className="mr-2 h-4 w-4" aria-hidden />
                                Dark
                            </DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="system" className="cursor-pointer text-sm">
                                <Monitor className="mr-2 h-4 w-4" aria-hidden />
                                System
                            </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer text-sm" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" aria-hidden />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
