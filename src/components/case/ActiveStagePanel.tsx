import { Stage, ChecklistItem, Document, DocumentType, DOCUMENT_TYPE_LABELS, STAGE_REQUIREMENTS, getMissingDocumentsForStage } from '@/types/case';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Check, AlertCircle, Lock, AlertTriangle, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import { getDocumentsForStage } from '@/lib/stageDocumentMapping';

// Must stay in sync with ExtractionAgent.DOCUMENT_KEY_MAP on the backend
const DOCUMENT_EXTRACTION_FIELDS: Record<string, string[]> = {
  'trade-license': ['Company Name', 'Trade License Number', 'Trade License Expiry Date', 'VAT TRN'],
  'establishment-card': ['Establishment Card Number', 'MOL Employee Count'],
  'census': ['Census Member Count', 'Mismatch Flag'],
  'initial-census': ['Census Member Count', 'Mismatch Flag'],
  'finalized-census': ['Census Member Count', 'Mismatch Flag'],
  'emirates-id': ['Signatory Name', 'Emirates ID / Passport No'],
  'emirates-id-passport': ['Signatory Name', 'Emirates ID / Passport No'],
  'passport': ['Signatory Name', 'Emirates ID / Passport No'],
  'vat-certificate': ['VAT TRN'],
  'mol-list': ['MOL Employee Count'],
  'mol-sheet': ['MOL Employee Count'],
  'customer-signed-quote': ['Quote Reference', 'Final Premium (AED)', 'Plan Code'],
  'signed-quotation': ['Quote Reference', 'Final Premium (AED)', 'Plan Code'],
  'kyc-signatory': ['Signatory Name', 'Emirates ID / Passport No'],
  'moa': ['Company Name', 'Signatory Name'],
  'other': ['Document Reference', 'Note'],
};

const DOC_TYPE_LABELS: Record<string, string> = {
  'trade-license': 'Trade License',
  'establishment-card': 'Establishment Card',
  'census': 'Census',
  'initial-census': 'Initial Census',
  'finalized-census': 'Finalized Census',
  'emirates-id': 'Emirates ID',
  'emirates-id-passport': 'Emirates ID / Passport',
  'passport': 'Passport',
  'vat-certificate': 'VAT Certificate',
  'mol-list': 'MOL List',
  'mol-sheet': 'MOL Sheet',
  'customer-signed-quote': 'Signed Quotation',
  'signed-quotation': 'Signed Quotation',
  'kyc-signatory': 'Signatory KYC',
  'moa': 'Memorandum of Association',
  'medical-application-form': 'Medical Application Form',
  'other': 'Other Document',
};

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
    const isAutoChecked = item.documentType
      ? documents.some(d => d.checklistId === item.id)
      : false;

    const isMissingDoc = item.documentType ? !isAutoChecked : false;
    const computedChecked = item.documentType ? isAutoChecked : item.checked;
    return { ...item, computedChecked, isMissingDoc, isAutoChecked };
  });

  const completedCount = stageChecklistWithComputed.filter(i => i.computedChecked).length;
  const totalCount = stageChecklistWithComputed.length;
  const requiredIncomplete = stageChecklistWithComputed.filter(item => item.required && !item.computedChecked);

  const getStageValidation = (): { status: 'complete' | 'warning' | 'blocked'; message: string } => {
    if (stage.status === 'complete') {
      return { status: 'complete', message: 'Stage complete – all required validations passed' };
    }
    if (stage.id === 7) {
      return { status: 'blocked', message: 'All previous stages must be complete before export.' };
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

  const stageDocTypes = docDefs.filter(d => d.applicableStages.includes(stage.id)).map(d => d.type);

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

        {stageDocTypes.length > 0 && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border/50">
            <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Documents used:</span>{' '}
              {stageDocTypes.map(dt => DOCUMENT_TYPE_LABELS[dt]).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Status Banner */}
      {getStatusBanner()}

      {/* Checklist Items */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Checklist Items
        </p>
        {stageChecklistWithComputed.map((item) => {
          const { isMissingDoc, isAutoChecked, computedChecked: isChecked } = item;
          const isSelected = selectedItemId === item.id;
          const extractionFields = item.documentType ? (DOCUMENT_EXTRACTION_FIELDS[item.documentType] ?? []) : [];

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem?.(item.id)}
              className={cn(
                "flex flex-col py-2 px-3 rounded-lg transition-all border cursor-pointer",
                isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-transparent bg-muted/30 hover:bg-muted/50",
                isMissingDoc && !isSelected && "bg-destructive/15 border-destructive/30",
                isChecked && !isMissingDoc && !isSelected && "bg-success/10 border-success/20"
              )}
            >
              {/* Top row: checkbox + label + upload button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Checkbox
                    id={item.id}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={!!item.documentType || (isAutoChecked && item.checked)}
                    className={cn(
                      "data-[state=checked]:bg-success data-[state=checked]:border-success",
                      isMissingDoc && "border-destructive"
                    )}
                  />
                  <label
                    htmlFor={item.id}
                    className={cn(
                      "text-sm cursor-pointer flex-1",
                      isChecked && "text-muted-foreground",
                      isMissingDoc && "text-destructive font-medium"
                    )}
                  >
                    {item.label}
                    {item.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </label>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.documentType && onUploadDocument && (
                    <label className="cursor-pointer inline-flex items-center justify-center rounded-md text-[10px] font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-6 px-2 uppercase tracking-tight">
                      {isMissingDoc ? 'Upload' : 'Update'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onUploadDocument(file, item.documentType!, item.id);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  )}
                  {isMissingDoc && !item.documentType && (
                    <span className="text-[10px] uppercase font-bold text-destructive">Required</span>
                  )}
                </div>
              </div>

              {/* Bottom row: expected document type + extraction fields */}
              {item.documentType && (
                <div className="mt-1.5 ml-6 flex flex-col gap-1 pb-0.5">
                  {/* Document type label */}
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {DOC_TYPE_LABELS[item.documentType] ?? item.documentType}
                    </span>
                  </div>

                  {/* Extraction fields pills */}
                  {extractionFields.length > 0 && (
                    <div className="flex items-start gap-1.5 flex-wrap">
                      <Sparkles className="h-3 w-3 text-primary/60 mt-0.5 shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {extractionFields.map(field => (
                          <span
                            key={field}
                            className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/8 text-primary/70 border border-primary/15"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
