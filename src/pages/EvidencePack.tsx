import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  mapBackendRequestToListItem,
  mapBackendStageToStage,
  mapBackendRequestChecklistToChecklistItem,
  mapBackendDocumentToDocument,
  groupExtractionsBySection,
  mapBackendRequestDecision,
  mapBackendRequestPublication,
  mapBackendRiskFlags,
} from '@/lib/mappers';
import { buildTimelineEvents } from '@/lib/timeline';
import { CaseData, Document } from '@/types/case';
import { EvidencePackSummary } from '@/components/evidence/EvidencePackSummary';
import { EvidencePackChecklist } from '@/components/evidence/EvidencePackChecklist';
import { EvidencePackExtractedData } from '@/components/evidence/EvidencePackExtractedData';
import { ShareholdingTree } from '@/components/case/ShareholdingTree';
import { EvidencePackOverrides } from '@/components/evidence/EvidencePackOverrides';
import { EvidencePackTimeline } from '@/components/evidence/EvidencePackTimeline';
import { EvidencePackDocuments } from '@/components/evidence/EvidencePackDocuments';
import { EvidencePackDecision } from '@/components/evidence/EvidencePackDecision';
import { EvidencePackDocumentPages } from '@/components/evidence/EvidencePackDocumentPages';

export default function EvidencePack() {
  const { requestId } = useParams();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [moaExtraction, setMoaExtraction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    (async () => {
      try {
        setLoading(true);
        const [req, docsRes, studioDocsRes] = await Promise.all([
          api.requests.get(requestId),
          api.documents.list(),
          api.studio.documents.list(),
        ]);
        const listItem = mapBackendRequestToListItem(req);
        const requestStages = (req.request_stages || []).map(mapBackendStageToStage);
        const requestChecklist = (req.request_stages || []).flatMap((rs: any) =>
          (rs.checklists || []).map((c: any) => ({
            ...mapBackendRequestChecklistToChecklistItem(c),
            stageId: rs.stage,
          }))
        );
        const requestDocuments: Document[] = docsRes
          .filter((d: any) => d.request === requestId)
          .map(mapBackendDocumentToDocument)
          .sort((a: Document, b: Document) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
        const extractionRecords = requestDocuments
          .filter(d => d.extraction)
          .map(d => ({ document: d.id, data: d.extraction.data }));

        const moaDoc = requestDocuments.find((d: any) => d.type === 'moa' || (d as any).doc_type === 'moa');
        setMoaExtraction(moaDoc && (moaDoc as any).extraction ? (moaDoc as any).extraction.data : null);

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

        const data: CaseData = {
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
          workforceMismatch: { detected: false, molCount: 0, censusCount: 0, accepted: false },
          docDefs: studioDocsRes.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.doc_type,
            mandatory: d.mandatory,
            extraction_keys: d.extraction_keys,
            aiInstructions: d.ai_instructions,
            hints: d.hints,
          })),
          isExported: publication !== undefined,
          isIssued: listItem.status === 'Issued' || listItem.status === 'Published',
        };
        setCaseData(data);
      } catch (err) {
        console.error('Failed to load evidence pack data', err);
        toast.error('Failed to load evidence pack');
      } finally {
        setLoading(false);
      }
    })();
  }, [requestId]);

  const handleExportPdf = async () => {
    // Wait a tick so any lazy-rendered PDF pages have had a chance to paint
    // before the browser hands the DOM off to its print engine.
    toast.loading('Preparing evidence pack…', { id: 'export-pdf' });
    await new Promise(resolve => setTimeout(resolve, 150));
    toast.dismiss('export-pdf');
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Evidence pack unavailable for this request.</p>
          <Link to="/requests">
            <Button variant="outline" size="sm">Back to requests</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background evidence-pack-root print:h-auto print:overflow-visible">
      {/* Header — hidden in print */}
      <div className="bg-background border-b border-border px-6 py-3 print:hidden sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/request/${requestId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Evidence Pack</h1>
              <p className="text-xs text-muted-foreground">
                {caseData.companyName} · {caseData.smartId || caseData.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Button onClick={handleExportPdf} size="sm" className="h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-8 print:p-0 print:space-y-6 print:max-w-none">
        <EvidencePackSummary caseData={caseData} />

        <EvidencePackDecision decision={caseData.decision} publication={caseData.publication} />

        {/* Stage Completion */}
        <section className="break-inside-avoid">
          <h2 className="text-sm font-semibold text-foreground mb-3">Stage completion</h2>
          <div className="border border-border rounded-md overflow-hidden">
            {caseData.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5',
                  idx !== caseData.stages.length - 1 && 'border-b border-border'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-8">S{stage.id}</span>
                  <span className="text-sm text-foreground">{stage.name}</span>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 h-5 rounded text-[11px] font-medium',
                  stage.status === 'complete' && 'bg-success/10 text-success',
                  stage.status === 'needs-review' && 'bg-warning/10 text-warning',
                  stage.status !== 'complete' && stage.status !== 'needs-review' && 'bg-muted text-muted-foreground'
                )}>
                  {stage.status === 'complete' && <Check className="h-3 w-3" />}
                  {stage.status === 'needs-review' && <AlertCircle className="h-3 w-3" />}
                  {stage.status.replace('-', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>

        <EvidencePackChecklist stages={caseData.stages} checklist={caseData.checklist} />
        <EvidencePackExtractedData extractedData={caseData.extractedData} />
        {moaExtraction && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              Shareholding structure
              <span className="text-[11px] font-normal text-muted-foreground">From MoA extraction</span>
            </h3>
            <ShareholdingTree extraction={moaExtraction} />
          </section>
        )}
        <EvidencePackOverrides workforceMismatch={caseData.workforceMismatch} />
        <EvidencePackTimeline timeline={caseData.timeline} />
        <EvidencePackDocuments documents={caseData.documents} />
        <EvidencePackDocumentPages documents={caseData.documents} />
      </div>
    </div>
  );
}
