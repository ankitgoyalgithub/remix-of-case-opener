import { AlertTriangle, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CaseData } from '@/types/case';

interface EvidencePackOverridesProps {
  workforceMismatch: CaseData['workforceMismatch'];
}

export function EvidencePackOverrides({ workforceMismatch }: EvidencePackOverridesProps) {
  const hasOverrides = workforceMismatch.detected && workforceMismatch.accepted;

  if (!hasOverrides) {
    return (
      <p className="text-[13px] text-muted-foreground italic">
        No overrides. The request passed every check without anyone needing to approve a result manually.
      </p>
    );
  }

  return (
    <div className="border border-warning/30 bg-warning/5 rounded-md p-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h4 className="text-[13px] font-semibold">Staff numbers didn't match — approved anyway</h4>
            <Badge variant="success" className="gap-1">
              <Check className="h-3 w-3" aria-hidden /> Approved anyway
            </Badge>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2">
            Government labour records (MOL/MOHRE) list {workforceMismatch.molCount} staff · the employee list has{' '}
            {workforceMismatch.censusCount}. An ops user reviewed the difference and chose to continue.
          </p>
          {workforceMismatch.acceptReason && (
            <div className="mt-2 px-3 py-2 bg-background rounded border border-border">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Reason given
              </p>
              <p className="text-[12px] italic">"{workforceMismatch.acceptReason}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
