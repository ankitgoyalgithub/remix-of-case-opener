import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActiveStagePanel } from '@/components/case/ActiveStagePanel';
import { DocumentsPanel } from '@/components/case/DocumentsPanel';
import { ExtractedDataPanel } from '@/components/case/ExtractedDataPanel';
import { DocumentHighlightsPanel } from '@/components/case/DocumentHighlightsPanel';
import { ChecklistDetailPanel } from '@/components/case/ChecklistDetailPanel';
import { Badge } from '@/components/ui/badge';
import { VerificationPhase } from '@/types/verificationChecks';
import {
    Document,
    TimelineEvent,
    getMissingDocuments,
    DocumentType,
    CaseData,
    DocDef
} from '@/types/case';
import {
    FileText,
    CheckSquare,
    Activity,
    ArrowRightLeft,
    Sparkles,
    ShieldCheck,
    ListTodo,
    Database,
    RefreshCw,
    BrainCircuit,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RequiredDocumentsPanel } from '@/components/case/RequiredDocumentsPanel';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
    onExport,
    onMarkIssued
}: OperationsWorkbenchProps) {
    const [reextractPrompt, setReextractPrompt] = React.useState('');
    const [isReextractDialogOpen, setIsReextractDialogOpen] = React.useState(false);

    const currentStageData = requestData.stages.find(s => s.id === activeViewStage);
    const selectedItem = requestData.checklist.find(i => i.id === selectedChecklistItemId);

    // Dynamic derivation from DB definitions
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

    // Filter extracted sections based on selection
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

        // Find keys from database-driven docDefs first
        const docDef = requestData.docDefs?.find(d => d.type === selectedDocument.type);
        const standardKeys = docDef?.extraction_keys || [];

        // Fallback for untracked types
        const finalKeys = standardKeys.length > 0 ? standardKeys : ['Document Reference', 'Note'];
        const extraction = selectedDocument.extraction?.data || {};

        return [{
            title: docDef?.name || selectedDocument.type.replace(/-/g, ' '),
            fields: finalKeys.map(key => ({
                label: key,
                value: extraction[key]?.value || null,
                confidence: (extraction[key]?.confidence || 0) * 100,
                status: (extraction[key]?.value ? 'needs-review' : 'pending') as "verified" | "pending" | "needs-review",
                documentId: selectedDocument.id
            }))
        }];
    }, [selectedDocument, requestData.docDefs]);

    const handleReupload = async (docId: string, file: File) => {
        await onUploadDocument(file, (selectedDocument?.type || 'other') as DocumentType);
    };

    const handlePreview = (doc: Document) => {
        if (doc.url) window.open(doc.url, '_blank');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background p-4 gap-4">


            <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 overflow-auto xl:overflow-hidden">
                {/* Left Column: Input & Tasks */}
                <div className="w-full xl:w-[420px] flex flex-col gap-4 shrink-0">
                    {/* Required Documents Section */}
                    <div className="h-[320px] lg:h-[380px] xl:h-[320px] bg-card rounded-lg border flex flex-col overflow-hidden">
                        <RequiredDocumentsPanel
                            documents={requestData.documents}
                            requiredDocTypes={caseRequiredDocTypes}
                            onUpload={onUploadDocument}
                            onSelectDocument={onSelectDocument}
                            selectedDocumentId={selectedDocument?.id}
                        />
                    </div>

                    {/* Operational Checklist Section */}
                    <div className="h-[400px] xl:flex-1 bg-card rounded-lg border flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                    <CheckSquare className="h-4 w-4 text-indigo-500" />
                                </div>
                                <h3 className="text-xs font-bold uppercase tracking-wider">Checklist</h3>
                            </div>
                            <Badge variant="outline" className="text-xs font-bold py-0 bg-primary/5 border-primary/20">
                                {currentStageData?.status === 'complete' ? 'COMPLETED' : 'IN PROGRESS'}
                            </Badge>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-4">
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
                    </div>
                </div>

                {/* Right Column: Intelligence & Evidence */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Data Bento Card / Traffic Light Report */}
                        <div className="bg-card rounded-lg border flex flex-col overflow-hidden min-h-[400px] 2xl:min-h-0">
                            <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Database className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider">
                                        {activeViewStage === 1
                                            ? 'Adjudication Report'
                                            : selectedItem
                                                ? 'Checklist Details'
                                                : 'Field Extractions'}
                                    </h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Action Hub - Contextual Buttons */}
                                    {selectedItem && (
                                        (selectedItem.handlerName && selectedItem.handlerName !== 'manual') || 
                                        selectedItem.itemType === 'cross-validation' || 
                                        selectedItem.verifications?.some(v => v.type !== 'manual')
                                    ) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs font-black tracking-widest gap-1.5 hover:bg-primary/5 text-primary border border-primary/20 hover:border-primary/40 uppercase"
                                            onClick={async () => {
                                                const loadingToast = toast.loading('Executing Validation Logic...');
                                                try {
                                                    if (onRunValidation) {
                                                        await onRunValidation(selectedItem.id);
                                                    }
                                                } catch (err) {
                                                    toast.error('Validation failed');
                                                } finally {
                                                    toast.dismiss(loadingToast);
                                                }
                                            }}
                                        >
                                            <RefreshCw className="h-3.5 w-3.5" />
                                            Re-Run Analysis
                                        </Button>
                                    )}

                                    {selectedDocument && !selectedItem && (
                                        <Dialog open={isReextractDialogOpen} onOpenChange={setIsReextractDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs font-black tracking-widest gap-1.5 hover:bg-primary/5 text-primary border border-primary/20 hover:border-primary/40 uppercase"
                                                >
                                                    <BrainCircuit className="h-3.5 w-3.5" />
                                                    Re-Extract
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
                                                <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
                                                    <DialogHeader className="mb-6">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                                <BrainCircuit className="h-6 w-6 text-primary" />
                                                            </div>
                                                            <div>
                                                                <DialogTitle className="text-xl font-bold tracking-tight">
                                                                    Refine AI Extraction
                                                                </DialogTitle>
                                                                <DialogDescription className="text-xs text-muted-foreground">
                                                                    Provide specific pointers to help the AI find missing values.
                                                                </DialogDescription>
                                                            </div>
                                                        </div>
                                                    </DialogHeader>

                                                    <div className="space-y-6">
                                                        <div className="space-y-3">
                                                            <Label htmlFor="prompt" className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] ml-0.5">
                                                                Additional AI Instruction
                                                            </Label>
                                                            <div className="relative group">
                                                                <Textarea
                                                                    id="prompt"
                                                                    rows={4}
                                                                    placeholder="e.g. Look for the Registration No on page 2, bottom left corner..."
                                                                    value={reextractPrompt}
                                                                    onChange={(e) => setReextractPrompt(e.target.value)}
                                                                    className="w-full rounded-xl border border-border bg-background/50 backdrop-blur-sm p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none placeholder:text-muted-foreground/50 shadow-sm"
                                                                />
                                                                <Sparkles className="absolute right-4 bottom-4 h-4 w-4 text-primary/30 group-focus-within:text-primary transition-colors" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] ml-0.5">
                                                                Quick Hints
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {hints.map((hint) => (
                                                                    <button
                                                                        key={hint}
                                                                        onClick={() => setReextractPrompt(prev => prev ? `${prev}, ${hint}` : hint)}
                                                                        className="text-xs font-medium bg-muted/50 hover:bg-primary/10 hover:text-primary border border-border hover:border-primary/30 py-1.5 px-3 rounded-full transition-all"
                                                                    >
                                                                        + {hint}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="pt-2">
                                                            <Button
                                                                disabled={!selectedDocument}
                                                                onClick={async (e) => {
                                                                    const btn = e.currentTarget;
                                                                    btn.disabled = true;
                                                                    try {
                                                                        if (selectedDocument && onReextract) {
                                                                            await onReextract(selectedDocument.id, reextractPrompt);
                                                                            setIsReextractDialogOpen(false);
                                                                            setReextractPrompt('');
                                                                        }
                                                                    } finally {
                                                                        btn.disabled = false;
                                                                    }
                                                                }}
                                                                className="w-full h-11 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/25 font-bold gap-2 transition-all hover:scale-[1.02]"
                                                            >
                                                                <RefreshCw className="h-4 w-4 animate-spin-slow" />
                                                                Run Intelligent Agent
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )}
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-4 lg:p-10">

                                    {/* If a checklist item is selected, show its detail panel instead of extraction */}
                                    {selectedItem ? (
                                        <ChecklistDetailPanel
                                            item={selectedItem}
                                            onValidationComplete={(updated) => {
                                                // Parent refresh handled via toast; result is updated in local state inside panel
                                            }}
                                            onRunValidation={onRunValidation}
                                        />
                                    ) : activeViewStage === 1 ? (
                                        <div className="space-y-6">
                                            <div className="bg-muted/10 rounded-lg p-4 border border-border/50">
                                                <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Traffic Light Summary</h5>
                                                <div className="space-y-3">
                                                    {[
                                                        { label: 'Entity Status', status: 'verified', source: 'NER', color: 'text-success' },
                                                        { label: 'Tax Status', status: 'valid', source: 'FTA', color: 'text-success' },
                                                        { label: 'UBO Check', status: '1 PEP detected', source: 'Manual Review Required', color: 'text-amber-500' },
                                                        { label: 'Expiry Alert', status: 'License expires in 12 days', source: 'Hard Stop Imminent', color: 'text-destructive' },
                                                    ].map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-md border border-border/50 shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                                                                    item.color.replace('text-', 'bg-')
                                                                )}></div>
                                                                <span className="text-xs font-bold text-foreground/80">{item.label}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className={cn("text-sm font-black uppercase", item.color)}>{item.status}</div>
                                                                <div className="text-[11px] text-muted-foreground font-medium group-hover:text-primary transition-colors hidden xs:block">Source: {item.source}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-4 bg-muted/10 rounded-lg border border-border/50">
                                                <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                                    The data is ready to be pushed to the core policy system. Review the yellow and red flags before final approval.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (selectedDocument && selectedDocument.status === 'failed') ? (
                                        <div className="h-full flex flex-col items-center justify-center py-12 md:py-24 text-center px-8">
                                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6 border border-destructive/20 border-dashed">
                                                <AlertCircle className="h-8 w-8 text-destructive/60" />
                                            </div>
                                            <h4 className="text-sm font-black text-destructive uppercase tracking-widest">Extraction Failed</h4>
                                            <p className="text-sm font-medium text-muted-foreground mt-2 max-w-[280px] leading-relaxed">
                                                The AI could not confidently isolate data from this document. This usually occurs with poor scan quality or complex layouts.
                                            </p>
                                            
                                            <div className="mt-8 flex flex-col gap-2 w-full max-w-[280px]">
                                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-xs text-left text-foreground/70 leading-tight flex gap-3 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                                                    <p>Use **Re-Extract** with manual pointers to help the AI locate specific fields.</p>
                                                </div>
                                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50 text-xs text-left text-foreground/70 leading-tight flex gap-3 items-start">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1" />
                                                    <p>Capture the required data points manually in the verification tasks.</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : filteredExtractedData.length > 0 ? (
                                        <ExtractedDataPanel
                                            sections={filteredExtractedData}
                                            isCompact
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-12 md:py-24 text-center">
                                            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border border-dashed">
                                                <Database className="h-6 w-6 text-muted-foreground/40" />
                                            </div>
                                            <p className="text-sm font-bold text-foreground">Checklist Signal Missing</p>
                                            <p className="text-sm text-muted-foreground mt-1 px-6 md:px-12 leading-relaxed text-balance">Select a verification task or document to stream AI-extracted data points.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
}
