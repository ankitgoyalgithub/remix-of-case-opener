import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Plug, Zap, Loader2, AlertTriangle, ArrowRight, FileText, Text,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';

/**
 * Picks an integration capability + maps its inputs to either:
 *   - a literal string
 *   - an extraction path ($.<doc-type>.extraction.<field>)
 *
 * Persists as:
 *   {
 *     capability_key: 'karza.gstin_verify',
 *     input_mapping: { gstin: '$.trade-license.extraction.GSTIN' },
 *     pass_condition: { status: 'ACTIVE' }  // optional per-item override
 *   }
 */
export interface CapabilityPickerValue {
    capability_key?: string;
    input_mapping?: Record<string, string>;
    pass_condition?: Record<string, any>;
}

interface CapabilityPickerProps {
    value: CapabilityPickerValue;
    onChange: (next: CapabilityPickerValue) => void;
    /** Document types available for extraction-path pickers. */
    docTypes?: Array<{ doc_type: string; name: string; extraction_keys?: string[] }>;
}

interface Capability {
    id: string;
    key: string;
    display_name: string;
    description: string;
    http_method: string;
    path: string;
    input_schema: Record<string, any>;
    passed_when: Record<string, any>;
    enabled: boolean;
    provider: string;
}

interface Provider {
    id: string;
    name: string;
    enabled: boolean;
    capabilities: Capability[];
}

function inputFieldsFromSchema(schema: Record<string, any> | null | undefined): string[] {
    if (!schema || typeof schema !== 'object') return [];
    // Support both { required: ['a','b'], properties: {...} } and plain { a: {...}, b: {...} }.
    if (Array.isArray(schema.required)) return schema.required.map(String);
    if (schema.properties && typeof schema.properties === 'object') {
        return Object.keys(schema.properties);
    }
    return Object.keys(schema);
}

export function CapabilityPicker({ value, onChange, docTypes = [] }: CapabilityPickerProps) {
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(true);
    const [docTypesList, setDocTypesList] = useState<Array<{ doc_type: string; name: string; extraction_keys?: string[] }>>(docTypes);
    const [passConditionText, setPassConditionText] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const [ps, dt] = await Promise.all([
                    api.integrations.providers.list(),
                    docTypes.length > 0 ? Promise.resolve(docTypes) : api.studio.documents.list(),
                ]);
                setProviders(ps);
                setDocTypesList(dt);
            } catch (err) {
                console.error('Failed to load capabilities', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        setPassConditionText(
            value.pass_condition && Object.keys(value.pass_condition).length > 0
                ? JSON.stringify(value.pass_condition, null, 2)
                : '',
        );
    }, [value.pass_condition]);

    const allCapabilities = useMemo(() => {
        const out: Array<{ capability: Capability; provider: Provider }> = [];
        for (const p of providers) {
            if (!p.enabled) continue;
            for (const c of p.capabilities) {
                if (c.enabled) out.push({ capability: c, provider: p });
            }
        }
        return out;
    }, [providers]);

    const selected = useMemo(
        () => allCapabilities.find(x => x.capability.key === value.capability_key),
        [allCapabilities, value.capability_key],
    );

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading capabilities…
            </div>
        );
    }

    if (allCapabilities.length === 0) {
        return (
            <div className="flex items-start gap-3 p-3 rounded-md border border-warning/30 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-medium">No integration capabilities available.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Add a provider + enable at least one capability under <strong>Studio → Integrations</strong>, then come back here.
                    </p>
                </div>
            </div>
        );
    }

    const inputFields = inputFieldsFromSchema(selected?.capability.input_schema);

    const onPickCapability = (key: string) => {
        const next = allCapabilities.find(x => x.capability.key === key);
        // Seed the input_mapping with the capability's input keys so the user sees rows to fill in.
        const seeded: Record<string, string> = {};
        if (next) {
            for (const f of inputFieldsFromSchema(next.capability.input_schema)) {
                seeded[f] = value.input_mapping?.[f] ?? '';
            }
        }
        onChange({
            capability_key: key,
            input_mapping: seeded,
            pass_condition: value.pass_condition,
        });
    };

    const setFieldValue = (field: string, newValue: string) => {
        onChange({
            ...value,
            input_mapping: { ...(value.input_mapping || {}), [field]: newValue },
        });
    };

    return (
        <div className="space-y-4 w-full">
            {/* Capability selector */}
            <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Capability
                </Label>
                <Select value={value.capability_key || ''} onValueChange={onPickCapability}>
                    <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pick a capability to invoke" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                        {providers.map(provider => {
                            const caps = provider.capabilities.filter(c => c.enabled);
                            if (caps.length === 0) return null;
                            return (
                                <div key={provider.id}>
                                    <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 bg-muted/30">
                                        {provider.name}
                                    </div>
                                    {caps.map(cap => (
                                        <SelectItem key={cap.id} value={cap.key}>
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-3 w-3 text-primary" />
                                                <span>{cap.display_name}</span>
                                                <code className="text-[10px] text-muted-foreground">{cap.key}</code>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </div>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {selected && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
                    {/* Capability card */}
                    <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/15 to-info/10 text-primary flex items-center justify-center shrink-0">
                            <Plug className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold">{selected.capability.display_name}</p>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5">{selected.provider.name}</Badge>
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                                    {selected.capability.http_method} {selected.capability.path}
                                </Badge>
                            </div>
                            {selected.capability.description && (
                                <p className="text-xs text-muted-foreground mt-1">{selected.capability.description}</p>
                            )}
                        </div>
                    </div>

                    {/* Input mapping */}
                    {inputFields.length > 0 ? (
                        <div className="space-y-2">
                            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Map inputs from the request
                            </Label>
                            <div className="space-y-1.5">
                                {inputFields.map(field => (
                                    <InputMappingRow
                                        key={field}
                                        field={field}
                                        value={value.input_mapping?.[field] || ''}
                                        docTypes={docTypesList}
                                        onChange={(v) => setFieldValue(field, v)}
                                    />
                                ))}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Pick an extracted field from one of the uploaded documents, or provide a literal value.
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">
                            This capability has no declared inputs. The request ID alone will be forwarded.
                        </p>
                    )}

                    {/* Pass condition override */}
                    <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                            Advanced: override pass condition
                        </summary>
                        <div className="mt-2 space-y-1.5">
                            <Textarea
                                rows={3}
                                value={passConditionText}
                                placeholder={
                                    selected.capability.passed_when && Object.keys(selected.capability.passed_when).length
                                        ? `Default: ${JSON.stringify(selected.capability.passed_when)}`
                                        : '{ "status": "ACTIVE" }'
                                }
                                onChange={(e) => {
                                    setPassConditionText(e.target.value);
                                    const t = e.target.value.trim();
                                    if (!t) {
                                        onChange({ ...value, pass_condition: undefined });
                                        return;
                                    }
                                    try {
                                        const parsed = JSON.parse(t);
                                        onChange({ ...value, pass_condition: parsed });
                                    } catch {
                                        // leave the text as-is; parent doesn't update until valid JSON
                                    }
                                }}
                                className="font-mono text-xs resize-none"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Blank = use the capability's default. Otherwise provide JSON like <code>{'{ "status": "ACTIVE" }'}</code>.
                            </p>
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}

function InputMappingRow({
    field, value, docTypes, onChange,
}: {
    field: string;
    value: string;
    docTypes: Array<{ doc_type: string; name: string; extraction_keys?: string[] }>;
    onChange: (v: string) => void;
}) {
    const isPath = value.startsWith('$.');
    const [mode, setMode] = useState<'extraction' | 'literal'>(isPath ? 'extraction' : 'literal');

    // Parse $.<doc-type>.extraction.<field>
    let currentDoc = '';
    let currentField = '';
    if (isPath) {
        const parts = value.slice(2).split('.');
        currentDoc = parts[0] || '';
        currentField = parts.slice(2).join('.') || '';
    }

    const selectedDocDef = docTypes.find(d => d.doc_type === currentDoc);
    const fieldOptions = selectedDocDef?.extraction_keys || [];

    return (
        <div className="flex items-center gap-2">
            <div className="w-32 shrink-0">
                <Badge variant="outline" className="font-mono text-[11px] w-full justify-start truncate">
                    {field}
                </Badge>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1.5 bg-background border border-border rounded-md p-0.5">
                <button
                    type="button"
                    onClick={() => { setMode('extraction'); onChange(''); }}
                    title="Pull from a document extraction"
                    className={cn(
                        'h-6 px-2 rounded text-[11px] font-medium flex items-center gap-1',
                        mode === 'extraction' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                    )}
                >
                    <FileText className="h-3 w-3" /> Doc
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('literal'); onChange(''); }}
                    title="Type a literal value"
                    className={cn(
                        'h-6 px-2 rounded text-[11px] font-medium flex items-center gap-1',
                        mode === 'literal' ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
                    )}
                >
                    <Text className="h-3 w-3" /> Literal
                </button>
            </div>
            <div className="flex items-center gap-1.5 flex-1">
                {mode === 'extraction' ? (
                    <>
                        <Select
                            value={currentDoc}
                            onValueChange={(doc) => {
                                // Keep field if it still exists in the new doc type
                                const newField = (docTypes.find(d => d.doc_type === doc)?.extraction_keys || []).includes(currentField)
                                    ? currentField : '';
                                onChange(newField ? `$.${doc}.extraction.${newField}` : `$.${doc}.extraction.`);
                            }}
                        >
                            <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder="Document" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                {docTypes.map(dt => (
                                    <SelectItem key={dt.doc_type} value={dt.doc_type}>
                                        {DOCUMENT_TYPE_LABELS[dt.doc_type as DocumentType] || dt.name || dt.doc_type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={currentField}
                            onValueChange={(f) => onChange(`$.${currentDoc}.extraction.${f}`)}
                            disabled={!currentDoc || fieldOptions.length === 0}
                        >
                            <SelectTrigger className="h-8 text-xs flex-1">
                                <SelectValue placeholder={fieldOptions.length === 0 ? 'No extraction fields' : 'Field'} />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                {fieldOptions.map(f => (
                                    <SelectItem key={f} value={f}>{f}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </>
                ) : (
                    <Input
                        className="h-8 text-xs"
                        placeholder="e.g. ACME Corp"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                )}
            </div>
        </div>
    );
}
