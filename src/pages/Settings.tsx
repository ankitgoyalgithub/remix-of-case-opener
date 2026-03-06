import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Monitor, Globe, Shield, CreditCard, Users, Link as LinkIcon, Database, Zap, Lock, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');

    const handleUpdate = () => {
        toast.success('Settings saved successfully');
    };

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        System Settings
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-3">v2.4.0</Badge>
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm">Configure your operational environment and workspace preferences.</p>
                </div>
                <Button className="rounded-xl font-black text-xs uppercase tracking-widest px-8 shadow-lg shadow-primary/20" onClick={handleUpdate}>
                    Save All Changes
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-card/40 p-1 border border-border/50 rounded-2xl h-14 overflow-hidden">
                    <TabsTrigger value="general" className="rounded-xl px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Monitor className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="rounded-xl px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Bell className="h-4 w-4 mr-2" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="workspace" className="rounded-xl px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Globe className="h-4 w-4 mr-2" />
                        Workspace
                    </TabsTrigger>
                    <TabsTrigger value="api" className="rounded-xl px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Zap className="h-4 w-4 mr-2" />
                        API & Integrations
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden">
                            <CardHeader className="bg-primary/5 border-b border-primary/5">
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                                    <Palette className="h-4 w-4" />
                                    Appearance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Interface Theme</Label>
                                        <p className="text-[11px] text-muted-foreground font-medium">Customize how the platform looks on your screen.</p>
                                    </div>
                                    <Select defaultValue="system">
                                        <SelectTrigger className="w-32 rounded-xl border-border/50 font-bold text-xs">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="light">Light Mode</SelectItem>
                                            <SelectItem value="dark">Dark Mode</SelectItem>
                                            <SelectItem value="system">System</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Density Mode</Label>
                                        <p className="text-[11px] text-muted-foreground font-medium">Control the amount of information on screen.</p>
                                    </div>
                                    <Select defaultValue="comfortable">
                                        <SelectTrigger className="w-32 rounded-xl border-border/50 font-bold text-xs">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="compact">Compact</SelectItem>
                                            <SelectItem value="comfortable">Comfortable</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden">
                            <CardHeader className="bg-indigo-500/5 border-b border-indigo-500/5">
                                <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-indigo-500">
                                    <Database className="h-4 w-4" />
                                    Performance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Predictive Prefetching</Label>
                                        <p className="text-[11px] text-muted-foreground font-medium">Pre-load data for faster navigation between stages.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Automated Refresh</Label>
                                        <p className="text-[11px] text-muted-foreground font-medium">Keep the inbox up to date in real-time.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="notifications" className="space-y-6">
                    <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden max-w-2xl mx-auto">
                        <CardHeader className="bg-primary/5 border-b border-primary/5 p-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                    <Bell className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-black uppercase tracking-wider">Notification Delivery</CardTitle>
                                    <CardDescription className="text-xs font-bold text-muted-foreground">Manage how and when you receive critical updates.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-primary/70">Operational Alerts</h4>
                                {[
                                    { label: 'Stage Completion', desc: 'Notify when an AI stage completes processing.', enabled: true },
                                    { label: 'SLA Warnings', desc: 'Alert when a request enters the final 10% of its SLA.', enabled: true },
                                    { label: 'Escalations', desc: 'Urgent notifications for manual intervention requests.', enabled: true },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between pb-4 border-b border-border/40 last:border-0 last:pb-0">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold">{item.label}</Label>
                                            <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                                        </div>
                                        <Switch defaultChecked={item.enabled} />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500/70">Collaboration</h4>
                                {[
                                    { label: 'Comment Mentions', desc: 'When a team member @mentions you on a request.', enabled: true },
                                    { label: 'Owner Assignments', desc: 'When a request is redirected to your queue.', enabled: false },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between pb-4 border-b border-border/40 last:border-0 last:pb-0">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold">{item.label}</Label>
                                            <p className="text-[11px] text-muted-foreground font-medium">{item.desc}</p>
                                        </div>
                                        <Switch defaultChecked={item.enabled} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="workspace" className="space-y-6 text-center py-12">
                    <div className="max-w-md mx-auto space-y-4">
                        <div className="w-20 h-20 rounded-3xl bg-muted mx-auto flex items-center justify-center border border-border border-dashed">
                            <Globe className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-xl font-black">Workspace Management</h3>
                        <p className="text-sm text-muted-foreground font-medium">Enterprise workspace controls are managed by your regional administrator. Apply for escalated permissions to edit team settings.</p>
                        <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-wider px-8 border-primary/20 hover:bg-primary/5">Contact Admin</Button>
                    </div>
                </TabsContent>

                <TabsContent value="api" className="space-y-6">
                    <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden max-w-4xl mx-auto">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                <div className="p-8 border-r border-border/50 space-y-6 bg-primary/[0.02]">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <Zap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-lg font-black">API Integration</h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">Connect your operational tools via our high-speed REST API. Generate keys to enable programmatic access to requests.</p>
                                    </div>
                                    <Button className="w-full rounded-xl font-black text-xs uppercase tracking-widest h-12 bg-primary shadow-lg shadow-primary/20">Generate API Key</Button>
                                </div>
                                <div className="p-8 space-y-8">
                                    {[
                                        { name: 'Refinitiv World-Check', status: 'Connected', icon: <Shield className="h-4 w-4" /> },
                                        { name: 'Salesforce CRM', status: 'Inactive', icon: <LinkIcon className="h-4 w-4" /> },
                                        { name: 'National Economic Register', status: 'Connected', icon: <Globe className="h-4 w-4" /> },
                                    ].map((app, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-9 h-9 rounded-xl bg-background border border-border/60 flex items-center justify-center text-muted-foreground">{app.icon}</div>
                                                <span className="text-sm font-bold">{app.name}</span>
                                            </div>
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase tracking-wider px-2",
                                                app.status === 'Connected' ? "bg-success/5 text-success border-success/20" : "bg-muted text-muted-foreground/60 border-border/40"
                                            )}>{app.status}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
