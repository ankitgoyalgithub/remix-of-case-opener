import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  description?: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps?: number[];
}

export function WizardStepper({ steps, currentStep, onStepClick, completedSteps = [] }: WizardStepperProps) {
  return (
    <div className="w-full flex flex-col pt-2">
      <div className="relative">
        {/* Track Line */}
        <div className="absolute top-0 bottom-0 left-[15px] w-[1px] bg-border/80 -z-10" />

        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          
          return (
            <div key={step.id} className="relative flex items-start mb-8 last:mb-0 group cursor-pointer" onClick={() => onStepClick(step.id)}>
              {/* Highlight active segment */}
              {isCompleted && index < steps.length - 1 && (
                <div className="absolute top-6 -bottom-8 left-[15px] w-[1px] bg-primary/40 -z-10" />
              )}
              {isActive && index > 0 && (
                <div className="absolute -top-8 bottom-[calc(100%-8px)] left-[15px] w-[1px] bg-primary -z-10" />
              )}

              {/* Indicator */}
              <div 
                className={cn(
                  "w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border bg-background transition-colors duration-200",
                  isActive ? "border-primary ring-4 ring-primary/10" 
                    : isCompleted ? "border-primary bg-primary/5 text-primary" 
                    : "border-border text-muted-foreground group-hover:border-primary/50"
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="h-4 w-4 stroke-[3px] text-primary" />
                ) : (
                  <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary" : "bg-transparent group-hover:bg-primary/30")} />
                )}
              </div>

              {/* Label */}
              <div className="ml-4 flex flex-col pt-1">
                <span className={cn(
                  "text-sm font-medium transition-colors", 
                  isActive ? "text-foreground" 
                    : isCompleted ? "text-foreground/80" 
                    : "text-muted-foreground group-hover:text-foreground/80"
                )}>
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
                    {step.description}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
