import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
    Palette, Users, Mail, Plus, RefreshCw, Trash2, CheckCircle2, AlertTriangle,
    Loader2, ArrowRight, Sun, Moon, Monitor,
} from 'lucide-react';
import { UsersPanel } from '@/components/settings/UsersPanel';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { PageShell, PageHeader } from '@/components/layout/PageShell';

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
    const [activeTab, setActiveTab] = useState('appearance');
    const [mailboxes, setMailboxes] = useState<MailboxAccount[]>([]);
    const [mailboxesLoading, setMailboxesLoading] = useState(false);
    const [mailboxesError, setMailboxesError] = useState(false);
    const [checking, setChecking] = useState<string | null>(null);
    const [me, setMe] = useState<{ id: number; role: string } | null>(null);

    useEffect(() => {
        api.user.me().then(setMe).catch(() => setMe(null));
    }, []);

    const loadMailboxes = async () => {
        try {
            setMailboxesLoading(true);
            setMailboxesError(false);
            const data = await api.inboundEmail.accounts.list();
            setMailboxes(data);
        } catch (err) {
            // Show an honest error + retry rather than rendering "none connected",
            // which would wrongly read as "all clear" during an outage.
            console.error('Settings: failed to load mailboxes', err);
            setMailboxesError(true);
        } finally {
            setMailboxesLoading(false);
        }
    };

    useEffect(() => { loadMailboxes(); }, []);

    const handleConnectGmail = () => {
        api.inboundEmail.startOAuth();
    };

    const handleCheckNow = async (account: MailboxAccount) => {
        setChecking(account.id);
        try {
            const res = await api.inboundEmail.accounts.poll(account.id);
            toast.success(`Checked ${account.email_address}`, {
                description: `${res.fetched ?? 0} received · ${res.matched ?? 0} matched · ${res.skipped ?? 0} skipped`,
            });
            loadMailboxes();
        } catch (err) {
            console.error('Settings: mailbox check failed', err);
            toast.error("We couldn't check that mailbox. Please try again.");
        } finally {
            setChecking(null);
        }
    };

    const handleDisconnect = async (account: MailboxAccount) => {
        try {
            await api.inboundEmail.accounts.delete(account.id);
            toast.success(`Disconnected ${account.email_address}`);
            loadMailboxes();
        } catch (err) {
            console.error('Settings: mailbox disconnect failed', err);
            toast.error("We couldn't disconnect that mailbox. Please try again.");
        }
    };

    return (
        <PageShell>
            <PageHeader
                eyebrow="Account · Preferences"
                title="Preferences"
                description="Set your appearance, manage team members, and connect mailboxes. Processing rules and workflows live under Configuration."
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted/40 p-0.5 border border-border h-9">
                    <TabsTrigger value="appearance" className="px-3 text-[13px] font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Palette className="h-3.5 w-3.5" aria-hidden />
                        Appearance
                    </TabsTrigger>
                    <TabsTrigger value="users" className="px-3 text-[13px] font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Users className="h-3.5 w-3.5" aria-hidden />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="mailboxes" className="px-3 text-[13px] font-medium gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <Mail className="h-3.5 w-3.5" aria-hidden />
                        Mailboxes
                    </TabsTrigger>
                </TabsList>

                {/* ── Appearance ─────────────────────────────────────────── */}
                <TabsContent value="appearance" className="space-y-6">
                    <Card className="max-w-2xl">
                        <CardHeader className="border-b border-border">
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <Palette className="h-4 w-4 text-muted-foreground" aria-hidden />
                                Appearance
                            </CardTitle>
                            <CardDescription className="text-xs">
                                How the platform looks on this device. Saved automatically.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                            <ThemePreference />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Users (admin) ──────────────────────────────────────── */}
                <TabsContent value="users" className="space-y-6 max-w-4xl">
                    <UsersPanel currentUserId={me?.id} />
                </TabsContent>

                {/* ── Connected mailboxes ────────────────────────────────── */}
                <TabsContent value="mailboxes" className="space-y-6">
                    <Card className="overflow-hidden max-w-4xl">
                        <CardHeader className="border-b border-border">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                        <Mail className="h-5 w-5" aria-hidden />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">Connected mailboxes</CardTitle>
                                        <CardDescription className="text-xs mt-0.5">
                                            Brokers email their documents to these mailboxes, and we turn them into requests automatically.
                                        </CardDescription>
                                    </div>
                                </div>
                                <Button size="sm" className="gap-1.5 shrink-0" onClick={handleConnectGmail}>
                                    <Plus className="h-3.5 w-3.5" aria-hidden />
                                    Connect Gmail
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-5">
                            {mailboxesLoading ? (
                                <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                    Loading mailboxes…
                                </div>
                            ) : mailboxesError ? (
                                <div role="alert" className="text-center py-8">
                                    <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3">
                                        <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
                                    </div>
                                    <p className="text-sm font-medium">We couldn't load your connected mailboxes.</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        This is usually temporary. Check your connection and try again.
                                    </p>
                                    <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={loadMailboxes}>
                                        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                                        Try again
                                    </Button>
                                </div>
                            ) : mailboxes.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />
                                    </div>
                                    <p className="text-sm font-medium">No mailboxes connected yet.</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                        Choose <strong>Connect Gmail</strong> to link a mailbox. You'll be sent to Google to grant read access, then returned here.
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
                                                <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                                    <Mail className="h-4 w-4" aria-hidden />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-medium truncate">{account.email_address}</p>
                                                        <Badge variant="neutral" className="text-[10px] h-4 px-1.5 uppercase">{account.provider}</Badge>
                                                        {account.has_refresh_token ? (
                                                            <Badge variant="success" className="text-[10px] h-4 px-1.5 gap-1">
                                                                <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />
                                                                Connected
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="warning" className="text-[10px] h-4 px-1.5 gap-1">
                                                                <AlertTriangle className="h-2.5 w-2.5" aria-hidden />
                                                                Reconnect needed
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        {account.rule_count} rule{account.rule_count !== 1 ? 's' : ''}
                                                        {account.last_polled_at && ` · last checked ${format(new Date(account.last_polled_at), 'dd MMM HH:mm')}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                                                    onClick={() => handleCheckNow(account)}
                                                    disabled={checking === account.id}
                                                    aria-label={`Check ${account.email_address} for new email now`}
                                                >
                                                    {checking === account.id
                                                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                                                        : <RefreshCw className="h-3 w-3" aria-hidden />}
                                                    Check now
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost" size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            aria-label={`Disconnect ${account.email_address}`}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Disconnect {account.email_address}?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                We'll stop checking this mailbox for new broker email. Requests already created from it stay exactly as they are. You can reconnect it later.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDisconnect(account)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Disconnect
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                    <Link to="/studio/inbound" className="block">
                                        <div className="mt-2 px-3 py-2 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-muted/20 transition-colors flex items-center justify-between text-xs text-muted-foreground hover:text-foreground">
                                            <span>Set up email rules and view received email</span>
                                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                        </div>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </PageShell>
    );
}

/**
 * The one real, persisted appearance control. Wired to next-themes so it both
 * changes the theme immediately and reflects the current choice.
 */
function ThemePreference() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const current = mounted ? (theme ?? 'system') : 'system';

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
                <Label htmlFor="theme-select" className="text-sm font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">
                    Choose light, dark, or match your device.
                </p>
            </div>
            <Select value={current} onValueChange={setTheme}>
                <SelectTrigger id="theme-select" aria-label="Interface theme" className="w-40">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="light">
                        <span className="flex items-center gap-2"><Sun className="h-3.5 w-3.5" aria-hidden /> Light</span>
                    </SelectItem>
                    <SelectItem value="dark">
                        <span className="flex items-center gap-2"><Moon className="h-3.5 w-3.5" aria-hidden /> Dark</span>
                    </SelectItem>
                    <SelectItem value="system">
                        <span className="flex items-center gap-2"><Monitor className="h-3.5 w-3.5" aria-hidden /> Match system</span>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
