import { useState, createContext, useContext } from 'react';
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
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Wand2,
  BookOpen,
  MessageSquare,
  Settings,
  Sparkles,
  Workflow,
  FileStack,
  Database,
  Brain,
  Link2,
  ClipboardCheck,
  Mail,
} from 'lucide-react';

// Context for Simple/Advanced mode
const StudioModeContext = createContext<{ isAdvanced: boolean; setIsAdvanced: (v: boolean) => void }>({
  isAdvanced: false,
  setIsAdvanced: () => { },
});

export function useStudioMode() {
  return useContext(StudioModeContext);
}

const simpleMenuItems = [
  { title: 'Setup Wizard', url: '/studio/setup', icon: Wand2, description: 'Guided configuration' },
  { title: 'Document Library', url: '/studio/library', icon: BookOpen, description: 'Manage documents' },
  { title: 'Templates & Messages', url: '/studio/templates', icon: MessageSquare, description: 'Notifications' },
  { title: 'Settings', url: '/studio/settings', icon: Settings, description: 'Global settings' },
];

const advancedMenuItems = [
  { title: 'Workflow Builder', url: '/studio/workflow', icon: Workflow, description: 'Configure stages' },
  { title: 'Document Catalog', url: '/studio/documents', icon: FileStack, description: 'Define document types' },
  { title: 'Fields to Extract', url: '/studio/extraction', icon: Database, description: 'AI extraction schema' },
  { title: 'AI Notes', url: '/studio/ai-instructions', icon: Brain, description: 'Extraction guidance' },
  { title: 'Cross-Validation', url: '/studio/cv-rules', icon: Link2, description: 'Field matching rules' },
  { title: 'Stage Checklist', url: '/studio/checklists', icon: ClipboardCheck, description: 'Stage task config' },
  { title: 'Email Templates', url: '/studio/emails', icon: Mail, description: 'Notification templates' },
  { title: 'Settings', url: '/studio/settings', icon: Settings, description: 'Global settings' },
];

export default function AIStudioLayout() {
  const [isAdvanced, setIsAdvanced] = useState(false);

  return (
    <StudioModeContext.Provider value={{ isAdvanced, setIsAdvanced }}>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-full flex w-full bg-background">
          <StudioSidebar isAdvanced={isAdvanced} />
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Top bar */}
            <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 sticky top-0 z-10">
              <SidebarTrigger className="h-8 w-8 hover:bg-muted rounded-md text-muted-foreground" />

              <Link to="/requests">
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground h-8 text-xs px-3">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Exit Studio
                </Button>
              </Link>

              <div className="flex-1" />

              {/* Mode toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background">
                <span className={cn('text-xs font-medium transition-colors', !isAdvanced ? 'text-foreground' : 'text-muted-foreground')}>
                  Standard
                </span>
                <Switch
                  checked={isAdvanced}
                  onCheckedChange={setIsAdvanced}
                  className="data-[state=checked]:bg-primary h-4 w-8 scale-90"
                />
                <span className={cn('text-xs font-medium transition-colors', isAdvanced ? 'text-foreground' : 'text-muted-foreground')}>
                  Advanced
                </span>
              </div>

              <Separator orientation="vertical" className="h-5 bg-border/60" />

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
          </main>
        </div>
      </SidebarProvider>
    </StudioModeContext.Provider>
  );
}

function StudioSidebar({ isAdvanced }: { isAdvanced: boolean }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const menuItems = isAdvanced ? advancedMenuItems : simpleMenuItems;

  return (
    <Sidebar className={cn(
      'border-r border-border bg-card transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )} collapsible="icon">
      <SidebarContent className="p-0">
        {/* Branding */}
        <div className={cn('p-4 border-b border-border/60', collapsed ? 'px-3' : 'px-4')}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">Insure Studio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isAdvanced ? 'Advanced Mode' : 'Standard Mode'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Nav items */}
        <SidebarGroup className="pt-3 px-3">
          {!collapsed && (
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-2 mb-2">
              {isAdvanced ? 'Configuration' : 'Setup'}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title + item.url}>
                    <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className="h-auto p-0">
                      <NavLink
                        to={item.url}
                        className={cn(
                          'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150',
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                        activeClassName=""
                      >
                        <item.icon className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                        )} />
                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <span className={cn(
                              'block text-sm font-medium truncate leading-none',
                              isActive ? 'text-white' : 'text-foreground'
                            )}>
                              {item.title}
                            </span>
                            <span className={cn(
                              'block text-xs truncate leading-none mt-0.5',
                              isActive ? 'text-white/70' : 'text-muted-foreground'
                            )}>
                              {item.description}
                            </span>
                          </div>
                        )}
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
