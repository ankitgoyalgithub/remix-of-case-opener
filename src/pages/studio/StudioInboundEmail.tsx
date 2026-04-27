import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Mail, Plus, Trash2, RefreshCw, Loader2, AlertTriangle, CheckCircle2,
    Inbox, Settings as SettingsIcon, ExternalLink, FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INBOUND_POLL_EVENT } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface EmailAccount {
    id: string;
    provider: string;
    label: string;
    email_address: string;
    enabled: boolean;
    last_polled_at: string | null;
    has_refresh_token: boolean;
    rule_count: number;
    notes: string;
}

interface IngestionRule {
    id: string;
    account: string;
    name: string;
    priority: number;
    sender_domains: string[];
    sender_addresses: string[];
    subject_keywords: string[];
    require_attachment: boolean;
    allowed_attachment_extensions: string[];
    default_priority: 'normal' | 'urgent';
    enabled: boolean;
}

interface IncomingEmail {
    id: string;
    account: string;
    from_address: string;
    from_name: string;
    subject: string;
    snippet: string;
    received_at: string | null;
    status: string;
    matched_rule_name: string | null;
    request_smart_id: string | null;
    attachment_count: number;
    error: string;
    created_at: string;
}

const STATUS_TONE: Record<string, string> = {
    matched: 'bg-success/10 text-success border-success/30',
    skipped: 'bg-muted text-muted-foreground border-border',
    pending: 'bg-info/10 text-info border-info/30',
    failed: 'bg-destructive/10 text-destructive border-destructive/30',
    duplicate: 'bg-muted text-muted-foreground border-border',
};

export default function StudioInboundEmail() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [accounts, setAccounts] = useState<EmailAccount[]>([]);
    const [rules, setRules] = useState<IngestionRule[]>([]);
    const [emails, setEmails] = useState<IncomingEmail[]>([]);
    const [polling, setPolling] = useState<string | null>(null);
    const [showRuleDialog, setShowRuleDialog] = useState<{ accountId: string; rule: IngestionRule | null } | null>(null);

    const refresh = async () => {
        try {
            setLoading(true);
            const [a, r, e] = await Promise.all([
                api.inboundEmail.accounts.list(),
                api.inboundEmail.rules.list(),
                api.inboundEmail.emails.list(),
            ]);
            setAccounts(a);
            setRules(r);
            setEmails(e);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load inbound email config');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    // Auto-refresh after every background poll so new emails appear in the feed.
    useEffect(() => {
        const onPolled = () => refresh();
        window.addEventListener(INBOUND_POLL_EVENT, onPolled);
        return () => window.removeEventListener(INBOUND_POLL_EVENT, onPolled);
    }, []);

    // Surface OAuth callback messages from query params
    useEffect(() => {
        const status = searchParams.get('inbound_email_status');
        const detail = searchParams.get('inbound_email_detail');
        if (status === 'ok') {
            toast.success(detail || 'Mailbox connected');
            // strip query params so we don't re-toast on reload
            setSearchParams({}, { replace: true });
            refresh();
        } else if (status === 'error') {
            toast.error(detail || 'Connection failed');
            setSearchParams({}, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const handleConnect = () => {
        api.inboundEmail.startOAuth();
    };

    const togglePoll = async (account: EmailAccount) => {
        setPolling(account.id);
        try {
            const res = await api.inboundEmail.accounts.poll(account.id);
            toast.success(`Polled ${account.email_address}`, {
                description: `${res.fetched ?? 0} fetched · ${res.matched ?? 0} matched · ${res.skipped ?? 0} skipped`,
            });
            await refresh();
        } catch (err: any) {
            toast.error(err?.message || 'Poll failed');
        } finally {
            setPolling(null);
        }
    };

    const toggleEnabled = async (account: EmailAccount) => {
        const next = !account.enabled;
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, enabled: next } : a));
        try {
            await api.inboundEmail.accounts.update(account.id, { enabled: next });
        } catch {
            setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, enabled: !next } : a));
            toast.error('Failed to update');
        }
    };

    const deleteAccount = async (account: EmailAccount) => {
        if (!window.confirm(`Disconnect ${account.email_address}? This deletes the stored token and all ingestion rules.`)) return;
        try {
            await api.inboundEmail.accounts.delete(account.id);
            toast.success('Disconnected');
            refresh();
        } catch {
            toast.error('Disconnect failed');
        }
    };

    const deleteRule = async (rule: IngestionRule) => {
        if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
        try {
            await api.inboundEmail.rules.delete(rule.id);
            toast.success('Rule deleted');
            refresh();
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-info/5 p-6">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                            <Mail className="h-3 w-3" />
                            Inbound email
                        </div>
                        <h1 className="text-3xl font-semibold text-foreground mt-2 tracking-tight">Email-driven submissions</h1>
                        <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                            Connect a Gmail mailbox. Brokers send submissions there with attachments; matching emails turn into requests automatically. Documents go into the existing extraction pipeline.
                        </p>
                    </div>
                    <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20 shrink-0" onClick={handleConnect}>
                        <Plus className="h-3.5 w-3.5" />
                        Connect Gmail
                    </Button>
                </div>
            </div>

            {/* Accounts */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : accounts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/15 to-info/10 flex items-center justify-center mx-auto mb-3 text-primary">
                            <Mail className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium">No mailboxes connected yet.</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            Click <strong>Connect Gmail</strong> to authorize a mailbox. You'll be sent to Google to grant read access, then bounced back here with the connection ready.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {accounts.map(account => {
                        const accountRules = rules.filter(r => r.account === account.id).sort((a, b) => a.priority - b.priority);
                        return (
                            <Card key={account.id} className={cn(!account.enabled && 'opacity-60')}>
                                <CardHeader className="pb-3 flex flex-row items-start gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/15 to-info/10 text-primary flex items-center justify-center shrink-0">
                                        <Inbox className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CardTitle className="text-sm font-semibold">{account.email_address}</CardTitle>
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
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {account.last_polled_at
                                                ? `Last polled ${format(new Date(account.last_polled_at), 'dd MMM HH:mm:ss')}`
                                                : 'Never polled yet'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="flex items-center gap-1.5">
                                            <Switch checked={account.enabled} onCheckedChange={() => toggleEnabled(account)} className="scale-90" />
                                            <span className="text-xs text-muted-foreground">{account.enabled ? 'Enabled' : 'Disabled'}</span>
                                        </div>
                                        <Button
                                            size="sm" variant="outline" className="h-8 gap-1.5"
                                            onClick={() => togglePoll(account)}
                                            disabled={polling === account.id}
                                        >
                                            {polling === account.id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <RefreshCw className="h-3.5 w-3.5" />}
                                            Poll now
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteAccount(account)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            Ingestion rules ({accountRules.length})
                                        </p>
                                        <Button
                                            size="sm" variant="outline" className="h-7 gap-1.5 text-xs"
                                            onClick={() => setShowRuleDialog({ accountId: account.id, rule: null })}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Add rule
                                        </Button>
                                    </div>
                                    {accountRules.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-2">
                                            No rules — emails will be skipped. Add one to start ingesting.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                                            {accountRules.map(rule => (
                                                <div
                                                    key={rule.id}
                                                    className={cn(
                                                        'rounded-md border border-border bg-muted/10 hover:bg-muted/30 transition-colors p-3',
                                                        !rule.enabled && 'opacity-60',
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <SettingsIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <p className="text-sm font-medium truncate">{rule.name}</p>
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">P{rule.priority}</Badge>
                                                            {rule.default_priority === 'urgent' && (
                                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-destructive/10 text-destructive border-destructive/30 shrink-0">Urgent</Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setShowRuleDialog({ accountId: account.id, rule })}>
                                                                Edit
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteRule(rule)}>
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                                                        {rule.sender_domains.length > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5">@{rule.sender_domains.join(', @')}</Badge>}
                                                        {rule.sender_addresses.length > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5">from: {rule.sender_addresses.join(', ')}</Badge>}
                                                        {rule.subject_keywords.length > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5">subject: {rule.subject_keywords.join(' | ')}</Badge>}
                                                        {rule.require_attachment && <Badge variant="outline" className="text-[10px] h-4 px-1.5">has attachment</Badge>}
                                                        {rule.allowed_attachment_extensions.length > 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{rule.allowed_attachment_extensions.join('/')}</Badge>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Recent emails feed */}
            {accounts.length > 0 && (
                <RecentEmailsFeed emails={emails} />
            )}

            {/* Rule editor dialog */}
            <RuleDialog
                open={showRuleDialog !== null}
                accountId={showRuleDialog?.accountId || ''}
                rule={showRuleDialog?.rule || null}
                onClose={() => setShowRuleDialog(null)}
                onSaved={refresh}
            />
        </div>
    );
}

function RecentEmailsFeed({ emails }: { emails: IncomingEmail[] }) {
    const [filter, setFilter] = useState<'all' | 'matched' | 'skipped' | 'failed'>('all');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const counts = {
        all: emails.length,
        matched: emails.filter(e => e.status === 'matched').length,
        skipped: emails.filter(e => e.status === 'skipped').length,
        failed: emails.filter(e => e.status === 'failed').length,
    };
    const filtered = filter === 'all' ? emails : emails.filter(e => e.status === filter);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Recent emails
                        <Badge variant="outline" className="text-[10px] ml-1">{emails.length}</Badge>
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        {([
                            { key: 'all' as const, label: 'All', tone: '' },
                            { key: 'matched' as const, label: 'Matched', tone: 'text-success' },
                            { key: 'skipped' as const, label: 'Skipped', tone: 'text-muted-foreground' },
                            { key: 'failed' as const, label: 'Failed', tone: 'text-destructive' },
                        ]).map(b => (
                            <button
                                key={b.key}
                                onClick={() => setFilter(b.key)}
                                className={cn(
                                    'h-7 px-2.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5',
                                    filter === b.key
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                                )}
                            >
                                <span className={b.tone}>{b.label}</span>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{counts[b.key]}</Badge>
                            </button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-3">
                        {emails.length === 0
                            ? 'No emails ingested yet. Trigger a poll on a connected mailbox.'
                            : `No ${filter} emails.`}
                    </p>
                ) : (
                    <div className="space-y-1.5">
                        {filtered.map(em => {
                            const isOpen = !!expanded[em.id];
                            const reasons = (em.error || '').split(' | ').filter(Boolean);
                            return (
                                <div
                                    key={em.id}
                                    className={cn(
                                        'rounded-md border bg-muted/10 transition-colors',
                                        em.status === 'matched' && 'border-success/30',
                                        em.status === 'failed' && 'border-destructive/30 bg-destructive/5',
                                        em.status === 'skipped' && 'border-border',
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(s => ({ ...s, [em.id]: !s[em.id] }))}
                                        className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-muted/20 transition-colors"
                                    >
                                        <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 shrink-0 mt-0.5', STATUS_TONE[em.status] || '')}>
                                            {em.status}
                                        </Badge>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-medium truncate">{em.subject || '(no subject)'}</p>
                                                {em.attachment_count > 0 && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                                        {em.attachment_count} att.
                                                    </Badge>
                                                )}
                                                {em.matched_rule_name && (
                                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/30">
                                                        rule: {em.matched_rule_name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                                                from {em.from_name ? `${em.from_name} <${em.from_address}>` : em.from_address}
                                                {em.received_at && ` · ${format(new Date(em.received_at), 'dd MMM HH:mm')}`}
                                            </p>
                                        </div>
                                        {em.request_smart_id && em.created_request && (
                                            <Link to={`/request/${em.created_request}`} className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1">
                                                    {em.request_smart_id}
                                                    <ExternalLink className="h-3 w-3" />
                                                </Button>
                                            </Link>
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2 text-xs">
                                            {em.snippet && (
                                                <div>
                                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
                                                    <p className="text-foreground/80 whitespace-pre-line line-clamp-3">{em.snippet}</p>
                                                </div>
                                            )}
                                            {(em.status === 'skipped' || em.status === 'failed') && reasons.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1">
                                                        Why it was {em.status}
                                                    </p>
                                                    <ul className="space-y-1">
                                                        {reasons.map((r, i) => (
                                                            <li key={i} className="flex items-start gap-2">
                                                                <span className="text-destructive mt-0.5">•</span>
                                                                <span className="text-foreground/90 break-words">{r}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            <div className="text-[10px] text-muted-foreground">
                                                Message ID: <code>{em.provider_message_id}</code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RuleDialog({ open, accountId, rule, onClose, onSaved }: {
    open: boolean; accountId: string; rule: IngestionRule | null;
    onClose: () => void; onSaved: () => void;
}) {
    const isEdit = !!rule;
    const [form, setForm] = useState({
        name: '', priority: 100,
        sender_domains: '', sender_addresses: '',
        subject_keywords: '', allowed_attachment_extensions: '',
        require_attachment: true, default_priority: 'normal' as 'normal' | 'urgent',
        enabled: true,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (rule) {
            setForm({
                name: rule.name, priority: rule.priority,
                sender_domains: rule.sender_domains.join(', '),
                sender_addresses: rule.sender_addresses.join(', '),
                subject_keywords: rule.subject_keywords.join(', '),
                allowed_attachment_extensions: rule.allowed_attachment_extensions.join(', '),
                require_attachment: rule.require_attachment,
                default_priority: rule.default_priority,
                enabled: rule.enabled,
            });
        } else {
            setForm({
                name: '', priority: 100,
                sender_domains: '', sender_addresses: '',
                subject_keywords: 'submission, request, quote, new application, renewal',
                allowed_attachment_extensions: 'pdf, jpg, png',
                require_attachment: true, default_priority: 'normal',
                enabled: true,
            });
        }
    }, [rule, open]);

    const splitCsv = (s: string) =>
        s.split(',').map(x => x.trim()).filter(Boolean);

    const save = async () => {
        if (!form.name.trim()) { toast.error('Rule name required'); return; }
        setSaving(true);
        try {
            const payload = {
                account: accountId,
                name: form.name,
                priority: form.priority,
                sender_domains: splitCsv(form.sender_domains),
                sender_addresses: splitCsv(form.sender_addresses),
                subject_keywords: splitCsv(form.subject_keywords),
                allowed_attachment_extensions: splitCsv(form.allowed_attachment_extensions),
                require_attachment: form.require_attachment,
                default_priority: form.default_priority,
                enabled: form.enabled,
            };
            if (isEdit && rule) await api.inboundEmail.rules.update(rule.id, payload);
            else await api.inboundEmail.rules.create(payload);
            toast.success(isEdit ? 'Rule updated' : 'Rule created');
            onSaved();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit ingestion rule' : 'Add ingestion rule'}</DialogTitle>
                    <DialogDescription>
                        Comma-separate multiple values. All non-empty conditions are AND'd together.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="grid grid-cols-[1fr_120px] gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Gulf brokers — submissions" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Priority</Label>
                            <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value || '100') })} />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Sender domains</Label>
                        <Input value={form.sender_domains} onChange={(e) => setForm({ ...form, sender_domains: e.target.value })} placeholder="gulfbrokers.com, broker-co.com" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Sender addresses (exact)</Label>
                        <Input value={form.sender_addresses} onChange={(e) => setForm({ ...form, sender_addresses: e.target.value })} placeholder="ops@gulfbrokers.com" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Subject keywords (any-of, case-insensitive)</Label>
                        <Input value={form.subject_keywords} onChange={(e) => setForm({ ...form, subject_keywords: e.target.value })} placeholder="submission, quote, renewal" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Allowed attachment extensions (empty = any)</Label>
                        <Input value={form.allowed_attachment_extensions} onChange={(e) => setForm({ ...form, allowed_attachment_extensions: e.target.value })} placeholder="pdf, jpg, png" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                            <Switch checked={form.require_attachment} onCheckedChange={(v) => setForm({ ...form, require_attachment: v })} />
                            <span className="text-xs text-muted-foreground">Require attachment</span>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Default request priority</Label>
                            <Select value={form.default_priority} onValueChange={(v) => setForm({ ...form, default_priority: v as 'normal' | 'urgent' })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                        <span className="text-xs text-muted-foreground">Enabled</span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />} {isEdit ? 'Save' : 'Create'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
