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
    <div className="max-w-[1700px] mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Studio Setup</h1>
        <p className="text-muted-foreground mt-1 text-sm">Configure your workspace preferences and standard operations.</p>
      </div>
 
      <div className="flex flex-col md:flex-row gap-8 items-stretch relative">
        {/* Left Sidebar: Stepper */}
        <div className="md:w-64 shrink-0 md:sticky md:top-24 hidden md:block">
          <WizardStepper
            steps={wizardSteps}
            currentStep={currentStep}
            onStepClick={setCurrentStep}
            completedSteps={completedSteps}
          />
        </div>
 
        {/* Right Area: Content + Footer */}
        <div className="flex-1 flex flex-col min-w-0 bg-card border rounded-xl shadow-sm min-h-[600px]">
          <div className="p-4 md:p-8 flex-1">
            {renderStepContent()}
          </div>

          {/* Clean Enterprise Footer */}
          <div className="px-6 md:px-10 py-5 bg-muted/20 border-t flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="px-6 h-10 font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider hidden sm:block">
              {currentStep} / {wizardSteps.length}
            </span>

            {currentStep < wizardSteps.length ? (
              <Button
                onClick={handleNext}
                className="px-6 h-10 font-medium"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => {}}
                className="px-6 h-10 font-medium bg-primary hover:bg-primary/90"
              >
                Complete Setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
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
