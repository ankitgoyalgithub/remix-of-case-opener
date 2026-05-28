import { useState } from 'react';
import { AgentTrace, AgentTraceStep } from '@/types/case';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Cpu, ChevronDown, ChevronRight, Clock, ExternalLink,
    Code2, Sparkles, FileText, Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DOCUMENT_TYPE_LABELS } from '@/types/case';

interface AgentTracePanelProps {
    trace?: AgentTrace;
    runAt?: string;
}

function Field({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
    if (value == null || value === '') return null;
    return (
        <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className={cn('text-sm text-foreground', mono && 'font-mono text-xs break-all')}>{value}</p>
        </div>
    );
}

function SourceIcon({ type }: { type: string }) {
    if (type === 'url') return <Globe className="h-3.5 w-3.5 text-primary" />;
    if (type === 'document') return <FileText className="h-3.5 w-3.5 text-info" />;
    return <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />;
}

function StepCard({ step, index }: { step: AgentTraceStep; index: number }) {
    const [expanded, setExpanded] = useState(false);

    const durationMs = step.duration_ms ?? 0;
    const durationLabel = durationMs > 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`;
    const statusColor = step.status === 'pass' ? 'text-success'
        : step.status === 'fail' ? 'text-destructive'
        : step.status === 'pending' ? 'text-warning'
        : 'text-muted-foreground';

    return (
        <div className="border border-border rounded-md overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate" title={`Step ${index + 1} · ${step.handler || 'handler'}`}>
                        Step {index + 1} · {step.handler || 'handler'}
                    </span>
                    {step.status && (
                        <span className={cn('text-[10px] font-semibold uppercase', statusColor)}>
                            {step.status}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
                    {step.model && (
                        <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {step.model}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {durationLabel}
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="px-3 py-3 space-y-3 bg-background">
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Handler" value={step.handler} />
                        <Field label="Model" value={step.model} />
                        <Field label="Provider" value={step.provider} />
                        <Field label="Duration" value={durationLabel} />
                        <Field label="Ran at" value={step.ran_at ? format(new Date(step.ran_at), 'dd MMM yyyy HH:mm:ss') : undefined} />
                        <Field label="Entity" value={step.entity_name} />
                        <Field label="Entity source" value={step.entity_source} />
                        <Field label="Focus" value={step.focus} />
                        <Field label="Action" value={step.action} />
                    </div>

                    {step.prompt && (
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                                <Code2 className="h-3 w-3" /> Prompt
                            </p>
                            <pre className="text-xs text-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap break-words font-mono">
                                {step.prompt}
                            </pre>
                        </div>
                    )}

                    {step.instruction && (
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-1">
                                <Code2 className="h-3 w-3" /> Instruction
                            </p>
                            <pre className="text-xs text-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap break-words font-mono">
                                {step.instruction}
                            </pre>
                        </div>
                    )}

                    {step.plan && (
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Saved plan</p>
                            <pre className="text-xs text-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap break-words font-mono">
                                {JSON.stringify(step.plan, null, 2)}
                            </pre>
                        </div>
                    )}

                    {step.tavily_answer && (
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Search provider summary
                            </p>
                            <p className="text-xs text-foreground bg-muted/40 rounded p-2 whitespace-pre-wrap">
                                {step.tavily_answer}
                            </p>
                        </div>
                    )}

                    {step.summary && (
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Model summary
                            </p>
                            <p className="text-xs text-foreground bg-muted/40 rounded p-2">
                                {step.summary}
                            </p>
                        </div>
                    )}

                    {step.sources && step.sources.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Sources consulted ({step.sources.length})
                            </p>
                            <div className="space-y-1.5">
                                {step.sources.map((s, i) => {
                                    const docLabel = s.type === 'document' && s.ref
                                        ? DOCUMENT_TYPE_LABELS[s.ref as keyof typeof DOCUMENT_TYPE_LABELS] || s.ref
                                        : s.label || s.ref;
                                    return (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                            <SourceIcon type={s.type} />
                                            {s.type === 'url' && s.ref ? (
                                                <a
                                                    href={s.ref}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline inline-flex items-center gap-1 min-w-0"
                                                    title={s.label ? `${s.label} — ${s.ref}` : s.ref}
                                                >
                                                    <span className="truncate">{s.label || s.ref}</span>
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                </a>
                                            ) : (
                                                <span className="text-foreground">{docLabel}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function AgentTracePanel({ trace, runAt }: AgentTracePanelProps) {
    const [open, setOpen] = useState(false);

    const steps = trace?.steps || [];
    if (steps.length === 0 && !trace?.definition_prompt && !trace?.definition_plan) return null;

    const totalMs = steps.reduce((sum, s) => sum + (s.duration_ms || 0), 0);
    const totalLabel = totalMs > 1000 ? `${(totalMs / 1000).toFixed(1)}s` : `${totalMs}ms`;

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-border hover:bg-muted/40 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {open ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">Agent trace</span>
                    <Badge variant="outline" className="text-[10px]">
                        {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                    </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {totalLabel}
                    </span>
                    {runAt && (
                        <span>{format(new Date(runAt), 'dd MMM HH:mm')}</span>
                    )}
                </div>
            </button>

            {open && (
                <div className="space-y-2 pl-1">
                    {steps.map((step, i) => (
                        <StepCard key={i} step={step} index={i} />
                    ))}

                    {(trace?.definition_prompt || trace?.definition_plan) && (
                        <div className="border border-border rounded-md px-3 py-2 bg-muted/10">
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                Definition (configured in AI Studio)
                            </p>
                            {trace.definition_prompt && (
                                <Field label="Prompt" value={trace.definition_prompt} />
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
