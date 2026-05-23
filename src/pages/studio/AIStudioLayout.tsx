import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  LayoutDashboard,
  Workflow,
  FileStack,
  ClipboardCheck,
  Plug,
  Mail,
  Inbox,
  ListChecks,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  description: string;
}

const menuItems: MenuItem[] = [
  { title: 'Overview', url: '/studio', icon: LayoutDashboard, description: 'Config health + quick links' },
  { title: 'Workflows', url: '/studio/workflows', icon: Workflow, description: 'Stage pipelines' },
  { title: 'Documents', url: '/studio/documents', icon: FileStack, description: 'Doc types + extraction + rules' },
  { title: 'Checks', url: '/studio/checks', icon: ClipboardCheck, description: 'Reusable checklist items' },
  { title: 'Integrations', url: '/studio/integrations', icon: Plug, description: 'External API providers' },
  { title: 'Inbound email', url: '/studio/inbound', icon: Inbox, description: 'Email-driven submissions' },
  { title: 'Jobs', url: '/studio/jobs', icon: ListChecks, description: 'Polling history + per-email outcomes' },
  { title: 'Messages', url: '/studio/messages', icon: Mail, description: 'Email + notification templates' },
  { title: 'Outputs', url: '/studio/outputs', icon: FileSpreadsheet, description: 'UW sheet & XLSX templates' },
  { title: 'Settings', url: '/studio/settings', icon: Settings, description: 'SLA, queues, roles' },
];

export default function AIStudioLayout() {
  // shadcn's SidebarProvider hardcodes `min-h-svh` on its wrapper, which
  // would force this sub-app to be viewport-tall and break the scroll
  // chain from AppLayout. Override with our own claim on parent height.
  return (
    <SidebarProvider defaultOpen={true} className="!min-h-0 flex-1 h-full">
      <StudioShell />
    </SidebarProvider>
  );
}

function StudioShell() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  // flex-1 + min-h-0 is the correct height claim inside the AppLayout's
  // <main className="flex-1 min-h-0 flex flex-col">. h-full doesn't propagate
  // reliably through a flex-col parent, which was breaking page scroll.
  return (
    <div className="flex-1 min-h-0 flex w-full bg-background relative overflow-hidden">
      <StudioSidebar />
      <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative">
        {/* Top bar — calm hairline, no gradient */}
        <div className="h-12 border-b border-border bg-background flex items-center px-4 gap-3 sticky top-0 z-10 shrink-0">
          <Link to="/requests">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Exit Studio
            </Button>
          </Link>

          <div className="flex-1" />

          <Badge variant="success" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live
          </Badge>
        </div>

        {/* Content — same shell as PageShell so Studio pages feel like the rest */}
        <div className="flex-1 overflow-auto bg-background">
          <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
            <Outlet />
          </div>
        </div>

        {/* Peek rail */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open navigation"
            className="absolute inset-y-0 left-0 w-1.5 hover:w-2 bg-transparent hover:bg-foreground/10 transition-all z-20 group"
          >
            <span className="sr-only">Open navigation</span>
          </button>
        )}
      </main>

      {/* Edge-anchored collapse toggle */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Open navigation' : 'Collapse navigation'}
              className={cn(
                'fixed top-[70px] z-30 h-6 w-6 rounded-full border border-border bg-background',
                'flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30',
                'transition-all',
                collapsed ? 'left-1.5' : 'left-[calc(16rem-0.75rem)]',
              )}
            >
              {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[11px]">
            {collapsed ? 'Open' : 'Collapse'} navigation
            <kbd className="ml-2 text-[10px] opacity-70 font-mono">⌘B</kbd>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function StudioSidebar() {
  const location = useLocation();

  const isActive = (url: string) => {
    if (url === '/studio') return location.pathname === '/studio' || location.pathname === '/studio/';
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  return (
    <Sidebar className="border-r border-border bg-background" collapsible="offcanvas">
      <SidebarContent className="p-0">
        {/* Branding — solid logomark, matches global Sidebar pattern */}
        <div className="px-4 h-12 border-b border-border flex items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-background" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground leading-none tracking-tight">AI Studio</p>
              <p className="page-eyebrow mt-1 normal-case tracking-wide">Configuration</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <SidebarGroup className="pt-3 px-2">
          <SidebarGroupLabel className="page-eyebrow px-2 mb-1.5">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild className="h-auto p-0">
                      <NavLink
                        to={item.url}
                        className={cn(
                          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors duration-150',
                          active
                            ? 'bg-muted text-foreground'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                        activeClassName=""
                      >
                        {/* Left accent bar — matches the pattern from the global Sidebar */}
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary" />}
                        <item.icon className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                        )} />
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            'block text-[13px] font-medium truncate leading-tight',
                            active ? 'text-foreground' : 'text-foreground/90',
                          )}>
                            {item.title}
                          </span>
                          <span className="block text-[11px] truncate leading-tight text-muted-foreground mt-0.5">
                            {item.description}
                          </span>
                        </div>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
