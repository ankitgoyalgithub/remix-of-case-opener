import { useState } from 'react';
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
import { 
  ArrowLeft, 
  Workflow, 
  FileStack, 
  Database, 
  Brain, 
  ClipboardCheck, 
  Mail, 
  Settings,
  Sparkles,
  Shield
} from 'lucide-react';

const studioMenuItems = [
  { title: 'Workflow Builder', url: '/studio/workflow', icon: Workflow, description: 'Configure stages' },
  { title: 'Document Catalog', url: '/studio/documents', icon: FileStack, description: 'Define document types' },
  { title: 'Extraction Schema', url: '/studio/extraction', icon: Database, description: 'Configure AI fields' },
  { title: 'AI Instructions', url: '/studio/ai-instructions', icon: Brain, description: 'Agent context' },
  { title: 'Checklist Builder', url: '/studio/checklists', icon: ClipboardCheck, description: 'Stage checklists' },
  { title: 'Email Templates', url: '/studio/emails', icon: Mail, description: 'Notification templates' },
  { title: 'Settings', url: '/studio/settings', icon: Settings, description: 'Global settings' },
];

function StudioSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar className={collapsed ? 'w-16' : 'w-64'} collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className={`p-4 border-b border-border ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-semibold text-sm">AI Ops Studio</h2>
                <p className="text-xs text-muted-foreground">Configuration</p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Badge */}
        {!collapsed && (
          <div className="px-4 py-2">
            <Badge variant="outline" className="w-full justify-center gap-1.5 py-1 bg-primary/5 border-primary/20 text-primary">
              <Shield className="h-3 w-3" />
              Admin Access
            </Badge>
          </div>
        )}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Configuration</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {studioMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <div className="flex-1 min-w-0">
                          <span className="text-sm block">{item.title}</span>
                          <span className="text-xs text-muted-foreground block truncate">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Back to Requests */}
        <div className={`mt-auto p-4 border-t border-border ${collapsed ? 'px-2' : ''}`}>
          <Link to="/requests">
            <Button variant="outline" size={collapsed ? 'icon' : 'sm'} className={collapsed ? '' : 'w-full gap-2'}>
              <ArrowLeft className="h-4 w-4" />
              {!collapsed && 'Back to Requests'}
            </Button>
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AIStudioLayout() {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <StudioSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <Badge variant="secondary" className="gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Draft Mode
            </Badge>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
