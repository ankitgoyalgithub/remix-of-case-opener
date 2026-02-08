import { useState, useMemo } from 'react';
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
import { PhaseRail } from '@/components/verification/PhaseRail';
import { OpsAdjudicationBar } from '@/components/verification/OpsAdjudicationBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockCaseData, mockExportPayload } from '@/data/mockCaseData';
import { mockVerificationChecks } from '@/data/mockVerificationData';
import { PHASES, getPhaseStatus, getOverallDecision, VerificationPhase } from '@/types/verificationChecks';
import { 
  Document, 
  TimelineEvent, 
  getMissingDocumentsForStage, 
  calculateSlaRemaining, 
  getSlaStatus,
  DocumentType 
} from '@/types/case';
import { FileText, Database, Send, FileCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RequestDetail() {
  const { requestId } = useParams();
  const [requestData, setRequestData] = useState({
    ...mockCaseData,
    id: requestId || mockCaseData.id,
  });
  const [currentStage, setCurrentStage] = useState(requestData.currentStage);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [showMissingInfoModal, setShowMissingInfoModal] = useState(false);
  const [showAssignOwnerModal, setShowAssignOwnerModal] = useState(false);

  // Phase Rail state
  const [activePhase, setActivePhase] = useState<VerificationPhase | null>(null);

  // Verification checks
  const verificationChecks = mockVerificationChecks;

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
    calculateSlaRemaining(requestData.createdAt, requestData.priority), 
    [requestData.createdAt, requestData.priority]
  );
  const slaStatus = useMemo(() => 
    getSlaStatus(slaRemaining, requestData.slaTargetHours),
    [slaRemaining, requestData.slaTargetHours]
  );

  // Get missing documents for current stage
  const missingDocsCurrentStage = useMemo(() => 
    getMissingDocumentsForStage(currentStage, requestData.documents),
    [currentStage, requestData.documents]
  );

  // Get all missing documents across all stages
  const allMissingDocs = useMemo(() => {
    const missing: DocumentType[] = [];
    for (let i = 1; i <= 6; i++) {
      missing.push(...getMissingDocumentsForStage(i, requestData.documents));
    }
    return [...new Set(missing)];
  }, [requestData.documents]);

  // Check if all stages are complete
  const allStagesComplete = useMemo(() => 
    requestData.stages.filter(s => s.id < 7).every(s => s.status === 'complete'),
    [requestData.stages]
  );

  // Determine automatic request status
  const computedStatus = useMemo(() => {
    if (requestData.isIssued) return 'Issued';
    if (allStagesComplete) return 'Ready for Export';
    if (missingDocsCurrentStage.length > 0 || requestData.missingInfoRequested) return 'Missing Info';
    return 'In Review';
  }, [requestData.isIssued, allStagesComplete, missingDocsCurrentStage, requestData.missingInfoRequested]);

  const headerData = {
    brokerName: 'Gulf Insurance Brokers',
    currentStageName: requestData.stages.find(s => s.id === currentStage)?.name || 'Unknown',
  };

  // Check if Phase 5 (Adjudication) is active
  const isAdjudicationPhase = activePhase === 'adjudication';

  const handleStageClick = (stageId: number) => {
    setCurrentStage(stageId);
    if (stageId === 7) {
      setActiveTab('export');
    }
  };

  const handleMarkStageComplete = (stageId: number) => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: `Stage ${stageId} completed`,
      user: requestData.owner,
      details: `${requestData.stages.find(s => s.id === stageId)?.name} marked as complete`,
    };
    
    setRequestData(prev => ({
      ...prev,
      stages: prev.stages.map(s => 
        s.id === stageId ? { ...s, status: 'complete' as const } : s
      ),
      currentStage: Math.min(stageId + 1, 7),
      timeline: [...prev.timeline, newTimeline],
    }));
    setCurrentStage(Math.min(stageId + 1, 7));
    toast.success(`Stage ${stageId} marked as complete`);
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

  const handleChecklistToggle = (itemId: string) => {
    setRequestData(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    }));
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
      stages: prev.stages.map(s => 
        s.id === 7 ? { ...s, status: 'complete' as const } : s
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

  return (
    <div className="h-screen flex flex-col bg-background">
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
        {/* Left Sidebar - Phase Rail + Stage Navigation */}
        <div className="w-60 border-r border-border bg-card overflow-y-auto flex flex-col">
          {/* Phase Rail */}
          <div className="p-4 border-b border-border">
            <PhaseRail
              phases={PHASES}
              activePhase={activePhase}
              phaseStatuses={phaseStatuses}
              onPhaseClick={setActivePhase}
            />
          </div>

          {/* Existing Stage Stepper */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Issuance Stages
            </h3>
            <CaseStepper 
              stages={requestData.stages}
              currentStage={currentStage}
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

        {/* Center Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Workforce Mismatch Banner for Stage 3 */}
          {currentStage === 3 && requestData.workforceMismatch.detected && (
            <div className="p-4 border-b border-border bg-card">
              <WorkforceMismatchBanner
                molCount={requestData.workforceMismatch.molCount}
                censusCount={requestData.workforceMismatch.censusCount}
                accepted={requestData.workforceMismatch.accepted}
                acceptReason={requestData.workforceMismatch.acceptReason}
                onAccept={handleAcceptMismatch}
              />
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-6">
              {/* Active Stage Panel */}
              <div className="bg-card rounded-xl border border-border p-6 mb-6">
                {requestData.stages.find(s => s.id === currentStage) && (
                  <ActiveStagePanel
                    stage={requestData.stages.find(s => s.id === currentStage)!}
                    checklist={requestData.checklist}
                    documents={requestData.documents}
                    onToggle={handleChecklistToggle}
                    onMarkStageComplete={handleMarkStageComplete}
                    workforceMismatch={requestData.workforceMismatch}
                  />
                )}
              </div>

              {/* Tabs: Summary (default), Documents, Extracted Data, Export */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="h-10 bg-muted/50 gap-2">
                  <TabsTrigger 
                    value="summary"
                    className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verification Summary
                  </TabsTrigger>
                  <TabsTrigger 
                    value="documents"
                    className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger 
                    value="extracted" 
                    className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Database className="h-4 w-4" />
                    Extracted Data
                  </TabsTrigger>
                  <TabsTrigger 
                    value="export"
                    className="gap-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    <Send className="h-4 w-4" />
                    Export
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <TabsContent value="summary" className="mt-0">
                    <VerificationSummaryPanel
                      checks={verificationChecks}
                      activePhase={activePhase}
                    />
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <DocumentsPanel 
                          documents={requestData.documents}
                          selectedDocument={selectedDocument}
                          onSelectDocument={setSelectedDocument}
                          activeStage={currentStage}
                        />
                      </div>
                      {selectedDocument && (
                        <div className="bg-card rounded-lg border border-border p-4">
                          <DocumentHighlightsPanel 
                            document={selectedDocument}
                            onClose={() => setSelectedDocument(null)}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="extracted" className="mt-0">
                    <ExtractedDataPanel 
                      sections={requestData.extractedData}
                      onVerify={handleVerifyField}
                    />
                  </TabsContent>

                  <TabsContent value="export" className="mt-0">
                    <ExportPanel 
                      payload={mockExportPayload}
                      isExported={requestData.isExported}
                      isIssued={requestData.isIssued}
                      allStagesComplete={allStagesComplete}
                      activeStage={currentStage}
                      onExport={handleExport}
                      onMarkIssued={handleMarkIssued}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Ops Adjudication Bar - visible only when Phase 5 selected */}
          <OpsAdjudicationBar
            visible={isAdjudicationPhase}
            decision={overallDecision}
            onApprove={handleApprove}
            onReject={handleReject}
            onRequestMissingInfo={() => setShowMissingInfoModal(true)}
          />
        </div>
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
