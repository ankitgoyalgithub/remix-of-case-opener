import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActiveStagePanel } from '@/components/case/ActiveStagePanel';
import { DocumentsPanel } from '@/components/case/DocumentsPanel';
import { ExtractedDataPanel } from '@/components/case/ExtractedDataPanel';
import { DocumentHighlightsPanel } from '@/components/case/DocumentHighlightsPanel';
import { PhaseRail } from '@/components/verification/PhaseRail';
import { VerificationSummaryPanel } from '@/components/verification/VerificationSummaryPanel';
import { ExportPanel } from '@/components/case/ExportPanel';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { PHASES, VerificationPhase } from '@/types/verificationChecks';
import {
    Stage,
    ChecklistItem,
    Document,
    DocumentType,
    ExtractedDataSection,
    CaseData
} from '@/types/case';
import {
    FileText,
    Search,
    Eye,
    CheckSquare,
    Info,
    Activity,
    ArrowRightLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface OperationsWorkbenchProps {
    requestData: CaseData;
    activeViewStage: number;
    activePhase: VerificationPhase | null;
    phaseStatuses: any;
    verificationChecks: any[];
    selectedDocument: Document | null;
    selectedChecklistItemId: string | null;
    onSelectChecklistItem: (itemId: string) => void;
    onStageComplete: (stageId: number) => void;
    onChecklistToggle: (itemId: string) => void;
    onUploadDocument: (file: File, type: DocumentType, checklistId?: string) => Promise<void>;
    onVerifyField: (section: string, field: string) => void;
    onSelectDocument: (doc: Document | null) => void;
    setActivePhase: (phase: VerificationPhase) => void;
    onExport: () => void;
    onMarkIssued: () => void;
}

export function OperationsWorkbench({
    requestData,
    activeViewStage,
    activePhase,
    phaseStatuses,
    verificationChecks,
    selectedDocument,
    selectedChecklistItemId,
    onSelectChecklistItem,
    onStageComplete,
    onChecklistToggle,
    onUploadDocument,
    onVerifyField,
    onSelectDocument,
    setActivePhase,
    onExport,
    onMarkIssued
}: OperationsWorkbenchProps) {
    const currentStageData = requestData.stages.find(s => s.id === activeViewStage);

    // Filter intelligence data based on selection
    const selectedItem = requestData.checklist.find(i => i.id === selectedChecklistItemId);

    // Map of document types to their relevant section categories
    const sectionRelevance: Record<string, string[]> = {
        'census': ['Workforce'],
        'mol-list': ['Workforce'],
        'trade-license': ['Employer & Legal', 'Commercial'],
        'establishment-card': ['Employer & Legal'],
        'vat-certificate': ['Employer & Legal', 'Commercial'],
        'moa': ['Employer & Legal', 'Signatory'],
        'kyc-signatory': ['Signatory'],
        'signatory-id': ['Signatory'],
        'customer-signed-quote': ['Commercial', 'Signatory'],
        'medical-application-form': ['Workforce', 'Signatory']
    };

    // Filter extracted sections based on selection
    const filteredExtractedData = React.useMemo(() => {
        // If no document is selected, show nothing to avoid clutter
        if (!selectedDocument) return [];

        // Keys must exactly match what ExtractionAgent stores (see services/extraction_agent.py DOCUMENT_KEY_MAP)
        const standardKeyMap: Record<string, string[]> = {
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
            'other': ['Document Reference', 'Note']
        };

        const standardKeys = standardKeyMap[selectedDocument.type] || standardKeyMap['other'];
        const extraction = selectedDocument.extraction?.data || {};

        // Transform standardized keys into ExtractedDataSection format
        return [{
            title: `Extracted: ${selectedDocument.name}`,
            fields: standardKeys.map(key => ({
                label: key,
                value: extraction[key]?.value || null,
                confidence: (extraction[key]?.confidence || 0) * 100,
                status: (extraction[key]?.value ? 'needs-review' : 'pending') as "verified" | "pending" | "needs-review",
                documentId: selectedDocument.id
            }))
        }];
    }, [selectedDocument]);

    const handleReupload = async (docId: string, file: File) => {
        // This would call the PATCH endpoint in production
        console.log(`Re-uploading for document ${docId}`);
        await onUploadDocument(file, (selectedDocument?.type || 'other') as DocumentType);
    };

    const handlePreview = (doc: Document) => {
        if (doc.url) window.open(doc.url, '_blank');
    };

    // If we are at the final stage, show export view
    const isFinalStage = activeViewStage === 7;

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-background/50 p-4 gap-4">
            {/* Top Bar: Context & Adjudication Summary */}
            <div className="flex items-center justify-between glass-card rounded-2xl p-3 px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                            {currentStageData?.name}
                        </h2>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Operational Context</span>
                    </div>
                    <Separator orientation="vertical" className="h-8 bg-border/50" />
                    <div className="flex items-center gap-6">
                        {Object.entries(PHASES).map(([key, phase]) => (
                            <div key={key} className="flex flex-col">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.1em]">{phase.label}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className={cn(
                                        "w-3 h-3 rounded-full border-[2.5px]",
                                        phaseStatuses[key] === 'passed' ? "bg-success/20 border-success" :
                                            phaseStatuses[key] === 'failed' ? "bg-destructive/20 border-destructive" :
                                                "bg-muted border-muted-foreground/30"
                                    )}></div>
                                    <span className="text-[11px] font-bold text-foreground/80 lowercase">{phaseStatuses[key] || 'pending'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-primary/20 hover:bg-primary/5 text-xs font-bold gap-2">
                        <Activity className="h-4 w-4" />
                        Real-time Health
                    </Button>
                    <Button
                        onClick={() => onStageComplete(activeViewStage)}
                        disabled={requestData.status === 'Issued' || currentStageData?.status === 'complete'}
                        className="h-9 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 text-xs font-bold border-t border-white/20"
                    >
                        Advance Stage
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Left Column: Command & Validation */}
                <div className="w-[380px] lg:w-[440px] flex flex-col gap-4">
                    <div className="flex-1 glass-card rounded-3xl flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-border/50 bg-muted/20">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <CheckSquare className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="text-sm font-bold uppercase tracking-tight">Stage Commands</h3>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-bold py-0.5 bg-primary/5 border-primary/20">{currentStageData?.status === 'complete' ? 'COMPLETED' : 'IN PROGRESS'}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">{currentStageData?.description || "Execute required validations for this stage."}</p>
                        </div>

                        <ScrollArea className="flex-1">
                            <div className="p-5">
                                {currentStageData && (
                                    <ActiveStagePanel
                                        stage={currentStageData}
                                        checklist={requestData.checklist}
                                        documents={requestData.documents}
                                        missingDocs={(requestData.docDefs?.filter(d => d.applicableStages.includes(activeViewStage) && d.mandatory && !requestData.documents.some(doc => doc.type === d.type)).map(d => d.type) as DocumentType[]) || []}
                                        docDefs={requestData.docDefs || []}
                                        onToggle={onChecklistToggle}
                                        onMarkStageComplete={onStageComplete}
                                        onUploadDocument={onUploadDocument}
                                        workforceMismatch={requestData.workforceMismatch}
                                        selectedItemId={selectedChecklistItemId}
                                        onSelectItem={onSelectChecklistItem}
                                    />
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Right Column: Intelligence & Evidence */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    {/* Intelligence Bento Grid */}
                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-4 min-h-0">
                        {/* Data Bento Card */}
                        <div className="glass-card rounded-3xl flex flex-col overflow-hidden bg-card/30">
                            <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <Database className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider">Field Extractions</h4>
                                </div>
                                {selectedItem?.documentType && (
                                    <Badge className="text-[10px] bg-blue-500/10 text-blue-500 border-none px-2">{selectedItem.documentType}</Badge>
                                )}
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="p-5">
                                    {filteredExtractedData.length > 0 ? (
                                        <ExtractedDataPanel
                                            sections={filteredExtractedData}
                                            onVerify={onVerifyField}
                                            isCompact
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center py-24 text-center">
                                            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border border-dashed">
                                                <Database className="h-6 w-6 text-muted-foreground/40" />
                                            </div>
                                            <p className="text-sm font-bold text-foreground">Operational Signal Missing</p>
                                            <p className="text-[11px] text-muted-foreground mt-1 px-12 leading-relaxed">Select a verification task from the command center to stream AI-extracted data points.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Evidence Bento Card */}
                        <div className="glass-card rounded-3xl flex flex-col overflow-hidden bg-card/20">
                            <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <FileText className="h-4 w-4 text-indigo-500" />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider">Evidence Library</h4>
                                </div>
                                {selectedDocument && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold gap-1.5 hover:bg-primary/5 text-primary"
                                        onClick={() => onSelectDocument(null)}
                                    >
                                        <ArrowRightLeft className="h-3.5 w-3.5" />
                                        SWITCH SOURCE
                                    </Button>
                                )}
                            </div>
                            <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
                                {selectedDocument ? (
                                    <div className="bg-card/50 rounded-2xl border border-border flex flex-col shadow-inner h-full overflow-hidden">
                                        <DocumentHighlightsPanel
                                            document={selectedDocument}
                                            docDef={requestData.docDefs?.find(d => d.type === selectedDocument.type)}
                                            onClose={() => onSelectDocument(null)}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col min-h-0 bg-muted/30 rounded-2xl border border-dashed border-border/60 overflow-hidden">
                                        <ScrollArea className="flex-1">
                                            <div className="p-4">
                                                {(() => {
                                                    // Only show document explicitly linked to the selected checklist item
                                                    const linkedDoc = selectedItem
                                                        ? requestData.documents.find(d => d.checklistId === selectedItem.id)
                                                        : null;
                                                    const docsToShow = linkedDoc ? [linkedDoc] : [];

                                                    if (!selectedItem) {
                                                        return (
                                                            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                                                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border border-dashed">
                                                                    <FileText className="h-6 w-6 text-muted-foreground/30" />
                                                                </div>
                                                                <p className="text-sm font-bold text-foreground">Select a Task</p>
                                                                <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed mx-auto">
                                                                    Click a checklist item on the left to view its linked document.
                                                                </p>
                                                            </div>
                                                        );
                                                    } else if (docsToShow.length > 0) {
                                                        return (
                                                            <DocumentsPanel
                                                                documents={docsToShow}
                                                                selectedDocument={selectedDocument}
                                                                onSelectDocument={onSelectDocument}
                                                                activeStage={activeViewStage}
                                                                docDefs={requestData.docDefs}
                                                                onUpload={undefined}
                                                                onReupload={handleReupload}
                                                                onPreview={handlePreview}
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                                            <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                                                                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border border-dashed">
                                                                    <FileText className="h-6 w-6 text-muted-foreground/30" />
                                                                </div>
                                                                <p className="text-sm font-bold text-foreground">Evidence Required</p>
                                                                <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px] leading-relaxed mx-auto">
                                                                    {selectedItem?.documentType
                                                                        ? `Upload the required document for "${selectedItem.label}" using the Upload button.`
                                                                        : "Upload supporting documentation to begin validation."}
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add Database icon locally if not already available in parent
function Database({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" />
        </svg>
    );
}

// Internal Helper Icons
function ShieldSquare({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
    );
}
