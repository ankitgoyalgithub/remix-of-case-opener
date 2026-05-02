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
  return (
    <SidebarProvider defaultOpen={true}>
      <StudioShell />
    </SidebarProvider>
  );
}

/**
 * Inner shell that reads sidebar state. Must live inside <SidebarProvider> so
 * the edge-anchored toggle and peek rail can reflect the current open state.
 */
function StudioShell() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <div className="h-full flex w-full bg-background relative overflow-hidden">
      <StudioSidebar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar — no trigger here; the edge button handles collapse. */}
        <div className="h-14 border-b border-border bg-gradient-to-r from-primary/5 via-background to-info/5 flex items-center px-4 gap-3 sticky top-0 z-10">
          <Link to="/requests">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 text-xs px-3">
              <ArrowLeft className="h-3.5 w-3.5" />
              Exit Studio
            </Button>
          </Link>

          <div className="flex-1" />

          <Badge variant="outline" className="gap-1.5 text-xs font-medium text-success border-success/30 bg-success/5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Live
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1400px] w-full mx-auto min-h-full p-6 lg:p-8">
            <Outlet />
          </div>
        </div>

        {/* Peek rail — thin hover strip on the left edge when the sidebar is hidden. */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open navigation"
            className="absolute inset-y-0 left-0 w-1.5 hover:w-2 bg-transparent hover:bg-primary/20 transition-all z-20 group"
          >
            <span className="sr-only">Open navigation</span>
            <span className="absolute top-1/2 -translate-y-1/2 left-full ml-1 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap">
              Open
            </span>
          </button>
        )}
      </main>

      {/* Edge-anchored toggle: always visible, hugs the sidebar/main boundary. */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Open navigation' : 'Collapse navigation'}
              className={cn(
                'fixed top-[70px] z-30 h-7 w-7 rounded-full border border-border bg-background shadow-sm',
                'flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40',
                'transition-all',
                collapsed ? 'left-1.5' : 'left-[calc(16rem-0.875rem)]',
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
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
    <Sidebar className="border-r border-border bg-card" collapsible="offcanvas">
      <SidebarContent className="p-0">
        {/* Branding */}
        <div className="p-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">AI Studio</p>
              <p className="text-[11px] text-muted-foreground mt-1">Configuration</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <SidebarGroup className="pt-3 px-3">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 mb-2">
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
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                          active
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                        activeClassName=""
                      >
                        <item.icon className={cn(
                          'h-4 w-4 shrink-0',
                          active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground',
                        )} />
                        <div className="flex-1 min-w-0">
                          <span className={cn(
                            'block text-sm font-medium truncate leading-none',
                            active ? 'text-white' : 'text-foreground',
                          )}>
                            {item.title}
                          </span>
                          <span className={cn(
                            'block text-xs truncate leading-none mt-0.5',
                            active ? 'text-white/70' : 'text-muted-foreground',
                          )}>
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
