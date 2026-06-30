import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileSpreadsheet, Plus, Trash2, Pencil, RotateCcw, Loader2, Star, ChevronRight,
  Upload, Power, CircleDot,
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Types (mirror workflow/rulebook_api.py serializers) ──────────────────────
interface Rulebook {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
  field_rule_count?: number;
  conditional_rule_count?: number;
}
interface FieldRule {
  id: number;
  rulebook: number;
  action_type: string;
  canonical: string;
  label: string;
  klass: string;
  headers: string[];
  enum_values: string[];
  enum_strict: boolean;
  multi: boolean;
  fmt: string;
  position: number;
  note: string;
  is_active: boolean;
}
interface ConditionalRule {
  id: number;
  rulebook: number;
  rule_key: string;
  label: string;
  enabled: boolean;
  severity: string;
}
interface RulebookDetail extends Rulebook {
  field_rules: FieldRule[];
  conditional_rules: ConditionalRule[];
}
interface Option { value: string; label: string; }
interface Metadata {
  action_types: Option[];
  klasses: Option[];
  formats: Option[];
  conditional_rules: { rule_key: string; label: string }[];
}

const KLASS_STYLE: Record<string, string> = {
  REQUIRED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  ENUM: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  FORMAT: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  OPTIONAL: 'bg-muted text-muted-foreground border-border',
};

const parseList = (s: string): string[] =>
  s.split(/[\n,]/).map(x => x.trim()).filter(Boolean);

const emptyDraft = (actionType: string): Partial<FieldRule> => ({
  action_type: actionType, canonical: '', label: '', klass: 'OPTIONAL',
  headers: [], enum_values: [], enum_strict: true, multi: false, fmt: '', position: 0, note: '',
});

export default function CensusRulebooks() {
  const [rulebooks, setRulebooks] = useState<Rulebook[]>([]);
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<RulebookDetail | null>(null);
  const [actionType, setActionType] = useState<string>('INCEPTION');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [newBook, setNewBook] = useState({ name: '', slug: '', description: '', is_default: false });
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FieldRule | null>(null);   // null = creating
  const [draft, setDraft] = useState<Partial<FieldRule>>(emptyDraft('INCEPTION'));
  const [headersText, setHeadersText] = useState('');
  const [enumText, setEnumText] = useState('');
  // upload-to-draft
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const [books, metadata] = await Promise.all([
        api.workflow.census.rulebooks.list(),
        api.workflow.census.metadata(),
      ]);
      setRulebooks(books);
      setMeta(metadata);
      setSelectedId(prev => prev ?? (books.find((b: Rulebook) => b.is_default)?.id ?? books[0]?.id ?? null));
    } catch {
      toast.error("We couldn't load your employee-list rules. Please refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    try {
      setDetailLoading(true);
      const d = await api.workflow.census.rulebooks.get(id);
      setDetail(d);
    } catch {
      toast.error("We couldn't load that rule set. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { if (selectedId != null) loadDetail(selectedId); }, [selectedId, loadDetail]);

  const refresh = async () => {
    if (selectedId != null) await loadDetail(selectedId);
    await loadList();
  };

  // ── Rulebook actions ───────────────────────────────────────────────────────
  const handleCreateBook = async () => {
    const slug = newBook.slug.trim() || newBook.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (!newBook.name.trim() || !slug) { toast.error('Name is required'); return; }
    try {
      const created = await api.workflow.census.rulebooks.create({ ...newBook, slug });
      toast.success(`Rule set '${created.name}' created`);
      setCreateOpen(false);
      setNewBook({ name: '', slug: '', description: '', is_default: false });
      setSelectedId(created.id);
      await loadList();
    } catch (e: any) {
      toast.error("We couldn't create that rule set. Please try again.");
      console.error(e);
    }
  };

  const handleDeleteBook = async (b: Rulebook) => {
    if (b.is_default) { toast.error('The default rule set cannot be deleted.'); return; }
    if (!confirm(`Delete the rule set "${b.name}" and all of its rules?`)) return;
    try {
      await api.workflow.census.rulebooks.delete(b.id);
      toast.success('Rule set deleted');
      setDetail(null);
      setSelectedId(null);
      await loadList();
    } catch {
      toast.error("We couldn't delete that rule set. Please try again.");
    }
  };

  const handleReset = async (b: Rulebook) => {
    if (!confirm(`Reset "${b.name}" to the built-in defaults? This will undo your manual edits to its column and cross-column rules.`)) return;
    try {
      await api.workflow.census.rulebooks.resetToDefaults(b.id);
      toast.success('Reset to the built-in defaults');
      await refresh();
    } catch {
      toast.error("We couldn't reset that rule set. Please try again.");
    }
  };

  // ── Upload a census file → draft a rulebook (created inactive for review) ────
  const handleCreateFromFile = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (newBook.name.trim()) fd.append('name', newBook.name.trim());
      if (newBook.slug.trim()) fd.append('slug', newBook.slug.trim());
      if (newBook.description.trim()) fd.append('description', newBook.description.trim());
      const created = await api.workflow.census.rulebooks.createFromFile(fd);
      const p = created.proposal || {};
      toast.success(
        `Draft “${created.name}” created from ${file.name} — ${p.mapped_columns ?? 0} matched, ${p.new_columns ?? 0} new columns. Review the columns, then turn it on.`,
      );
      setCreateOpen(false);
      setNewBook({ name: '', slug: '', description: '', is_default: false });
      setSelectedId(created.id);
      await loadList();
    } catch (e: any) {
      toast.error("We couldn't read that employee-list file. Check it's a spreadsheet (.xlsx or .csv) and try again.");
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Approval gate: activate / deactivate a rulebook for the validator ───────
  const handleToggleActive = async (b: Rulebook, active: boolean) => {
    try {
      await api.workflow.census.rulebooks.update(b.id, { is_active: active });
      toast.success(active
        ? 'Turned on — this rule set is now used to check employee lists'
        : 'Turned off — this rule set is no longer used');
      await refresh();
    } catch (e: any) {
      toast.error("We couldn't update that rule set. Please try again.");
      console.error(e);
    }
  };

  // ── Field-rule editing ─────────────────────────────────────────────────────
  const openCreateField = () => {
    setEditing(null);
    setDraft(emptyDraft(actionType));
    setHeadersText('');
    setEnumText('');
    setEditOpen(true);
  };

  const openEditField = (fr: FieldRule) => {
    setEditing(fr);
    setDraft({ ...fr });
    setHeadersText((fr.headers || []).join(', '));
    setEnumText((fr.enum_values || []).join(', '));
    setEditOpen(true);
  };

  const handleSaveField = async () => {
    if (!detail) return;
    const payload: any = {
      action_type: draft.action_type,
      canonical: (draft.canonical || '').trim(),
      label: (draft.label || '').trim() || draft.canonical,
      klass: draft.klass,
      headers: parseList(headersText),
      enum_values: parseList(enumText),
      enum_strict: !!draft.enum_strict,
      multi: !!draft.multi,
      fmt: draft.fmt || '',
      position: Number(draft.position) || 0,
      note: draft.note || '',
    };
    if (!payload.canonical) { toast.error('A field id is required'); return; }
    try {
      if (editing) {
        await api.workflow.census.fieldRules.update(editing.id, payload);
        toast.success(`Updated ${payload.canonical}`);
      } else {
        await api.workflow.census.fieldRules.create({ ...payload, rulebook: detail.id });
        toast.success(`Added ${payload.canonical}`);
      }
      setEditOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error("We couldn't save that column rule. Please try again.");
      console.error(e);
    }
  };

  const handleDeleteField = async (fr: FieldRule) => {
    if (!confirm(`Delete the column rule "${fr.label}" (${fr.canonical})?`)) return;
    try {
      await api.workflow.census.fieldRules.delete(fr.id);
      toast.success('Column rule deleted');
      await refresh();
    } catch {
      toast.error("We couldn't delete that column rule. Please try again.");
    }
  };

  // ── Conditional-rule toggles ───────────────────────────────────────────────
  const updateConditional = async (cr: ConditionalRule, patch: Partial<ConditionalRule>) => {
    // optimistic
    setDetail(d => d ? { ...d, conditional_rules: d.conditional_rules.map(c => c.id === cr.id ? { ...c, ...patch } : c) } : d);
    try {
      await api.workflow.census.conditionalRules.update(cr.id, patch);
    } catch {
      toast.error("We couldn't update that check. Please try again.");
      if (selectedId != null) loadDetail(selectedId);
    }
  };

  const actionTypes = meta?.action_types ?? [{ value: 'INCEPTION', label: 'Inception' }];
  const fieldRules = (detail?.field_rules ?? [])
    .filter(fr => fr.action_type === actionType)
    .sort((a, b) => a.position - b.position);

  if (loading) {
    return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Employee-list rules</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Set the rules an uploaded employee list (the people to be insured) is checked against — which spreadsheet
              columns map to each field, what's required, allowed values and formats, and checks that span columns.
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2 shrink-0">
          <Plus className="h-3.5 w-3.5" aria-hidden /> Add rule set
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Rulebook list */}
        <div className="space-y-2">
          {rulebooks.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-colors',
                selectedId === b.id ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                  {b.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />}
                  {b.name}
                </span>
                <ChevronRight className={cn('h-4 w-4 shrink-0', selectedId === b.id ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{b.slug}</code>
                {!b.is_active && <Badge variant="warning" className="text-[10px] h-4 px-1">off</Badge>}
                <span className="text-[10px] text-muted-foreground">{b.field_rule_count ?? 0} columns</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="min-w-0">
          {!detail || detailLoading ? (
            <div className="flex h-[300px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-5">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                        {detail.name}
                        {detail.is_default && <Badge variant="info" className="text-[10px] h-5">default</Badge>}
                        {detail.is_active
                          ? (!detail.is_default && <Badge variant="success" className="text-[10px] h-5 gap-1"><CircleDot className="h-2.5 w-2.5" aria-hidden />active</Badge>)
                          : <Badge variant="warning" className="text-[10px] h-5">draft · not in use</Badge>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{detail.description || 'No description'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {detail.is_active
                        ? (!detail.is_default && (
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleToggleActive(detail, false)}>
                              <Power className="h-3.5 w-3.5" aria-hidden /> Turn off
                            </Button>
                          ))
                        : (
                          <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleToggleActive(detail, true)}>
                            <Power className="h-3.5 w-3.5" aria-hidden /> Turn on (start using)
                          </Button>
                        )}
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => handleReset(detail)}>
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to defaults
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive disabled:opacity-30"
                        disabled={detail.is_default}
                        aria-label={detail.is_default ? 'The default rule set cannot be deleted' : `Delete rule set ${detail.name}`}
                        onClick={() => handleDeleteBook(detail)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                  {!detail.is_active && (
                    <div className="mt-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning leading-relaxed">
                      This is a <strong>draft</strong> — it isn't being used yet. Review the proposed columns below
                      (type, column-name matches, whether each is required), then choose <strong>Turn on</strong> to start using it.
                    </div>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Action-type tabs + column table */}
                  <Tabs value={actionType} onValueChange={setActionType}>
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <TabsList className="h-8">
                        {actionTypes.map(at => (
                          <TabsTrigger key={at.value} value={at.value} className="text-xs px-2.5 h-6">{at.label}</TabsTrigger>
                        ))}
                      </TabsList>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={openCreateField}>
                        <Plus className="h-3 w-3" aria-hidden /> Add column
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="text-xs">Column</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Column names it matches</TableHead>
                            <TableHead className="text-xs w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fieldRules.map(fr => (
                            <TableRow key={fr.id} className="group">
                              <TableCell className="align-top">
                                <div className="text-sm font-medium text-foreground">{fr.label}</div>
                                <code className="text-[10px] text-muted-foreground">{fr.canonical}</code>
                              </TableCell>
                              <TableCell className="align-top">
                                <Badge variant="outline" className={cn('text-[10px] h-5', KLASS_STYLE[fr.klass] || '')}>{fr.klass}</Badge>
                                {fr.fmt && <Badge variant="outline" className="text-[10px] h-5 ml-1">{fr.fmt}</Badge>}
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-wrap gap-1">
                                  {(fr.headers || []).map((h, i) => (
                                    <code key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{h}</code>
                                  ))}
                                  {(!fr.headers || fr.headers.length === 0) && <span className="text-[11px] text-muted-foreground italic">—</span>}
                                </div>
                                {fr.enum_values?.length > 0 && (
                                  <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[360px]">
                                    values: {fr.enum_values.slice(0, 8).join(', ')}{fr.enum_values.length > 8 ? '…' : ''}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="align-top text-right">
                                <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditField(fr)} aria-label={`Edit column ${fr.label || fr.canonical}`}>
                                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteField(fr)} aria-label={`Delete column ${fr.label || fr.canonical}`}>
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {fieldRules.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-8">
                              No columns of this type yet. Use "Add column" to create one.
                            </TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Conditional rules */}
              {detail.conditional_rules.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Checks across columns</CardTitle>
                    <p className="text-xs text-muted-foreground">Turn these checks on or off (for example, Emirates ID year vs date of birth) and set how serious a failure is.</p>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    {detail.conditional_rules.map(cr => (
                      <div key={cr.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-2.5">
                        <div className="min-w-0">
                          <div className="text-sm text-foreground">{cr.label || cr.rule_key}</div>
                          <code className="text-[10px] text-muted-foreground">{cr.rule_key}</code>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Select value={cr.severity || 'default'} onValueChange={v => updateConditional(cr, { severity: v === 'default' ? '' : v })}>
                            <SelectTrigger className="h-7 w-[110px] text-xs" aria-label={`How serious a failure of "${cr.label || cr.rule_key}" is`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Default</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                          <Switch checked={cr.enabled} onCheckedChange={v => updateConditional(cr, { enabled: v })} aria-label={`Turn the check "${cr.label || cr.rule_key}" on or off`} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create rule set dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Create a rule set</DialogTitle>
            <DialogDescription>Create one from an employee-list file (recommended), or start empty and add columns yourself.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Upload-to-draft */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.csv,.txt"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleCreateFromFile(f); }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-5 text-center transition-colors hover:bg-primary/10 disabled:opacity-60"
            >
              {uploading
                ? <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                : <Upload className="h-5 w-5 text-primary" aria-hidden />}
              <span className="text-sm font-medium text-foreground">
                {uploading ? 'Reading the file…' : 'Create from an employee list'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Upload an .xlsx or .csv — we read its columns and draft a rule set for you to review and turn on.
              </span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or start empty</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ruleset-name">Name</Label>
              <Input id="ruleset-name" placeholder="e.g. Standard employee list" value={newBook.name} onChange={e => setNewBook({ ...newBook, name: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ruleset-slug">Short code</Label>
              <Input id="ruleset-slug" placeholder="auto from name (e.g. standard-employee-list)" value={newBook.slug} onChange={e => setNewBook({ ...newBook, slug: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ruleset-desc">Description</Label>
              <Input id="ruleset-desc" placeholder="optional" value={newBook.description} onChange={e => setNewBook({ ...newBook, description: e.target.value })} />
            </div>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
              <span className="text-sm">Make this the default rule set</span>
              <Switch checked={newBook.is_default} onCheckedChange={v => setNewBook({ ...newBook, is_default: v })} aria-label="Make this the default rule set" />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateBook}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field-rule edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit column · ${editing.canonical}` : 'Add column'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Action type</Label>
                <Select value={draft.action_type} onValueChange={v => setDraft({ ...draft, action_type: v })} disabled={!!editing}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(at => <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="field-id">Field id</Label>
                <Input id="field-id" value={draft.canonical || ''} disabled={!!editing} placeholder="e.g. staff_id"
                  onChange={e => setDraft({ ...draft, canonical: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-label">Label</Label>
              <Input id="field-label" value={draft.label || ''} placeholder="What people see, e.g. Staff ID"
                onChange={e => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={draft.klass} onValueChange={v => setDraft({ ...draft, klass: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(meta?.klasses ?? []).map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Format check</Label>
                <Select value={draft.fmt || '__none'} onValueChange={v => setDraft({ ...draft, fmt: v === '__none' ? '' : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(meta?.formats ?? []).map(f => <SelectItem key={f.value || '__none'} value={f.value || '__none'}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-headers">Column names it matches <span className="text-muted-foreground font-normal">(separate with commas or new lines)</span></Label>
              <Textarea id="field-headers" rows={2} value={headersText} placeholder="employee number, employee no"
                onChange={e => setHeadersText(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-values">Allowed values <span className="text-muted-foreground font-normal">(for a dropdown column)</span></Label>
              <Textarea id="field-values" rows={2} value={enumText} placeholder="male, female"
                onChange={e => setEnumText(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                <span className="text-sm">Strict dropdown <span className="text-[10px] text-muted-foreground">(reject other values)</span></span>
                <Switch checked={!!draft.enum_strict} onCheckedChange={v => setDraft({ ...draft, enum_strict: v })} aria-label="Strict dropdown — reject values outside the allowed list" />
              </label>
              <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                <span className="text-sm">Multiple values <span className="text-[10px] text-muted-foreground">(e.g. "A & B")</span></span>
                <Switch checked={!!draft.multi} onCheckedChange={v => setDraft({ ...draft, multi: v })} aria-label="Allow more than one value in a cell" />
              </label>
            </div>
            <div className="grid gap-2 w-32">
              <Label htmlFor="field-position">Order</Label>
              <Input id="field-position" type="number" value={draft.position ?? 0} onChange={e => setDraft({ ...draft, position: parseInt(e.target.value, 10) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveField}>{editing ? 'Save changes' : 'Add column'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
