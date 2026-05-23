import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { RequestDetailHeader } from '@/components/request/RequestDetailHeader';
import { TimelineDrawer } from '@/components/case/TimelineDrawer';
import { BypassReasonModal } from '@/components/case/BypassReasonModal';
import { DecisionModal, DecisionAction } from '@/components/request/DecisionModal';
import { MissingInfoEmailModal } from '@/components/request/MissingInfoEmailModal';
import { AssignOwnerModal } from '@/components/request/AssignOwnerModal';
import { OperationsWorkbench } from '@/components/workbench/OperationsWorkbench';
import { CaseJourney } from '@/components/workbench/CaseJourney';
import { CaseContextRail } from '@/components/workbench/CaseContextRail';
import { useUiPref } from '@/hooks/useUiPref';
import { api } from '@/lib/api';
import {
  mapBackendRequestToListItem, mapBackendStageToStage,
  mapBackendRequestChecklistToChecklistItem, mapBackendDocumentToDocument,
  groupExtractionsBySection, mapBackendRequestDecision,
  mapBackendRequestPublication, mapBackendRiskFlags,
} from '@/lib/mappers';
import { buildTimelineEvents } from '@/lib/timeline';
import {
  Document,
  TimelineEvent,
  getMissingDocuments,
  calculateSlaRemaining,
  getSlaStatus,
  DocumentType,
  CaseData,
  DocDef
} from '@/types/case';
import { FileCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RequestDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const [loading, setLoading] = useState(true);
  const [requestData, setRequestData] = useState<CaseData | null>(null);
  const [readinessKey, setReadinessKey] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [showAssignOwnerModal, setShowAssignOwnerModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedChecklistItemId, setSelectedChecklistItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchRequestDetails = async (opts: { silent?: boolean } = {}) => {
    if (!requestId) return;
    try {
      if (!opts.silent) setLoading(true);
      const [req, docsRes, studioDocsRes] = await Promise.all([
        api.requests.get(requestId),
        api.documents.list({ requestId }),
        api.studio.documents.list()
      ]);

      const listItem = mapBackendRequestToListItem(req);

      const dynamicDocDefs: DocDef[] = studioDocsRes.map((d: any) => ({
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
        (rs.checklists || []).map((c: any) => ({
          ...mapBackendRequestChecklistToChecklistItem(c),
          stageId: rs.stage
        }))
      );

      const requestStages = (req.request_stages || []).map(mapBackendStageToStage);

      // Map documents and filter by current request (defensive — server already filters)
      const target = String(requestId).toLowerCase();
      const requestDocuments = (docsRes as any[])
        .filter((d) => {
          const r = d?.request;
          if (r == null) return false;
          const rid = typeof r === 'object' ? r.id ?? r.pk : r;
          return rid && String(rid).toLowerCase() === target;
        })
        .map(mapBackendDocumentToDocument)
        .sort((a: Document, b: Document) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      // Extract extractions from matching documents
      const extractionRecords = requestDocuments
        .filter(d => d.extraction)
        .map(d => ({
          document: d.id,
          data: d.extraction.data
        }));

      const decision = mapBackendRequestDecision(req);
      const publication = mapBackendRequestPublication(req);
      const riskFlags = mapBackendRiskFlags(req);

      const timeline = buildTimelineEvents({
        createdAt: listItem.createdAt,
        companyName: listItem.companyName,
        decision,
        publication,
        documents: requestDocuments,
        checklist: requestChecklist as any,
        riskFlags,
      });

      const fullData: CaseData = {
        id: listItem.id,
        smartId: listItem.smartId,
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
        timeline,
        checklist: requestChecklist,
        decision,
        publication,
        riskFlags,
        workforceMismatch: {
          detected: false,
          molCount: 0,
          censusCount: 0,
          accepted: false
        },
        docDefs: dynamicDocDefs,
        isExported: publication !== undefined,
        isIssued: listItem.status === 'Issued' || listItem.status === 'Published',
        missingInfoRequested: undefined
      };

      setRequestData(fullData);
      setReadinessKey(k => k + 1);
    } catch (error) {
      console.error('Failed to fetch request details:', error);
      if (!opts.silent) toast.error('Failed to load request data');
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [requestId]);

  // Refetch when the tab regains focus, so Studio edits (new/required docs,
  // checklist changes) show up on existing requests without a manual reload.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchRequestDetails();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [requestId]);

  // Keep selectedDocument sync'd with the latest requestData payload (e.g. after upload finishes)
  useEffect(() => {
    if (!requestData) return;

    let nextDoc = null;
    if (selectedChecklistItemId) {
      const item = requestData.checklist.find(i => i.id === selectedChecklistItemId);
      if (item?.documentType && item.documentType.length > 0) {
        // Attempt to find the first required document that belongs to this checklist item
        const firstDocType = item.documentType[0];
        nextDoc = requestData.documents.find(d => d.type === firstDocType) || null;
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
    // Terminal states from the backend always win over derived ones.
    if (requestData.status === 'Published') return 'Published';
    if (requestData.status === 'Approved') return 'Approved';
    if (requestData.status === 'Rejected') return 'Rejected';
    if (requestData.isIssued) return 'Issued';
    if (allStagesComplete) return 'Ready for Export';
    if (allMissingDocs.length > 0 || requestData.missingInfoRequested) return 'Missing Info';
    return 'In Review';
  }, [requestData?.status, requestData?.isIssued, allStagesComplete, allMissingDocs, requestData?.missingInfoRequested]);

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
        s.id === 1 ? { ...s, status: 'complete' as const } : s
      ),
    }));
  };

  const [bypassItem, setBypassItem] = useState<{ id: string; label: string } | null>(null);
  const [decisionAction, setDecisionAction] = useState<DecisionAction | null>(null);
  // Three-zone workbench collapse preferences — persisted across navigation.
  const [journeyCollapsed, setJourneyCollapsed] = useUiPref<boolean>('workbench.journey.collapsed', false);
  const [contextCollapsed, setContextCollapsed] = useUiPref<boolean>('workbench.context.collapsed', false);

  const submitDecision = async (comment: string) => {
    if (!requestData || !decisionAction) return;
    try {
      if (decisionAction === 'approve') {
        await api.requests.approve(requestData.id, comment);
        toast.success('Request approved.');
      } else {
        await api.requests.reject(requestData.id, comment);
        toast.success('Request rejected.');
      }
      await fetchRequestDetails();
    } catch (err: any) {
      console.error('Decision failed', err);
      toast.error(err?.message || 'Could not record decision.');
    } finally {
      setDecisionAction(null);
    }
  };

  const submitPublish = async () => {
    if (!requestData) return;
    if (!window.confirm('Publish this request to the core system?')) return;
    try {
      await api.requests.publish(requestData.id);
      toast.success('Request published.');
      fetchRequestDetails();
    } catch (err: any) {
      console.error('Publish failed', err);
      toast.error(err?.message || 'Could not publish request.');
    }
  };

  const persistChecklistToggle = async (itemId: string, nextChecked: boolean, overrideReason?: string) => {
    const payload: any = { checked: nextChecked };
    if (overrideReason) payload.override_reason = overrideReason;
    await api.workflow.requestChecklistUpdate(itemId, payload);
    // Optimistic item update so the checkbox flips instantly.
    setRequestData(prev => ({
      ...prev,
      checklist: prev.checklist.map(i =>
        i.id === itemId
          ? {
              ...i,
              checked: nextChecked,
              overrideReason: nextChecked ? (overrideReason || i.overrideReason) : undefined,
            }
          : i
      ),
    }));
    // Server signal has already recomputed stage status + request status.
    // Pull the updated stages silently so the "Completed" pill flips without a full reload.
    fetchRequestDetails({ silent: true });
  };

  const handleChecklistToggle = async (itemId: string) => {
    if (!requestData) return;
    const item = requestData.checklist.find(i => i.id === itemId);
    if (!item) return;

    const nextChecked = !item.checked;

    // If the operator is trying to MARK a FAILED check as done, ask for a bypass reason first.
    const resultStatus = (item as any).result?.status;
    if (nextChecked && resultStatus === 'fail') {
      setBypassItem({ id: itemId, label: item.label });
      return;
    }

    try {
      await persistChecklistToggle(itemId, nextChecked);
    } catch (err) {
      console.error('Failed to toggle checklist', err);
      toast.error('Failed to update checklist item');
    }
  };

  const handleRunValidation = async (itemId: string) => {
    try {
      await api.workflow.runChecklistValidation(itemId);
      toast.success('Validation logic executed');
      fetchRequestDetails();
    } catch (err) {
      console.error('Failed to run validation', err);
      toast.error('Automated check failed to execute');
    }
  };

  const handleChecklistSelect = (itemId: string) => {
    setSelectedChecklistItemId(itemId);

    // If the item is an extraction task and has a document type, try to find that document
    const item = requestData?.checklist.find(i => i.id === itemId);
    // If the item is linked to a document type, select that document automatically
    if (item?.documentType && item.documentType.length > 0) {
      const firstDocType = item.documentType[0];
      const doc = requestData?.documents.find(d => d.type === firstDocType);
      if (doc) {
        setSelectedDocument(doc);
      }
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
      {/* Upload indicator */}
      {isUploading && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-md bg-background border border-border shadow-md">
          <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
          <span className="text-sm text-foreground">Uploading document…</span>
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
        onApprove={() => setDecisionAction('approve')}
        onReject={() => setDecisionAction('reject')}
        onPublish={submitPublish}
        timelineDrawer={<TimelineDrawer events={requestData.timeline} />}
      />

      {/* Three-zone workbench: case journey · focused center · contextual rail */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <CaseJourney
          stages={requestData.stages}
          checklist={requestData.checklist}
          documents={requestData.documents}
          docDefs={requestData.docDefs}
          activeStageId={activeViewStage}
          selectedItemId={selectedChecklistItemId}
          selectedDocId={selectedDocument?.id ?? null}
          onSelectStage={handleStageClick}
          onSelectItem={(id) => {
            handleChecklistSelect(id);
            setSelectedDocument(null);
          }}
          onSelectDoc={(doc) => {
            setSelectedDocument(doc);
            if (doc) setSelectedChecklistItemId(null);
          }}
          onUploadDoc={handleUploadDocument}
          collapsed={journeyCollapsed}
          onToggleCollapsed={() => setJourneyCollapsed(v => !v)}
        />

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Evidence Pack link sits as a thin sub-bar — secondary action,
              not a stripe of chrome. */}
          <div className="h-8 px-4 border-b border-border flex items-center justify-end shrink-0 bg-background">
            <Link to={`/request/${requestData.id}/evidence-pack`}>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground hover:text-foreground">
                <FileCheck className="h-3.5 w-3.5" />
                Evidence pack
              </Button>
            </Link>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            <OperationsWorkbench
              centerOnly
              requestData={requestData}
              activeViewStage={activeViewStage}
              selectedDocument={selectedDocument}
              selectedChecklistItemId={selectedChecklistItemId}
              onSelectChecklistItem={handleChecklistSelect}
              onStageComplete={handleMarkStageComplete}
              onChecklistToggle={handleChecklistToggle}
              onRunValidation={handleRunValidation}
              onUploadDocument={handleUploadDocument}
              onReextract={handleReextract}
              onSelectDocument={(doc) => {
                setSelectedDocument(doc);
                if (doc) setSelectedChecklistItemId(null);
              }}
              onExport={handleExport}
              onMarkIssued={handleMarkIssued}
            />
          </div>
        </div>

        <CaseContextRail
          riskFlags={requestData.riskFlags}
          inboundEmails={(requestData as any).inbound_emails || []}
          timeline={requestData.timeline}
          collapsed={contextCollapsed}
          onToggleCollapsed={() => setContextCollapsed(v => !v)}
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

      <BypassReasonModal
        item={bypassItem}
        onCancel={() => setBypassItem(null)}
        onConfirm={async (reason) => {
          if (!bypassItem) return;
          const id = bypassItem.id;
          try {
            await persistChecklistToggle(id, true, reason);
            toast.success('Check overridden with reason logged.');
          } catch (err) {
            console.error('Failed to override check', err);
            toast.error('Could not mark the check as done.');
          } finally {
            setBypassItem(null);
          }
        }}
      />

      <DecisionModal
        open={decisionAction !== null}
        action={decisionAction || 'approve'}
        companyName={requestData.companyName}
        onCancel={() => setDecisionAction(null)}
        onConfirm={submitDecision}
      />
    </div>
  );
}
