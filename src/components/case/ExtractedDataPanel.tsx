import { ExtractedDataSection, ExtractedField } from '@/types/case';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

interface ExtractedDataPanelProps {
  sections: ExtractedDataSection[];
  isCompact?: boolean;
}

export function ExtractedDataPanel({ sections, isCompact }: ExtractedDataPanelProps) {
  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            {section.title && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {section.title}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {section.fields.filter(f => f.value).length}/{section.fields.length} FIELDS
                </Badge>
              </div>
            )}

            <div className="grid gap-2">
              {section.fields.map((field) => (
                <ExtractedFieldRow
                  key={`${field.documentId}-${field.label}`}
                  field={field}
                  isCompact={isCompact}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

interface ExtractedFieldRowProps {
  field: ExtractedField;
  isCompact?: boolean;
}

function isTabularArray(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.length > 0 && value.every(row => row && typeof row === 'object' && !Array.isArray(row));
}

function humaniseKey(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Recover structured values that got stringified at some point in the pipeline
 * (e.g. old extractions stored via Python `str(list)` with single quotes).
 * Only returns a structured value when parsing unambiguously succeeds.
 */
function tryParseStructured(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value;

  // 1. Valid JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed;
  } catch { /* fall through */ }

  // 2. Python-style repr → normalise to JSON and retry
  try {
    const normalised = trimmed
      .replace(/'/g, '"')
      .replace(/\bNone\b/g, 'null')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false');
    const parsed = JSON.parse(normalised);
    if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) return parsed;
  } catch { /* fall through */ }

  return value;
}

function ExtractedFieldRow({ field }: ExtractedFieldRowProps) {
  // Recover structured values that may have been stringified upstream.
  const value = tryParseStructured(field.value as unknown);
  const hasValue = value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');

  // Tabular: array of plain objects → render a real table
  if (isTabularArray(value)) {
    const rows = value as Record<string, unknown>[];
    const columns = Array.from(rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach(k => acc.add(k));
      return acc;
    }, new Set<string>()));

    return (
      <div className="rounded-md border bg-background shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-semibold text-muted-foreground uppercase">{field.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">{rows.length} row{rows.length === 1 ? '' : 's'}</span>
            {typeof field.confidence === 'number' && field.confidence > 0 && (
              <div className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                field.confidence > 90 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              )}>
                {Math.round(field.confidence)}% AI
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {columns.map(col => (
                  <th key={col} className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {humaniseKey(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-border/60 last:border-b-0">
                  {columns.map(col => {
                    const cell = row[col];
                    const isEmpty = cell === null || cell === undefined || cell === '';
                    return (
                      <td key={col} className={cn('px-3 py-2', isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground')}>
                        {isEmpty ? '—' : typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Object → render as key/value definition list
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div className="rounded-md border bg-background shadow-sm p-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase block mb-2">{field.label}</span>
        <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-xs text-muted-foreground">{humaniseKey(k)}</dt>
              <dd className="text-foreground break-words">{v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  // Scalar (original behaviour)
  return (
    <div className="group flex items-center justify-between p-3 rounded-md border bg-background hover:border-primary/40 transition-colors shadow-sm">
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
          {field.label}
        </span>
        <div className="flex items-center gap-2">
          {hasValue ? (
            <p className="text-sm font-semibold text-foreground break-words">{String(value)}</p>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive/60" />
              <span className="text-sm font-semibold text-destructive/50 italic">Not detected</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {hasValue && (
          <div className={cn(
            'px-2 py-0.5 rounded text-xs font-bold uppercase shadow-sm border',
            field.confidence > 90 ? 'bg-success/10 text-success border-success/10' : 'bg-warning/10 text-warning border-warning/10'
          )}>
            {Math.round(field.confidence)}% AI
          </div>
        )}
      </div>
    </div>
  );
}
