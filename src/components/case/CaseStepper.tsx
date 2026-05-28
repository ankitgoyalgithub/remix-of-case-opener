import { Stage, ChecklistItem } from '@/types/case';
import { Check, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStageHelperText } from '@/lib/stageDocumentMapping';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CaseStepperProps {
  stages: Stage[];
  currentStage: number;
  onStageClick: (stageId: number) => void;
  /** Per-stage progress is derived from these so the rail can render
   *  orange "in progress, all good" vs red "has failures" states. */
  checklist?: ChecklistItem[];
}

export function CaseStepper({ stages, currentStage, onStageClick, checklist }: CaseStepperProps) {
  // Returns the per-stage progress derived from checklist items
  const getProgress = (stageId: number) => {
    const items = (checklist || []).filter(i => i.stageId === stageId);
    let failed = 0;
    let passed = 0;
    for (const it of items) {
      const s = (it.result as any)?.status as ('pass' | 'fail' | 'pending' | 'error' | undefined);
      if (s === 'fail' || s === 'error') failed += 1;
      else if (s === 'pass' || it.checked) passed += 1;
    }
    return { total: items.length, failed, passed };
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isComplete = stage.status === 'complete';
          const needsReview = stage.status === 'needs-review';
          const helperText = getStageHelperText(stage.name);

          // In-progress visual state: any failed check → red; otherwise
          // some-passed-but-not-all → orange. Only applies when the stage
          // hasn't been marked complete yet.
          const progress = getProgress(stage.id);
          const hasFailures = !isComplete && progress.failed > 0;
          const inProgress = !isComplete && !hasFailures
            && progress.passed > 0 && progress.passed < progress.total;

          return (
            <div key={stage.id} className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onStageClick(stage.id)}
                    className={cn(
                      'group flex items-center gap-2 h-8 px-2.5 rounded-md text-xs transition-colors',
                      // Precedence: complete (green) > has failures (red) >
                      // in-progress with no failures (orange) > active (blue)
                      // > untouched (muted). Active state adds a ring on top
                      // of whatever color the stage already has.
                      isComplete && 'text-success hover:bg-success/10',
                      isComplete && isActive && 'bg-success/15 font-medium ring-1 ring-success/40',
                      hasFailures && 'text-destructive hover:bg-destructive/10',
                      hasFailures && isActive && 'bg-destructive/15 font-medium ring-1 ring-destructive/40',
                      inProgress && 'text-warning hover:bg-warning/10',
                      inProgress && isActive && 'bg-warning/15 font-medium ring-1 ring-warning/40',
                      !isComplete && !hasFailures && !inProgress && isActive && 'bg-primary/10 text-primary font-medium',
                      !isComplete && !hasFailures && !inProgress && !isActive && 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0',
                        // Same precedence on the circle bubble
                        isComplete && 'bg-success text-success-foreground',
                        !isComplete && hasFailures && 'bg-destructive text-destructive-foreground',
                        !isComplete && !hasFailures && inProgress && 'bg-warning text-warning-foreground',
                        !isComplete && !hasFailures && !inProgress && isActive && 'bg-primary text-primary-foreground',
                        !isComplete && !hasFailures && !inProgress && needsReview && 'bg-warning text-warning-foreground',
                        !isComplete && !hasFailures && !inProgress && !isActive && !needsReview && 'bg-muted-foreground/20 text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check className="h-3 w-3" />
                        : hasFailures ? <XCircle className="h-3 w-3" />
                        : inProgress ? <AlertTriangle className="h-3 w-3" />
                        : index + 1}
                    </span>
                    <span className="whitespace-nowrap">{stage.name}</span>
                    {needsReview && !isActive && (
                      <span className="text-[10px] px-1 rounded bg-warning/15 text-warning uppercase font-medium">
                        Review
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {helperText && (
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    <p className="text-xs">{helperText}</p>
                  </TooltipContent>
                )}
              </Tooltip>

              {index < stages.length - 1 && (
                <div
                  className={cn(
                    'w-4 h-px mx-0.5',
                    isComplete ? 'bg-success/50' : 'bg-border'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
