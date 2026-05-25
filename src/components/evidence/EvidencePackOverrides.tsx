import { AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { CaseData } from '@/types/case';

interface EvidencePackOverridesProps {
  workforceMismatch: CaseData['workforceMismatch'];
}

export function EvidencePackOverrides({ workforceMismatch }: EvidencePackOverridesProps) {
  const hasOverrides = workforceMismatch.detected && workforceMismatch.accepted;

  if (!hasOverrides) {
    return (
      <p className="text-[13px] text-muted-foreground italic">
        No overrides were applied. All validations passed without manual intervention.
      </p>
    );
  }

  return (
    <div className="border border-warning/30 bg-warning/5 rounded-md p-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[13px] font-semibold">Workforce mismatch override</h4>
            <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded bg-success/12 text-success text-[11px] font-semibold">
              <Check className="h-3 w-3" /> Accepted
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2">
            MOL shows {workforceMismatch.molCount} employees · Census has {workforceMismatch.censusCount} members.
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            <div>
              <span className="text-muted-foreground">Overridden by: </span>
              <span className="font-medium">Sarah Ahmed</span>
            </div>
            <div>
              <span className="text-muted-foreground">Override time: </span>
              <span className="font-medium">{format(new Date(), 'dd MMM yyyy HH:mm')}</span>
            </div>
          </div>
          {workforceMismatch.acceptReason && (
            <div className="mt-2 px-3 py-2 bg-background rounded border border-border">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                Reason
              </p>
              <p className="text-[12px] italic">"{workforceMismatch.acceptReason}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
