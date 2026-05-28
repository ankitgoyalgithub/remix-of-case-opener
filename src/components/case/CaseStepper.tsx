import { Stage } from '@/types/case';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStageHelperText } from '@/lib/stageDocumentMapping';
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
          const helperText = getStageHelperText(stage.name);

          return (
            <div key={stage.id} className="flex items-center shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onStageClick(stage.id)}
                    className={cn(
                      'group flex items-center gap-2 h-8 px-2.5 rounded-md text-xs border transition-colors',
                      isActive && 'border-primary/40 bg-primary/10 text-primary font-medium',
                      !isActive && 'border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold shrink-0 border',
                        isActive && 'border-primary bg-primary text-primary-foreground',
                        !isActive && isComplete && 'border-success bg-success text-success-foreground',
                        !isActive && needsReview && 'border-warning bg-warning text-warning-foreground',
                        !isActive && !isComplete && !needsReview && 'border-border bg-background text-muted-foreground'
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
