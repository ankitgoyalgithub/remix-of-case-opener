import { Stage } from '@/types/case';
import { Check, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    const base = "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200";
    
    if (isActive) {
      return cn(base, "bg-primary/10 border-2 border-primary");
    }
    
    switch (stage.status) {
      case 'complete':
        return cn(base, "bg-success/10 border border-success/30 hover:bg-success/15");
      case 'needs-review':
        return cn(base, "bg-warning/10 border border-warning/30 hover:bg-warning/15");
      case 'active':
        return cn(base, "bg-primary/5 border border-primary/30 hover:bg-primary/10");
      default:
        return cn(base, "bg-muted/50 border border-border hover:bg-muted");
    }
  };

  const getIconStyles = (stage: Stage) => {
    const base = "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold";
    
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
    <div className="flex flex-col gap-2">
      {stages.map((stage, index) => (
        <div key={stage.id} className="relative">
          {index < stages.length - 1 && (
            <div 
              className={cn(
                "absolute left-[1.85rem] top-[3rem] w-0.5 h-4 -translate-x-1/2",
                stage.status === 'complete' ? 'bg-success/50' : 'bg-border'
              )}
            />
          )}
          <div
            className={getStageStyles(stage, currentStage === stage.id)}
            onClick={() => onStageClick(stage.id)}
          >
            <div className={getIconStyles(stage)}>
              {getStageIcon(stage)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{stage.name}</p>
              <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
            </div>
            {stage.status === 'needs-review' && (
              <span className="text-xs bg-warning/20 text-warning-foreground px-2 py-0.5 rounded-full">
                Review
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
