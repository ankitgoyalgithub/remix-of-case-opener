import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  CHECK_TEMPLATES, CATEGORY_META, CheckTemplate, Severity,
} from './checkTemplates';

interface DocOption { id: number; name: string; doc_type: string; category?: string; is_active?: boolean }
interface ApiStage { id: number; name: string; order: number }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: ApiStage | null;
  onCreated: () => void;
}

export function CheckLibraryDialog({ open, onOpenChange, stage, onCreated }: Props) {
  const [step, setStep] = useState<'pick' | 'fill'>('pick');
  const [template, setTemplate] = useState<CheckTemplate | null>(null);
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<Severity>('block');
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('pick');
    setTemplate(null);
    setSlots({});
    setName('');
    setSeverity('block');
    setSearch('');
    api.studio.documents.list()
      .then(d => setDocs((d as DocOption[]).filter(x => x.is_active !== false)))
      .catch(() => setDocs([]));
  }, [open]);

  const docLabel = (slug: string) => docs.find(d => d.doc_type === slug)?.name || slug;

  // Suggested name auto-fills as the user fills slots
  useEffect(() => {
    if (!template) return;
    const suggested = template.suggestName?.(slots, docLabel) || '';
    setName(prev => (prev && prev !== suggested) ? prev : suggested);
    // intentionally don't depend on `name` — only suggest while user hasn't typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, template, docs]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? CHECK_TEMPLATES.filter(t =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.id.includes(q))
      : CHECK_TEMPLATES;
    const out: Record<string, CheckTemplate[]> = {};
    for (const t of filtered) (out[t.category] ||= []).push(t);
    return out;
  }, [search]);

  const slotsValid = (() => {
    if (!template) return false;
    for (const s of template.slots) {
      if (!s.required) continue;
      const v = slots[s.key];
      if (s.type === 'doc-types') {
        if (!Array.isArray(v) || v.length < 2) return false;
      } else {
        if (v === undefined || v === null || String(v).trim() === '') return false;
      }
    }
    return true;
  })();

  const handleSave = async () => {
    if (!template || !stage) return;
    if (!slotsValid) { toast.error('Please fill the required fields'); return; }
    if (!name.trim()) { toast.error('Give the check a name'); return; }

    const payload = template.toPayload(slots, severity);
    setSaving(true);
    try {
      await api.studio.checklists.create({
        name: name.trim(),
        stage: stage.id,
        item_type: payload.item_type || 'manual',
        auto_check_rule: payload.auto_check_rule || 'manual',
        required: payload.required ?? (severity === 'block'),
        manual_override_allowed: payload.manual_override_allowed ?? true,
        handler_name: payload.handler_name || '',
        config_payload: payload.config_payload || {},
        linked_documents: payload.linked_documents || [],
      });
      toast.success('Check added');
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add check');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          {step === 'fill' && template ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep('pick')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <DialogTitle className="text-left text-base truncate flex items-center gap-2">
                  <template.icon className="h-4 w-4 text-primary" />
                  {template.title}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">{template.description}</p>
              </div>
            </div>
          ) : (
            <>
              <DialogTitle className="text-left text-base">
                Add a check {stage && <span className="text-muted-foreground font-normal">to {stage.name}</span>}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">Pick what you want to verify.</p>
            </>
          )}
        </DialogHeader>

        {step === 'pick' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search check types…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
              {Object.keys(grouped).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">No check types match.</p>
              )}
              {(Object.entries(grouped) as Array<[CheckTemplate['category'], CheckTemplate[]]>).map(([cat, list]) => (
                <div key={cat} className="space-y-1.5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {CATEGORY_META[cat]?.label || cat}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">{CATEGORY_META[cat]?.description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setTemplate(t); setSlots({}); setStep('fill'); }}
                        className="flex items-start gap-3 text-left p-3 rounded-md border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors"
                      >
                        <t.icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'fill' && template && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {template.slots.length === 0 && (
                <p className="text-xs text-muted-foreground rounded-md border border-dashed py-3 text-center">
                  Nothing to configure for this check — give it a name and pick a severity.
                </p>
              )}

              {template.slots.map(slot => (
                <div key={slot.key} className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {slot.label}
                    {slot.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {slot.type === 'string' && (
                    <Input
                      placeholder={slot.placeholder}
                      value={slots[slot.key] ?? ''}
                      onChange={e => setSlots({ ...slots, [slot.key]: e.target.value })}
                    />
                  )}

                  {slot.type === 'multiline' && (
                    <Textarea
                      placeholder={slot.placeholder}
                      rows={4}
                      value={slots[slot.key] ?? ''}
                      onChange={e => setSlots({ ...slots, [slot.key]: e.target.value })}
                      className="text-sm"
                    />
                  )}

                  {slot.type === 'doc-type' && (
                    <Select
                      value={slots[slot.key] ?? ''}
                      onValueChange={v => setSlots({ ...slots, [slot.key]: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Pick a document" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {docs.map(d => (
                          <SelectItem key={d.id} value={d.doc_type}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {slot.type === 'doc-types' && (
                    <DocMultiSelect
                      docs={docs}
                      values={slots[slot.key] || []}
                      onChange={(v) => setSlots({ ...slots, [slot.key]: v })}
                    />
                  )}
                </div>
              ))}

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium">Name <span className="text-muted-foreground">(shown to ops)</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trade licence is current" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">If it fails…</Label>
                <div className="grid grid-cols-3 gap-2">
                  <SeverityChip
                    label="Block release"
                    sub="Required to pass"
                    selected={severity === 'block'}
                    onClick={() => setSeverity('block')}
                  />
                  <SeverityChip
                    label="Warn"
                    sub="Visible, not blocking"
                    selected={severity === 'warn'}
                    onClick={() => setSeverity('warn')}
                  />
                  <SeverityChip
                    label="Just note"
                    sub="Logged for ops"
                    selected={severity === 'note'}
                    onClick={() => setSeverity('note')}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setStep('pick')} disabled={saving}>Back</Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !slotsValid || !name.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                Add check
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SeverityChip({
  label, sub, selected, onClick,
}: { label: string; sub: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border p-2.5 text-left transition-colors',
        selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40',
      )}
    >
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </button>
  );
}

function DocMultiSelect({
  docs, values, onChange,
}: {
  docs: DocOption[];
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const grouped: Record<string, DocOption[]> = {};
  for (const d of docs) {
    const cat = d.category || 'Other';
    (grouped[cat] ||= []).push(d);
  }
  const toggle = (slug: string) =>
    onChange(values.includes(slug) ? values.filter(s => s !== slug) : [...values, slug]);

  if (docs.length === 0) {
    return <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md">No document types yet.</p>;
  }
  return (
    <div className="border border-border rounded-md p-2 max-h-56 overflow-y-auto space-y-2">
      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{cat}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {list.map(d => {
              const checked = values.includes(d.doc_type);
              return (
                <label
                  key={d.id}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
                    checked ? 'bg-primary/10' : 'hover:bg-muted/50',
                  )}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(d.doc_type)} />
                  <span className="truncate">{d.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
