import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { CaseStepper } from '@/components/case/CaseStepper';
import { RequestDetailHeader } from '@/components/request/RequestDetailHeader';
import { ExtractedDataPanel } from '@/components/case/ExtractedDataPanel';
import { DocumentsPanel } from '@/components/case/DocumentsPanel';
import { DocumentHighlightsPanel } from '@/components/case/DocumentHighlightsPanel';
import { WorkforceMismatchBanner } from '@/components/case/WorkforceMismatchBanner';
import { ActiveStagePanel } from '@/components/case/ActiveStagePanel';
import { TimelineDrawer } from '@/components/case/TimelineDrawer';
import { ExportPanel } from '@/components/case/ExportPanel';
import { MissingInfoEmailModal } from '@/components/request/MissingInfoEmailModal';
import { AssignOwnerModal } from '@/components/request/AssignOwnerModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OperationsWorkbench } from '@/components/workbench/OperationsWorkbench';
import { mockExportPayload, mockChecklist } from '@/data/mockCaseData';
import { api } from '@/lib/api';
import { mapBackendRequestToListItem, mapBackendStageToStage, mapBackendRequestChecklistToChecklistItem, mapBackendDocumentToDocument, groupExtractionsBySection } from '@/lib/mappers';
import {
  Document,
  TimelineEvent,
  getMissingDocuments,
  calculateSlaRemaining,
  getSlaStatus,
  DocumentType,
  CaseData
} from '@/types/case';
import { FileText, Database, Send, FileCheck, ShieldCheck, Loader2, ListTodo, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<CaseData | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [showAssignOwnerModal, setShowAssignOwnerModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      const [req, docsRes, studioDocsRes] = await Promise.all([
        api.requests.get(requestId),
        api.documents.list(),
        api.studio.documents.list()
      ]);

      console.log('DEBUG_FRONTEND: docsRes length =', docsRes.length);
      console.log('DEBUG_FRONTEND: docsRes[0] =', JSON.stringify(docsRes[0]));
      console.log('DEBUG_FRONTEND: requestId =', requestId);

      const listItem = mapBackendRequestToListItem(req);

      const dynamicDocDefs = studioDocsRes.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.doc_type,
        mandatory: d.mandatory,
        extraction_keys: d.extraction_keys,
        aiInstructions: d.ai_instructions,
        hints: d.hints
      }));

      // collect all checklists from all stages
      const requestChecklist = (req.request_stages || []).flatMap((rs: any) =>
        (rs.checklists || []).map(mapBackendRequestChecklistToChecklistItem)
      );

      const requestStages = (req.request_stages || []).map(mapBackendStageToStage);

      // Map documents and filter by current request (ensure newest first)
      const requestDocuments = docsRes
        .filter((d: any) => d.request === requestId)
        .map(mapBackendDocumentToDocument)
        .sort((a: Document, b: Document) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      // Extract extractions from matching documents
      const extractionRecords = requestDocuments
        .filter(d => d.extraction)
        .map(d => ({
          document: d.id,
          data: d.extraction.data
        }));

      const fullData: CaseData = {
        id: listItem.id,
        companyName: listItem.companyName,
        status: listItem.status,
        owner: listItem.owner,
        queue: listItem.queue,
        brokerEmail: listItem.brokerEmail,
        currentStage: parseInt(listItem.currentStageId?.toString()) || requestStages[0]?.id || 1,
        priority: listItem.priority,
        slaTargetHours: listItem.slaTargetHours,
        createdAt: listItem.createdAt,
        stages: requestStages,
        documents: requestDocuments,
        extractedData: groupExtractionsBySection(extractionRecords),
        timeline: [],
        checklist: requestChecklist,
        workforceMismatch: {
          detected: false,
          molCount: 0,
          censusCount: 0,
          accepted: false
        },
        docDefs: dynamicDocDefs,
        isExported: false,
        isIssued: listItem.status === 'Issued',
        missingInfoRequested: undefined
      };

      console.log('DEBUG_FRONTEND: fullData.documents names =', fullData.documents.map(d => d.name));
      console.log('DEBUG_FRONTEND: fullData.documents urls =', fullData.documents.map(d => d.url));
      setRequestData(fullData);
    } catch (error) {
      console.error('Failed to fetch request details:', error);
      toast.error('Failed to load request data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  // Keep selectedDocument sync'd with the latest requestData payload (e.g. after upload finishes)
  useEffect(() => {
    if (!requestData) return;

    let nextDoc = null;
    if (selectedChecklistItemId) {
      const item = requestData.checklist.find(i => i.id === selectedChecklistItemId);
      if (item?.documentType) {
        nextDoc = requestData.documents.find(d => d.type === item.documentType) || null;
      }
    } else if (selectedDocument) {
      nextDoc = requestData.documents.find(d => d.id === selectedDocument.id) || null;
    }

    if (nextDoc && JSON.stringify(nextDoc) !== JSON.stringify(selectedDocument)) {
      setSelectedDocument(nextDoc);
    }
  }, [requestData, selectedChecklistItemId, selectedDocument]);

  const currentStage = requestData?.stages?.find(s => s.id === requestData.currentStage)?.id
    || requestData?.stages?.[0]?.id
    || requestData?.currentStage
    || 1;

  const activeViewStage = selectedStageId || currentStage;

  const getMissingForStage = (stageId: number, docs: Document[], docDefs: any[]) => {
    return getMissingDocuments(docs, docDefs);
  };

  // Get all manually-missing documents across all stages
  const allMissingDocs = useMemo(() => {
    if (!requestData || !requestData.docDefs) return [];
    return getMissingDocuments(requestData.documents, requestData.docDefs);
  }, [requestData?.documents, requestData?.docDefs]);

  // allMissingDocs is now calculated above verificationChecks

  // Calculate SLA dynamically
  const slaRemaining = useMemo(() =>
    requestData ? calculateSlaRemaining(requestData.createdAt, requestData.priority) : 0,
    [requestData?.createdAt, requestData?.priority]
  );
  const slaStatus = useMemo(() =>
    requestData ? getSlaStatus(slaRemaining, requestData.slaTargetHours) : 'green',
    [slaRemaining, requestData?.slaTargetHours]
  );

  // Check if all active stages are complete
  const allStagesComplete = useMemo(() =>
    requestData ? requestData.stages.filter((s, idx, arr) => idx < arr.length - 1).every(s => s.status === 'complete') : false,
    [requestData?.stages]
  );

  // Determine automatic request status
  const computedStatus = useMemo(() => {
    if (!requestData) return 'In Review';
    if (requestData.isIssued) return 'Issued';
    if (allStagesComplete) return 'Ready for Export';
    if (allMissingDocs.length > 0 || requestData.missingInfoRequested) return 'Missing Info';
    return 'In Review';
  }, [requestData?.isIssued, allStagesComplete, allMissingDocs, requestData?.missingInfoRequested]);

  const headerData = {
    brokerName: 'Gulf Insurance Brokers',
    currentStageName: requestData?.stages?.find(s => s.id === currentStage)?.name || 'Unknown',
  };

  const handleStageClick = (stageId: number) => {
    setSelectedStageId(stageId);
    setActiveTab('tasks');
    if (stageId === requestData?.stages[requestData.stages.length - 1]?.id) {
      setActiveTab('export');
    }
  };

  const handleUploadDocument = async (file: globalThis.File, docType: DocumentType = 'other', checklistId?: string) => {
    if (!requestData?.id) return;
    const formData = new FormData();
    formData.append('request', requestData.id);
    formData.append('file', file);
    formData.append('doc_type', docType);
    if (checklistId) {
      formData.append('checklist_item', checklistId);
    }

    // Link document to the specific request stage instance
    const currentStageInstance = requestData.stages.find(s => s.id === activeViewStage);
    if (currentStageInstance?.instanceId) {
      formData.append('request_stage', currentStageInstance.instanceId.toString());
    }

    try {
      setIsUploading(true);
      await api.documents.upload(formData);
      toast.success('Document uploaded successfully');
      fetchRequestDetails();
    } catch (err: any) {
      console.error('Failed to upload', err);
      const errorMessage = err?.message || 'Failed to upload document';
      toast.error(errorMessage, { description: 'Ensure your S3 credentials and bucket are correctly configured.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleMarkStageComplete = async (stageId: number) => {
    if (!requestData) return;

    const stage = requestData.stages.find(s => s.id === stageId);

    try {
      if (stage?.instanceId) {
        await api.workflow.requestStageUpdate(stage.instanceId, { status: 'completed', completed_at: new Date().toISOString() });
      }

      // Update the main request status/current_stage if needed
      const currentStageIndex = requestData.stages.findIndex(s => s.id === stageId);
      let nextStageId = stageId;
      if (currentStageIndex > -1 && currentStageIndex < requestData.stages.length - 1) {
        nextStageId = requestData.stages[currentStageIndex + 1].id;
      }
      if (stage?.nextStageId) {
        nextStageId = stage.nextStageId;
      }
      await api.requests.update(requestData.id, { current_stage: nextStageId });

      toast.success(`Stage ${stage?.name || stageId} marked as complete`);
      fetchRequestDetails();
    } catch (err) {
      console.error('Failed to complete stage', err);
      toast.error('Failed to update stage status');
    }
  };


  const handleAcceptMismatch = (reason: string) => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Workforce discrepancy accepted',
      user: requestData.owner,
      details: `Reason: ${reason}`,
    };
    setRequestData(prev => ({
      ...prev,
      workforceMismatch: { ...prev.workforceMismatch, accepted: true, acceptReason: reason },
      timeline: [...prev.timeline, newTimeline],
      stages: prev.stages.map(s =>
        s.id === 3 ? { ...s, status: 'complete' as const } : s
      ),
    }));
  };

  const handleChecklistToggle = async (itemId: string) => {
    if (!requestData) return;
    const item = requestData.checklist.find(i => i.id === itemId);
    if (!item) return;

    try {
      await api.workflow.requestChecklistUpdate(itemId, { checked: !item.checked });
      setRequestData(prev => ({
        ...prev,
        checklist: prev.checklist.map(i =>
          i.id === itemId ? { ...i, checked: !item.checked } : i
        ),
      }));
    } catch (err) {
      console.error('Failed to toggle checklist', err);
      toast.error('Failed to update checklist item');
    }
  };

  const handleChecklistSelect = (itemId: string) => {
    setSelectedChecklistItemId(itemId);

    // If the item is an extraction task and has a document type, try to find that document
    const item = requestData?.checklist.find(i => i.id === itemId);
    if (item?.documentType) {
      const doc = requestData?.documents.find(d => d.type === item.documentType);
      if (doc) setSelectedDocument(doc);
    }
  };

  const handleExport = () => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Exported to Core',
      user: 'System',
      details: 'Request data pushed to core system successfully',
    };
    setRequestData(prev => ({
      ...prev,
      isExported: true,
      timeline: [...prev.timeline, newTimeline],
      checklist: prev.checklist.map(c =>
        c.id === 'c21' ? { ...c, checked: true } : c
      ),
    }));
  };

  const handleMarkIssued = () => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Policy Issued',
      user: requestData.owner,
      details: 'SME Health policy marked as issued',
    };
    setRequestData(prev => ({
      ...prev,
      isIssued: true,
      status: 'Issued',
      timeline: [...prev.timeline, newTimeline],
      stages: prev.stages.map((s, idx) =>
        idx === prev.stages.length - 1 ? { ...s, status: 'complete' as const } : s
      ),
      checklist: prev.checklist.map(c =>
        c.id === 'c22' ? { ...c, checked: true } : c
      ),
    }));
  };

  const handleAssignOwner = (owner: string, queue: 'Senior Ops Queue' | 'Standard Ops Queue') => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Owner assigned',
      user: 'System',
      details: `Request assigned to ${owner} (${queue})`,
    };
    setRequestData(prev => ({
      ...prev,
      owner,
      queue,
      timeline: [...prev.timeline, newTimeline],
    }));
  };

  const handleMissingInfoSent = () => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Missing information requested',
      user: requestData.owner,
      details: `Email sent to broker requesting: ${allMissingDocs.length} document(s)`,
    };
    setRequestData(prev => ({
      ...prev,
      missingInfoRequested: {
        timestamp: new Date(),
        documents: allMissingDocs,
      },
      timeline: [...prev.timeline, newTimeline],
    }));
  };

  const handleReextract = async (docId: string, additionalPrompt?: string) => {
    try {
      toast.loading('AI is re-processing document...', { id: 'reextract' });
      await api.documents.extract(docId, additionalPrompt);
      toast.success('Re-extraction complete', { id: 'reextract' });
      fetchRequestDetails();
    } catch (err: any) {
      console.error('Failed to re-extract', err);
      // Try to get a more descriptive error from the backend Response if possible
      const errorMessage = err?.message || 'Failed to re-extract document';
      toast.error(errorMessage, { id: 'reextract', description: 'Check your AI and Storage configuration.' });
    }
  };

  const handleEscalate = () => {
    toast.info('Escalation dialog would open here');
  };

  const handleApprove = () => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Request Approved',
      user: requestData.owner,
      details: 'Request approved via Ops Adjudication',
    };
    setRequestData(prev => ({
      ...prev,
      timeline: [...prev.timeline, newTimeline],
    }));
    toast.success('Request approved', {
      description: 'Approval logged to timeline',
    });
  };

  const handleReject = (reason: string) => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Request Rejected',
      user: requestData.owner,
      details: `Reason: ${reason}`,
    };
    setRequestData(prev => ({
      ...prev,
      timeline: [...prev.timeline, newTimeline],
    }));
    toast.error('Request rejected', {
      description: 'Rejection reason logged to timeline',
    });
  };

  const handleDeleteRequest = async () => {
    if (!requestId) return;
    try {
      toast.loading('Deleting request...', { id: 'delete-request' });
      await api.requests.delete(requestId);
      toast.success('Request deleted successfully', { id: 'delete-request' });
      navigate('/requests');
    } catch (err) {
      console.error('Failed to delete request', err);
      toast.error('Failed to delete request', { id: 'delete-request' });
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!requestData) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Request Not Found</h2>
          <p className="text-muted-foreground mb-6">The request ID could not be found in the system.</p>
          <Link to="/requests">
            <Button>Back to Inbox</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Upload Sandclock Overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 p-8 rounded-3xl bg-card/90 border border-border/50 shadow-2xl">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="relative z-10 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30">
                <Hourglass className="h-8 w-8 text-primary animate-spin" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-foreground tracking-tight">Uploading Document</p>
              <p className="text-xs text-muted-foreground">Please wait while we securely upload your file...</p>
            </div>
            <div className="w-48 h-1 bg-muted/30 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[upload-progress_2s_ease-in-out_infinite]" style={{ width: '60%', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      )}
      <RequestDetailHeader
        requestId={requestData.smartId || requestData.id}
        companyName={requestData.companyName}
        brokerName={headerData.brokerName}
        priority={requestData.priority}
        slaRemaining={slaRemaining}
        slaTargetHours={requestData.slaTargetHours}
        slaStatus={slaStatus}
        currentStage={headerData.currentStageName}
        status={computedStatus}
        owner={requestData.owner}
        queue={requestData.queue}
        hasMissingDocuments={allMissingDocs.length > 0}
        onAssignOwner={() => setShowAssignOwnerModal(true)}
        onRequestMissingInfo={() => setShowMissingInfoModal(true)}
        onEscalate={handleEscalate}
        onDelete={handleDeleteRequest}
        timelineDrawer={<TimelineDrawer events={requestData.timeline} />}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Stage Navigation Only */}
        <div className="w-60 border-r border-border bg-card overflow-y-auto flex flex-col">
          {/* Stage Stepper */}
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Issuance Stages
            </h3>
            <CaseStepper
              stages={requestData.stages}
              currentStage={activeViewStage}
              onStageClick={handleStageClick}
            />
          </div>

          <div className="mt-auto p-4 border-t border-border">
            <Link to="/evidence-pack">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <FileCheck className="h-4 w-4" />
                Evidence Pack
              </Button>
            </Link>
          </div>
        </div>

        <OperationsWorkbench
          requestData={requestData}
          activeViewStage={activeViewStage}
          selectedDocument={selectedDocument}
          selectedChecklistItemId={selectedChecklistItemId}
          onSelectChecklistItem={handleChecklistSelect}
          onStageComplete={handleMarkStageComplete}
          onChecklistToggle={handleChecklistToggle}
          onUploadDocument={handleUploadDocument}
          onReextract={handleReextract}
          onSelectDocument={setSelectedDocument}
          onExport={handleExport}
          onMarkIssued={handleMarkIssued}
        />
      </div>

      {/* Modals */}
      <MissingInfoEmailModal
        open={showMissingInfoModal}
        onOpenChange={setShowMissingInfoModal}
        requestId={requestData.id}
        companyName={requestData.companyName}
        brokerEmail={requestData.brokerEmail}
        missingDocuments={allMissingDocs}
        onMarkAsSent={handleMissingInfoSent}
      />

      <AssignOwnerModal
        open={showAssignOwnerModal}
        onOpenChange={setShowAssignOwnerModal}
        currentOwner={requestData.owner}
        currentQueue={requestData.queue}
        onAssign={handleAssignOwner}
      />
    </div>
  );
}
