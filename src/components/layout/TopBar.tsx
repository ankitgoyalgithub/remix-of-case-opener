import { useNavigate } from 'react-router-dom';
import { Bell, User, Settings as SettingsIcon, LogOut, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/auth';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

/**
 * Slim top bar. Sits on top of every page, persistent.
 *  - Left: empty (Sidebar owns the brand). Pages can render their own
 *    breadcrumb inside <PageHeader/> below this bar.
 *  - Right: command-palette search, notifications, user menu.
 */
export function TopBar() {
    const navigate = useNavigate();

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

    return (
        <header className="h-14 border-b border-border bg-background flex items-center justify-end px-3 md:px-4 gap-1.5 shrink-0">
            <button
                type="button"
                onClick={() => {
                    const isMac = /Mac/i.test(navigator.platform);
                    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac }));
                }}
                className="hidden md:inline-flex h-8 items-center gap-2 rounded-md border border-border bg-muted/40 pl-2.5 pr-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-[220px]"
                title="Open command palette"
            >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Search requests, docs…</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono leading-none">⌘K</kbd>
            </button>

            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-background" />
                )}
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback className="bg-foreground text-background text-[11px] font-mono font-semibold">{initials}</AvatarFallback>
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
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer text-sm" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}
