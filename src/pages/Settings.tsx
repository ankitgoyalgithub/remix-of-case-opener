import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Settings as SettingsIcon, Bell, Monitor, Globe, Shield, CreditCard, Users, Link as LinkIcon, Database, Zap, Lock, Palette, Mail, Plus, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { UsersPanel } from '@/components/settings/UsersPanel';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MailboxAccount {
    id: string;
    email_address: string;
    provider: string;
    enabled: boolean;
    has_refresh_token: boolean;
    last_polled_at: string | null;
    rule_count: number;
}

export default function Settings() {
    const [activeTab, setActiveTab] = useState('general');
    const [mailboxes, setMailboxes] = useState<MailboxAccount[]>([]);
    const [mailboxesLoading, setMailboxesLoading] = useState(false);
    const [polling, setPolling] = useState<string | null>(null);
    const [me, setMe] = useState<{ id: number; role: string } | null>(null);

    useEffect(() => {
        api.user.me().then(setMe).catch(() => setMe(null));
    }, []);

    const loadMailboxes = async () => {
        try {
            setMailboxesLoading(true);
            const data = await api.inboundEmail.accounts.list();
            setMailboxes(data);
        } catch {
            // silent — Settings page renders even when API is unavailable
        } finally {
            setMailboxesLoading(false);
        }
    };

    useEffect(() => { loadMailboxes(); }, []);

    const handleConnectGmail = () => {
        api.inboundEmail.startOAuth();
    };

    const handlePoll = async (account: MailboxAccount) => {
        setPolling(account.id);
        try {
            const res = await api.inboundEmail.accounts.poll(account.id);
            toast.success(`Polled ${account.email_address}`, {
                description: `${res.fetched ?? 0} fetched · ${res.matched ?? 0} matched · ${res.skipped ?? 0} skipped`,
            });
            loadMailboxes();
        } catch (err: any) {
            toast.error(err?.message || 'Poll failed');
        } finally {
            setPolling(null);
        }
    };

    const handleDisconnect = async (account: MailboxAccount) => {
        if (!window.confirm(`Disconnect ${account.email_address}?`)) return;
        try {
            await api.inboundEmail.accounts.delete(account.id);
            toast.success('Disconnected');
            loadMailboxes();
        } catch {
            toast.error('Failed to disconnect');
        }
    };

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
                    <TabsTrigger value="users" className="rounded-xl px-6 font-bold text-xs uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                        <Users className="h-4 w-4 mr-2" />
                        Users
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
                                        <p className="text-sm text-muted-foreground font-medium">Customize how the platform looks on your screen.</p>
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
                                        <p className="text-sm text-muted-foreground font-medium">Control the amount of information on screen.</p>
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
                                        <p className="text-sm text-muted-foreground font-medium">Pre-load data for faster navigation between stages.</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold">Automated Refresh</Label>
                                        <p className="text-sm text-muted-foreground font-medium">Keep the inbox up to date in real-time.</p>
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
                                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-primary/70">Operational Alerts</h4>
                                {[
                                    { label: 'Stage Completion', desc: 'Notify when an AI stage completes processing.', enabled: true },
                                    { label: 'SLA Warnings', desc: 'Alert when a request enters the final 10% of its SLA.', enabled: true },
                                    { label: 'Escalations', desc: 'Urgent notifications for manual intervention requests.', enabled: true },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between pb-4 border-b border-border/40 last:border-0 last:pb-0">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold">{item.label}</Label>
                                            <p className="text-sm text-muted-foreground font-medium">{item.desc}</p>
                                        </div>
                                        <Switch defaultChecked={item.enabled} />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border/50">
                                <h4 className="text-sm font-black uppercase tracking-[0.3em] text-indigo-500/70">Collaboration</h4>
                                {[
                                    { label: 'Comment Mentions', desc: 'When a team member @mentions you on a request.', enabled: true },
                                    { label: 'Owner Assignments', desc: 'When a request is redirected to your queue.', enabled: false },
                                ].map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between pb-4 border-b border-border/40 last:border-0 last:pb-0">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold">{item.label}</Label>
                                            <p className="text-sm text-muted-foreground font-medium">{item.desc}</p>
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

                <TabsContent value="users" className="space-y-6 max-w-4xl mx-auto">
                    <UsersPanel currentUserId={me?.id} />
                </TabsContent>

                <TabsContent value="api" className="space-y-6">
                    {/* Connected mailboxes */}
                    <Card className="overflow-hidden max-w-4xl mx-auto">
                        <CardHeader className="bg-gradient-to-r from-primary/5 via-background to-info/5 border-b border-border">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 to-info/10 text-primary flex items-center justify-center shrink-0">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">Connected mailboxes</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Inbox-driven submissions. Brokers email here; documents become requests automatically.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button size="sm" className="gap-1.5 shrink-0" onClick={handleConnectGmail}>
                                    <Plus className="h-3.5 w-3.5" />
                                    Connect Gmail
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5">
                            {mailboxesLoading ? (
                                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading mailboxes…
                                </div>
                            ) : mailboxes.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium">No mailboxes connected.</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                        Click <strong>Connect Gmail</strong> to authorize a mailbox. You'll be sent to Google to grant read access, then bounced back here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {mailboxes.map(account => (
                                        <div
                                            key={account.id}
                                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border border-border bg-muted/10"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/15 to-info/10 text-primary flex items-center justify-center shrink-0">
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-medium truncate">{account.email_address}</p>
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase">{account.provider}</Badge>
                                                        {account.has_refresh_token ? (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/30 gap-1">
                                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                                Authorized
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-warning/10 text-warning border-warning/30 gap-1">
                                                                <AlertTriangle className="h-2.5 w-2.5" />
                                                                No token
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {account.rule_count} rule{account.rule_count !== 1 ? 's' : ''}
                                                        {account.last_polled_at && ` · last polled ${format(new Date(account.last_polled_at), 'dd MMM HH:mm')}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                                                    onClick={() => handlePoll(account)}
                                                    disabled={polling === account.id}
                                                >
                                                    {polling === account.id
                                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                                        : <RefreshCw className="h-3 w-3" />}
                                                    Poll
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDisconnect(account)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    <Link to="/studio/inbound" className="block">
                                        <div className="mt-2 px-3 py-2 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-muted/20 transition-colors flex items-center justify-between text-xs text-muted-foreground hover:text-foreground">
                                            <span>Configure ingestion rules + view recent emails</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </div>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

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
                                                "text-[11px] font-black uppercase tracking-wider px-2",
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
