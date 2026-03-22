import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WizardStepper, WizardStep } from '@/components/studio/WizardStepper';
import { WizardStepWorkflow } from '@/components/studio/WizardStepWorkflow';
import { WizardStepDocuments } from '@/components/studio/WizardStepDocuments';
import { WizardStepChecklist } from '@/components/studio/WizardStepChecklist';
import { WizardStepEmails } from '@/components/studio/WizardStepEmails';
import { WizardStepReview } from '@/components/studio/WizardStepReview';
import { DocumentConfigDrawer } from '@/components/studio/DocumentConfigDrawer';
import { DocumentDefinition } from '@/data/mockStudioData';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const wizardSteps: WizardStep[] = [
  { id: 1, label: 'Workflow Stages' },
  { id: 2, label: 'Documents' },
  { id: 3, label: 'Stage Checklist' },
  { id: 4, label: 'Emails' },
  { id: 5, label: 'Review & Publish' },
];

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [drawerDoc, setDrawerDoc] = useState<DocumentDefinition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleNext = () => {
    if (currentStep < wizardSteps.length) {
      setCompletedSteps(prev => prev.includes(currentStep) ? prev : [...prev, currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleConfigureDocument = (doc: DocumentDefinition) => {
    setDrawerDoc(doc);
    setDrawerOpen(true);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <WizardStepWorkflow />;
      case 2:
        return <WizardStepDocuments onConfigureDocument={handleConfigureDocument} />;
      case 3:
        return <WizardStepChecklist />;
      case 4:
        return <WizardStepEmails />;
      case 5:
        return <WizardStepReview />;
      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* Premium Header/Stepper Area */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full -z-10" />
        <WizardStepper
          steps={wizardSteps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step Content: High-Fidelity Glass Container */}
      <div className="min-h-[600px] flex flex-col">
        <div className="flex-1 glass-card rounded-[2.5rem] p-8 border-primary/10 shadow-2xl shadow-primary/5 bg-card/40 backdrop-blur-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="h-32 w-32 text-primary" />
          </div>

          <div className="relative z-10 h-full flex flex-col">
            {renderStepContent()}
          </div>
        </div>
      </div>

      {/* Navigation: Corporate Command Bar */}
      <div className="flex items-center justify-between glass px-4 md:px-8 py-4 md:py-5 rounded-3xl border-primary/10 bg-card/40 shadow-xl gap-2">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="gap-2 md:gap-3 h-10 md:h-12 px-3 md:px-6 rounded-xl md:rounded-2xl border-border/50 hover:bg-primary/5 hover:text-primary transition-all font-bold text-[10px] md:text-xs tracking-wider shrink-0"
        >
          <ArrowLeft className="h-3 md:h-4 w-3 md:w-4" />
          <span className="hidden xs:inline">PREVIOUS STEP</span>
          <span className="xs:hidden">PREV</span>
        </Button>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-[8px] md:text-[10px] font-black tracking-[0.2em] text-primary/40 uppercase hidden sm:block">Progress</span>
          <div className="flex gap-1 md:gap-1.5">
            {wizardSteps.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  s.id === currentStep ? "w-6 md:w-8 bg-primary" : "w-1.5 md:w-2 bg-muted/50"
                )}
              />
            ))}
          </div>
        </div>

        {currentStep < wizardSteps.length ? (
          <Button
            onClick={handleNext}
            className="gap-2 md:gap-3 h-10 md:h-12 px-4 md:px-8 rounded-xl md:rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 font-bold text-[10px] md:text-xs tracking-wider shrink-0"
          >
            <span className="hidden xs:inline">NEXT PHASE</span>
            <span className="xs:hidden">NEXT</span>
            <ArrowRight className="h-3 md:h-4 w-3 md:w-4" />
          </Button>
        ) : (
          <div className="w-[80px] md:w-[140px]" /> // Spacing for balance
        )}
      </div>

      {/* Document Config Drawer */}
      <DocumentConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        document={drawerDoc}
      />
    </div>
  );
}
