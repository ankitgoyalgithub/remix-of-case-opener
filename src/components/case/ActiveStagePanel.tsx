import { Stage, ChecklistItem, Document, DocumentType, DOCUMENT_TYPE_LABELS, STAGE_REQUIREMENTS, getMissingDocumentsForStage } from '@/types/case';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ActiveStagePanelProps {
  stage: Stage;
  checklist: ChecklistItem[];
  documents: Document[];
  onToggle: (itemId: string) => void;
  onMarkStageComplete: (stageId: number) => void;
  workforceMismatch?: {
    detected: boolean;
    molCount: number;
    censusCount: number;
    accepted: boolean;
  };
}

export function ActiveStagePanel({ 
  stage, 
  checklist, 
  documents, 
  onToggle, 
  onMarkStageComplete,
  workforceMismatch 
}: ActiveStagePanelProps) {
  const stageChecklist = checklist.filter(item => item.stageId === stage.id);
  const missingDocs = getMissingDocumentsForStage(stage.id, documents);
  
  // Calculate completion
  const completedCount = stageChecklist.filter(i => i.checked).length;
  const totalCount = stageChecklist.length;
  const requiredIncomplete = stageChecklist.filter(item => item.required && !item.checked);

  // Stage validation
  const getStageValidation = (): { status: 'complete' | 'warning' | 'blocked'; message: string } => {
    if (stage.status === 'complete') {
      return { status: 'complete', message: 'Stage complete – all required validations passed' };
    }
    
    // Stage 7 special check
    if (stage.id === 7) {
      return { status: 'blocked', message: 'All previous stages must be complete before export.' };
    }
    
    // Workforce mismatch check for stage 3
    if (stage.id === 3 && workforceMismatch?.detected && !workforceMismatch?.accepted) {
      return { 
        status: 'warning', 
        message: `Mismatch detected: MOL = ${workforceMismatch.molCount} employees, Census = ${workforceMismatch.censusCount} members` 
      };
    }
    
    if (stage.status === 'needs-review') {
      return { status: 'warning', message: 'Stage needs review – discrepancies detected' };
    }
    
    if (missingDocs.length > 0) {
      return { 
        status: 'blocked', 
        message: `Stage blocked – ${missingDocs.length} required document(s) missing` 
      };
    }
    
    if (requiredIncomplete.length > 0) {
      return { 
        status: 'blocked', 
        message: `Stage blocked – ${requiredIncomplete.length} required item(s) not completed` 
      };
    }
    
    return { status: 'complete', message: 'Ready to mark as complete' };
  };

  const validation = getStageValidation();
  const canComplete = validation.status !== 'blocked' && stage.status !== 'complete';

  const getStatusBanner = () => {
    switch (validation.status) {
      case 'complete':
        return (
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success text-sm font-medium">
              {validation.message}
            </AlertDescription>
          </Alert>
        );
      case 'warning':
        return (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning text-sm font-medium">
              {validation.message}
            </AlertDescription>
          </Alert>
        );
      case 'blocked':
        return (
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              {validation.message}
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Stage Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{stage.name}</h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            completedCount === totalCount 
              ? "bg-success/20 text-success" 
              : "bg-muted text-muted-foreground"
          )}>
            {completedCount}/{totalCount}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{stage.description}</p>
      </div>

      {/* Status Banner */}
      {getStatusBanner()}

      {/* Missing Documents List */}
      {missingDocs.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          <p className="text-xs font-semibold text-destructive mb-2">Missing Required Documents:</p>
          <ul className="space-y-1">
            {missingDocs.map(doc => (
              <li key={doc} className="text-xs text-destructive flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                {DOCUMENT_TYPE_LABELS[doc]}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist Items */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Checklist Items
        </p>
        {stageChecklist.map((item) => {
          const isMissingDoc = item.documentType && missingDocs.includes(item.documentType);
          const isAutoChecked = item.documentType && !missingDocs.includes(item.documentType) && documents.some(d => d.type === item.documentType);
          
          return (
            <div 
              key={item.id}
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors",
                isMissingDoc && "bg-destructive/10 border border-destructive/20",
                item.checked && !isMissingDoc && "bg-success/5"
              )}
            >
              <Checkbox 
                id={item.id}
                checked={item.checked}
                onCheckedChange={() => onToggle(item.id)}
                disabled={isAutoChecked && item.checked}
                className={cn(
                  "data-[state=checked]:bg-success data-[state=checked]:border-success",
                  isMissingDoc && "border-destructive"
                )}
              />
              <label 
                htmlFor={item.id}
                className={cn(
                  "text-sm cursor-pointer flex-1",
                  item.checked && "text-muted-foreground",
                  isMissingDoc && "text-destructive font-medium"
                )}
              >
                {item.label}
                {item.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              {isMissingDoc && (
                <span className="text-xs text-destructive">Missing</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mark Complete Button */}
      {stage.status !== 'complete' && (
        <Button
          size="sm"
          variant={canComplete ? "default" : "outline"}
          className={cn(
            "w-full gap-2",
            !canComplete && "opacity-60"
          )}
          onClick={() => canComplete && onMarkStageComplete(stage.id)}
          disabled={!canComplete}
        >
          {canComplete ? (
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

      {stage.status === 'complete' && (
        <div className="flex items-center justify-center gap-2 py-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">Stage Completed</span>
        </div>
      )}
    </div>
  );
}
