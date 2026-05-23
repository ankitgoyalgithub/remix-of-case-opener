import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChecklistValidationResult, ChecklistRuleResult } from '@/types/case';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Users, CheckCircle2, XCircle, AlertTriangle, Clock, ShieldCheck, Eye,
  Settings2, Check, X as XIcon, Send, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

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

function parsePassportFromNote(note?: string | null): string | null {
  if (!note) return null;
  // Patterns like "(passport: K6329d0779)" or "passport K6329d0779"
  const m = note.match(/passport[:\s]+([A-Z0-9]{5,16})/i);
  return m ? m[1] : null;
}

function parseNationalityFromNote(note?: string | null): string | null {
  if (!note) return null;
  const m = note.match(/nationality[:\s]+([A-Za-z][A-Za-z\s-]{2,30})/i);
  return m ? m[1].trim() : null;
}

// MOL target_value tends to be a long concatenation of:
//   "<Latin name> <14-digit labor card #> <Arabic name>"
// Plus sometimes passport / nationality embedded.
function splitMolValue(raw: string | null | undefined): {
  latin: string; idNum: string | null; arabic: string | null; passport: string | null; nationality: string | null;
} {
  if (!raw || raw === '—') return { latin: '', idNum: null, arabic: null, passport: null, nationality: null };

  const arabicMatch = raw.match(/[؀-ۿ][؀-ۿ\s]+/);
  const arabic = arabicMatch ? arabicMatch[0].trim() : null;

  // 14-digit labor card OR 7-12 alphanumeric passport.
  const labourMatch = raw.match(/\b\d{12,16}\b/);
  const idNum = labourMatch ? labourMatch[0] : null;

  // Passport pattern: 1-2 letters + 6-9 digits (UAE/Indian/etc passport-like).
  const passportMatch = raw.match(/\b[A-Z]{1,2}\d{5,9}[A-Z0-9]?\b/);
  const passport = passportMatch ? passportMatch[0] : null;

  let latin = raw;
  if (arabic)   latin = latin.replace(arabic, '');
  if (idNum)    latin = latin.replace(idNum, '');
  if (passport) latin = latin.replace(passport, '');
  latin = latin.replace(/\s{2,}/g, ' ').trim();

  return { latin, idNum, arabic, passport, nationality: null };
}

interface ParsedRow {
  source: ChecklistRuleResult;
  status: RowStatus;
  conf: number | null;
  census: { name: string; passport: string | null; nationality: string | null };
  mol: { name: string; passport: string | null; nationality: string | null; idNum: string | null; arabic: string | null };
}

function buildParsedRow(source: ChecklistRuleResult): ParsedRow {
  // Prefer structured fields when the backend supplies them (new MOL handler
  // emits source_passport / source_nationality / target_passport /
  // target_nationality / confidence). Fall back to regex parsing on note +
  // target_value for older payloads.
  const mol = splitMolValue(source.target_value);
  const status = classifyRow(source);
  return {
    source,
    status,
    conf: source.confidence != null ? source.confidence : parseConfidence(source.note),
    census: {
      name: source.source_value || source.rule || '—',
      passport: source.source_passport ?? parsePassportFromNote(source.note),
      nationality: source.source_nationality ?? parseNationalityFromNote(source.note),
    },
    mol: {
      name: mol.latin || (source.target_value && source.target_value !== '—' ? source.target_value : ''),
      passport: source.target_passport ?? mol.passport,
      nationality: source.target_nationality ?? null,
      idNum: mol.idNum,
      arabic: mol.arabic,
    },
  };
}

type FilterKey = 'all' | 'matched' | 'review' | 'missing';

const STATUS_BADGE: Record<RowStatus, { label: string; cls: string; icon: React.ReactNode }> = {
  auto: {
    label: 'Auto confirmed',
    cls: 'bg-success/10 text-success border border-success/25',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  review: {
    label: 'Needs review',
    cls: 'bg-warning/10 text-warning border border-warning/25',
    icon: <Eye className="h-3 w-3" />,
  },
  missing: {
    label: 'Missing in MOL',
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

  // Parse all rows once. Sorted: review first, then missing, then matched.
  const parsedRows: ParsedRow[] = useMemo(() => {
    return employeeRows.map(buildParsedRow);
  }, [employeeRows]);

  const [filter, setFilter] = useState<FilterKey>('all');
  const counts = useMemo(() => {
    let matched = 0, review = 0, missing = 0;
    for (const r of parsedRows) {
      if (r.status === 'auto') matched++;
      else if (r.status === 'review') review++;
      else if (r.status === 'missing') missing++;
    }
    return { all: parsedRows.length, matched, review, missing };
  }, [parsedRows]);

  const visibleRows = useMemo(() => {
    if (filter === 'all') return parsedRows;
    return parsedRows.filter(r => {
      if (filter === 'matched') return r.status === 'auto';
      if (filter === 'review') return r.status === 'review';
      if (filter === 'missing') return r.status === 'missing';
      return true;
    });
  }, [parsedRows, filter]);

  // ─── Selection & bulk actions ─────────────────────────────────────
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set());
  // When the visible set changes (filter switch), drop selection that no longer
  // matches — otherwise users could approve hidden rows by mistake.
  useEffect(() => {
    setSelectedIdx(new Set());
  }, [filter]);

  const toggleRow = (idx: number) => {
    setSelectedIdx(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };
  const allSelected = visibleRows.length > 0 && visibleRows.every((_, i) => selectedIdx.has(i));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIdx(new Set());
    else setSelectedIdx(new Set(visibleRows.map((_, i) => i)));
  };

  // ─── Review drawer state ──────────────────────────────────────────
  const [reviewingIdx, setReviewingIdx] = useState<number | null>(null);

  // Bulk + single-row action stubs — wire to your API when ready.
  // Status changes are visual-only for now and don't persist server-side.
  const handleAction = (action: 'confirm' | 'override' | 'reject' | 'missing' | 'review', count: number) => {
    const label =
      action === 'confirm'  ? 'Confirmed'
      : action === 'override' ? 'Confirmed (override)'
      : action === 'reject'   ? 'Rejected'
      : action === 'missing'  ? 'Marked missing in MOL'
      : 'Sent for review';
    toast.success(`${label} · ${count} record${count === 1 ? '' : 's'}`);
    setSelectedIdx(new Set());
    setReviewingIdx(null);
  };

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
        <Link to="/studio/checks">
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
            <Settings2 className="h-3.5 w-3.5" />
            Configure rules
          </Button>
        </Link>
      </div>

      {/* Rule summary — explains the matching logic that produced these results */}
      <div className="rounded-md border border-border bg-card px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <span className="page-eyebrow">Match rules</span>
        <div className="flex items-center gap-2 flex-wrap">
          <RuleChip field="Passport" mode="exact" />
          <RuleChip field="Nationality" mode="exact" />
          <RuleChip field="Name" mode="fuzzy · contains" />
        </div>
      </div>

      {/* KPI tiles — clicking a tile filters to that bucket */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <KpiTile label="Total census" value={summary.total} onClick={() => setFilter('all')} active={filter === 'all'} />
        <KpiTile label="Auto confirmed" value={summary.autoValidated} tone="success" onClick={() => setFilter('matched')} active={filter === 'matched'} />
        <KpiTile label="Needs review" value={summary.needsReview} tone={summary.needsReview > 0 ? 'warning' : 'default'} onClick={() => setFilter('review')} active={filter === 'review'} />
        <KpiTile label="Missing in MOL" value={summary.missing} tone={summary.missing > 0 ? 'danger' : 'default'} onClick={() => setFilter('missing')} active={filter === 'missing'} />
        <KpiTile label="Match rate" value={`${matchRate}%`} tone={matchRate >= 80 ? 'success' : matchRate >= 50 ? 'warning' : 'danger'} />
      </div>

      {parsedRows.length > 0 && (
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

          {/* Bulk action bar — only when rows are selected */}
          {selectedIdx.size > 0 && (
            <div className="rounded-md border border-foreground/20 bg-foreground text-background px-3 py-1.5 flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[12.5px] font-medium">
                {selectedIdx.size} selected
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-background hover:bg-background/15" onClick={() => setSelectedIdx(new Set())}>
                Clear
              </Button>
              <div className="flex-1" />
              <BulkBtn icon={Check} label="Confirm all" onClick={() => handleAction('confirm', selectedIdx.size)} />
              <BulkBtn icon={Check} label="Confirm (override)" onClick={() => handleAction('override', selectedIdx.size)} variant="ghost" />
              <BulkBtn icon={XIcon} label="Reject all" onClick={() => handleAction('reject', selectedIdx.size)} variant="ghost" />
              <BulkBtn icon={XCircle} label="Mark missing" onClick={() => handleAction('missing', selectedIdx.size)} variant="ghost" />
              <BulkBtn icon={Send} label="Send for review" onClick={() => handleAction('review', selectedIdx.size)} variant="ghost" />
            </div>
          )}

          {/* Comparison table — 3 Census cols + 3 MOL cols + Conf + Status */}
          <div className="rounded-md border border-border overflow-x-auto">
            <div className="min-w-[980px]">
              {/* Top header band: spans CENSUS over 3 cols, MOL over 3 cols */}
              <div className="grid grid-cols-[36px_minmax(180px,1.2fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_minmax(180px,1.2fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_72px_120px] text-[10px] font-semibold uppercase tracking-[0.14em] border-b border-border">
                <div className="px-3 py-2 flex items-center">
                  <Checkbox
                    checked={allSelected ? true : selectedIdx.size > 0 ? 'indeterminate' : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all visible"
                  />
                </div>
                <div className="bg-info/8 text-info col-span-3 px-3 py-2 border-l border-r border-border text-center">Census</div>
                <div className="bg-primary/8 text-primary col-span-3 px-3 py-2 border-r border-border text-center">MOL</div>
                <div className="px-3 py-2 border-r border-border text-muted-foreground text-right">Conf.</div>
                <div className="px-3 py-2 text-muted-foreground">Status</div>
              </div>

              {/* Sub-header: Name / Passport / Nationality per side */}
              <div className="grid grid-cols-[36px_minmax(180px,1.2fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_minmax(180px,1.2fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_72px_120px] text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground border-b border-border bg-muted/30">
                <div />
                <div className="px-3 py-1.5 border-l border-border">Name</div>
                <div className="px-3 py-1.5">Passport</div>
                <div className="px-3 py-1.5 border-r border-border">Nationality</div>
                <div className="px-3 py-1.5">Name</div>
                <div className="px-3 py-1.5">ID / Passport</div>
                <div className="px-3 py-1.5 border-r border-border">Nationality</div>
                <div />
                <div />
              </div>

              {/* Rows */}
              <div className="divide-y divide-border">
                {visibleRows.map((row, idx) => {
                  const isMissing = row.status === 'missing' || !row.source.target_value || row.source.target_value === '—';
                  const badge = STATUS_BADGE[row.status];
                  const isSelected = selectedIdx.has(idx);

                  const confTone = row.conf == null
                    ? 'text-muted-foreground/60'
                    : row.conf >= 85 ? 'text-success'
                    : row.conf >= 60 ? 'text-warning'
                    : 'text-destructive';

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'grid grid-cols-[36px_minmax(180px,1.2fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_minmax(180px,1.2fr)_minmax(110px,0.8fr)_minmax(90px,0.7fr)_72px_120px] hover:bg-muted/40 transition-colors cursor-pointer',
                        isSelected && 'bg-primary/[0.04]',
                      )}
                      onClick={() => setReviewingIdx(idx)}
                    >
                      <div
                        className="px-3 py-2.5 flex items-center"
                        onClick={(e) => { e.stopPropagation(); toggleRow(idx); }}
                      >
                        <Checkbox checked={isSelected} aria-label="Select row" />
                      </div>

                      {/* CENSUS — Name */}
                      <Cell className="bg-info/[0.03] border-l border-border">
                        <p className="text-[13px] font-medium text-foreground truncate" title={row.census.name}>
                          {row.census.name}
                        </p>
                      </Cell>

                      {/* CENSUS — Passport */}
                      <Cell className="bg-info/[0.03]">
                        {row.census.passport ? (
                          <p className="text-[12px] font-mono text-foreground tabular-nums truncate" title={row.census.passport}>
                            {row.census.passport}
                          </p>
                        ) : <Dash />}
                      </Cell>

                      {/* CENSUS — Nationality */}
                      <Cell className="bg-info/[0.03] border-r border-border">
                        {row.census.nationality ? (
                          <p className="text-[12px] text-foreground truncate" title={row.census.nationality}>
                            {row.census.nationality}
                          </p>
                        ) : <Dash />}
                      </Cell>

                      {/* MOL — Name */}
                      <Cell className={cn(isMissing ? 'bg-destructive/[0.03]' : 'bg-primary/[0.03]')}>
                        {isMissing ? (
                          <span className="text-[12.5px] text-muted-foreground italic">Not found</span>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate" dir="ltr" title={row.mol.name}>
                              {row.mol.name}
                            </p>
                            {row.mol.arabic && (
                              <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5" dir="rtl">
                                {row.mol.arabic}
                              </p>
                            )}
                          </div>
                        )}
                      </Cell>

                      {/* MOL — ID / Passport */}
                      <Cell className={cn(isMissing ? 'bg-destructive/[0.03]' : 'bg-primary/[0.03]')}>
                        {row.mol.passport ? (
                          <p className="text-[12px] font-mono text-foreground tabular-nums truncate" title={row.mol.passport}>
                            {row.mol.passport}
                          </p>
                        ) : row.mol.idNum ? (
                          <p className="text-[11.5px] font-mono text-muted-foreground tabular-nums truncate" title={`Labour card ${row.mol.idNum}`}>
                            {row.mol.idNum}
                          </p>
                        ) : <Dash />}
                      </Cell>

                      {/* MOL — Nationality */}
                      <Cell className={cn('border-r border-border', isMissing ? 'bg-destructive/[0.03]' : 'bg-primary/[0.03]')}>
                        {row.mol.nationality ? (
                          <p className="text-[12px] text-foreground truncate">{row.mol.nationality}</p>
                        ) : <Dash />}
                      </Cell>

                      {/* Confidence */}
                      <div className="px-3 py-2.5 border-r border-border flex items-center justify-end">
                        <span className={cn('text-[13px] font-semibold tabular-nums', confTone)}>
                          {row.conf != null ? `${row.conf}%` : '—'}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="px-2.5 py-2.5 flex items-center gap-1">
                        <span className={cn(
                          'inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10.5px] font-medium leading-none whitespace-nowrap',
                          badge.cls,
                        )}>
                          {badge.icon}
                          {badge.label}
                        </span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/60 ml-auto shrink-0" />
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
      {parsedRows.length === 0 && summary.total > 0 && (
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

      {/* Review dialog — opens on row click */}
      <ReviewDialog
        row={reviewingIdx != null ? visibleRows[reviewingIdx] : null}
        onClose={() => setReviewingIdx(null)}
        onAction={(action) => handleAction(action, 1)}
      />
    </div>
  );
}

// ─── Small primitives ──────────────────────────────────────────────────

function Cell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-3 py-2.5 min-w-0 flex flex-col justify-center', className)}>
      {children}
    </div>
  );
}

function Dash() {
  return <span className="text-[12px] text-muted-foreground/40">—</span>;
}

function RuleChip({ field, mode }: { field: string; mode: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border bg-background text-[11px]">
      <span className="font-medium text-foreground">{field}</span>
      <span className="text-muted-foreground/70">·</span>
      <span className="font-mono uppercase tracking-wider text-[9.5px] text-muted-foreground">{mode}</span>
    </span>
  );
}

function KpiTile({
  label, value, tone = 'default', onClick, active,
}: {
  label: string;
  value: number | string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  active?: boolean;
}) {
  const valueTone = {
    default: 'text-foreground',
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-destructive',
  }[tone];

  const cls = cn(
    'rounded-md border bg-card px-3 py-2.5 text-left transition-colors',
    active
      ? 'border-foreground/30 ring-1 ring-foreground/10'
      : 'border-border',
    onClick && 'cursor-pointer hover:border-foreground/20 hover:bg-muted/30',
  );

  return (
    <button type="button" onClick={onClick} className={cls} disabled={!onClick}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-[20px] font-semibold tabular-nums leading-none', valueTone)}>
        {value}
      </p>
    </button>
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

function BulkBtn({
  icon: Icon, label, onClick, variant = 'solid',
}: {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: 'solid' | 'ghost';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 inline-flex items-center gap-1.5 px-2.5 rounded text-[12px] font-medium transition-colors',
        variant === 'solid'
          ? 'bg-background text-foreground hover:bg-background/85'
          : 'text-background hover:bg-background/15',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ─── Review dialog ────────────────────────────────────────────────────

function ReviewDialog({
  row, onClose, onAction,
}: {
  row: ParsedRow | null;
  onClose: () => void;
  onAction: (action: 'confirm' | 'override' | 'reject' | 'missing' | 'review') => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (row) setNote('');
  }, [row]);

  if (!row) return null;

  const badge = STATUS_BADGE[row.status];

  return (
    <Dialog open={!!row} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manual review
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10.5px] font-medium leading-none',
              badge.cls,
            )}>
              {badge.icon}
              {badge.label}
            </span>
          </DialogTitle>
          <DialogDescription>
            Compare the census record against the MOL match. Confirm if correct,
            override if the rule was too strict, or reject / mark missing if no match.
          </DialogDescription>
        </DialogHeader>

        {/* Side-by-side detail */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <CompareCard
            title="Census"
            tint="info"
            fields={[
              { label: 'Name', value: row.census.name },
              { label: 'Passport', value: row.census.passport },
              { label: 'Nationality', value: row.census.nationality },
            ]}
          />
          <CompareCard
            title="MOL"
            tint="primary"
            empty={!row.mol.name}
            fields={[
              { label: 'Name', value: row.mol.name },
              { label: 'Passport / Labour card', value: row.mol.passport || row.mol.idNum },
              { label: 'Nationality', value: row.mol.nationality },
              { label: 'Name (Arabic)', value: row.mol.arabic, dir: 'rtl' as const },
            ]}
          />
        </div>

        {/* Confidence + rule reasoning */}
        {row.source.note && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 mt-1">
            <p className="page-eyebrow mb-1">Rule reasoning</p>
            <p className="text-[12.5px] text-foreground leading-relaxed">{row.source.note}</p>
          </div>
        )}

        {/* Comment */}
        <div className="space-y-1.5 mt-1">
          <label className="page-eyebrow">Reviewer note (optional)</label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context for the audit trail…"
            className="resize-none text-sm"
          />
        </div>

        <DialogFooter className="flex flex-wrap gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onAction('review')}>
            <Send className="h-3.5 w-3.5" />
            Send for review
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => onAction('missing')}>
            <XCircle className="h-3.5 w-3.5" />
            Mark missing
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => onAction('reject')}>
            <XIcon className="h-3.5 w-3.5" />
            Reject
          </Button>
          <Button size="sm" variant="success" className="gap-1.5" onClick={() => onAction(row.status === 'review' ? 'override' : 'confirm')}>
            <Check className="h-3.5 w-3.5" />
            {row.status === 'review' ? 'Confirm (override)' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompareCard({
  title, tint, empty, fields,
}: {
  title: string;
  tint: 'info' | 'primary';
  empty?: boolean;
  fields: Array<{ label: string; value: string | null | undefined; dir?: 'ltr' | 'rtl' }>;
}) {
  const headerCls = tint === 'info' ? 'bg-info/8 text-info' : 'bg-primary/8 text-primary';
  return (
    <div className="rounded-md border border-border overflow-hidden">
      <div className={cn('px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]', headerCls)}>
        {title}
      </div>
      <div className="p-3 space-y-2">
        {empty ? (
          <p className="text-[12.5px] text-muted-foreground italic">No matching MOL record.</p>
        ) : (
          fields
            .filter(f => f.value)
            .map((f, i) => (
              <div key={i} className="grid grid-cols-[88px_1fr] gap-2 items-baseline">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-muted-foreground">{f.label}</span>
                <span className="text-[12.5px] text-foreground break-words" dir={f.dir}>{f.value}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
