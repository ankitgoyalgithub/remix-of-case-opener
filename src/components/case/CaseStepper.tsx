import { Stage } from '@/types/case';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_HELPER_TEXT } from '@/lib/stageDocumentMapping';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CaseStepperProps {
  stages: Stage[];
  currentStage: number;
  onStageClick: (stageId: number) => void;
}

export function CaseStepper({ stages, currentStage, onStageClick }: CaseStepperProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {stages.map((stage, index) => {
          const isActive = currentStage === stage.id;
          const isComplete = stage.status === 'complete';
          const needsReview = stage.status === 'needs-review';
          const helperText = STAGE_HELPER_TEXT[stage.id];

          return (
            <div key={stage.id} className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onStageClick(stage.id)}
                    className={cn(
                      'group flex items-center gap-2 h-8 px-2.5 rounded-md text-xs transition-colors',
                      // A complete stage stays green even when selected. The
                      // active indicator is communicated by an extra ring + a
                      // stronger green background, not by switching to primary.
                      isComplete && isActive && 'bg-success/15 text-success font-medium ring-1 ring-success/40',
                      isComplete && !isActive && 'text-success hover:bg-success/10',
                      !isComplete && isActive && 'bg-primary/10 text-primary font-medium',
                      !isComplete && !isActive && 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0',
                        // Complete always green, regardless of active state
                        isComplete && 'bg-success text-success-foreground',
                        !isComplete && isActive && 'bg-primary text-primary-foreground',
                        !isComplete && needsReview && 'bg-warning text-warning-foreground',
                        !isComplete && !isActive && !needsReview && 'bg-muted-foreground/20 text-muted-foreground'
                      )}
                    >
                      {isComplete ? <Check className="h-3 w-3" /> : index + 1}
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
