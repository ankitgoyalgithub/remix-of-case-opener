import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Sparkles, Wand2, FileText, Network, Settings2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { HandlerSchemaForm, HandlerField } from './HandlerSchemaForm';

interface HandlerMeta {
  name: string;
  label: string;
  description: string;
  category: string;
  schema: HandlerField[];
}

type AutoCheckRule = 'manual' | 'document-present' | 'field-extracted' | 'cross-validation';

const AUTO_CHECK_OPTIONS: Array<{ value: AutoCheckRule; label: string }> = [
  { value: 'manual', label: 'Manual Only' },
  { value: 'document-present', label: 'Document Present' },
  { value: 'field-extracted', label: 'Field Extracted' },
  { value: 'cross-validation', label: 'Cross-validation Auto' },
];

const ITEM_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'verification', label: 'Verification' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'cross-validation', label: 'Cross-validation' },
  { value: 'third-party-api', label: 'Third-party API' },
  { value: 'agent-orchestrator', label: 'Agent (prompt-driven)' },
  { value: 'entity-screening', label: 'Entity screening' },
  { value: 'risk-review', label: 'Risk review' },
];

interface CheckItem {
  id: number;
  stage: number;
  name: string;
  required: boolean;
  linked_documents: string[];
  item_type: string;
  auto_check_rule: AutoCheckRule;
  manual_override_allowed: boolean;
  handler_name?: string;
  config_payload?: Record<string, any>;
  task_description?: string;
  task_details?: string;
  api_config?: Record<string, any>;
  cross_validation_rules?: Array<{ id: number; name: string }>;
}

interface ApiStage {
  id: number;
  name: string;
  order: number;
}

interface DocOption {
  id: number;
  name: string;
  doc_type: string;
  category: string;
}

interface CvRuleOption {
  id: number;
  name: string;
  source_doc_type: string;
  target_doc_type: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CheckItem | null;
  stages: ApiStage[];
  onSaved: () => void;
}

function formatJson(obj: any): string {
  if (!obj || (typeof obj === 'object' && Object.keys(obj).length === 0)) return '{}';
  try { return JSON.stringify(obj, null, 2); } catch { return '{}'; }
}

export function CheckConfigDrawer({ open, onOpenChange, item, stages, onSaved }: Props) {
  // Mirror of editable state — populated when the drawer opens.
  const [name, setName] = useState('');
  const [stageId, setStageId] = useState<number | null>(null);
  const [itemType, setItemType] = useState('manual');
  const [autoCheckRule, setAutoCheckRule] = useState<AutoCheckRule>('manual');
  const [required, setRequired] = useState(false);
  const [overrideAllowed, setOverrideAllowed] = useState(true);

  const [taskDescription, setTaskDescription] = useState('');
  const [taskDetails, setTaskDetails] = useState('');

  const [linkedDocs, setLinkedDocs] = useState<string[]>([]);
  const [cvRuleIds, setCvRuleIds] = useState<number[]>([]);

  // Each verification = { handler, config }. The runner walks them in order and
  // aggregates the worst-case status. `handler === 'manual'` is a synthetic
  // entry that just marks the check as needing operator attention.
  const [verifications, setVerifications] = useState<Array<{ handler: string; config: Record<string, any> }>>([]);
  const [configPayloadText, setConfigPayloadText] = useState('{}');
  const [apiConfigText, setApiConfigText] = useState('{}');
  const [configPayloadError, setConfigPayloadError] = useState<string | null>(null);
  const [apiConfigError, setApiConfigError] = useState<string | null>(null);

  const [docOptions, setDocOptions] = useState<DocOption[]>([]);
  const [cvOptions, setCvOptions] = useState<CvRuleOption[]>([]);
  const [handlers, setHandlers] = useState<HandlerMeta[]>([]);
  const [saving, setSaving] = useState(false);

  // Load doc + CV + handler-registry options once when the drawer first opens.
  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.studio.documents.list().catch(() => []),
      api.studio.cvRules.list().catch(() => []),
      api.studio.checkHandlers.list().catch(() => []),
    ]).then(([docs, cvs, hs]) => {
      setDocOptions(docs as DocOption[]);
      setCvOptions(cvs as CvRuleOption[]);
      setHandlers(hs as HandlerMeta[]);
    });
  }, [open]);

  // Reset form when item changes.
  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setStageId(item.stage);
    setItemType(item.item_type || 'manual');
    setAutoCheckRule(item.auto_check_rule || 'manual');
    setRequired(item.required);
    setOverrideAllowed(item.manual_override_allowed);
    setTaskDescription(item.task_description || '');
    setTaskDetails(item.task_details || '');
    setLinkedDocs([...(item.linked_documents || [])]);
    setCvRuleIds((item.cross_validation_rules || []).map(r => r.id));
    // Verifications: prefer the modern array, fall back to the legacy single-handler shape.
    const cfgVerifications = (item.config_payload as any)?.verifications;
    if (Array.isArray(cfgVerifications) && cfgVerifications.length > 0) {
      setVerifications(cfgVerifications.map((v: any) => ({
        handler: v.handler || v.type || '',
        config: v.config || {},
      })));
    } else if (item.handler_name) {
      // Legacy: single handler stored on the definition itself.
      const { verifications: _drop, ...rest } = (item.config_payload || {}) as any;
      setVerifications([{ handler: item.handler_name, config: rest }]);
    } else {
      setVerifications([]);
    }
    setConfigPayloadText(formatJson(item.config_payload));
    setApiConfigText(formatJson(item.api_config));
    setConfigPayloadError(null);
    setApiConfigError(null);
  }, [item, open]);

  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocOption[]> = {};
    for (const d of docOptions) {
      const cat = d.category || 'Other';
      (groups[cat] ||= []).push(d);
    }
    return groups;
  }, [docOptions]);

  const groupedHandlers = useMemo(() => {
    const groups: Record<string, HandlerMeta[]> = {};
    for (const h of handlers) {
      const cat = h.category || 'other';
      (groups[cat] ||= []).push(h);
    }
    return groups;
  }, [handlers]);

  const handlerByName = useMemo(() => {
    const m: Record<string, HandlerMeta> = {};
    for (const h of handlers) m[h.name] = h;
    return m;
  }, [handlers]);

  const addVerification = () => setVerifications(prev => [...prev, { handler: '', config: {} }]);
  const addManualStep = () => setVerifications(prev => [...prev, { handler: 'manual', config: {} }]);
  const removeVerification = (idx: number) => setVerifications(prev => prev.filter((_, i) => i !== idx));
  const moveVerification = (idx: number, dir: -1 | 1) => setVerifications(prev => {
    const next = [...prev];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return prev;
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  });
  const updateVerification = (idx: number, patch: Partial<{ handler: string; config: Record<string, any> }>) => {
    setVerifications(prev => prev.map((v, i) => {
      if (i !== idx) return v;
      let next = { ...v, ...patch };
      // When the handler changes, seed defaults from the new schema and drop
      // keys that don't apply to the new shape.
      if (patch.handler !== undefined && patch.handler !== v.handler) {
        const meta = handlerByName[patch.handler];
        const seeded: Record<string, any> = {};
        for (const f of meta?.schema || []) {
          if (f.default !== undefined) seeded[f.key] = f.default;
        }
        next = { handler: patch.handler, config: seeded };
      }
      return next;
    }));
  };

  if (!item) return null;

  const toggleDoc = (slug: string) => {
    setLinkedDocs(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };
  const toggleCvRule = (id: number) => {
    setCvRuleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!stageId) { toast.error('Stage is required'); return; }

    // Validate every verification has a handler picked
    for (let i = 0; i < verifications.length; i++) {
      if (!verifications[i].handler) {
        toast.error(`Pick a handler for verification #${i + 1} or remove it`);
        return;
      }
    }

    // Build the config_payload — verifications are the source of truth; we
    // also overwrite any pre-existing top-level `verifications` key so stale
    // data from legacy single-handler shape doesn't leak through.
    const builtVerifications = verifications.map(v => ({
      type: v.handler,
      handler: v.handler,
      config: v.config || {},
    }));

    // Keep any non-verifications keys the user may have on config_payload
    // (rare, but preserves things like `prompt` at the root if set elsewhere).
    let basePayload: Record<string, any> = {};
    if (configPayloadText.trim()) {
      try {
        const parsed = JSON.parse(configPayloadText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) basePayload = parsed;
      } catch {
        /* ignore — the form is the source of truth, raw JSON is just for inspection */
      }
    }
    const newConfigPayload = { ...basePayload, verifications: builtVerifications };

    let parsedApi: Record<string, any> = {};
    try {
      parsedApi = apiConfigText.trim() ? JSON.parse(apiConfigText) : {};
      if (typeof parsedApi !== 'object' || Array.isArray(parsedApi)) throw new Error('must be a JSON object');
      setApiConfigError(null);
    } catch (e: any) {
      setApiConfigError(`Invalid JSON: ${e.message}`);
      toast.error('API config is not valid JSON');
      return;
    }

    // Pick the "primary" handler — first non-manual entry — to keep the
    // legacy `handler_name` column in sync. Older code paths that read it
    // (and the runner's fallback) stay correct.
    const primary = verifications.find(v => v.handler && v.handler !== 'manual')?.handler || '';

    setSaving(true);
    try {
      await api.studio.checklists.update(String(item.id), {
        name: name.trim(),
        stage: stageId,
        item_type: itemType,
        auto_check_rule: autoCheckRule,
        required,
        manual_override_allowed: overrideAllowed,
        task_description: taskDescription,
        task_details: taskDetails,
        linked_documents: linkedDocs,
        cross_validation_rule_ids: cvRuleIds,
        handler_name: primary,
        config_payload: newConfigPayload,
        api_config: parsedApi,
      });
      toast.success('Check saved');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Failed to save check', err);
      toast.error(err?.message || 'Failed to save check');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[640px] sm:max-w-[640px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-left truncate">{item.name}</SheetTitle>
          <SheetDescription className="text-left text-xs">
            Stage: {stages.find(s => s.id === stageId)?.name || '—'} · ID {item.id}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="basics" className="px-6 pt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basics" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Basics</TabsTrigger>
              <TabsTrigger value="prompts" className="gap-1.5"><Wand2 className="h-3.5 w-3.5" />Prompts</TabsTrigger>
              <TabsTrigger value="linked" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Linked</TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Advanced</TabsTrigger>
            </TabsList>

            {/* BASICS */}
            <TabsContent value="basics" className="space-y-4 pt-4 pb-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trade licence is current" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Stage</Label>
                  <Select value={stageId ? String(stageId) : ''} onValueChange={v => setStageId(Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.order}. {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Item type</Label>
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Auto-check rule</Label>
                <Select value={autoCheckRule} onValueChange={v => setAutoCheckRule(v as AutoCheckRule)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUTO_CHECK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <Label className="text-sm">Required</Label>
                    <p className="text-[11px] text-muted-foreground">Block release until passed</p>
                  </div>
                  <Switch checked={required} onCheckedChange={setRequired} />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <Label className="text-sm">Manual override</Label>
                    <p className="text-[11px] text-muted-foreground">Ops can mark as passed</p>
                  </div>
                  <Switch checked={overrideAllowed} onCheckedChange={setOverrideAllowed} />
                </div>
              </div>
            </TabsContent>

            {/* PROMPTS */}
            <TabsContent value="prompts" className="space-y-4 pt-4 pb-6">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Wand2 className="h-3 w-3" />
                  Task description
                </Label>
                <Textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="What this check is verifying. Shown to ops in the workbench."
                  rows={3}
                  className="text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Plain English. Surfaces to operators when a manual review is needed.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Prompt / additional instructions
                </Label>
                <Textarea
                  value={taskDetails}
                  onChange={e => setTaskDetails(e.target.value)}
                  placeholder={'Detailed instructions for the AI agent. e.g. "Verify that the trade licence expiry date is at least 90 days in the future. Flag if the activity codes do not include insurance brokerage."'}
                  rows={9}
                  className="text-sm font-mono leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground">
                  This is the prompt the agent uses when <code className="text-[10px] bg-muted px-1 rounded">item_type</code> is <code className="text-[10px] bg-muted px-1 rounded">agent-orchestrator</code> or any handler that consumes free-form instructions.
                </p>
              </div>
            </TabsContent>

            {/* LINKED */}
            <TabsContent value="linked" className="space-y-4 pt-4 pb-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">Linked documents</Label>
                  <span className="text-[11px] text-muted-foreground">{linkedDocs.length} selected</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Document types this check depends on. The auto-check rule uses these to know when to run (e.g. <em>document-present</em> waits for any of these to be uploaded).
                </p>
                {Object.keys(groupedDocs).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">
                    No document types defined yet. Add them in <strong>Documents</strong>.
                  </div>
                ) : (
                  <div className="space-y-3 mt-2">
                    {Object.entries(groupedDocs).map(([cat, docs]) => (
                      <div key={cat} className="border border-border rounded-md p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{cat}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {docs.map(d => {
                            const checked = linkedDocs.includes(d.doc_type);
                            return (
                              <label
                                key={d.id}
                                className={cn(
                                  'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm transition-colors',
                                  checked ? 'bg-primary/10' : 'hover:bg-muted/50',
                                )}
                              >
                                <Checkbox checked={checked} onCheckedChange={() => toggleDoc(d.doc_type)} />
                                <span className="truncate">{d.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {autoCheckRule === 'cross-validation' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Network className="h-3 w-3" />
                      Cross-validation rules
                    </Label>
                    <span className="text-[11px] text-muted-foreground">{cvRuleIds.length} selected</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Which CV rules this check evaluates. Manage rules under <strong>Documents → Configure → CV rules</strong>.
                  </p>
                  {cvOptions.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">
                      No cross-validation rules defined yet.
                    </div>
                  ) : (
                    <div className="space-y-1 mt-2 max-h-72 overflow-y-auto pr-1">
                      {cvOptions.map(r => {
                        const checked = cvRuleIds.includes(r.id);
                        return (
                          <label
                            key={r.id}
                            className={cn(
                              'flex items-start gap-2 px-2 py-2 rounded cursor-pointer text-sm transition-colors border',
                              checked ? 'bg-primary/10 border-primary/30' : 'border-border hover:bg-muted/30',
                            )}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => toggleCvRule(r.id)} className="mt-0.5" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{r.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate font-mono">
                                {r.source_doc_type} ↔ {r.target_doc_type}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ADVANCED */}
            <TabsContent value="advanced" className="space-y-4 pt-4 pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Verifications</p>
                  <p className="text-[11px] text-muted-foreground">
                    Stack one or more handlers — they all run in order. Worst-case status wins.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{verifications.length} step{verifications.length === 1 ? '' : 's'}</Badge>
              </div>

              {verifications.length === 0 && (
                <div className="rounded-md border border-info/30 bg-info/5 p-3 flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" />
                  <div className="text-[11px] text-foreground/80">
                    <p className="font-medium">No verifications yet.</p>
                    <p className="text-muted-foreground mt-0.5">
                      Click "Add verification" to plug in a handler (FTA, NER, signature match, AML…).
                      Leave empty to fall back to the auto-check rule (document-present, field-extracted, …).
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {verifications.map((v, idx) => {
                  const meta = handlerByName[v.handler];
                  const isManual = v.handler === 'manual';
                  return (
                    <div key={idx} className="rounded-md border border-border bg-muted/10">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
                        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-5">#{idx + 1}</span>
                        {isManual ? (
                          <Badge className="bg-warning/15 text-warning border-0 text-[10px] gap-1 h-5">
                            <Wand2 className="h-3 w-3" />
                            Manual step
                          </Badge>
                        ) : (
                          <Select value={v.handler || ''} onValueChange={(handler) => updateVerification(idx, { handler })}>
                            <SelectTrigger className="h-7 flex-1 text-xs">
                              <SelectValue placeholder="Pick a handler" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {Object.entries(groupedHandlers).map(([cat, list]) => (
                                <div key={cat} className="px-1 py-1">
                                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{cat}</p>
                                  {list.map(h => (
                                    <SelectItem key={h.name} value={h.name}>
                                      <span className="font-medium">{h.label}</span>
                                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">{h.name}</span>
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => moveVerification(idx, -1)}
                            title="Move up"
                          >
                            <span className="text-xs">↑</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === verifications.length - 1}
                            onClick={() => moveVerification(idx, 1)}
                            title="Move down"
                          >
                            <span className="text-xs">↓</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeVerification(idx)}
                            title="Remove"
                          >
                            <span className="text-xs">×</span>
                          </Button>
                        </div>
                      </div>

                      {!isManual && meta && (
                        <div className="px-3 py-3">
                          {meta.description && (
                            <p className="text-[10px] text-muted-foreground mb-3">{meta.description}</p>
                          )}
                          <HandlerSchemaForm
                            schema={meta.schema}
                            values={v.config}
                            onChange={(config) => updateVerification(idx, { config })}
                          />
                        </div>
                      )}

                      {!isManual && !meta && v.handler && (
                        <p className="px-3 py-3 text-[11px] text-warning flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Handler "{v.handler}" not found in the registry.
                        </p>
                      )}

                      {isManual && (
                        <p className="px-3 py-2 text-[11px] text-muted-foreground">
                          A "manual" step keeps the check at <em>pending</em> until an operator ticks it. Useful when the rest of the pipeline is automated but a human signoff is required.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={addVerification} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Add verification
                </Button>
                <Button variant="outline" size="sm" onClick={addManualStep} className="gap-1.5">
                  <Wand2 className="h-3.5 w-3.5" />
                  Add manual step
                </Button>
              </div>

              <details className="text-[11px]">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw config_payload (advanced)</summary>
                <Textarea
                  value={configPayloadText}
                  onChange={e => { setConfigPayloadText(e.target.value); setConfigPayloadError(null); }}
                  rows={6}
                  className={cn('font-mono text-xs leading-relaxed mt-2', configPayloadError && 'border-destructive')}
                  spellCheck={false}
                />
                {configPayloadError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{configPayloadError}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  The list above is the source of truth on save. Edit raw JSON only for keys outside the verification stack.
                </p>
              </details>

              <details className="text-[11px]">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">API config (legacy)</summary>
                <Textarea
                  value={apiConfigText}
                  onChange={e => { setApiConfigText(e.target.value); setApiConfigError(null); }}
                  rows={4}
                  className={cn('font-mono text-xs leading-relaxed mt-2', apiConfigError && 'border-destructive')}
                  spellCheck={false}
                />
                {apiConfigError && (
                  <p className="text-[11px] text-destructive flex items-center gap-1 mt-1"><AlertCircle className="h-3 w-3" />{apiConfigError}</p>
                )}
              </details>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-background flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
            {linkedDocs.length > 0 && <Badge variant="outline" className="text-[10px]">{linkedDocs.length} docs</Badge>}
            {cvRuleIds.length > 0 && <Badge variant="outline" className="text-[10px]">{cvRuleIds.length} CV rules</Badge>}
            {verifications.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {verifications.length} verification{verifications.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
