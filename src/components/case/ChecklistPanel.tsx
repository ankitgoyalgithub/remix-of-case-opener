import { ChecklistItem, Stage, DocumentType, DOCUMENT_TYPE_LABELS, getMissingDocumentsForStage, Document } from '@/types/case';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { ClipboardCheck, Check, AlertCircle, Lock } from 'lucide-react';

interface ChecklistPanelProps {
  checklist: ChecklistItem[];
  stages: Stage[];
  currentStage: number;
  documents: Document[];
  onToggle: (itemId: string) => void;
  onMarkStageComplete?: (stageId: number) => void;
}

export function ChecklistPanel({
  checklist,
  stages,
  currentStage,
  documents,
  onToggle,
  onMarkStageComplete
}: ChecklistPanelProps) {
  const getStageChecklist = (stageId: number) => {
    return checklist.filter(item => item.stageId === stageId);
  };

  const getStageProgress = (stageId: number) => {
    const items = getStageChecklist(stageId);
    const completed = items.filter(i => i.checked).length;
    return { completed, total: items.length };
  };

  const getMissingDocsForStage = (stageId: number): DocumentType[] => {
    return getMissingDocumentsForStage(stageId, documents);
  };

  const canCompleteCurrentStage = (stageId: number): { canComplete: boolean; missingDocs: DocumentType[]; reason?: string } => {
    // Stage 7 requires all previous stages complete
    if (stageId === 7) {
      const allPreviousComplete = stages
        .filter((s, idx, arr) => idx < arr.length - 1)
        .every(s => s.status === 'complete');
      if (!allPreviousComplete) {
        return {
          canComplete: false,
          missingDocs: [],
          reason: 'All previous stages must be complete before export.'
        };
      }
      return { canComplete: true, missingDocs: [] };
    }

    const missingDocs = getMissingDocsForStage(stageId);
    const stageItems = getStageChecklist(stageId);
    const requiredIncomplete = stageItems.filter(item => item.required && !item.checked);

    if (missingDocs.length > 0) {
      return { canComplete: false, missingDocs };
    }

    if (requiredIncomplete.length > 0) {
      return {
        canComplete: false,
        missingDocs: [],
        reason: `${requiredIncomplete.length} required checklist item(s) not completed.`
      };
    }

    return { canComplete: true, missingDocs: [] };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Checklist</h3>
      </div>

      {stages.map((stage) => {
        const items = getStageChecklist(stage.id);
        const { completed, total } = getStageProgress(stage.id);
        const isCurrentStage = stage.id === currentStage;
        const missingDocs = getMissingDocsForStage(stage.id);
        const stageValidation = canCompleteCurrentStage(stage.id);

        if (items.length === 0) return null;

        return (
          <Card
            key={stage.id}
            className={cn(
              "transition-all duration-200",
              isCurrentStage && "ring-1 ring-primary/50",
              stage.status === 'complete' && "opacity-75"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {stage.status === 'complete' && (
                    <Check className="h-4 w-4 text-success" />
                  )}
                  {stage.status === 'needs-review' && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  {stage.name}
                </CardTitle>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  completed === total
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
                )}>
                  {completed}/{total}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {items.map((item) => {
                  const isMissingDoc = item.documentType && missingDocs.includes(item.documentType);

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 py-1 px-2 rounded",
                        isMissingDoc && "bg-destructive/10"
                      )}
                    >
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={() => onToggle(item.id)}
                        className={cn(
                          "data-[state=checked]:bg-success data-[state=checked]:border-success",
                          isMissingDoc && "border-destructive"
                        )}
                      />
                      <label
                        htmlFor={item.id}
                        className={cn(
                          "text-sm cursor-pointer flex-1",
                          item.checked && "text-muted-foreground line-through",
                          isMissingDoc && "text-destructive font-medium"
                        )}
                      >
                        {item.label}
                        {item.required && (
                          <span className="text-destructive ml-1">*</span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Stage gating warning */}
              {isCurrentStage && !stageValidation.canComplete && (
                <Alert variant="destructive" className="mt-3 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {stageValidation.missingDocs.length > 0 ? (
                      <>
                        <strong>Missing required documents:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {stageValidation.missingDocs.map(doc => (
                            <li key={doc}>{DOCUMENT_TYPE_LABELS[doc]}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      stageValidation.reason
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Mark Complete button for current stage */}
              {isCurrentStage && stage.status !== 'complete' && onMarkStageComplete && (
                <Button
                  size="sm"
                  variant={stageValidation.canComplete ? "default" : "outline"}
                  className={cn(
                    "w-full mt-3 gap-2",
                    !stageValidation.canComplete && "opacity-60"
                  )}
                  onClick={() => stageValidation.canComplete && onMarkStageComplete(stage.id)}
                  disabled={!stageValidation.canComplete}
                >
                  {stageValidation.canComplete ? (
                    <>
                      <Check className="h-4 w-4" />
                      Mark Stage Complete
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      Cannot Complete Stage
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
