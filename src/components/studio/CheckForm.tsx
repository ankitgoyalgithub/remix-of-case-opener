import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  CHECK_TEMPLATES, CheckTemplate, SlotDef, Severity,
} from './checkTemplates';

interface DocOption { id: number; name: string; doc_type: string; category?: string; is_active?: boolean }

interface FieldPair {
  source_doc: string;
  source_field: string;
  target_doc: string;
  target_field: string;
}

export interface CheckFormState {
  template: CheckTemplate;
  name: string;
  severity: Severity;
  slots: Record<string, any>;
}

interface Props {
  /** Lock the picker — used when editing an existing check. */
  fixedTemplateId?: string;
  /** Initial form values (template + slots + name + severity). */
  initial?: CheckFormState | null;
  /** Called whenever the form state changes. */
  onChange: (state: CheckFormState) => void;
  /** Validation hint — true when the slots are filled enough to save. */
  onValidityChange?: (valid: boolean) => void;
}

export function CheckForm({ fixedTemplateId, initial, onChange, onValidityChange }: Props) {
  const [docs, setDocs] = useState<DocOption[]>([]);
  useEffect(() => {
    api.studio.documents.list()
      .then(d => setDocs((d as DocOption[]).filter(x => x.is_active !== false)))
      .catch(() => setDocs([]));
  }, []);
  const docLabel = (slug: string) => docs.find(d => d.doc_type === slug)?.name || slug;

  // Census rulebooks — feeds the 'census-rulebook' slot's live dropdown.
  const [rulebooks, setRulebooks] = useState<Array<{ slug: string; name: string }>>([]);
  useEffect(() => {
    api.workflow.census.rulebooks.list()
      .then((r: any[]) => setRulebooks((r || []).map(x => ({ slug: x.slug, name: x.name }))))
      .catch(() => setRulebooks([]));
  }, []);

  const [template, setTemplate] = useState<CheckTemplate>(
    initial?.template
    || CHECK_TEMPLATES.find(t => t.id === fixedTemplateId)
    || CHECK_TEMPLATES[0]
  );
  const [slots, setSlots] = useState<Record<string, any>>(initial?.slots || {});
  const [severity, setSeverity] = useState<Severity>(initial?.severity || 'block');
  const [name, setName] = useState<string>(initial?.name || '');
  const [userEditedName, setUserEditedName] = useState<boolean>(!!initial?.name);

  // Seed defaults when the template changes
  useEffect(() => {
    const seeded: Record<string, any> = {};
    for (const slot of template.slots) {
      if (slot.default !== undefined) seeded[slot.key] = slot.default;
    }
    setSlots(prev => ({ ...seeded, ...prev }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id]);

  // Auto-suggest name while the user hasn't manually typed
  useEffect(() => {
    if (userEditedName) return;
    const suggested = template.suggestName?.(slots, docLabel) || '';
    setName(suggested);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, template, docs]);

  // Bubble state up
  useEffect(() => {
    onChange({ template, name, severity, slots });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, name, severity, slots]);

  // Validity
  const valid = useMemo(() => {
    if (!name.trim()) return false;
    for (const slot of template.slots) {
      if (!slot.required || !isVisible(slot, slots)) continue;
      const v = slots[slot.key];
      if (slot.type === 'doc-types' || slot.type === 'field-pairs') {
        if (!Array.isArray(v) || v.length === 0) return false;
        if (slot.type === 'field-pairs') {
          if (!v.every((p: FieldPair) => p.source_doc && p.source_field && p.target_doc && p.target_field)) return false;
        }
      } else if (v === undefined || v === null || String(v).trim() === '') {
        return false;
      }
    }
    return true;
  }, [name, template, slots]);

  useEffect(() => { onValidityChange?.(valid); }, [valid, onValidityChange]);

  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocOption[]> = {};
    for (const d of docs) (groups[d.category || 'Other'] ||= []).push(d);
    return groups;
  }, [docs]);

  return (
    <div className="space-y-4">
      {/* Template picker — only shown when not locked */}
      {!fixedTemplateId && (
        <Field label="What kind of check?">
          <Select value={template.id} onValueChange={(id) => {
            const t = CHECK_TEMPLATES.find(x => x.id === id);
            if (t) setTemplate(t);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CHECK_TEMPLATES.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="font-medium">{t.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">{template.description}</p>
        </Field>
      )}

      {/* Slots */}
      {template.slots.filter(s => isVisible(s, slots)).map(slot => (
        <SlotInput
          key={slot.key}
          slot={slot}
          value={slots[slot.key]}
          onChange={(v) => setSlots(prev => ({ ...prev, [slot.key]: v }))}
          docs={docs}
          groupedDocs={groupedDocs}
          rulebooks={rulebooks}
        />
      ))}

      {/* Name */}
      <Field label="Name" hint="Shown to ops in the workbench.">
        <Input
          value={name}
          onChange={(e) => { setName(e.target.value); setUserEditedName(true); }}
          placeholder="e.g. Trade Licence is current"
        />
      </Field>

      {/* Severity */}
      <Field label="If it fails…">
        <div className="grid grid-cols-3 gap-2">
          <SeverityChip label="Block release" sub="Required to pass"
            selected={severity === 'block'} onClick={() => setSeverity('block')} />
          <SeverityChip label="Warn" sub="Visible, not blocking"
            selected={severity === 'warn'} onClick={() => setSeverity('warn')} />
          <SeverityChip label="Just note" sub="Logged for audit"
            selected={severity === 'note'} onClick={() => setSeverity('note')} />
        </div>
      </Field>
    </div>
  );
}


function isVisible(slot: SlotDef, slots: Record<string, any>): boolean {
  if (!slot.visibleWhen) return true;
  return slot.visibleWhen.in.includes(slots[slot.visibleWhen.key]);
}


function SlotInput({
  slot, value, onChange, docs, groupedDocs, rulebooks,
}: {
  slot: SlotDef;
  value: any;
  onChange: (v: any) => void;
  docs: DocOption[];
  groupedDocs: Record<string, DocOption[]>;
  rulebooks: Array<{ slug: string; name: string }>;
}) {
  const requiredMark = slot.required ? <span className="text-destructive ml-1">*</span> : null;

  return (
    <Field
      label={<>{slot.label}{requiredMark}</>}
      hint={
        slot.hint ||
        (slot.type === 'doc-types' && Array.isArray(value) ? `${value.length} selected` : undefined)
      }
    >
      {slot.type === 'string' && (
        <Input
          placeholder={slot.placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {slot.type === 'multiline' && (
        <Textarea
          rows={3}
          placeholder={slot.placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm"
        />
      )}
      {slot.type === 'number' && (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
      )}
      {slot.type === 'select' && (
        <Select value={value ?? ''} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue placeholder={slot.placeholder} /></SelectTrigger>
          <SelectContent>
            {(slot.options || []).map(o => (
              <SelectItem key={o.value} value={o.value}>
                <span className="font-medium">{o.label}</span>
                {o.hint && <span className="ml-2 text-[11px] text-muted-foreground">{o.hint}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {slot.type === 'boolean' && (
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <Checkbox checked={!!value} onCheckedChange={(c) => onChange(c === true)} />
          <span className="text-xs text-muted-foreground">{slot.placeholder || 'Enabled'}</span>
        </label>
      )}
      {slot.type === 'census-rulebook' && (
        <Select value={value || '__auto'} onValueChange={(v) => onChange(v === '__auto' ? '' : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__auto"><span className="font-medium">Auto-select (best fit)</span></SelectItem>
            {rulebooks.map(rb => (
              <SelectItem key={rb.slug} value={rb.slug}>{rb.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {slot.type === 'doc-type' && (
        <Select value={value ?? ''} onValueChange={(v) => onChange(v)}>
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
          groupedDocs={groupedDocs}
          values={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      )}
      {slot.type === 'field-pairs' && (
        <FieldPairsEditor
          docs={docs}
          values={Array.isArray(value) ? value : []}
          onChange={onChange}
        />
      )}
    </Field>
  );
}


function Field({
  label, hint, children,
}: {
  label: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}


function SeverityChip({
  label, sub, selected, onClick,
}: {
  label: string; sub: string; selected: boolean; onClick: () => void;
}) {
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
  groupedDocs, values, onChange,
}: {
  groupedDocs: Record<string, DocOption[]>;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (slug: string) =>
    onChange(values.includes(slug) ? values.filter(s => s !== slug) : [...values, slug]);

  const total = Object.values(groupedDocs).reduce((n, list) => n + list.length, 0);
  if (total === 0) {
    return <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md">No document types yet.</p>;
  }
  return (
    <div className="border border-border rounded-md p-2 max-h-60 overflow-y-auto space-y-2">
      {Object.entries(groupedDocs).map(([cat, list]) => (
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


function FieldPairsEditor({
  docs, values, onChange,
}: {
  docs: DocOption[];
  values: FieldPair[];
  onChange: (v: FieldPair[]) => void;
}) {
  const update = (idx: number, patch: Partial<FieldPair>) =>
    onChange(values.map((p, i) => i === idx ? { ...p, ...patch } : p));
  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));
  const add = () => onChange([...values, { source_doc: '', source_field: '', target_doc: '', target_field: '' }]);

  return (
    <div className="space-y-2">
      {values.length === 0 && (
        <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-md">
          No pairs yet — click "Add pair" below.
        </p>
      )}
      {values.map((p, idx) => (
        <div key={idx} className="rounded-md border border-border p-2 bg-muted/10 space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <Select value={p.source_doc} onValueChange={(v) => update(idx, { source_doc: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Source document" /></SelectTrigger>
              <SelectContent>
                {docs.map(d => <SelectItem key={d.id} value={d.doc_type}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-xs"
              placeholder="Source field, e.g. Company Name"
              value={p.source_field}
              onChange={(e) => update(idx, { source_field: e.target.value })}
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => remove(idx)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <Select value={p.target_doc} onValueChange={(v) => update(idx, { target_doc: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target document" /></SelectTrigger>
              <SelectContent>
                {docs.map(d => <SelectItem key={d.id} value={d.doc_type}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              className="h-8 text-xs"
              placeholder="Target field"
              value={p.target_field}
              onChange={(e) => update(idx, { target_field: e.target.value })}
            />
            <div className="w-7" />
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Add pair
      </Button>
    </div>
  );
}
