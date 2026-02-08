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
import { ArrowLeft, ArrowRight } from 'lucide-react';

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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Stepper */}
      <div className="mb-8">
        <WizardStepper
          steps={wizardSteps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {wizardSteps.length}
        </span>

        {currentStep < wizardSteps.length ? (
          <Button onClick={handleNext} className="gap-2">
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <div /> // Publish is in the Review step itself
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
