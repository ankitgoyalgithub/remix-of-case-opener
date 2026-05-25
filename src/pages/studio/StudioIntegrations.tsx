import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Plug, Plus, Key, Trash2, Zap, Loader2, AlertTriangle, CheckCircle2, ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageShell';

interface Credential {
    id: string;
    name: string;
    description: string;
    has_secret: boolean;
}

interface Capability {
    id: string;
    key: string;
    display_name: string;
    description: string;
    http_method: string;
    path: string;
    enabled: boolean;
    provider: string;
}

interface Provider {
    id: string;
    vendor_key: string;
    name: string;
    base_url: string;
    auth_type: string;
    auth_header_name: string;
    credential: string | null;
    credential_name: string | null;
    default_timeout_seconds: number;
    enabled: boolean;
    notes: string;
    capabilities: Capability[];
}

const AUTH_LABELS: Record<string, string> = {
    none: 'No auth',
    bearer: 'Bearer token',
    api_key_header: 'API key (header)',
    api_key_query: 'API key (query)',
    basic: 'HTTP Basic',
};

export default function StudioIntegrations() {
    const [loading, setLoading] = useState(true);
    const [providers, setProviders] = useState<Provider[]>([]);
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [showProviderDialog, setShowProviderDialog] = useState<Provider | 'new' | null>(null);
    const [showCredDialog, setShowCredDialog] = useState<Credential | 'new' | null>(null);
    const [showCapabilityDialog, setShowCapabilityDialog] = useState<{ provider: Provider; capability: Capability | null } | null>(null);

    const refresh = async () => {
        try {
            setLoading(true);
            const [p, c] = await Promise.all([
                api.integrations.providers.list(),
                api.integrations.credentials.list(),
            ]);
            setProviders(p);
            setCredentials(c);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load integrations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const toggleProvider = async (provider: Provider) => {
        const next = !provider.enabled;
        setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, enabled: next } : p));
        try {
            await api.integrations.providers.update(provider.id, { enabled: next });
        } catch {
            setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, enabled: !next } : p));
            toast.error('Failed to update provider');
        }
    };

    const deleteProvider = async (provider: Provider) => {
        if (!window.confirm(`Delete provider "${provider.name}"? Its capabilities go too.`)) return;
        try {
            await api.integrations.providers.delete(provider.id);
            toast.success('Provider deleted');
            refresh();
        } catch {
            toast.error('Failed to delete provider');
        }
    };

    const deleteCredential = async (cred: Credential) => {
        if (!window.confirm(`Delete credential "${cred.name}"?`)) return;
        try {
            await api.integrations.credentials.delete(cred.id);
            toast.success('Credential deleted');
            refresh();
        } catch {
            toast.error('Failed to delete — it may be in use');
        }
    };

    const deleteCapability = async (cap: Capability) => {
        if (!window.confirm(`Delete capability "${cap.display_name}"?`)) return;
        try {
            await api.integrations.capabilities.delete(cap.id);
            toast.success('Capability deleted');
            refresh();
        } catch {
            toast.error('Failed to delete capability');
        }
    };

    return (
        <>
            <PageHeader
                eyebrow="Studio · Integrations"
                title="External API providers"
                description="Wire aggregators (Karza, Signzy, IDfy…) in once. Agents pick them up as tools automatically when referenced by a checklist item."
                actions={
                    <>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCredDialog('new')}>
                            <Key className="h-3.5 w-3.5" />
                            Add credential
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={() => setShowProviderDialog('new')}>
                            <Plus className="h-3.5 w-3.5" />
                            Add provider
                        </Button>
                    </>
                }
            />

            {/* Credentials panel */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Key className="h-4 w-4 text-warning" />
                        Credentials
                        <Badge variant="outline" className="text-[10px]">{credentials.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {credentials.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            No credentials yet. Add one before configuring a provider.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {credentials.map(cred => (
                                <div key={cred.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border bg-muted/10">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-warning/20 to-warning/5 text-warning flex items-center justify-center shrink-0">
                                            <Key className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{cred.name}</p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {cred.has_secret ? 'Secret set' : 'No secret'} {cred.description && `· ${cred.description}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCredDialog(cred)}>
                                            Edit
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCredential(cred)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Providers */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : providers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center mx-auto mb-3 text-warning">
                            <Plug className="h-5 w-5" />
                        </div>
                        <p className="text-sm font-medium">No providers configured yet.</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                            Add a credential, then a provider (e.g. Karza), then register one or more capabilities (e.g. <code className="text-[11px]">karza.gstin_verify</code>).
                        </p>
                        <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowProviderDialog('new')}>
                            <Plus className="h-3.5 w-3.5" />
                            Add first provider
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {providers.map(provider => (
                        <Card key={provider.id} className={cn('overflow-hidden', !provider.enabled && 'opacity-60')}>
                            <div className="p-4 flex items-start justify-between gap-3 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/15 to-info/10 text-primary flex items-center justify-center shrink-0">
                                        <Plug className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-sm font-semibold">{provider.name}</p>
                                            {provider.vendor_key && (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{provider.vendor_key}</Badge>
                                            )}
                                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">{AUTH_LABELS[provider.auth_type] || provider.auth_type}</Badge>
                                            {provider.credential_name ? (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-success/10 text-success border-success/30 gap-1">
                                                    <ShieldCheck className="h-2.5 w-2.5" />
                                                    {provider.credential_name}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-warning/10 text-warning border-warning/30 gap-1">
                                                    <AlertTriangle className="h-2.5 w-2.5" />
                                                    No credential
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono mt-1">{provider.base_url}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <Switch checked={provider.enabled} onCheckedChange={() => toggleProvider(provider)} className="scale-90" />
                                        <span className="text-xs text-muted-foreground">{provider.enabled ? 'Enabled' : 'Disabled'}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowProviderDialog(provider)}>Edit</Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteProvider(provider)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            {/* Capabilities */}
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Capabilities ({provider.capabilities.length})
                                    </p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1.5 text-xs"
                                        onClick={() => setShowCapabilityDialog({ provider, capability: null })}
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add capability
                                    </Button>
                                </div>
                                {provider.capabilities.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic py-2">
                                        No capabilities registered yet. Add one to let checklist items invoke this provider.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {provider.capabilities.map(cap => (
                                            <div
                                                key={cap.id}
                                                className={cn(
                                                    'flex items-start gap-2 px-3 py-2 rounded-md border border-border bg-muted/10 hover:bg-muted/30 transition-colors',
                                                    !cap.enabled && 'opacity-60',
                                                )}
                                            >
                                                <div className="h-7 w-7 rounded-md bg-gradient-to-br from-success/20 to-success/5 text-success flex items-center justify-center shrink-0 mt-0.5">
                                                    <Zap className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{cap.display_name}</p>
                                                    <p className="text-[11px] text-muted-foreground font-mono truncate">{cap.key}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        <span className="font-mono">{cap.http_method}</span> {cap.path}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={() => setShowCapabilityDialog({ provider, capability: cap })}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteCapability(cap)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* How to wire note */}
            <Card className="bg-muted/20 border-dashed">
                <CardContent className="py-4 flex items-start gap-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Using a capability in a checklist item</p>
                        <p className="mt-0.5">
                            Set handler to <code className="px-1 py-0.5 rounded bg-background border text-[11px]">external_api_verification</code> and config_payload to <code className="px-1 py-0.5 rounded bg-background border text-[11px]">{'{'} capability_key, input_mapping, pass_condition {'}'}</code>.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <ProviderDialog
                open={showProviderDialog !== null}
                provider={showProviderDialog === 'new' ? null : (showProviderDialog as Provider | null)}
                credentials={credentials}
                onClose={() => setShowProviderDialog(null)}
                onSaved={refresh}
            />
            <CredentialDialog
                open={showCredDialog !== null}
                credential={showCredDialog === 'new' ? null : (showCredDialog as Credential | null)}
                onClose={() => setShowCredDialog(null)}
                onSaved={refresh}
            />
            <CapabilityDialog
                open={showCapabilityDialog !== null}
                provider={showCapabilityDialog?.provider || null}
                capability={showCapabilityDialog?.capability || null}
                onClose={() => setShowCapabilityDialog(null)}
                onSaved={refresh}
            />
        </>
    );
}

function ProviderDialog({ open, provider, credentials, onClose, onSaved }: {
    open: boolean; provider: Provider | null; credentials: Credential[];
    onClose: () => void; onSaved: () => void;
}) {
    const isEdit = !!provider;
    const [form, setForm] = useState({
        name: '', vendor_key: '', base_url: 'https://', auth_type: 'bearer',
        auth_header_name: '', credential: '' as string, default_timeout_seconds: 15,
        enabled: true, notes: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (provider) {
            setForm({
                name: provider.name, vendor_key: provider.vendor_key,
                base_url: provider.base_url, auth_type: provider.auth_type,
                auth_header_name: provider.auth_header_name,
                credential: provider.credential || '',
                default_timeout_seconds: provider.default_timeout_seconds,
                enabled: provider.enabled, notes: provider.notes,
            });
        } else {
            setForm({
                name: '', vendor_key: '', base_url: 'https://', auth_type: 'bearer',
                auth_header_name: '', credential: '', default_timeout_seconds: 15,
                enabled: true, notes: '',
            });
        }
    }, [provider, open]);

    const save = async () => {
        if (!form.name.trim() || !form.base_url.trim()) {
            toast.error('Name and base URL are required');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, credential: form.credential || null };
            if (isEdit && provider) await api.integrations.providers.update(provider.id, payload);
            else await api.integrations.providers.create(payload);
            toast.success(isEdit ? 'Provider updated' : 'Provider created');
            onSaved();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit provider' : 'Add provider'}</DialogTitle>
                    <DialogDescription>Configure an external API vendor.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Name</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Karza Primary" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Vendor key <span className="text-muted-foreground/60">(optional)</span></Label>
                            <Input value={form.vendor_key} onChange={(e) => setForm({ ...form, vendor_key: e.target.value })} placeholder="karza" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Base URL</Label>
                        <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.karza.in/v3" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Auth type</Label>
                            <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(AUTH_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Credential</Label>
                            <Select value={form.credential || 'none'} onValueChange={(v) => setForm({ ...form, credential: v === 'none' ? '' : v })}>
                                <SelectTrigger><SelectValue placeholder="— none —" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">— none —</SelectItem>
                                    {credentials.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {(form.auth_type === 'api_key_header' || form.auth_type === 'api_key_query') && (
                        <div className="space-y-1.5">
                            <Label className="text-xs">{form.auth_type === 'api_key_header' ? 'Header name' : 'Query param name'}</Label>
                            <Input value={form.auth_header_name} onChange={(e) => setForm({ ...form, auth_header_name: e.target.value })} placeholder={form.auth_type === 'api_key_header' ? 'x-karza-key' : 'api_key'} />
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 items-end">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Timeout (seconds)</Label>
                            <Input type="number" value={form.default_timeout_seconds} onChange={(e) => setForm({ ...form, default_timeout_seconds: parseInt(e.target.value || '0') })} />
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                            <span className="text-xs text-muted-foreground">Enabled</span>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Notes</Label>
                        <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any context or caveats…" className="resize-none" />
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

function CredentialDialog({ open, credential, onClose, onSaved }: {
    open: boolean; credential: Credential | null; onClose: () => void; onSaved: () => void;
}) {
    const isEdit = !!credential;
    const [form, setForm] = useState({ name: '', description: '', secret_value: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (credential) setForm({ name: credential.name, description: credential.description, secret_value: '' });
        else setForm({ name: '', description: '', secret_value: '' });
    }, [credential, open]);

    const save = async () => {
        if (!form.name.trim()) { toast.error('Name required'); return; }
        setSaving(true);
        try {
            const payload: any = { name: form.name, description: form.description };
            if (form.secret_value) payload.secret_value = form.secret_value;
            if (isEdit && credential) await api.integrations.credentials.update(credential.id, payload);
            else await api.integrations.credentials.create(payload);
            toast.success(isEdit ? 'Credential updated' : 'Credential created');
            onSaved();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit credential' : 'Add credential'}</DialogTitle>
                    <DialogDescription>API key / bearer token / shared secret. Stored write-only — never displayed back.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs">Name</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="karza-primary" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Description <span className="text-muted-foreground/60">(optional)</span></Label>
                        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Production key, rotated quarterly" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Secret value {isEdit && <span className="text-muted-foreground/60">(leave blank to keep existing)</span>}</Label>
                        <Input type="password" value={form.secret_value} onChange={(e) => setForm({ ...form, secret_value: e.target.value })} placeholder="••••••••" />
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

function CapabilityDialog({ open, provider, capability, onClose, onSaved }: {
    open: boolean; provider: Provider | null; capability: Capability | null; onClose: () => void; onSaved: () => void;
}) {
    const isEdit = !!capability;
    const [form, setForm] = useState({
        key: '', display_name: '', description: '', http_method: 'POST', path: '',
        input_schema: '{}', output_mapping: '{}', passed_when: '{}', cost_hint: '', enabled: true,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (capability) {
            setForm({
                key: capability.key, display_name: capability.display_name,
                description: capability.description, http_method: capability.http_method,
                path: capability.path, cost_hint: '', enabled: capability.enabled,
                input_schema: JSON.stringify((capability as any).input_schema || {}, null, 2),
                output_mapping: JSON.stringify((capability as any).output_mapping || {}, null, 2),
                passed_when: JSON.stringify((capability as any).passed_when || {}, null, 2),
            });
        } else {
            setForm({
                key: '', display_name: '', description: '', http_method: 'POST', path: '',
                input_schema: '{}', output_mapping: '{}', passed_when: '{}', cost_hint: '', enabled: true,
            });
        }
    }, [capability, open]);

    const save = async () => {
        if (!provider) return;
        if (!form.key.trim() || !form.display_name.trim()) { toast.error('Key and name required'); return; }
        let input_schema: any, output_mapping: any, passed_when: any;
        try {
            input_schema = JSON.parse(form.input_schema || '{}');
            output_mapping = JSON.parse(form.output_mapping || '{}');
            passed_when = JSON.parse(form.passed_when || '{}');
        } catch {
            toast.error('One of the JSON fields is invalid');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                provider: provider.id,
                key: form.key, display_name: form.display_name, description: form.description,
                http_method: form.http_method, path: form.path,
                input_schema, output_mapping, passed_when,
                cost_hint: form.cost_hint, enabled: form.enabled,
            };
            if (isEdit && capability) await api.integrations.capabilities.update(capability.id, payload);
            else await api.integrations.capabilities.create(payload);
            toast.success(isEdit ? 'Capability updated' : 'Capability created');
            onSaved();
            onClose();
        } catch (e: any) {
            toast.error(e?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit capability' : 'Add capability'}</DialogTitle>
                    <DialogDescription>
                        {provider && <>Under <strong>{provider.name}</strong>. </>}
                        The <code className="text-[11px]">key</code> is the stable identifier you'll reference from checklist items.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Key</Label>
                            <Input value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="karza.gstin_verify" className="font-mono text-sm" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Display name</Label>
                            <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="GSTIN verification" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs">Description</Label>
                        <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="resize-none text-sm" />
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Method</Label>
                            <Select value={form.http_method} onValueChange={(v) => setForm({ ...form, http_method: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Path <span className="text-muted-foreground/60">(relative, supports <code className="text-[10px]">{'{placeholder}'}</code>)</span></Label>
                            <Input value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} placeholder="/gstin/{gstin}" className="font-mono text-sm" />
                        </div>
                    </div>
                    <details className="border border-border rounded-md">
                        <summary className="px-3 py-2 cursor-pointer text-xs font-medium text-muted-foreground">Advanced: input schema / output mapping / pass condition</summary>
                        <div className="p-3 space-y-2 border-t border-border">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Input schema (JSON)</Label>
                                <Textarea rows={3} value={form.input_schema} onChange={(e) => setForm({ ...form, input_schema: e.target.value })} className="font-mono text-xs resize-none" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Output mapping (JSON) <span className="text-muted-foreground/60">{'{ "verdict": "data.status" }'}</span></Label>
                                <Textarea rows={3} value={form.output_mapping} onChange={(e) => setForm({ ...form, output_mapping: e.target.value })} className="font-mono text-xs resize-none" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Pass condition (JSON) <span className="text-muted-foreground/60">{'{ "status": "ACTIVE" }'}</span></Label>
                                <Textarea rows={2} value={form.passed_when} onChange={(e) => setForm({ ...form, passed_when: e.target.value })} className="font-mono text-xs resize-none" />
                            </div>
                        </div>
                    </details>
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
