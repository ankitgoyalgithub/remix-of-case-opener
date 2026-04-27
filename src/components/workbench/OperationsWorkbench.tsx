import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActiveStagePanel } from '@/components/case/ActiveStagePanel';
import { ExtractedDataPanel } from '@/components/case/ExtractedDataPanel';
import { ChecklistDetailPanel } from '@/components/case/ChecklistDetailPanel';
import { HighlightedPdfViewer } from '@/components/case/HighlightedPdfViewer';
import { ExtractionDiffDialog } from '@/components/case/ExtractionDiffDialog';
import {
    Document,
    getMissingDocuments,
    DocumentType,
    CaseData,
} from '@/types/case';
import {
    RefreshCw,
    BrainCircuit,
    AlertCircle,
    Database,
    Sparkles,
    ChevronDown,
    ChevronRight,
    GitCompare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RequiredDocumentsPanel } from '@/components/case/RequiredDocumentsPanel';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';


interface OperationsWorkbenchProps {
    requestData: CaseData;
    activeViewStage: number;
    selectedDocument: Document | null;
    selectedChecklistItemId: string | null;
    onSelectChecklistItem: (itemId: string) => void;
    onStageComplete: (stageId: number) => void;
    onChecklistToggle: (itemId: string) => void;
    onRunValidation?: (itemId: string) => Promise<void>;
    onUploadDocument: (file: File, type: DocumentType, checklistId?: string) => Promise<void>;
    onSelectDocument: (doc: Document | null) => void;
    onReextract?: (docId: string, additionalPrompt?: string) => Promise<void>;
    onExport: () => void;
    onMarkIssued: () => void;
}

const DEFAULT_HINTS = [
    "Check for stamps/signatures",
    "Find specific dates",
    "Look on last page",
    "Verify numeric values"
];

export function OperationsWorkbench({
    requestData,
    activeViewStage,
    selectedDocument,
    selectedChecklistItemId,
    onSelectChecklistItem,
    onStageComplete,
    onChecklistToggle,
    onRunValidation,
    onUploadDocument,
    onReextract,
    onSelectDocument,
}: OperationsWorkbenchProps) {
    const [reextractPrompt, setReextractPrompt] = React.useState('');
    const [isReextractDialogOpen, setIsReextractDialogOpen] = React.useState(false);
    const [documentsCollapsed, setDocumentsCollapsed] = React.useState(false);
    const [checklistCollapsed, setChecklistCollapsed] = React.useState(false);
    const [highlightText, setHighlightText] = React.useState<string | null>(null);
    const [activeFieldKey, setActiveFieldKey] = React.useState<string | null>(null);
    const [showDiffDialog, setShowDiffDialog] = React.useState(false);

    // Find a prior version of the selected document (same doc_type, different id, older)
    const priorVersionOfSelected = React.useMemo(() => {
        if (!selectedDocument) return null;
        const sameType = requestData.documents.filter(d =>
            d.id !== selectedDocument.id
            && d.type === selectedDocument.type
            && !!d.extraction?.data
        );
        if (sameType.length === 0) return null;
        // documents are already sorted newest-first in RequestDetail; pick the first
        // one that is older than the selected doc.
        const older = sameType.find(d => d.uploadedAt.getTime() < selectedDocument.uploadedAt.getTime());
        return older || sameType[0];
    }, [selectedDocument, requestData.documents]);

    // Reset the highlight when selection changes so it doesn't "stick" across docs.
    React.useEffect(() => {
        setHighlightText(null);
        setActiveFieldKey(null);
    }, [selectedDocument?.id]);

    const currentStageData = requestData.stages.find(s => s.id === activeViewStage);
    const selectedItem = requestData.checklist.find(i => i.id === selectedChecklistItemId);

    const caseRequiredDocTypes = React.useMemo(() => {
        if (!requestData.docDefs) return [];
        return requestData.docDefs
            .filter(d => d.mandatory)
            .map(d => d.type) as DocumentType[];
    }, [requestData.docDefs]);

    const activeDocDef = React.useMemo(() =>
        requestData.docDefs?.find(d => d.type === selectedDocument?.type),
        [requestData.docDefs, selectedDocument]);

    const missingDocs = React.useMemo(() => {
        if (!requestData.docDefs) return [];
        return getMissingDocuments(requestData.documents, requestData.docDefs);
    }, [requestData.documents, requestData.docDefs]);

    const hints = (activeDocDef?.hints?.length ? activeDocDef.hints : null) || DEFAULT_HINTS;

    const filteredExtractedData = React.useMemo(() => {
        if (!selectedDocument) return [];

        if (selectedDocument.status === 'failed') {
            return [{
                title: `Extraction Failed: ${selectedDocument.name}`,
                fields: [{
                    label: "Error",
                    value: "The AI agent could not process this document. Check your S3 credentials and bucket configuration.",
                    confidence: 0,
                    status: 'pending' as const,
                    documentId: selectedDocument.id
                }]
            }];
        }

        const docDef = requestData.docDefs?.find(d => d.type === selectedDocument.type);
        const standardKeys = docDef?.extraction_keys || [];
        const extraction = selectedDocument.extraction?.data || {};

        // When a schema is configured, render those keys in order.
        // When no schema is configured, render every key the agent extracted.
        const keys: string[] = standardKeys.length > 0
            ? standardKeys
            : Object.keys(extraction);

        return [{
            title: docDef?.name || selectedDocument.type.replace(/-/g, ' '),
            fields: keys.map(key => {
                const entry = extraction[key];
                // Entries may be {value, confidence} OR a plain value (free-form mode).
                const isWrapped = entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in (entry as any);
                const rawValue = isWrapped ? (entry as any).value : entry;
                const confidence = isWrapped ? ((entry as any).confidence || 0) : (rawValue ? 90 : 0);
                const hasValue = rawValue !== null && rawValue !== undefined && !(typeof rawValue === 'string' && rawValue.trim() === '');
                return {
                    label: key,
                    value: rawValue ?? null,
                    confidence: confidence > 1 ? confidence : confidence * 100,
                    status: (hasValue ? 'needs-review' : 'pending') as "verified" | "pending" | "needs-review",
                    documentId: selectedDocument.id,
                };
            }),
        }];
    }, [selectedDocument, requestData.docDefs]);

    const hasAutomatedValidation = selectedItem && (
        (selectedItem.handlerName && selectedItem.handlerName !== 'manual') ||
        selectedItem.itemType === 'cross-validation' ||
        selectedItem.verifications?.some(v => v.type !== 'manual')
    );

    const rightPanelTitle = selectedItem
        ? 'Checklist Details'
        : selectedDocument
        ? 'Extracted Data'
        : 'Details';

    return (
        <div className="flex-1 flex overflow-hidden bg-background">
            {/* Left column: documents + checklist */}
            <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-border flex flex-col overflow-hidden">
                <div
                    className={cn(
                        'border-b border-border flex flex-col overflow-hidden shrink-0',
                        documentsCollapsed
                            ? 'h-auto'
                            : checklistCollapsed
                            ? 'flex-1 min-h-0'
                            : 'h-[320px]',
                    )}
                >
                    <RequiredDocumentsPanel
                        documents={requestData.documents}
                        requiredDocTypes={caseRequiredDocTypes}
                        onUpload={onUploadDocument}
                        onSelectDocument={onSelectDocument}
                        selectedDocumentId={selectedDocument?.id}
                        collapsed={documentsCollapsed}
                        onToggleCollapsed={() => setDocumentsCollapsed(v => !v)}
                    />
                </div>

                <div
                    className={cn(
                        'flex flex-col overflow-hidden min-h-0',
                        checklistCollapsed ? 'h-auto' : 'flex-1',
                    )}
                >
                    <button
                        type="button"
                        onClick={() => setChecklistCollapsed(v => !v)}
                        className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0 bg-background hover:bg-muted/40 transition-colors text-left"
                    >
                        <div className="flex items-center gap-1.5">
                            {checklistCollapsed ? (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                            <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
                        </div>
                        <span className={cn(
                            'text-[11px] px-2 h-5 inline-flex items-center rounded font-medium',
                            currentStageData?.status === 'complete'
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground'
                        )}>
                            {currentStageData?.status === 'complete' ? 'Completed' : 'In progress'}
                        </span>
                    </button>
                    {!checklistCollapsed && (
                        <ScrollArea className="flex-1">
                            <div className="px-4 py-3">
                                {currentStageData && (
                                    <ActiveStagePanel
                                        stage={currentStageData}
                                        checklist={requestData.checklist}
                                        documents={requestData.documents}
                                        missingDocs={missingDocs}
                                        docDefs={requestData.docDefs || []}
                                        onToggle={onChecklistToggle}
                                        onMarkStageComplete={onStageComplete}
                                        selectedItemId={selectedChecklistItemId}
                                        onSelectItem={onSelectChecklistItem}
                                        onRunValidation={onRunValidation}
                                    />
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </div>

            {/* Right column: details */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <div className="px-5 py-2.5 border-b border-border flex items-center justify-between shrink-0 bg-background">
                    <h3 className="text-sm font-semibold text-foreground">{rightPanelTitle}</h3>

                    <div className="flex items-center gap-1.5">
                        {hasAutomatedValidation && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs"
                                onClick={async () => {
                                    const t = toast.loading('Running validation…');
                                    try {
                                        if (onRunValidation && selectedItem) {
                                            await onRunValidation(selectedItem.id);
                                        }
                                    } catch {
                                        toast.error('Validation failed');
                                    } finally {
                                        toast.dismiss(t);
                                    }
                                }}
                            >
                                <RefreshCw className="h-3 w-3" />
                                Re-run
                            </Button>
                        )}

                        {selectedDocument && !selectedItem && priorVersionOfSelected && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs"
                                onClick={() => setShowDiffDialog(true)}
                                title="Compare with prior version"
                            >
                                <GitCompare className="h-3 w-3" />
                                Compare versions
                            </Button>
                        )}

                        {selectedDocument && !selectedItem && (
                            <Dialog open={isReextractDialogOpen} onOpenChange={setIsReextractDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                                        <BrainCircuit className="h-3 w-3" />
                                        Re-extract
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[460px]">
                                    <DialogHeader>
                                        <DialogTitle>Refine AI extraction</DialogTitle>
                                        <DialogDescription>
                                            Give the AI specific pointers to help it locate missing values.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="prompt" className="text-xs">Additional instruction</Label>
                                            <Textarea
                                                id="prompt"
                                                rows={4}
                                                placeholder="e.g. Look for the Registration No on page 2, bottom left corner…"
                                                value={reextractPrompt}
                                                onChange={(e) => setReextractPrompt(e.target.value)}
                                                className="text-sm resize-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Quick hints</Label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {hints.map((hint) => (
                                                    <button
                                                        key={hint}
                                                        onClick={() => setReextractPrompt(prev => prev ? `${prev}, ${hint}` : hint)}
                                                        className="text-xs bg-muted hover:bg-primary/10 hover:text-primary border border-border rounded-md px-2 py-1 transition-colors"
                                                    >
                                                        + {hint}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsReextractDialogOpen(false)}>Cancel</Button>
                                        <Button
                                            disabled={!selectedDocument}
                                            onClick={async () => {
                                                if (selectedDocument && onReextract) {
                                                    await onReextract(selectedDocument.id, reextractPrompt);
                                                    setIsReextractDialogOpen(false);
                                                    setReextractPrompt('');
                                                }
                                            }}
                                            className="gap-1.5"
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Run extraction
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>

                {(() => {
                    const isPdfSelected = selectedDocument && !selectedItem && /\.pdf($|\?)/i.test(selectedDocument.name || selectedDocument.url || '');
                    const showSplit = isPdfSelected && filteredExtractedData.length > 0 && selectedDocument?.status !== 'failed';

                    if (selectedItem || (selectedDocument && selectedDocument.status === 'failed') || !selectedDocument || filteredExtractedData.length === 0 || !showSplit) {
                        return (
                            <ScrollArea className="flex-1">
                                <div className="px-5 py-4">
                                    {selectedItem ? (
                                        <ChecklistDetailPanel
                                            item={selectedItem}
                                            onValidationComplete={() => { }}
                                            onRunValidation={onRunValidation}
                                        />
                                    ) : (selectedDocument && selectedDocument.status === 'failed') ? (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                                <AlertCircle className="h-6 w-6 text-destructive" />
                                            </div>
                                            <h4 className="text-sm font-semibold text-foreground">Extraction failed</h4>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                                                The AI could not confidently extract data from this document. Try Re-extract with specific pointers, or enter values manually.
                                            </p>
                                        </div>
                                    ) : filteredExtractedData.length > 0 ? (
                                        <ExtractedDataPanel sections={filteredExtractedData} isCompact />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-16 text-center">
                                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                                <Database className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">No document selected</p>
                                            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                                                Select a document on the left to see its extracted fields, or pick a checklist item to see validation details.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        );
                    }

                    // Split layout: PDF on the left, extracted data on the right.
                    return (
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 min-w-0 border-r border-border">
                                <HighlightedPdfViewer
                                    url={selectedDocument!.proxyUrl || selectedDocument!.url!}
                                    externalUrl={selectedDocument!.url}
                                    fileName={selectedDocument!.name}
                                    highlightText={highlightText}
                                />
                            </div>
                            <div className="w-[360px] xl:w-[420px] shrink-0 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="px-4 py-3">
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                            Click a field to locate it on the page
                                        </p>
                                        <ExtractedDataPanel
                                            sections={filteredExtractedData}
                                            isCompact
                                            activeFieldKey={activeFieldKey}
                                            onFieldClick={(field) => {
                                                const value = field.value == null ? '' : String(field.value);
                                                if (!value) return;
                                                setHighlightText(value);
                                                setActiveFieldKey(`${field.documentId}-${field.label}`);
                                            }}
                                        />
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    );
                })()}
            </div>

            <ExtractionDiffDialog
                open={showDiffDialog}
                onOpenChange={setShowDiffDialog}
                previous={priorVersionOfSelected || undefined}
                current={selectedDocument || undefined}
            />
        </div>
    );
}
