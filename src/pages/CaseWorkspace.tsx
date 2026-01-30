import { useState } from 'react';
import { CaseStepper } from '@/components/case/CaseStepper';
import { CaseHeader } from '@/components/case/CaseHeader';
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
import { FileText, Database, FileCheck, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function CaseWorkspace() {
  const [caseData, setCaseData] = useState(mockCaseData);
  const [currentStage, setCurrentStage] = useState(caseData.currentStage);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeTab, setActiveTab] = useState('extracted');

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
    setCaseData(prev => ({
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
    setCaseData(prev => ({
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
    setCaseData(prev => ({
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
      details: 'Case data pushed to core system successfully',
    };
    setCaseData(prev => ({
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
    setCaseData(prev => ({
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

  return (
    <div className="h-screen flex flex-col bg-background">
      <CaseHeader 
        caseId={caseData.id}
        companyName={caseData.companyName}
        status={caseData.status}
        currentStage={currentStage}
        totalStages={caseData.stages.length}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Stepper */}
        <div className="w-72 border-r border-border bg-card p-4 overflow-auto">
          <CaseStepper 
            stages={caseData.stages}
            currentStage={currentStage}
            onStageClick={handleStageClick}
          />
          
          <div className="mt-6 pt-6 border-t border-border">
            <Link to="/evidence-pack">
              <Button variant="outline" className="w-full gap-2">
                <FileCheck className="h-4 w-4" />
                View Evidence Pack
              </Button>
            </Link>
          </div>
        </div>

        {/* Center Panel - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Workforce Mismatch Banner for Stage 3 */}
          {currentStage === 3 && caseData.workforceMismatch.detected && (
            <div className="p-4 border-b border-border">
              <WorkforceMismatchBanner
                molCount={caseData.workforceMismatch.molCount}
                censusCount={caseData.workforceMismatch.censusCount}
                accepted={caseData.workforceMismatch.accepted}
                acceptReason={caseData.workforceMismatch.acceptReason}
                onAccept={handleAcceptMismatch}
              />
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="border-b border-border px-4">
              <TabsList className="h-12 bg-transparent gap-4">
                <TabsTrigger 
                  value="extracted" 
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Database className="h-4 w-4" />
                  Extracted Data
                </TabsTrigger>
                <TabsTrigger 
                  value="documents"
                  className="gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FileText className="h-4 w-4" />
                  Documents
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
                <TabsContent value="extracted" className="mt-0">
                  <ExtractedDataPanel 
                    sections={caseData.extractedData}
                    onVerify={handleVerifyField}
                  />
                </TabsContent>

                <TabsContent value="documents" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Uploaded Documents</h3>
                      <DocumentsPanel 
                        documents={caseData.documents}
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

                <TabsContent value="export" className="mt-0">
                  <ExportPanel 
                    payload={mockExportPayload}
                    isExported={caseData.isExported}
                    isIssued={caseData.isIssued}
                    onExport={handleExport}
                    onMarkIssued={handleMarkIssued}
                  />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Right Sidebar - Checklist & Timeline */}
        <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
          <Tabs defaultValue="checklist" className="flex-1 flex flex-col">
            <div className="border-b border-border px-4">
              <TabsList className="h-12 bg-transparent">
                <TabsTrigger value="checklist" className="text-sm">Checklist</TabsTrigger>
                <TabsTrigger value="timeline" className="text-sm">Timeline</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="checklist" className="mt-0">
                  <ChecklistPanel 
                    checklist={caseData.checklist}
                    stages={caseData.stages}
                    currentStage={currentStage}
                    onToggle={handleChecklistToggle}
                  />
                </TabsContent>
                <TabsContent value="timeline" className="mt-0">
                  <TimelinePanel events={caseData.timeline} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
