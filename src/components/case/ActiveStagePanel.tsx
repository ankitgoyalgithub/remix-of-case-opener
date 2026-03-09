import { Stage, ChecklistItem, Document, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Lock, AlertTriangle, CheckCircle2, FileText, Sparkles, ShieldCheck, ListTodo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getDocumentsForStage } from '@/lib/stageDocumentMapping';

// Must stay in sync with ExtractionAgent.DOCUMENT_KEY_MAP on the backend

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
  missingDocs: DocumentType[];
  docDefs: any[];
  onUploadDocument?: (file: globalThis.File, docType: DocumentType, checklistId?: string) => Promise<void>;
  selectedItemId?: string | null;
  onSelectItem?: (itemId: string) => void;
}

export function ActiveStagePanel({
  stage,
  checklist,
  documents,
  onToggle,
  onMarkStageComplete,
  workforceMismatch,
  missingDocs,
  docDefs,
  onUploadDocument,
  selectedItemId,
  onSelectItem
}: ActiveStagePanelProps) {
  const stageChecklist = checklist.filter(item => item.stageId === stage.id);

  const stageChecklistWithComputed = stageChecklist.map(item => {
    return { ...item };
  });

  const completedCount = stageChecklistWithComputed.filter(i => i.checked).length;
  const totalCount = stageChecklistWithComputed.length;
  const requiredIncomplete = stageChecklistWithComputed.filter(item => item.required && !item.checked);

  const getStageValidation = (): { status: 'complete' | 'warning' | 'blocked'; message: string } => {
    if (stage.status === 'complete') {
      return { status: 'complete', message: 'Stage complete – all required validations passed' };
    }
    if (stage.id === 5 && requiredIncomplete.length > 0) {
      return { status: 'blocked', message: 'Final adjudication requires all tasks to be cleared.' };
    }
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
      return { status: 'blocked', message: `Stage blocked – ${missingDocs.length} required document(s) missing` };
    }
    if (requiredIncomplete.length > 0) {
      return { status: 'blocked', message: `Stage blocked – ${requiredIncomplete.length} required item(s) not completed` };
    }
    return { status: 'complete', message: 'Ready to mark as complete' };
  };

  const validation = getStageValidation();
  const canComplete = validation.status !== 'blocked' && stage.status !== 'complete';

  const getStatusBanner = () => {
    switch (validation.status) {
      case 'complete':
        return (
          <Alert className="border-success/30 bg-success/15 shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success text-sm font-medium">
              {validation.message}
            </AlertDescription>
          </Alert>
        );
      case 'warning':
        return (
          <Alert className="border-warning/30 bg-warning/15 shadow-sm">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning text-sm font-medium">
              {validation.message}
            </AlertDescription>
          </Alert>
        );
      case 'blocked':
        return (
          <Alert variant="destructive" className="border-destructive/30 bg-destructive/15 text-destructive shadow-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              {validation.message}
            </AlertDescription>
          </Alert>
        );
    }
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'extraction': return <Sparkles className="h-3 w-3 text-blue-500" />;
      case 'verification': return <ShieldCheck className="h-3 w-3 text-indigo-500" />;
      case 'cross-validation': return <CheckCircle2 className="h-3 w-3 text-purple-500" />;
      default: return <ListTodo className="h-3 w-3 text-muted-foreground" />;
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
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">{stage.description}</p>
      </div>

      {/* Status Banner */}
      {getStatusBanner()}

      {/* Checklist Items */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 opacity-70">
          Operational Tasks
        </p>
        {stageChecklistWithComputed.map((item) => {
          const isSelected = selectedItemId === item.id;
          const isChecked = item.checked;

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem?.(item.id)}
              className={cn(
                "flex flex-col py-3 px-4 rounded-xl transition-all border cursor-pointer",
                isSelected ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/10" : "border-transparent bg-muted/20 hover:bg-muted/40",
                isChecked && !isSelected && "bg-success/5 border-success/10"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Checkbox
                    id={item.id}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "data-[state=checked]:bg-success data-[state=checked]:border-success h-5 w-5 rounded-md"
                    )}
                  />
                  <div className="flex flex-col min-w-0">
                    <label
                      htmlFor={item.id}
                      className={cn(
                        "text-[13px] font-bold cursor-pointer truncate",
                        isChecked ? "text-muted-foreground/60" : "text-foreground"
                      )}
                    >
                      {item.label}
                      {item.required && <span className="text-destructive ml-1">*</span>}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        {getItemTypeIcon(item.itemType)}
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                          {item.itemType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isChecked && item.required && (
                  <Badge variant="outline" className="text-[9px] font-bold py-0 bg-destructive/5 text-destructive border-destructive/20 uppercase shrink-0">
                    Action Required
                  </Badge>
                )}
              </div>
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
          onClick={(e) => {
            e.stopPropagation();
            canComplete && onMarkStageComplete(stage.id);
          }}
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
    </div>
  );
}
