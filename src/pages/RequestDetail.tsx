import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { VerificationSummaryPanel } from '@/components/verification/VerificationSummaryPanel';
import { OpsAdjudicationBar } from '@/components/verification/OpsAdjudicationBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OperationsWorkbench } from '@/components/workbench/OperationsWorkbench';
import { mockExportPayload, mockChecklist } from '@/data/mockCaseData';
import { mockVerificationChecks } from '@/data/mockVerificationData';
import { api } from '@/lib/api';
import { mapBackendRequestToListItem, mapBackendStageToStage, mapBackendRequestChecklistToChecklistItem, mapBackendDocumentToDocument, groupExtractionsBySection } from '@/lib/mappers';
import { PHASES, getPhaseStatus, getOverallDecision, VerificationPhase } from '@/types/verificationChecks';
import {
  Document,
  TimelineEvent,
  getMissingDocumentsForStage,
  calculateSlaRemaining,
  getSlaStatus,
  DocumentType,
  CaseData
} from '@/types/case';
import { FileText, Database, Send, FileCheck, ShieldCheck, Loader2, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RequestDetail() {
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<CaseData | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [showAssignOwnerModal, setShowAssignOwnerModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState<string | null>(null);

  // Phase Rail state
  const [activePhase, setActivePhase] = useState<VerificationPhase | null>(null);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    try {
      setLoading(true);
      const [req, docsRes, studioDocsRes] = await Promise.all([
        api.requests.get(requestId),
        api.documents.list(),
        api.studio.documents.list()
      ]);

      const listItem = mapBackendRequestToListItem(req);

      const dynamicDocDefs = studioDocsRes.map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.doc_type,
        applicableStages: d.applicable_stages,
        mandatory: d.mandatory
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
    const defs = docDefs.filter(d => d.applicableStages.includes(stageId) && d.mandatory);
    const uploaded = new Set(docs.map(d => d.type));
    return defs.filter(d => !uploaded.has(d.type)).map(d => d.type);
  };

  // Get all missing documents across all stages ahead of verification checks
  const allMissingDocs = useMemo(() => {
    if (!requestData || !requestData.docDefs) return [];
    const missing: DocumentType[] = [];
    const stages = requestData.stages.map(s => s.id);
    for (const s of stages) {
      missing.push(...getMissingForStage(s, requestData.documents, requestData.docDefs));
    }
    return [...new Set(missing)];
  }, [requestData?.documents, requestData?.docDefs, requestData?.stages]);

  // Dynamic Verification checks based on actual missing documents
  const verificationChecks = useMemo(() => {
    return mockVerificationChecks.map(check => {
      if (check.id === 'vc-1') { // Intake: Document Completeness
        if (allMissingDocs.length > 0) {
          return {
            ...check,
            status: 'fail' as const,
            resultText: `Missing ${allMissingDocs.length} required document(s)`,
            actionRequired: `Upload missing documents to proceed.`,
            evidence: {
              ...check.evidence,
              extractedSnippet: `Required documents missing from upload package. Please provide the remaining documents to proceed.`,
            }
          };
        } else {
          return {
            ...check,
            status: 'pass' as const,
            resultText: 'All required documents digitized',
            evidence: {
              ...check.evidence,
              extractedSnippet: `All required documents processed successfully.`,
            }
          };
        }
      }
      return check;
    });
  }, [allMissingDocs]);

  // Compute phase statuses
  const phaseStatuses = useMemo(() => {
    const statuses = {} as Record<VerificationPhase, ReturnType<typeof getPhaseStatus>>;
    for (const phase of PHASES) {
      statuses[phase.id] = getPhaseStatus(verificationChecks, phase.id);
    }
    return statuses;
  }, [verificationChecks]);

  const overallDecision = useMemo(() => getOverallDecision(verificationChecks), [verificationChecks]);

  // Calculate SLA dynamically
  const slaRemaining = useMemo(() =>
    requestData ? calculateSlaRemaining(requestData.createdAt, requestData.priority) : 0,
    [requestData?.createdAt, requestData?.priority]
  );
  const slaStatus = useMemo(() =>
    requestData ? getSlaStatus(slaRemaining, requestData.slaTargetHours) : 'green',
    [slaRemaining, requestData?.slaTargetHours]
  );

  // Get missing documents for current active view stage
  const missingDocsCurrentStage = useMemo(() =>
    requestData && requestData.docDefs ? getMissingForStage(activeViewStage, requestData.documents, requestData.docDefs) : [],
    [activeViewStage, requestData?.documents, requestData?.docDefs]
  );

  // allMissingDocs is now calculated above verificationChecks

  // Check if all stages are complete
  const allStagesComplete = useMemo(() =>
    requestData ? requestData.stages.filter((s, idx, arr) => idx < arr.length - 1).every(s => s.status === 'complete') : false,
    [requestData?.stages]
  );

  // Determine automatic request status
  const computedStatus = useMemo(() => {
    if (!requestData) return 'In Review';
    if (requestData.isIssued) return 'Issued';
    if (allStagesComplete) return 'Ready for Export';
    if (missingDocsCurrentStage.length > 0 || requestData.missingInfoRequested) return 'Missing Info';
    return 'In Review';
  }, [requestData?.isIssued, allStagesComplete, missingDocsCurrentStage, requestData?.missingInfoRequested]);

  const headerData = {
    brokerName: 'Gulf Insurance Brokers',
    currentStageName: requestData?.stages?.find(s => s.id === currentStage)?.name || 'Unknown',
  };

  // Check if Phase 5 (Adjudication) is active
  const isAdjudicationPhase = activePhase === 'adjudication';

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
      await api.documents.upload(formData);
      toast.success('Document uploaded successfully');
      fetchRequestDetails();
    } catch (err) {
      console.error('Failed to upload', err);
      toast.error('Failed to upload document');
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

  const handleVerifyField = (sectionTitle: string, fieldLabel: string) => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: `Verified: ${fieldLabel}`,
      user: requestData.owner,
      details: `Field in ${sectionTitle} marked as verified`,
    };
    setRequestData(prev => ({
      ...prev,
      timeline: [...prev.timeline, newTimeline],
    }));
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
      checklist: prev.checklist.map(c =>
        c.id === 'c11' ? { ...c, checked: true } : c
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

    // Strictly select document only if it is explicitly linked to this checklist item
    const item = requestData?.checklist.find(i => i.id === itemId);
    if (item?.documentType) {
      const doc = requestData?.documents.find(d => d.checklistId === item.id);
      setSelectedDocument(doc || null);
    } else {
      setSelectedDocument(null);
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
    <div className="h-full flex flex-col bg-background">
      <RequestDetailHeader
        requestId={requestData.id}
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

        {/* Center Panel - The New Workbench */}
        <OperationsWorkbench
          requestData={requestData}
          activeViewStage={activeViewStage}
          activePhase={activePhase}
          phaseStatuses={phaseStatuses}
          verificationChecks={verificationChecks}
          selectedDocument={selectedDocument}
          selectedChecklistItemId={selectedChecklistItemId}
          onSelectChecklistItem={handleChecklistSelect}
          onStageComplete={handleMarkStageComplete}
          onChecklistToggle={handleChecklistToggle}
          onUploadDocument={handleUploadDocument}
          onVerifyField={handleVerifyField}
          onSelectDocument={setSelectedDocument}
          setActivePhase={setActivePhase}
          onExport={handleExport}
          onMarkIssued={handleMarkIssued}
        />

        {/* Ops Adjudication Bar - visible only when Phase 5 selected */}
        <OpsAdjudicationBar
          visible={isAdjudicationPhase}
          decision={overallDecision}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestMissingInfo={() => setShowMissingInfoModal(true)}
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
