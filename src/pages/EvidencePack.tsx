import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Check, AlertCircle, Loader2, FileText } from 'lucide-react';
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
          api.documents.list({ requestId }),
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
        const target = String(requestId).toLowerCase();
        const requestDocuments: Document[] = (docsRes as any[])
          .filter((d) => {
            const r = d?.request;
            if (r == null) return false;
            const rid = typeof r === 'object' ? r.id ?? r.pk : r;
            return rid && String(rid).toLowerCase() === target;
          })
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

  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!caseData || exporting) return;
    setExporting(true);
    toast.loading('Generating evidence pack…', { id: 'export-pdf' });
    try {
      const { buildEvidencePackPdf, downloadEvidencePackPdf } = await import('@/lib/pdf/evidencePack');
      const blob = await buildEvidencePackPdf({ caseData });
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      const safeName = (caseData.smartId || caseData.id).replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadEvidencePackPdf(blob, `evidence-pack_${safeName}_${stamp}.pdf`);
      toast.success('Evidence pack downloaded', { id: 'export-pdf' });
    } catch (err) {
      console.error('Failed to build evidence pack PDF', err);
      toast.error('Failed to generate PDF', { id: 'export-pdf' });
    } finally {
      setExporting(false);
    }
  };

  const sections = useMemo(() => {
    const base = [
      { id: 'summary', label: 'Summary' },
      { id: 'decision', label: 'Decision' },
      { id: 'stages', label: 'Stages' },
      { id: 'checklist', label: 'Checklist' },
      { id: 'extracted', label: 'Extracted data' },
    ];
    if (moaExtraction) base.push({ id: 'shareholding', label: 'Shareholding' });
    base.push(
      { id: 'overrides', label: 'Overrides' },
      { id: 'timeline', label: 'Timeline' },
      { id: 'documents', label: 'Documents' },
      { id: 'document-pages', label: 'Document pages' },
    );
    return base.map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0') }));
  }, [moaExtraction]);

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

  const sectionWrap = (id: string, label: string, num: string, children: React.ReactNode) => (
    <section id={id} className="scroll-mt-24 break-inside-avoid">
      <div className="flex items-baseline gap-3 pb-2 mb-3 border-b border-border">
        <span className="font-mono text-[10.5px] font-semibold tracking-[0.16em] uppercase text-primary">
          {num}
        </span>
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">{label}</h2>
      </div>
      {children}
    </section>
  );

  return (
    <div className="h-full overflow-y-auto bg-background evidence-pack-root print:h-auto print:overflow-visible">
      {/* Header — hidden in print */}
      <div className="bg-background border-b border-border px-4 md:px-6 lg:px-8 py-3 print:hidden sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={`/request/${requestId}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="page-eyebrow">Case · Evidence pack</p>
                {caseData.isIssued ? (
                  <span className="inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-semibold uppercase tracking-wider bg-success/10 text-success">
                    Final
                  </span>
                ) : (
                  <span className="inline-flex items-center px-1.5 h-4 rounded text-[9.5px] font-semibold uppercase tracking-wider bg-warning/10 text-warning">
                    Draft
                  </span>
                )}
              </div>
              <h1 className="page-title truncate">{caseData.companyName}</h1>
              <p className="text-xs text-muted-foreground truncate font-mono">
                {caseData.smartId || caseData.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Button onClick={handleExportPdf} size="sm" className="gap-1.5 shrink-0" disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? 'Generating…' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8 pt-4 pb-6 print:px-0 print:py-0 print:max-w-none">
        <div className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)] gap-8 print:block">
          {/* TOC sidebar — print-hidden */}
          <aside className="hidden lg:block print:hidden">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-3">
                Contents
              </p>
              <nav className="flex flex-col gap-0.5">
                {sections.map(s => (
                  <div key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="group flex items-baseline gap-2 py-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground/60 group-hover:text-primary transition-colors">
                        {s.num}
                      </span>
                      <span className="truncate">{s.label}</span>
                    </a>
                    {s.id === 'document-pages' && caseData.documents.length > 0 && (
                      <div className="ml-5 mt-0.5 mb-1 border-l border-border pl-2.5 flex flex-col gap-0.5">
                        {caseData.documents.map(doc => (
                          <a
                            key={doc.id}
                            href={`#doc-${doc.id}`}
                            title={doc.name}
                            className="flex items-baseline gap-1.5 py-0.5 text-[11.5px] text-muted-foreground hover:text-foreground transition-colors min-w-0"
                          >
                            <FileText className="h-2.5 w-2.5 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{doc.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="space-y-8 print:space-y-6 min-w-0">
            {sectionWrap('summary', 'Request summary', '01',
              <EvidencePackSummary caseData={caseData} />)}

            {sectionWrap('decision', 'Decision & publication', '02',
              <EvidencePackDecision decision={caseData.decision} publication={caseData.publication} />)}

            {sectionWrap('stages', 'Stage completion', '03',
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
            )}

            {sectionWrap('checklist', 'Checklist snapshot', '04',
              <EvidencePackChecklist stages={caseData.stages} checklist={caseData.checklist} />)}

            {sectionWrap('extracted', 'Extracted data', '05',
              <EvidencePackExtractedData extractedData={caseData.extractedData} />)}

            {moaExtraction && sectionWrap('shareholding', 'Shareholding structure', '06',
              <div className="rounded-md border border-border bg-card p-4">
                <p className="text-[11px] text-muted-foreground mb-3">From MoA extraction</p>
                <ShareholdingTree extraction={moaExtraction} />
              </div>
            )}

            {sectionWrap('overrides', 'Overrides', moaExtraction ? '07' : '06',
              <EvidencePackOverrides workforceMismatch={caseData.workforceMismatch} />)}

            {sectionWrap('timeline', 'Activity timeline', moaExtraction ? '08' : '07',
              <EvidencePackTimeline timeline={caseData.timeline} />)}

            {sectionWrap('documents', `Documents (${caseData.documents.length})`, moaExtraction ? '09' : '08',
              <EvidencePackDocuments documents={caseData.documents} />)}

            {sectionWrap('document-pages', 'Document pages', moaExtraction ? '10' : '09',
              <EvidencePackDocumentPages documents={caseData.documents} />)}
          </main>
        </div>
      </div>
    </div>
  );
}
