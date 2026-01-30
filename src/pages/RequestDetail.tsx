import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CaseStepper } from '@/components/case/CaseStepper';
import { RequestDetailHeader } from '@/components/request/RequestDetailHeader';
import { ExtractedDataPanel } from '@/components/case/ExtractedDataPanel';
import { DocumentsPanel } from '@/components/case/DocumentsPanel';
import { DocumentHighlightsPanel } from '@/components/case/DocumentHighlightsPanel';
import { WorkforceMismatchBanner } from '@/components/case/WorkforceMismatchBanner';
import { ChecklistPanel } from '@/components/case/ChecklistPanel';
import { TimelinePanel } from '@/components/case/TimelinePanel';
import { ExportPanel } from '@/components/case/ExportPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockCaseData, mockExportPayload } from '@/data/mockCaseData';
import { Document, TimelineEvent } from '@/types/case';
import { FileText, Database, Send, FileCheck } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('documents');

  // Mock additional data for header
  const headerData = {
    brokerName: 'Gulf Insurance Brokers',
    priority: 'High' as const,
    slaRemaining: 18,
    slaStatus: 'green' as const,
    currentStageName: requestData.stages.find(s => s.id === currentStage)?.name || 'Unknown',
  };

  const handleStageClick = (stageId: number) => {
    setCurrentStage(stageId);
    if (stageId === 7) {
      setActiveTab('export');
    }
  };

  const handleVerifyField = (sectionTitle: string, fieldLabel: string) => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: `Verified: ${fieldLabel}`,
      user: 'Sarah Ahmed',
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
      user: 'Sarah Ahmed',
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
        c.id === 'c19' ? { ...c, checked: true } : c
      ),
    }));
  };

  const handleMarkIssued = () => {
    const newTimeline: TimelineEvent = {
      id: `t${Date.now()}`,
      timestamp: new Date(),
      action: 'Policy Issued',
      user: 'Sarah Ahmed',
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
        c.id === 'c20' ? { ...c, checked: true } : c
      ),
    }));
  };

  const handleAssignOwner = () => {
    toast.info('Assign Owner dialog would open here');
  };

  const handleRequestMissingInfo = () => {
    toast.info('Request Missing Info dialog would open here');
  };

  const handleEscalate = () => {
    toast.info('Escalation dialog would open here');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <RequestDetailHeader 
        requestId={requestData.id}
        companyName={requestData.companyName}
        brokerName={headerData.brokerName}
        priority={headerData.priority}
        slaRemaining={headerData.slaRemaining}
        slaStatus={headerData.slaStatus}
        currentStage={headerData.currentStageName}
        status={requestData.status}
        owner="Sarah Ahmed"
        onAssignOwner={handleAssignOwner}
        onRequestMissingInfo={handleRequestMissingInfo}
        onEscalate={handleEscalate}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Activity Timeline */}
        <div className="w-72 border-r border-border bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4">
              <TimelinePanel events={requestData.timeline} />
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Documents (Default) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Workforce Mismatch Banner for Stage 3 */}
          {currentStage === 3 && requestData.workforceMismatch.detected && (
            <div className="p-4 border-b border-border">
              <WorkforceMismatchBanner
                molCount={requestData.workforceMismatch.molCount}
                censusCount={requestData.workforceMismatch.censusCount}
                accepted={requestData.workforceMismatch.accepted}
                acceptReason={requestData.workforceMismatch.acceptReason}
                onAccept={handleAcceptMismatch}
              />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-border px-4">
              <TabsList className="h-12 bg-transparent gap-4">
                <TabsTrigger 
                  value="documents"
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FileText className="h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger 
                  value="extracted" 
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Database className="h-4 w-4" />
                  Extracted Data
                </TabsTrigger>
                <TabsTrigger 
                  value="export"
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Send className="h-4 w-4" />
                  Export
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <TabsContent value="documents" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Received Documents</h3>
                      <DocumentsPanel 
                        documents={requestData.documents}
                        selectedDocument={selectedDocument}
                        onSelectDocument={setSelectedDocument}
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
                    onExport={handleExport}
                    onMarkIssued={handleMarkIssued}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Sidebar - Stepper + Checklist */}
        <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-4">
              <CaseStepper 
                stages={requestData.stages}
                currentStage={currentStage}
                onStageClick={handleStageClick}
              />
              
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold mb-4 text-sm">Stage Checklist</h3>
                <ChecklistPanel 
                  checklist={requestData.checklist}
                  stages={requestData.stages}
                  currentStage={currentStage}
                  onToggle={handleChecklistToggle}
                />
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <Link to="/evidence-pack">
                  <Button variant="outline" className="w-full gap-2">
                    <FileCheck className="h-4 w-4" />
                    View Evidence Pack
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
