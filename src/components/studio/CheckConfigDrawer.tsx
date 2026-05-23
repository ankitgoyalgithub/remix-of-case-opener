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
  { value: 'manual', label: 'Only when an operator runs it' },
  { value: 'document-present', label: 'When the linked document arrives' },
  { value: 'field-extracted', label: 'When AI extracts the fields' },
  { value: 'cross-validation', label: 'When linked rules can run' },
];

const ITEM_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'verification', label: 'Verification' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'cross-validation', label: 'Cross-validation' },
  { value: 'third-party-api', label: 'External API' },
  { value: 'agent-orchestrator', label: 'AI agent' },
  { value: 'entity-screening', label: 'Entity screening' },
  { value: 'risk-review', label: 'Risk review' },
];

// ─── MOL validation per-field rules ───────────────────────────────────
// Hardcoded defaults mirror what the legacy handler used. Editing these in
// the drawer writes into config_payload.fields, and the backend handler
// merges over the same defaults on the server side.

type MolMode = 'exact' | 'fuzzy' | 'exact_fuzzy' | 'contains';
type MolPriority = 'high' | 'medium' | 'low';

interface MolField {
  enabled: boolean;
  mode: MolMode;
  required: boolean;
  priority: MolPriority;
}

const DEFAULT_MOL_FIELDS: Record<string, MolField> = {
  passport_number: { enabled: true,  mode: 'exact_fuzzy', required: true,  priority: 'high'   },
  full_name:       { enabled: true,  mode: 'fuzzy',       required: false, priority: 'high'   },
  nationality:     { enabled: true,  mode: 'exact',       required: false, priority: 'medium' },
};

const MOL_FIELD_LABEL: Record<string, string> = {
  passport_number: 'Passport',
  full_name:       'Name',
  nationality:     'Nationality',
};

const MOL_MODE_OPTIONS: Array<{ value: MolMode; label: string; hint: string }> = [
  { value: 'exact',       label: 'Exact',           hint: 'Must match character-for-character' },
  { value: 'fuzzy',       label: 'Fuzzy',           hint: 'Levenshtein-similar values count' },
  { value: 'exact_fuzzy', label: 'Exact or fuzzy',  hint: 'Try exact first, fall back to fuzzy' },
  { value: 'contains',    label: 'Contains',        hint: 'Census value is a substring of MOL value (or vice versa)' },
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

  // MOL validation — per-field matching rules. Only renders when the check
  // uses the mol-validation handler. Backend reads from config_payload.fields.
  const [matchFields, setMatchFields] = useState<Record<string, MolField>>(DEFAULT_MOL_FIELDS);
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

    // Load MOL per-field rules (if present) — merge over the defaults so any
    // missing keys stay sensible.
    const stored = (item.config_payload as any)?.fields;
    if (stored && typeof stored === 'object') {
      const merged: Record<string, MolField> = { ...DEFAULT_MOL_FIELDS };
      for (const key of Object.keys(merged)) {
        const partial = stored[key];
        if (partial && typeof partial === 'object') {
          merged[key] = {
            enabled:  partial.enabled  ?? merged[key].enabled,
            mode:     (partial.mode    ?? merged[key].mode) as MolMode,
            required: partial.required ?? merged[key].required,
            priority: (partial.priority ?? merged[key].priority) as MolPriority,
          };
        }
      }
      setMatchFields(merged);
    } else {
      setMatchFields(DEFAULT_MOL_FIELDS);
    }
  }, [item, open]);

  // True when any verification step (or legacy handler_name) is the MOL
  // validation handler. The backend registers it as `mol_validation`
  // (underscore); accept the hyphenated form too in case older seeds use it.
  // Drives the conditional MOL matching rules editor below the basics form.
  const isMolValidation = useMemo(() => {
    const isMol = (h?: string) => h === 'mol_validation' || h === 'mol-validation';
    if (isMol(item?.handler_name)) return true;
    return verifications.some(v => isMol(v.handler));
  }, [item?.handler_name, verifications]);

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
    const newConfigPayload: Record<string, any> = { ...basePayload, verifications: builtVerifications };

    // If this is the MOL validation check, persist the per-field rules so the
    // backend handler can read them from config_payload.fields.
    if (isMolValidation) {
      newConfigPayload.fields = matchFields;
    } else {
      // Different check — strip a stale `fields` key if one was left behind.
      delete newConfigPayload.fields;
    }

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
      <SheetContent className="w-[620px] sm:max-w-[620px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-left truncate text-base">{item.name}</SheetTitle>
          <SheetDescription className="text-left text-[11px]">
            {stages.find(s => s.id === stageId)?.name || 'No stage'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="basics" className="px-5 pt-3">
            <TabsList className="grid grid-cols-4 w-full h-9">
              <TabsTrigger value="basics" className="text-xs">Basics</TabsTrigger>
              <TabsTrigger value="prompts" className="text-xs">Prompts</TabsTrigger>
              <TabsTrigger value="linked" className="text-xs">Linked</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">Advanced</TabsTrigger>
            </TabsList>

            {/* BASICS */}
            <TabsContent value="basics" className="space-y-3 pt-4 pb-6">
              <Field label="Name">
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trade licence is current" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Stage">
                  <Select value={stageId ? String(stageId) : ''} onValueChange={v => setStageId(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {stages.map(s => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.order}. {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Type">
                  <Select value={itemType} onValueChange={setItemType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ToggleRow
                  label="Required"
                  hint="Blocks release until passed"
                  checked={required}
                  onChange={setRequired}
                />
                <ToggleRow
                  label="Allow override"
                  hint="Ops can pass it manually"
                  checked={overrideAllowed}
                  onChange={setOverrideAllowed}
                />
              </div>

              <details className="text-xs pt-1">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  When should it run automatically?
                </summary>
                <div className="mt-2">
                  <Select value={autoCheckRule} onValueChange={v => setAutoCheckRule(v as AutoCheckRule)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AUTO_CHECK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Used as a fallback when no Steps are configured under <strong>Advanced</strong>.
                  </p>
                </div>
              </details>

              {/* MOL Validation — per-field matching rules.
                  Only rendered when this check uses the mol-validation handler. */}
              {isMolValidation && (
                <div className="pt-3 mt-3 border-t border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">Matching rules</p>
                    <Badge variant="neutral" className="text-[10px]">MOL only</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1.5">
                    How each field is compared between the Census file and the MOL list. Stored on
                    <code className="ml-1 px-1 py-px text-[10px] bg-muted rounded">config_payload.fields</code>.
                  </p>

                  <div className="rounded-md border border-border bg-card divide-y divide-border">
                    {(['passport_number', 'full_name', 'nationality'] as const).map(key => {
                      const f = matchFields[key];
                      return (
                        <div key={key} className="px-3 py-2.5 grid grid-cols-[110px_1fr_auto] gap-3 items-center">
                          {/* Field name + enabled toggle */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Switch
                              checked={f.enabled}
                              onCheckedChange={(v) => setMatchFields(prev => ({
                                ...prev,
                                [key]: { ...prev[key], enabled: !!v },
                              }))}
                            />
                            <Label className={cn(
                              'text-[13px] font-medium truncate',
                              !f.enabled && 'text-muted-foreground line-through',
                            )}>
                              {MOL_FIELD_LABEL[key]}
                            </Label>
                          </div>

                          {/* Mode select */}
                          <Select
                            value={f.mode}
                            onValueChange={(v) => setMatchFields(prev => ({
                              ...prev,
                              [key]: { ...prev[key], mode: v as MolMode },
                            }))}
                            disabled={!f.enabled}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MOL_MODE_OPTIONS.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-xs">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{o.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Required */}
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={f.required}
                              onCheckedChange={(v) => setMatchFields(prev => ({
                                ...prev,
                                [key]: { ...prev[key], required: !!v },
                              }))}
                              disabled={!f.enabled}
                            />
                            <Label className="text-[11px] text-muted-foreground">Required</Label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <strong>Required</strong> fields must match for the rule to consider a candidate at all.
                    Non-required fields contribute to the confidence score when present, but their absence
                    doesn't disqualify a match.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* PROMPTS */}
            <TabsContent value="prompts" className="space-y-4 pt-4 pb-6">
              <Field
                label="What this check does"
                hint="One line, plain English. Shown to ops in the workbench."
              >
                <Textarea
                  value={taskDescription}
                  onChange={e => setTaskDescription(e.target.value)}
                  placeholder="e.g. Confirms the trade licence is still valid."
                  rows={2}
                  className="text-sm"
                />
              </Field>

              <Field
                label="AI prompt"
                hint="Tell the AI exactly what to verify. Used by AI-driven steps."
              >
                <Textarea
                  value={taskDetails}
                  onChange={e => setTaskDetails(e.target.value)}
                  placeholder={'e.g. Confirm the trade licence expiry is at least 90 days away and the activity list includes "insurance brokerage". Flag anything that doesn\'t match.'}
                  rows={8}
                  className="text-sm leading-relaxed"
                />
              </Field>
            </TabsContent>

            {/* LINKED */}
            <TabsContent value="linked" className="space-y-4 pt-4 pb-6">
              <Field
                label="Documents this check needs"
                hint="The check waits for these to be uploaded before running."
                trailing={<span className="text-[11px] text-muted-foreground">{linkedDocs.length} selected</span>}
              >
                {Object.keys(groupedDocs).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">
                    No document types yet. Add them in <strong>Documents</strong>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(groupedDocs).map(([cat, docs]) => (
                      <div key={cat} className="border border-border rounded-md p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{cat}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {docs.map(d => {
                            const checked = linkedDocs.includes(d.doc_type);
                            return (
                              <label
                                key={d.id}
                                className={cn(
                                  'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
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
              </Field>

              {autoCheckRule === 'cross-validation' && (
                <Field
                  label="Cross-validation rules"
                  hint="Pick the rules this check should run."
                  trailing={<span className="text-[11px] text-muted-foreground">{cvRuleIds.length} selected</span>}
                >
                  {cvOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">
                      No rules yet. Create them in <strong>Documents → CV rules</strong>.
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                      {cvOptions.map(r => {
                        const checked = cvRuleIds.includes(r.id);
                        return (
                          <label
                            key={r.id}
                            className={cn(
                              'flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer text-sm border',
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
                </Field>
              )}
            </TabsContent>

            {/* ADVANCED */}
            <TabsContent value="advanced" className="space-y-3 pt-4 pb-6">
              <div>
                <p className="text-sm font-medium">Steps</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Add one or more steps. They run in order. If any step fails, the check fails.
                </p>
              </div>

              {verifications.length === 0 && (
                <p className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">
                  No steps yet. Add one below.
                </p>
              )}

              <div className="space-y-2">
                {verifications.map((v, idx) => {
                  const meta = handlerByName[v.handler];
                  const isManual = v.handler === 'manual';
                  return (
                    <div key={idx} className="rounded-md border border-border bg-card">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border/60">
                        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums w-4">{idx + 1}</span>
                        {isManual ? (
                          <span className="flex-1 text-xs font-medium text-warning flex items-center gap-1.5">
                            <Wand2 className="h-3 w-3" />
                            Manual signoff
                          </span>
                        ) : (
                          <Select value={v.handler || ''} onValueChange={(handler) => updateVerification(idx, { handler })}>
                            <SelectTrigger className="h-7 flex-1 text-xs">
                              <SelectValue placeholder="Pick what this step does" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {Object.entries(groupedHandlers).map(([cat, list]) => (
                                <div key={cat} className="px-1 py-1">
                                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
                                  {list.map(h => (
                                    <SelectItem key={h.name} value={h.name}>{h.label}</SelectItem>
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
                            <span className="text-sm">↑</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            disabled={idx === verifications.length - 1}
                            onClick={() => moveVerification(idx, 1)}
                            title="Move down"
                          >
                            <span className="text-sm">↓</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeVerification(idx)}
                            title="Remove step"
                          >
                            <span className="text-sm">×</span>
                          </Button>
                        </div>
                      </div>

                      {!isManual && meta && (
                        <div className="px-3 py-3">
                          {meta.description && (
                            <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{meta.description}</p>
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
                          "{v.handler}" isn't a registered handler.
                        </p>
                      )}

                      {isManual && (
                        <p className="px-3 py-2 text-[11px] text-muted-foreground">
                          The check stays pending until an operator ticks it.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={addVerification} className="gap-1.5 h-8">
                  <Sparkles className="h-3.5 w-3.5" />
                  Add step
                </Button>
                <Button variant="outline" size="sm" onClick={addManualStep} className="gap-1.5 h-8">
                  <Wand2 className="h-3.5 w-3.5" />
                  Add manual signoff
                </Button>
              </div>

              <details className="text-[11px] pt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                  Raw config (read-only inspector)
                </summary>
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
                  Steps above always win on save.
                </p>
              </details>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-5 py-3 border-t border-border bg-background flex items-center gap-2">
          <div className="flex-1 text-[11px] text-muted-foreground truncate">
            {[
              linkedDocs.length > 0 && `${linkedDocs.length} ${linkedDocs.length === 1 ? 'doc' : 'docs'}`,
              cvRuleIds.length > 0 && `${cvRuleIds.length} ${cvRuleIds.length === 1 ? 'rule' : 'rules'}`,
              verifications.length > 0 && `${verifications.length} ${verifications.length === 1 ? 'step' : 'steps'}`,
            ].filter(Boolean).join(' · ')}
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

function Field({
  label, hint, trailing, children,
}: {
  label: string;
  hint?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {trailing}
      </div>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label, hint, checked, onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
