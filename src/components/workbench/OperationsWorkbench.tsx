import React from 'react';
import {
    Document,
    getMissingDocuments,
    DocumentType,
    CaseData,
} from '@/types/case';
import { WorkbenchStagePanel } from './WorkbenchStagePanel';
import { DocumentDrawer } from './DocumentDrawer';

interface OperationsWorkbenchProps {
    requestData: CaseData;
    activeViewStage: number;
    selectedDocument: Document | null;
    selectedChecklistItemId: string | null;
    onSelectChecklistItem: (itemId: string) => void;
    onStageComplete: (stageId: number) => void;
    onChecklistToggle: (itemId: string) => void;
    onRunValidation?: (itemId: string) => Promise<void>;
    onSelectDocument: (doc: Document | null) => void;
    onReextract?: (docId: string, additionalPrompt?: string) => Promise<void>;
    onAskBroker: () => void;
}

/**
 * Single-column workbench: renders the active stage panel (checklist + details +
 * documents-in-stage) and an on-demand document drawer. The header, AI banner,
 * risk strip and stepper live in the parent page (RequestDetail).
 */
export function OperationsWorkbench({
    requestData,
    activeViewStage,
    selectedDocument,
    selectedChecklistItemId,
    onSelectChecklistItem,
    onStageComplete,
    onChecklistToggle,
    onRunValidation,
    onSelectDocument,
    onReextract,
    onAskBroker,
}: OperationsWorkbenchProps) {
    const [docDrawerOpen, setDocDrawerOpen] = React.useState(false);

    const currentStageData = requestData.stages.find(s => s.id === activeViewStage);

    const firstStageId = React.useMemo(() => {
        if (requestData.stages.length === 0) return undefined;
        return [...requestData.stages].sort((a, b) => a.order - b.order)[0].id;
    }, [requestData.stages]);

    const missingDocs = React.useMemo(() => {
        if (!requestData.docDefs) return [];
        return getMissingDocuments(requestData.documents, requestData.docDefs);
    }, [requestData.documents, requestData.docDefs]);

    const activeDocDef = React.useMemo(
        () => requestData.docDefs?.find(d => (d.type || d.doc_type) === selectedDocument?.type),
        [requestData.docDefs, selectedDocument],
    );

    const priorVersionOfSelected = React.useMemo(() => {
        if (!selectedDocument) return null;
        const sameType = requestData.documents.filter(d =>
            d.id !== selectedDocument.id && d.type === selectedDocument.type && !!d.extraction?.data);
        if (sameType.length === 0) return null;
        const older = sameType.find(d => d.uploadedAt.getTime() < selectedDocument.uploadedAt.getTime());
        return older || sameType[0];
    }, [selectedDocument, requestData.documents]);

    const handleOpenDoc = (doc: Document) => {
        onSelectDocument(doc);
        setDocDrawerOpen(true);
    };

    if (!currentStageData) {
        return (
            <div className="px-6 py-16 text-center text-sm text-muted-foreground">
                No stage selected.
            </div>
        );
    }

    return (
        <div className="px-4 md:px-6 lg:px-8 py-5">
            <div className="w-full">
                <WorkbenchStagePanel
                    stage={currentStageData}
                    isFirstStage={currentStageData.id === firstStageId}
                    checklist={requestData.checklist}
                    documents={requestData.documents}
                    docDefs={requestData.docDefs || []}
                    missingDocs={missingDocs as DocumentType[]}
                    selectedItemId={selectedChecklistItemId}
                    onSelectItem={onSelectChecklistItem}
                    onToggle={onChecklistToggle}
                    onRunValidation={onRunValidation}
                    onMarkStageComplete={onStageComplete}
                    onOpenDoc={handleOpenDoc}
                    onAskBroker={onAskBroker}
                />
            </div>

            <DocumentDrawer
                open={docDrawerOpen}
                onOpenChange={setDocDrawerOpen}
                document={selectedDocument}
                docDef={activeDocDef}
                priorVersion={priorVersionOfSelected}
                onReextract={onReextract}
            />
        </div>
    );
}
