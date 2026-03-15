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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Wand2,
  BookOpen,
  MessageSquare,
  Settings,
  Sparkles,
  Shield,
  Workflow,
  FileStack,
  Database,
  Brain,
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
  { title: 'Fields to Extract', url: '/studio/extraction', icon: Database, description: 'Configure AI fields' },
  { title: 'AI Notes', url: '/studio/ai-instructions', icon: Brain, description: 'Extraction guidance' },
  { title: 'Stage Checklist', url: '/studio/checklists', icon: ClipboardCheck, description: 'Stage checklists' },
  { title: 'Email Templates', url: '/studio/emails', icon: Mail, description: 'Notification templates' },
  { title: 'Settings', url: '/studio/settings', icon: Settings, description: 'Global settings' },
];

export default function AIStudioLayout() {
  const [isAdvanced, setIsAdvanced] = useState(false);

  return (
    <StudioModeContext.Provider value={{ isAdvanced, setIsAdvanced }}>
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-full flex w-full bg-background/50 selection:bg-primary/20 selection:text-primary">
          <StudioSidebar isAdvanced={isAdvanced} />
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

            {/* Top Bar: Cinematic Navigator */}
            <div className="h-16 border-b border-border/50 bg-card/60 backdrop-blur-xl flex items-center px-6 gap-6 relative z-10 sticky top-0">
              <SidebarTrigger className="hover:bg-primary/5 text-primary" />

              <Link to="/requests">
                <Button variant="ghost" size="sm" className="gap-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl px-4 py-2 transition-all">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs font-bold tracking-tight">EXIT STUDIO</span>
                </Button>
              </Link>

              <div className="flex-1" />

              {/* Mode Control Group */}
              <div className="flex items-center gap-6 glass-card px-4 py-1.5 rounded-2xl border-primary/10">
                <div className="flex items-center gap-3">
                  <span className={cn("text-[10px] font-bold tracking-wider transition-colors", !isAdvanced ? "text-primary" : "text-muted-foreground")}>STANDARD</span>
                  <Switch
                    checked={isAdvanced}
                    onCheckedChange={setIsAdvanced}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className={cn("text-[10px] font-bold tracking-wider transition-colors", isAdvanced ? "text-primary" : "text-muted-foreground")}>ADVANCED</span>
                </div>

                <Separator orientation="vertical" className="h-4 bg-border/50" />

                <Badge variant="outline" className="gap-2 py-1 px-3 bg-success/5 border-success/20 text-success text-[10px] font-bold rounded-lg group hover:bg-success/10 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  SYSTEM LIVE
                  <Sparkles className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                </Badge>
              </div>

              <div className="w-px h-6 bg-border/50 mx-2" />

              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/50 hover:bg-muted">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto relative z-0">
              <div className="max-w-[1400px] mx-auto min-h-full">
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
      "border-r border-border/50 bg-background/80 backdrop-blur-xl transition-all duration-300",
      collapsed ? "w-20" : "w-72"
    )} collapsible="icon">
      <SidebarContent className="p-0 overflow-hidden">
        {/* Branding Area: Refined Multi-layered Logo */}
        <div className={cn("p-6 pb-2 shrink-0 transition-all", collapsed ? "px-3" : "px-6")}>
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-primary/40 to-indigo-500/40 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <div className="relative flex w-11 h-11 items-center justify-center rounded-xl bg-card border border-primary/20 shadow-[0_4px_20px_-4px_rgba(var(--primary),0.2)]">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <h2 className="text-lg font-extrabold tracking-tight text-foreground leading-none">
                    INSURE<span className="text-primary italic">STUDIO</span>
                  </h2>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2 opacity-60">Engine v4.2</p>
                </div>
              )}
            </div>

            {/* Context Badge */}
            {!collapsed && (
              <div className="flex items-center gap-3 rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent p-3 shadow-inner">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-foreground leading-tight">Admin Master</span>
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider mt-0.5">Full Sovereignty</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <SidebarGroup className="mt-6 px-4">
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 px-3 mb-4 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-primary/40" />
              {isAdvanced ? 'Advanced Engine' : 'Baseline Config'}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title + item.url}>
                    <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined} className="h-auto p-0">
                      <NavLink
                        to={item.url}
                        className={cn(
                          "group flex flex-1 items-center gap-4 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-300",
                          isActive
                            ? "bg-primary text-white shadow-lg shadow-primary/20 border-t border-white/20"
                            : "text-muted-foreground hover:bg-primary/5 hover:text-foreground border border-transparent"
                        )}
                        activeClassName=""
                      >
                        <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-primary/70")} />
                        {!collapsed && (
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <span className="block truncate leading-tight tracking-tight">{item.title}</span>
                            <span className={cn(
                              "block truncate text-[10px] font-medium leading-none mt-1.5 transition-colors tracking-normal",
                              isActive ? "text-white/70" : "text-muted-foreground/60 group-hover:text-muted-foreground/90"
                            )}>
                              {item.description}
                            </span>
                          </div>
                        )}
                        {isActive && !collapsed && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]" />
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

      {/* Sidebar Footer Removed */}
    </Sidebar>
  );
}
