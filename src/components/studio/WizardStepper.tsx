import { useSidebar } from '@/components/ui/sidebar';
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
  const { open } = useSidebar();
  const collapsed = !open;
  return (
    <div className="w-full relative px-2">
      {/* Background Track */}
      <div className="absolute top-5 left-0 right-0 h-[3px] bg-muted/40 rounded-full mx-10 -z-10" />

      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = step.id < currentStep;

          return (
            <div key={step.id} className="flex-1 first:flex-initial last:flex-initial flex flex-col items-center group relative">
              {/* Step Marker Container */}
              <button
                onClick={() => onStepClick(step.id)}
                className="flex flex-col items-center gap-3 transition-all duration-300 relative"
              >
                {/* Connector Line (Internal to item to ensure alignment) */}
                {index > 0 && (
                  <div
                    className={cn(
                      "absolute top-5 right-[calc(50%+20px)] left-[-50%] h-[3px] transition-all duration-500 -z-10",
                      isPast || isCompleted ? "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]" : "bg-muted/40"
                    )}
                  />
                )}

                {/* Circle Indicator */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 relative",
                    isActive
                      ? "border-primary bg-primary text-white shadow-lg shadow-primary/30 scale-110 z-10"
                      : isCompleted
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border/60 bg-card text-muted-foreground/60 group-hover:border-primary/40 group-hover:text-foreground"
                  )}
                >
                  {/* Glowing Ring for Active Step */}
                  {isActive && (
                    <div className="absolute -inset-1 rounded-2xl border-2 border-primary/20 animate-pulse" />
                  )}

                  {isCompleted ? (
                    <Check className="h-5 w-5 stroke-[3px]" />
                  ) : (
                    <span className="relative z-10">{step.id}</span>
                  )}
                </div>

                {/* Label & Description */}
                <div className="flex flex-col items-center px-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-wider transition-all duration-300 text-center",
                      isActive ? "text-primary scale-105" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.description && !collapsed && (
                    <span className="text-[10px] text-muted-foreground/60 mt-0.5 max-w-[120px] text-center line-clamp-1">
                      {step.description}
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
