import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface HandlerField {
  key: string;
  label: string;
  type:
    | 'string' | 'multiline' | 'number' | 'boolean'
    | 'select' | 'doc-type' | 'doc-types'
    | 'cv-rule-ids' | 'credential' | 'json';
  required?: boolean;
  optional?: boolean;
  placeholder?: string;
  default?: any;
  options?: Array<{ value: string; label: string }>;
  multi?: boolean;
}

interface DocOption { id: number; name: string; doc_type: string; category: string; }
interface CvRuleOption { id: number; name: string; source_doc_type: string; target_doc_type: string; mode?: string; }
interface CredentialOption { id: number; name: string; provider?: string | { name?: string }; }

interface Props {
  schema: HandlerField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
}

export function HandlerSchemaForm({ schema, values, onChange }: Props) {
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [cvRules, setCvRules] = useState<CvRuleOption[]>([]);
  const [credentials, setCredentials] = useState<CredentialOption[]>([]);

  // Lazy-load only the lookups the schema actually references.
  useEffect(() => {
    const types = new Set(schema.map(f => f.type));
    if (types.has('doc-type') || types.has('doc-types')) {
      api.studio.documents.list().then(d => setDocs(d as DocOption[])).catch(() => setDocs([]));
    }
    if (types.has('cv-rule-ids')) {
      api.studio.cvRules.list().then(d => setCvRules(d as CvRuleOption[])).catch(() => setCvRules([]));
    }
    if (types.has('credential')) {
      api.integrations.credentials.list().then(d => setCredentials(d as CredentialOption[])).catch(() => setCredentials([]));
    }
  }, [schema]);

  const set = (k: string, v: any) => onChange({ ...values, [k]: v });

  if (!schema || schema.length === 0) {
    return <p className="text-[11px] text-muted-foreground">This handler has no extra configuration.</p>;
  }

  return (
    <div className="space-y-4">
      {schema.map(field => {
        const value = values[field.key] !== undefined ? values[field.key] : field.default;
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              {field.label}{field.required && <span className="text-destructive ml-1">*</span>}
              {field.optional && <span className="text-muted-foreground/60 ml-1">(optional)</span>}
            </Label>

            {field.type === 'string' && (
              <Input
                value={value ?? ''}
                placeholder={field.placeholder}
                onChange={e => set(field.key, e.target.value)}
              />
            )}

            {field.type === 'multiline' && (
              <Textarea
                rows={4}
                value={value ?? ''}
                placeholder={field.placeholder}
                onChange={e => set(field.key, e.target.value)}
                className="text-sm"
              />
            )}

            {field.type === 'number' && (
              <Input
                type="number"
                value={value ?? ''}
                placeholder={field.placeholder}
                onChange={e => set(field.key, e.target.value === '' ? null : Number(e.target.value))}
              />
            )}

            {field.type === 'boolean' && (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <p className="text-xs text-muted-foreground">{field.placeholder || 'Toggle'}</p>
                <Switch checked={!!value} onCheckedChange={v => set(field.key, v)} />
              </div>
            )}

            {field.type === 'select' && !field.multi && (
              <Select value={value ?? ''} onValueChange={v => set(field.key, v)}>
                <SelectTrigger><SelectValue placeholder={field.placeholder || 'Pick one'} /></SelectTrigger>
                <SelectContent>
                  {(field.options || []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {field.type === 'select' && field.multi && (
              <MultiCheckboxList
                options={(field.options || []).map(o => ({ value: o.value, label: o.label }))}
                values={Array.isArray(value) ? value : []}
                onChange={v => set(field.key, v)}
              />
            )}

            {field.type === 'doc-type' && (
              <Select value={value ?? ''} onValueChange={v => set(field.key, v)}>
                <SelectTrigger><SelectValue placeholder="Pick a document type" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {docs.map(d => <SelectItem key={d.id} value={d.doc_type}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {field.type === 'doc-types' && (
              <MultiCheckboxList
                options={docs.map(d => ({ value: d.doc_type, label: d.name }))}
                values={Array.isArray(value) ? value : []}
                onChange={v => set(field.key, v)}
              />
            )}

            {field.type === 'cv-rule-ids' && (
              <MultiCheckboxList
                options={cvRules.map(r => ({
                  value: String(r.id),
                  label: `${r.name} ${r.mode === 'set-equal' ? '(set-equal)' : `(${r.source_doc_type} ↔ ${r.target_doc_type})`}`,
                }))}
                values={(Array.isArray(value) ? value : []).map(String)}
                onChange={v => set(field.key, v.map(Number))}
              />
            )}

            {field.type === 'credential' && (
              <Select value={value ? String(value) : ''} onValueChange={v => set(field.key, v ? Number(v) : null)}>
                <SelectTrigger><SelectValue placeholder="Pick a credential" /></SelectTrigger>
                <SelectContent>
                  {credentials.length === 0 && (
                    <SelectItem value="__none" disabled>No credentials yet — add one in Integrations</SelectItem>
                  )}
                  {credentials.map(c => {
                    const provider = typeof c.provider === 'string' ? c.provider : (c.provider?.name || 'unknown');
                    return <SelectItem key={c.id} value={String(c.id)}>{c.name} · {provider}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            )}

            {field.type === 'json' && (
              <Textarea
                rows={6}
                value={typeof value === 'string' ? value : (value ? JSON.stringify(value, null, 2) : '')}
                placeholder='{ }'
                onChange={e => set(field.key, e.target.value)}
                className="font-mono text-xs"
                spellCheck={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MultiCheckboxList({
  options, values, onChange,
}: {
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  if (options.length === 0) {
    return <div className="text-xs text-muted-foreground py-2">No options available.</div>;
  }
  const toggle = (v: string) => {
    if (values.includes(v)) onChange(values.filter(x => x !== v));
    else onChange([...values, v]);
  };
  return (
    <div className="space-y-1 max-h-56 overflow-y-auto pr-1 border border-border rounded-md p-2">
      {options.map(o => {
        const checked = values.includes(o.value);
        return (
          <label
            key={o.value}
            className={cn(
              'flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm',
              checked ? 'bg-primary/10' : 'hover:bg-muted/50',
            )}
          >
            <Checkbox checked={checked} onCheckedChange={() => toggle(o.value)} />
            <span className="truncate">{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}
