import { useEffect, useState } from 'react';
import { FileText, CheckSquare, Globe2, AlertTriangle, ChevronDown, Loader2, Check, X, Clock, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

interface ReadinessPanelProps {
    requestId: string;
    /** Bumped by parent when the request data changes so the panel refetches. */
    refreshKey?: number;
}

type OverallStatus = 'ready' | 'blocked' | 'review' | 'waiting';

interface DocumentItem {
    doc_type: string;
    name: string;
    required: boolean;
    state: 'received' | 'processing' | 'failed' | 'missing';
    document_id: string | null;
    uploaded_at: string | null;
}

interface CheckItem {
    id: string;
    name: string;
    item_type: string;
    handler: string | null;
    stage_name: string | null;
    required: boolean;
    status: 'passed' | 'failed' | 'pending' | 'not_run' | 'error';
    summary: string | null;
    run_at: string | null;
}

interface RiskFlagItem {
    id: number;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    flag_type: string;
    check_type: string;
    title: string;
    description: string;
    document_type: string | null;
    resolved: boolean;
    resolution_note: string | null;
    blocking: boolean;
}

interface Readiness {
    overall: { status: OverallStatus; headline: string };
    documents: { total: number; received: number; missing: number; processing: number; failed: number; required_missing: number; items: DocumentItem[] };
    internal_checks: { total: number; passed: number; failed: number; pending: number; error: number; items: CheckItem[] };
    external_checks: { total: number; passed: number; failed: number; pending: number; error: number; items: CheckItem[] };
    risk_flags: { total: number; unresolved: number; blocking: number; items: RiskFlagItem[] };
}

type PillarKey = 'documents' | 'internal' | 'external' | 'risks';

const OVERALL_STYLE: Record<OverallStatus, { chip: string; label: string }> = {
    ready: { chip: 'bg-success/10 text-success', label: 'Ready' },
    blocked: { chip: 'bg-destructive/10 text-destructive', label: 'Blocked' },
    review: { chip: 'bg-warning/10 text-warning', label: 'Review' },
    waiting: { chip: 'bg-muted text-muted-foreground', label: 'Waiting' },
};

export function ReadinessPanel({ requestId, refreshKey }: ReadinessPanelProps) {
    const [data, setData] = useState<Readiness | null>(null);
    const [loading, setLoading] = useState(true);
    const [openPillar, setOpenPillar] = useState<PillarKey | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                const res = await api.requests.readiness(requestId);
                if (!cancelled) setData(res);
            } catch (err) {
                console.error('Failed to load readiness', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [requestId, refreshKey]);

    if (loading && !data) {
        return (
            <div className="border-b border-border bg-background px-6 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Evaluating readiness…
            </div>
        );
    }

    if (!data) return null;

    const { overall, documents, internal_checks, external_checks, risk_flags } = data;

    const togglePillar = (key: PillarKey) => setOpenPillar(prev => (prev === key ? null : key));

    return (
        <div className="border-b border-border bg-background">
            {/* Headline bar */}
            <div className="flex items-center gap-4 px-6 py-3">
                <span className={cn('inline-flex items-center px-2 h-6 rounded text-xs font-semibold uppercase tracking-wide', OVERALL_STYLE[overall.status].chip)}>
                    {OVERALL_STYLE[overall.status].label}
                </span>
                <p className="text-sm text-foreground font-medium">{overall.headline}</p>
            </div>

            {/* Pillar tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-border">
                <PillarTile
                    icon={FileText}
                    label="Documents"
                    primary={`${documents.received} / ${documents.total}`}
                    secondary={documents.required_missing > 0 ? `${documents.required_missing} required missing` : documents.processing > 0 ? `${documents.processing} processing` : 'All required received'}
                    tone={documents.required_missing > 0 ? 'bad' : documents.processing > 0 ? 'warn' : 'ok'}
                    active={openPillar === 'documents'}
                    onClick={() => togglePillar('documents')}
                />
                <PillarTile
                    icon={CheckSquare}
                    label="Data checks"
                    primary={`${internal_checks.passed} / ${internal_checks.total}`}
                    secondary={internal_checks.failed > 0 ? `${internal_checks.failed} failed` : internal_checks.pending > 0 ? `${internal_checks.pending} to run` : 'All passed'}
                    tone={internal_checks.failed > 0 || internal_checks.error > 0 ? 'bad' : internal_checks.pending > 0 ? 'warn' : 'ok'}
                    active={openPillar === 'internal'}
                    onClick={() => togglePillar('internal')}
                />
                <PillarTile
                    icon={Globe2}
                    label="External"
                    primary={`${external_checks.passed} / ${external_checks.total}`}
                    secondary={external_checks.failed > 0 ? `${external_checks.failed} failed` : external_checks.pending > 0 ? `${external_checks.pending} pending` : external_checks.total === 0 ? 'None configured' : 'All passed'}
                    tone={external_checks.failed > 0 || external_checks.error > 0 ? 'bad' : external_checks.pending > 0 ? 'warn' : 'ok'}
                    active={openPillar === 'external'}
                    onClick={() => togglePillar('external')}
                />
                <PillarTile
                    icon={AlertTriangle}
                    label="Risk flags"
                    primary={risk_flags.unresolved === 0 ? 'None' : `${risk_flags.unresolved}`}
                    secondary={risk_flags.blocking > 0 ? `${risk_flags.blocking} blocking` : risk_flags.unresolved > 0 ? `${risk_flags.unresolved} to review` : 'Clear'}
                    tone={risk_flags.blocking > 0 ? 'bad' : risk_flags.unresolved > 0 ? 'warn' : 'ok'}
                    active={openPillar === 'risks'}
                    onClick={() => togglePillar('risks')}
                />
            </div>

            {/* Drill-down */}
            {openPillar && (
                <div className="border-t border-border bg-muted/30 px-6 py-3 max-h-64 overflow-y-auto">
                    {openPillar === 'documents' && <DocumentsDrill items={documents.items} />}
                    {openPillar === 'internal' && <ChecksDrill items={internal_checks.items} emptyText="No data checks configured for this workflow." />}
                    {openPillar === 'external' && <ChecksDrill items={external_checks.items} emptyText="No external checks configured for this workflow." />}
                    {openPillar === 'risks' && <RiskFlagsDrill items={risk_flags.items} />}
                </div>
            )}
        </div>
    );
}

// ---------- Pillar tile ----------

function PillarTile({
    icon: Icon,
    label,
    primary,
    secondary,
    tone,
    active,
    onClick,
}: {
    icon: any;
    label: string;
    primary: string;
    secondary: string;
    tone: 'ok' | 'warn' | 'bad';
    active: boolean;
    onClick: () => void;
}) {
    const toneClasses = {
        ok: 'text-success',
        warn: 'text-warning',
        bad: 'text-destructive',
    }[tone];

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex items-center gap-3 px-5 py-3 text-left border-r border-border last:border-r-0 transition-colors',
                'hover:bg-muted/40',
                active && 'bg-muted/50'
            )}
        >
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', active && 'rotate-180')} />
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{primary}</p>
                <p className={cn('text-xs mt-0.5 truncate', toneClasses)} title={secondary}>{secondary}</p>
            </div>
        </button>
    );
}

// ---------- Drill-downs ----------

function DocumentsDrill({ items }: { items: DocumentItem[] }) {
    if (items.length === 0) {
        return <EmptyRow text="No document types configured." />;
    }
    return (
        <ul className="divide-y divide-border/60 rounded-md bg-background border border-border/60">
            {items.map(item => (
                <li key={item.doc_type} className="flex items-center gap-3 px-3 py-2">
                    <DocStateIcon state={item.state} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate" title={item.name}>{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {item.required ? 'Required' : 'Optional'}
                            {item.state === 'missing' && ' · not uploaded'}
                            {item.state === 'processing' && ' · extracting…'}
                            {item.state === 'failed' && ' · extraction failed'}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    );
}

function ChecksDrill({ items, emptyText }: { items: CheckItem[]; emptyText: string }) {
    if (items.length === 0) {
        return <EmptyRow text={emptyText} />;
    }
    return (
        <ul className="divide-y divide-border/60 rounded-md bg-background border border-border/60">
            {items.map(item => (
                <li key={item.id} className="flex items-start gap-3 px-3 py-2">
                    <CheckStateIcon status={item.status} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {item.stage_name && <span>{item.stage_name} · </span>}
                            <span className="capitalize">{item.item_type.replace(/-/g, ' ')}</span>
                            {item.status === 'not_run' && ' · not run yet'}
                            {item.status === 'pending' && ' · pending'}
                        </p>
                        {item.summary && (
                            <p className="text-xs text-muted-foreground/90 mt-0.5 break-words leading-relaxed">{item.summary}</p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function RiskFlagsDrill({ items }: { items: RiskFlagItem[] }) {
    if (items.length === 0) {
        return <EmptyRow text="No risk flags raised." />;
    }
    return (
        <ul className="divide-y divide-border/60 rounded-md bg-background border border-border/60">
            {items.map(item => (
                <li key={item.id} className="flex items-start gap-3 px-3 py-2">
                    <CircleAlert className={cn('h-4 w-4 mt-0.5 shrink-0',
                        item.severity === 'critical' || item.severity === 'high' ? 'text-destructive' :
                        item.severity === 'medium' ? 'text-warning' : 'text-muted-foreground'
                    )} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn('text-sm font-medium', item.resolved ? 'text-muted-foreground line-through' : 'text-foreground')}>
                                {item.title}
                            </p>
                            <span className={cn('text-[10px] uppercase font-semibold px-1.5 h-4 rounded inline-flex items-center',
                                item.severity === 'critical' && 'bg-destructive/10 text-destructive',
                                item.severity === 'high' && 'bg-destructive/10 text-destructive',
                                item.severity === 'medium' && 'bg-warning/10 text-warning',
                                item.severity === 'low' && 'bg-muted text-muted-foreground',
                                item.severity === 'info' && 'bg-muted text-muted-foreground',
                            )}>
                                {item.severity}
                            </span>
                            {item.resolved && <span className="text-[10px] uppercase font-semibold px-1.5 h-4 rounded bg-success/10 text-success inline-flex items-center">Resolved</span>}
                        </div>
                        {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 break-words leading-relaxed">{item.description}</p>
                        )}
                        {item.document_type && (
                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">From {item.document_type}</p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function EmptyRow({ text }: { text: string }) {
    return (
        <div className="text-xs text-muted-foreground py-3 text-center bg-background border border-border/60 rounded-md">
            {text}
        </div>
    );
}

function DocStateIcon({ state }: { state: DocumentItem['state'] }) {
    if (state === 'received') return <Check className="h-4 w-4 text-success shrink-0" />;
    if (state === 'processing') return <Loader2 className="h-4 w-4 text-warning animate-spin shrink-0" />;
    if (state === 'failed') return <X className="h-4 w-4 text-destructive shrink-0" />;
    return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function CheckStateIcon({ status }: { status: CheckItem['status'] }) {
    if (status === 'passed') return <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />;
    if (status === 'failed') return <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />;
    if (status === 'error') return <CircleAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />;
    if (status === 'pending') return <Loader2 className="h-4 w-4 text-warning animate-spin mt-0.5 shrink-0" />;
    return <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />;
}
