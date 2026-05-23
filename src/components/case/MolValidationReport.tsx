import { useMemo, useState } from 'react';
import { ChecklistValidationResult, ChecklistRuleResult } from '@/types/case';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Users, CheckCircle2, XCircle, AlertTriangle, Clock, ShieldCheck, Eye,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MolValidationReportProps {
  result: ChecklistValidationResult;
}

interface ParsedSummary {
  total: number;
  autoValidated: number;
  needsReview: number;
  missing: number;
  molTotal: number;
  molMissing: number;
}

function parseSummaryNote(note: string): ParsedSummary {
  const safe = (re: RegExp) => {
    const m = note.match(re);
    return m ? parseInt(m[1], 10) : 0;
  };
  return {
    total:         safe(/^(\d+) census/),
    autoValidated: safe(/(\d+) auto-validated/),
    needsReview:   safe(/(\d+) need review/),
    missing:       safe(/(\d+) missing in MOL/),
    molTotal:      safe(/MOL list:\s*(\d+)/),
    molMissing:    safe(/\((\d+) not in census\)/),
  };
}

type RowStatus = 'auto' | 'review' | 'missing' | 'warning';

function classifyRow(row: ChecklistRuleResult): RowStatus {
  if (row.rule === 'Extraction warning') return 'warning';
  const note = (row.note || '').toUpperCase();
  if (note.includes('AUTO_VALIDATED')) return 'auto';
  if (note.includes('MISSING IN MOL') || note.includes('MISSING_IN_MOL')) return 'missing';
  if (note.includes('NEEDS_REVIEW') || note.includes('NEEDS REVIEW') || note.includes('AMBIGUOUS')) return 'review';
  return row.passed === true ? 'auto' : row.passed === false ? 'missing' : 'review';
}

function parseConfidence(note?: string | null): number | null {
  if (!note) return null;
  const m = note.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return n >= 0 && n <= 100 ? n : null;
}

// MOL target_value tends to be a long concatenation of:
//   "<Latin name> <14-digit labor card #> <Arabic name>"
// Split it visually so the row reads cleanly side-by-side with CENSUS.
function splitMolValue(raw: string | null | undefined): { latin: string; idNum: string | null; arabic: string | null } {
  if (!raw || raw === '—') return { latin: '', idNum: null, arabic: null };

  const arabicMatch = raw.match(/[؀-ۿ][؀-ۿ\s]+/);
  const arabic = arabicMatch ? arabicMatch[0].trim() : null;

  const idMatch = raw.match(/\b\d{8,16}\b/);
  const idNum = idMatch ? idMatch[0] : null;

  let latin = raw;
  if (arabic) latin = latin.replace(arabic, '');
  if (idNum) latin = latin.replace(idNum, '');
  latin = latin.replace(/\s{2,}/g, ' ').trim();

  return { latin, idNum, arabic };
}

type FilterKey = 'all' | 'matched' | 'review' | 'missing';

const STATUS_BADGE: Record<RowStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  auto: {
    label: 'Validated',
    cls: 'bg-success/10 text-success border border-success/25',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  review: {
    label: 'Review',
    cls: 'bg-warning/10 text-warning border border-warning/25',
    icon: <Eye className="h-3 w-3" />,
  },
  missing: {
    label: 'Missing',
    cls: 'bg-destructive/10 text-destructive border border-destructive/25',
    icon: <XCircle className="h-3 w-3" />,
  },
  warning: {
    label: 'Warning',
    cls: 'bg-muted text-muted-foreground border border-border',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export function MolValidationReport({ result }: MolValidationReportProps) {
  const details = (result.details || []) as ChecklistRuleResult[];
  const summaryRow = details.find(r => r.rule === 'Summary');
  const employeeRows = details.filter(r => r.rule !== 'Summary' && r.rule !== 'Extraction warning');
  const warningRows  = details.filter(r => r.rule === 'Extraction warning');

  const summary: ParsedSummary = summaryRow
    ? parseSummaryNote(summaryRow.note || '')
    : { total: 0, autoValidated: 0, needsReview: 0, missing: 0, molTotal: 0, molMissing: 0 };

  const runAt = result.run_at ? new Date(result.run_at) : null;
  const overallPassed = result.status === 'pass';
  const VerdictIcon = overallPassed ? ShieldCheck : summary.missing > 0 ? XCircle : AlertTriangle;
  const verdictColor = overallPassed ? 'text-success' : summary.missing > 0 ? 'text-destructive' : 'text-warning';
  const verdictBg = overallPassed
    ? 'border-success/25 bg-success/5'
    : summary.missing > 0
      ? 'border-destructive/25 bg-destructive/5'
      : 'border-warning/25 bg-warning/5';

  const matchRate = summary.total > 0 ? Math.round((summary.autoValidated / summary.total) * 100) : 0;

  // Filter tabs — All / Matched / Review / Missing
  const [filter, setFilter] = useState<FilterKey>('all');
  const counts = useMemo(() => {
    let matched = 0, review = 0, missing = 0;
    for (const r of employeeRows) {
      const s = classifyRow(r);
      if (s === 'auto') matched++;
      else if (s === 'review') review++;
      else if (s === 'missing') missing++;
    }
    return { all: employeeRows.length, matched, review, missing };
  }, [employeeRows]);

  const visibleRows = useMemo(() => {
    if (filter === 'all') return employeeRows;
    return employeeRows.filter(r => {
      const s = classifyRow(r);
      if (filter === 'matched') return s === 'auto';
      if (filter === 'review') return s === 'review';
      if (filter === 'missing') return s === 'missing';
      return true;
    });
  }, [employeeRows, filter]);

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <div className={cn('rounded-md border p-4 flex items-start gap-3', verdictBg)}>
        <div className="shrink-0 h-10 w-10 rounded-md bg-background border border-border flex items-center justify-center">
          <VerdictIcon className={cn('h-5 w-5', verdictColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-foreground">MOL Employee Validation</h4>
            <Badge variant={overallPassed ? 'success' : summary.missing > 0 ? 'critical' : 'warning'}>
              {overallPassed
                ? 'All employees validated'
                : summary.missing > 0
                  ? `${summary.missing} missing in MOL`
                  : `${summary.needsReview} need review`}
            </Badge>
          </div>
          {runAt && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last run · {format(runAt, 'dd MMM yyyy, HH:mm')}
            </p>
          )}
        </div>
      </div>

      {/* KPI tiles — 5 across, hairline-bordered, match the Census Validator pattern */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <KpiTile label="Total census" value={summary.total} />
        <KpiTile label="Auto confirmed" value={summary.autoValidated} tone="success" />
        <KpiTile label="Needs review" value={summary.needsReview} tone={summary.needsReview > 0 ? 'warning' : 'default'} />
        <KpiTile label="Missing in MOL" value={summary.missing} tone={summary.missing > 0 ? 'danger' : 'default'} />
        <KpiTile label="Match rate" value={`${matchRate}%`} tone={matchRate >= 80 ? 'success' : matchRate >= 50 ? 'warning' : 'danger'} />
      </div>

      {employeeRows.length > 0 && (
        <div className="space-y-2">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
            <FilterPill active={filter === 'matched'} onClick={() => setFilter('matched')} label="Matched" count={counts.matched} tone="success" />
            <FilterPill active={filter === 'review'} onClick={() => setFilter('review')} label="Needs review" count={counts.review} tone="warning" />
            <FilterPill active={filter === 'missing'} onClick={() => setFilter('missing')} label="Missing in MOL" count={counts.missing} tone="danger" />
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {visibleRows.length} {visibleRows.length === 1 ? 'record' : 'records'}
            </span>
          </div>

          {/* Side-by-side comparison table.
              Wrapped in overflow-x-auto + min-w so the right-most STATUS column
              never gets clipped silently — on narrow viewports the table scrolls
              horizontally instead of hiding content. */}
          <div className="rounded-md border border-border overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Header row: CENSUS | MOL | Confidence | Status */}
              <div className="grid grid-cols-[minmax(160px,1fr)_minmax(220px,1.4fr)_64px_92px] text-[10px] font-semibold uppercase tracking-[0.12em]">
                <div className="bg-info/8 text-info px-3 py-2 border-r border-border">Census</div>
                <div className="bg-primary/8 text-primary px-3 py-2 border-r border-border">MOL</div>
                <div className="px-3 py-2 border-r border-border text-muted-foreground text-right">Conf.</div>
                <div className="px-3 py-2 text-muted-foreground">Status</div>
              </div>

              <div className="divide-y divide-border">
                {visibleRows.map((row, idx) => {
                  const status = classifyRow(row);
                  const conf = parseConfidence(row.note);
                  const mol = splitMolValue(row.target_value);
                  const isMissing = status === 'missing' || !row.target_value || row.target_value === '—';
                  const badge = STATUS_BADGE[status];

                  const confTone = conf == null
                    ? 'text-muted-foreground/60'
                    : conf >= 85 ? 'text-success'
                    : conf >= 60 ? 'text-warning'
                    : 'text-destructive';

                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-[minmax(160px,1fr)_minmax(220px,1.4fr)_64px_92px] hover:bg-muted/30 transition-colors"
                    >
                      {/* CENSUS cell */}
                      <div className="bg-info/[0.03] px-3 py-2.5 border-r border-border min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {row.source_value || row.rule || '—'}
                        </p>
                        {row.source_doc_type && (
                          <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5 truncate">
                            {row.source_doc_type}
                          </p>
                        )}
                      </div>

                      {/* MOL cell */}
                      <div className={cn('px-3 py-2.5 border-r border-border min-w-0', isMissing ? 'bg-destructive/[0.03]' : 'bg-primary/[0.03]')}>
                        {isMissing ? (
                          <p className="text-[13px] text-muted-foreground italic">Not found</p>
                        ) : (
                          <>
                            <p className="text-[13px] font-medium text-foreground truncate" dir="ltr" title={mol.latin || row.target_value || ''}>
                              {mol.latin || row.target_value}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 min-w-0">
                              {mol.idNum && (
                                <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">{mol.idNum}</span>
                              )}
                              {mol.arabic && (
                                <span className="text-[11px] text-muted-foreground/80 truncate" dir="rtl">{mol.arabic}</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Confidence */}
                      <div className="px-3 py-2.5 border-r border-border flex items-center justify-end">
                        <span className={cn('text-[13px] font-semibold tabular-nums', confTone)}>
                          {conf != null ? `${conf}%` : '—'}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="px-2.5 py-2.5 flex items-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10.5px] font-medium leading-none whitespace-nowrap',
                          badge.cls,
                        )}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {visibleRows.length === 0 && (
                  <div className="px-3 py-8 text-center">
                    <p className="text-xs text-muted-foreground">No records in this view.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All-clear state */}
      {employeeRows.length === 0 && summary.total > 0 && (
        <div className="rounded-md border border-success/25 bg-success/5 p-4 flex items-start gap-3">
          <Users className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">All {summary.total} employees validated</p>
            <p className="text-xs text-muted-foreground mt-1">
              Every census employee matched against the MOL list with sufficient confidence.
            </p>
          </div>
        </div>
      )}

      {/* Extraction warnings */}
      {warningRows.length > 0 && (
        <div className="rounded-md border border-warning/25 bg-warning/5 p-3 space-y-1">
          <p className="text-[11px] font-semibold text-warning uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Extraction warnings
          </p>
          {warningRows.map((w, idx) => (
            <p key={idx} className="text-xs text-muted-foreground">{w.note}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label, value, tone = 'default',
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const valueTone = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-destructive',
  }[tone];

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-[20px] font-semibold tabular-nums leading-none', valueTone)}>
        {value}
      </p>
    </div>
  );
}

function FilterPill({
  active, onClick, label, count, tone = 'default',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const activeCls = active
    ? 'bg-foreground text-background border-foreground'
    : 'bg-background text-foreground border-border hover:bg-muted';

  const countCls = active
    ? 'bg-background/15 text-background'
    : ({
        default: 'bg-muted text-muted-foreground',
        success: 'bg-success/15 text-success',
        warning: 'bg-warning/15 text-warning',
        danger:  'bg-destructive/15 text-destructive',
      } as const)[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 inline-flex items-center gap-1.5 px-2.5 rounded-md border text-[12px] font-medium transition-colors',
        activeCls,
      )}
    >
      {label}
      <span className={cn('px-1 h-4 inline-flex items-center justify-center rounded text-[10px] tabular-nums', countCls)}>
        {count}
      </span>
    </button>
  );
}
