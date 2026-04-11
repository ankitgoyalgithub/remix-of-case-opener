import { Stage } from '@/types/case';
import { Check, AlertCircle, Circle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STAGE_HELPER_TEXT } from '@/lib/stageDocumentMapping';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CaseStepperProps {
  stages: Stage[];
  currentStage: number;
  onStageClick: (stageId: number) => void;
}

export function CaseStepper({ stages, currentStage, onStageClick }: CaseStepperProps) {
  const getStageIcon = (stage: Stage) => {
    switch (stage.status) {
      case 'complete':
        return <Check className="h-4 w-4" />;
      case 'needs-review':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
  };

  const getStageStyles = (stage: Stage, isActive: boolean) => {
    const base = "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group";

    if (isActive) {
      return cn(base, "bg-background border border-primary/40 shadow-sm ring-1 ring-primary/10 text-foreground");
    }

    switch (stage.status) {
      case 'complete':
        return cn(base, "bg-success/10 border border-success/30 hover:bg-success/20 hover:border-success/50 text-foreground/90");
      case 'needs-review':
        return cn(base, "bg-warning/10 border border-warning/30 hover:bg-warning/20 hover:border-warning/50 text-foreground/90");
      case 'active':
        return cn(base, "bg-primary/5 border border-primary/30 hover:bg-primary/15 hover:border-primary/50 text-foreground/90");
      default:
        return cn(base, "bg-muted/30 border border-border/60 hover:bg-muted/50 hover:border-border text-muted-foreground");
    }
  };

  const getIconStyles = (stage: Stage, isActive: boolean) => {
    const base = "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0";

    if (isActive) {
      return cn(base, "bg-primary text-primary-foreground shadow-sm");
    }

    switch (stage.status) {
      case 'complete':
        return cn(base, "bg-success text-success-foreground");
      case 'needs-review':
        return cn(base, "bg-warning text-warning-foreground");
      case 'active':
        return cn(base, "bg-primary text-primary-foreground");
      default:
        return cn(base, "bg-muted text-muted-foreground");
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-4">
        <div className="flex items-center shrink-0">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap bg-muted/30 px-2 py-1 rounded-full">
            {stages.filter(s => s.status === 'complete').length}/{stages.length} done
          </span>
        </div>

        <div className="flex items-center gap-2">
          {stages.map((stage, index) => {
            const isActive = currentStage === stage.id;
            const helperText = STAGE_HELPER_TEXT[stage.id];

            return (
              <div key={stage.id} className="relative flex items-center shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={getStageStyles(stage, isActive)}
                      onClick={() => onStageClick(stage.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onStageClick(stage.id)}
                    >
                      <div className={getIconStyles(stage, isActive)}>
                        {getStageIcon(stage)}
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-xs font-medium truncate whitespace-nowrap",
                          isActive && "text-primary font-semibold"
                        )}>
                          {stage.name}
                        </p>
                      </div>
                      
                      {stage.status === 'needs-review' && !isActive && (
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-xs bg-warning/20 text-warning-foreground px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            Review
                          </span>
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  {helperText && (
                    <TooltipContent side="bottom" className="max-w-[200px]">
                      <p className="text-xs">{helperText}</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Horizontal Connector line */}
                {index < stages.length - 1 && (
                  <div
                    className={cn(
                      "w-4 h-0.5 ml-2 rounded-full",
                      stage.status === 'complete' ? 'bg-success/50' : 'bg-border/50'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
