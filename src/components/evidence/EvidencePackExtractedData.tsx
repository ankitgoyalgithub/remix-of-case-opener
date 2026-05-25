import type { ReactNode } from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { ExtractedDataSection } from '@/types/case';
import { cn } from '@/lib/utils';

interface EvidencePackExtractedDataProps {
  extractedData: ExtractedDataSection[];
}

function renderFieldValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">—</span>;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>;
    if (value.every(v => typeof v === 'string' || typeof v === 'number')) return value.join(', ');
    return (
      <ul className="mt-1 space-y-0.5 list-disc pl-4">
        {value.map((item, i) => (
          <li key={i} className="text-[12px]">{renderFieldValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
      <span className="block space-y-0.5 text-[12px]">
        {entries.map(([k, v]) => (
          <span key={k} className="block">
            <span className="text-muted-foreground">{k}: </span>
            <span>{renderFieldValue(v)}</span>
          </span>
        ))}
      </span>
    );
  }
  return String(value);
}

export function EvidencePackExtractedData({ extractedData }: EvidencePackExtractedDataProps) {
  if (!extractedData || extractedData.length === 0) {
    return <p className="text-[13px] text-muted-foreground italic">No extracted data recorded.</p>;
  }

  return (
    <div className="space-y-5">
      {extractedData.map((section, sectionIdx) => {
        const verifiedCount = section.fields.filter(f => f.status === 'verified').length;
        const allVerified = verifiedCount === section.fields.length;
        return (
          <div key={`${section.title}-${sectionIdx}`} className="break-inside-avoid">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-foreground">{section.title}</h4>
              <span className={cn(
                'font-mono text-[11px] font-semibold',
                allVerified ? 'text-success' : verifiedCount > 0 ? 'text-warning' : 'text-muted-foreground'
              )}>
                {verifiedCount}/{section.fields.length} verified
              </span>
            </div>
            <div className="border border-border rounded-md divide-y divide-border">
              {section.fields.map((field, fieldIdx) => (
                <div
                  key={`${field.label}-${fieldIdx}`}
                  className="grid grid-cols-[140px_minmax(0,1fr)_auto_auto] gap-3 items-start px-3 py-2 text-[13px]"
                >
                  <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-muted-foreground pt-0.5">
                    {field.label}
                  </span>
                  <span className="font-medium break-words min-w-0">{renderFieldValue(field.value)}</span>
                  <span className={cn(
                    'text-[11px] font-mono font-semibold tabular-nums',
                    field.confidence >= 95 ? 'text-success' :
                    field.confidence >= 85 ? 'text-warning' : 'text-destructive'
                  )}>
                    {field.confidence}%
                  </span>
                  {field.status === 'verified' ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
