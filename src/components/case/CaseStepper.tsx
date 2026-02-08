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
      return cn(base, "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20");
    }
    
    switch (stage.status) {
      case 'complete':
        return cn(base, "bg-success/10 border border-success/30 hover:bg-success/20 hover:border-success/50");
      case 'needs-review':
        return cn(base, "bg-warning/10 border border-warning/30 hover:bg-warning/20 hover:border-warning/50");
      case 'active':
        return cn(base, "bg-primary/5 border border-primary/30 hover:bg-primary/15 hover:border-primary/50");
      default:
        return cn(base, "bg-muted/50 border border-border hover:bg-muted hover:border-muted-foreground/30");
    }
  };

  const getIconStyles = (stage: Stage, isActive: boolean) => {
    const base = "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0";
    
    if (isActive) {
      return cn(base, "bg-primary-foreground/20 text-primary-foreground");
    }
    
    switch (stage.status) {
      case 'complete':
        return cn(base, "bg-success text-success-foreground");
      case 'needs-review':
        return cn(base, "bg-warning text-warning-foreground");
      case 'active':
        return cn(base, "bg-primary text-primary-foreground");
      default:
        return cn(base, "bg-muted-foreground/20 text-muted-foreground");
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {stages.filter(s => s.status === 'complete').length}/{stages.length} complete
          </span>
        </div>
        
        <div className="flex flex-col gap-1.5">
          {stages.map((stage, index) => {
            const isActive = currentStage === stage.id;
            const helperText = STAGE_HELPER_TEXT[stage.id];
            
            return (
              <div key={stage.id} className="relative">
                {/* Connector line */}
                {index < stages.length - 1 && (
                  <div 
                    className={cn(
                      "absolute left-[0.9rem] top-[2.5rem] w-0.5 h-3 -translate-x-1/2 z-0",
                      stage.status === 'complete' ? 'bg-success/50' : 'bg-border'
                    )}
                  />
                )}
                
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
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isActive && "text-primary-foreground"
                        )}>
                          {stage.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {stage.status === 'needs-review' && !isActive && (
                          <span className="text-xs bg-warning/20 text-warning-foreground px-1.5 py-0.5 rounded">
                            Review
                          </span>
                        )}
                        <ChevronRight className={cn(
                          "h-4 w-4 transition-transform",
                          isActive ? "text-primary-foreground rotate-90" : "text-muted-foreground group-hover:translate-x-0.5"
                        )} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  {helperText && (
                    <TooltipContent side="right" className="max-w-[200px]">
                      <p className="text-xs">{helperText}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
