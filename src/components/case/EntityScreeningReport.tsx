import { ChecklistValidationResult, ChecklistRuleResult } from '@/types/case';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ShieldCheck, AlertTriangle, ExternalLink, Clock, Search, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { severityMeta, bySeverity } from '@/lib/status';

interface EntityScreeningReportProps {
    result: ChecklistValidationResult;
    itemLabel?: string;
}

function parseEntityRow(row: ChecklistRuleResult) {
    const entity = row.source_value || '';
    const provider = row.target_value || '';
    // Note looks like: "Screening 'X' (source: Y) via Z."
    const sourceMatch = (row.note || '').match(/source:\s*([^)]+)\)/i);
    const resolutionSource = sourceMatch ? sourceMatch[1].trim() : undefined;
    return { entity, provider, resolutionSource };
}

export function EntityScreeningReport({ result, itemLabel }: EntityScreeningReportProps) {
    const details = (result.details || []) as (ChecklistRuleResult & { source_url?: string })[];

    const entityRow = details.find(r => r.rule === 'Entity');
    const verdictRow = details.find(r => r.rule === 'Result' || r.rule === 'Screening status');
    const findingRows = details.filter(
        r => r.rule !== 'Entity' && r.rule !== 'Result' && r.rule !== 'Screening status',
    );

    const entityMeta = entityRow ? parseEntityRow(entityRow) : { entity: '', provider: '', resolutionSource: undefined };
    const runAt = result.run_at ? new Date(result.run_at) : null;

    const sortedFindings = [...findingRows].sort(bySeverity(f => f.target_value));

    const hasHighSeverity = sortedFindings.some(f => {
        const s = (f.target_value || '').toLowerCase();
        return s === 'high' || s === 'critical';
    });

    const verdictStyles = result.status === 'pass'
        ? 'border-success/30 bg-success/5'
        : result.status === 'fail'
        ? 'border-destructive/30 bg-destructive/5'
        : 'border-warning/30 bg-warning/5';
    const VerdictIcon = result.status === 'pass' ? ShieldCheck : result.status === 'fail' ? ShieldAlert : AlertTriangle;

    return (
        <div className="space-y-5">
            {/* Header: entity + verdict */}
            <div className={cn('rounded-lg border p-4 flex items-start gap-4', verdictStyles)}>
                <div className="shrink-0 h-10 w-10 rounded-md bg-background border border-border flex items-center justify-center">
                    <VerdictIcon className={cn(
                        'h-5 w-5',
                        result.status === 'pass' ? 'text-success'
                            : result.status === 'fail' ? 'text-destructive'
                            : 'text-warning',
                    )} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-semibold text-foreground truncate">
                            {entityMeta.entity || itemLabel || 'Background check'}
                        </h4>
                        <Badge
                            variant="outline"
                            className={cn(
                                'text-[11px] font-semibold uppercase',
                                result.status === 'pass'
                                    ? 'bg-success/10 text-success border-success/30'
                                    : result.status === 'fail'
                                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                                    : 'bg-warning/10 text-warning border-warning/30',
                            )}
                        >
                            {result.status === 'pass' ? 'Clear' : result.status === 'fail' ? 'Adverse signals' : 'Needs attention'}
                        </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        {entityMeta.resolutionSource && (
                            <div>
                                <p className="text-muted-foreground">Company identified from</p>
                                <p className="font-medium text-foreground">{entityMeta.resolutionSource}</p>
                            </div>
                        )}
                        {entityMeta.provider && (
                            <div>
                                <p className="text-muted-foreground">Service</p>
                                <p className="font-medium text-foreground">{entityMeta.provider}</p>
                            </div>
                        )}
                        {runAt && (
                            <div>
                                <p className="text-muted-foreground">Last run</p>
                                <p className="font-medium text-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(runAt, 'dd MMM yyyy HH:mm')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Investigation narrative */}
            <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        What the background check found
                    </p>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                    {verdictRow?.note
                        || (sortedFindings.length === 0
                            ? 'No adverse signals were found for this company.'
                            : 'The items below were flagged for review.')}
                </p>
                {entityRow?.note && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                        How this was checked: {entityRow.note}
                    </p>
                )}
            </div>

            {/* Findings */}
            {sortedFindings.length > 0 ? (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Findings ({sortedFindings.length})
                        </p>
                        {hasHighSeverity && (
                            <Badge variant="critical" className="text-[10px] font-semibold uppercase">
                                High-severity findings
                            </Badge>
                        )}
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/30 text-[11px] uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Category</th>
                                    <th className="px-3 py-2 font-semibold">Finding</th>
                                    <th className="px-3 py-2 font-semibold">Severity</th>
                                    <th className="px-3 py-2 font-semibold">Source</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {sortedFindings.map((f, idx) => {
                                    const sev = severityMeta(f.target_value || 'info');
                                    return (
                                        <tr key={idx} className="align-top">
                                            <td className="px-3 py-3">
                                                <span className="text-xs font-medium text-foreground">{f.rule}</span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-sm font-medium text-foreground">{f.source_value || 'Finding'}</p>
                                                {f.note && (
                                                    <p className="text-xs text-muted-foreground mt-1">{f.note}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <Badge variant={sev.variant} className="text-[10px] font-semibold uppercase">
                                                    {sev.label}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-3">
                                                {f.source_url ? (
                                                    <a
                                                        href={f.source_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Open source
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-medium text-foreground">No adverse signals detected</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            We searched public sources for sanctions, politically exposed persons (PEP),
                            adverse media and regulatory actions, and found nothing that looks like a genuine
                            red flag for this company.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
