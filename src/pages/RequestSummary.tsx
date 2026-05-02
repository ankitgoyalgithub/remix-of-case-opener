import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    Loader2, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2,
    FileCheck, FileWarning, ShieldAlert, Send, Gavel, Upload, Sparkles,
    Files, FileQuestion, ExternalLink, PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DocumentType, calculateSlaRemaining, getSlaStatus } from '@/types/case';
import { mapBackendRequestToListItem, mapBackendRequestDecision, mapBackendRequestPublication } from '@/lib/mappers';
import { ConversationPanel, InboundEmail } from '@/components/request/ConversationPanel';
import { BulkZipUploadButton } from '@/components/request/BulkZipUploadButton';
import { OutputTemplatePicker } from '@/components/request/OutputTemplatePicker';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Skeleton } from '@/components/ui/skeleton';
import { ParallaxHero } from '@/components/ui/parallax-hero';

interface ReadinessSummary {
    overall: { status: 'ready' | 'blocked' | 'review' | 'waiting'; headline: string };
    documents: {
        total: number; received: number; missing: number; processing: number; failed: number; required_missing: number;
        items: Array<{
            doc_type: string;
            name: string;
            required: boolean;
            state: 'received' | 'processing' | 'failed' | 'missing';
            party_name?: string | null;
            party_requirement_id?: string | null;
        }>;
    };
    internal_checks: { total: number; passed: number; failed: number; pending: number; error: number };
    external_checks: { total: number; passed: number; failed: number; pending: number; error: number };
    risk_flags: { total: number; unresolved: number; blocking: number };
}

const STATUS_STYLES: Record<string, string> = {
    submitted: 'bg-muted text-foreground',
    in_review: 'bg-info/10 text-info',
    missing_info: 'bg-warning/10 text-warning',
    ready_for_export: 'bg-success/10 text-success',
    approved: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
    exported: 'bg-primary/10 text-primary',
};

const STATUS_LABEL: Record<string, string> = {
    submitted: 'New',
    in_review: 'In Review',
    missing_info: 'Missing Info',
    ready_for_export: 'Ready for Export',
    approved: 'Approved',
    rejected: 'Rejected',
    exported: 'Published',
};

const SEVERITY_ORDER: Record<string, number> = {
    critical: 0, high: 1, medium: 2, low: 3, info: 4,
};

const SEVERITY_STYLES: Record<string, string> = {
    critical: 'bg-destructive/15 text-destructive border-destructive/30',
    high: 'bg-destructive/10 text-destructive border-destructive/30',
    medium: 'bg-warning/15 text-warning border-warning/30',
    low: 'bg-muted text-muted-foreground border-border',
    info: 'bg-muted text-muted-foreground border-border',
};

const OVERALL_STYLE: Record<ReadinessSummary['overall']['status'], string> = {
    ready: 'bg-success/10 text-success border-success/30',
    blocked: 'bg-destructive/10 text-destructive border-destructive/30',
    review: 'bg-warning/10 text-warning border-warning/30',
    waiting: 'bg-muted text-muted-foreground border-border',
};

export default function RequestSummary() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<any>(null);
    const [readiness, setReadiness] = useState<ReadinessSummary | null>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [docDefs, setDocDefs] = useState<any[]>([]);
    const [uploadingType, setUploadingType] = useState<string | null>(null);
    const [remappingId, setRemappingId] = useState<string | null>(null);
    const [runningChecks, setRunningChecks] = useState(false);

    const handleRunChecks = async () => {
        if (!requestId || runningChecks) return;
        setRunningChecks(true);
        const t = toast.loading('Running automated checks…');
        try {
            const res: any = await api.requests.runChecklists(requestId);
            toast.success(
                `Checks done — ran ${res.ran ?? 0}, passed ${res.passed ?? 0}, failed ${res.failed ?? 0}`,
                { id: t },
            );
            await fetchData(true);
        } catch (err: any) {
            console.error('Failed to run checklists', err);
            toast.error(err?.message || 'Failed to run checks', { id: t });
        } finally {
            setRunningChecks(false);
        }
    };

    const fetchData = async (silent = false) => {
        if (!requestId) return;
        if (!silent) setLoading(true);
        const [reqResult, rdResult, docsResult, defsResult] = await Promise.allSettled([
            api.requests.get(requestId),
            api.requests.readiness(requestId),
            api.documents.list(),
            api.studio.documents.list(),
        ]);

        if (reqResult.status === 'fulfilled') {
            setRequest(reqResult.value);
        } else {
            console.error('Failed to load request', reqResult.reason);
            if (!silent) toast.error(reqResult.reason?.message || 'Failed to load request');
        }

        if (rdResult.status === 'fulfilled') setReadiness(rdResult.value);
        if (docsResult.status === 'fulfilled') {
            setDocuments(docsResult.value.filter((d: any) => d.request === requestId));
        }
        if (defsResult.status === 'fulfilled') setDocDefs(defsResult.value);

        if (!silent) setLoading(false);
    };

    const handleRemapDocType = async (docId: string, newType: string) => {
        setRemappingId(docId);
        try {
            await api.documents.update(docId, { doc_type: newType });
            toast.success('Document re-classified');
            await fetchData(true);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to update document type');
        } finally {
            setRemappingId(null);
        }
    };

    useEffect(() => {
        fetchData();
    }, [requestId]);

    const handleUpload = async (docType: string, file: File, partyReqId?: string | null) => {
        if (!requestId) return;
        const uploadKey = partyReqId ? `party:${partyReqId}` : docType;
        setUploadingType(uploadKey);
        const formData = new FormData();
        formData.append('request', requestId);
        formData.append('file', file);
        formData.append('doc_type', docType);
        if (partyReqId) formData.append('party_requirement_id', partyReqId);
        const t = toast.loading(`Uploading ${file.name}…`);
        try {
            await api.documents.upload(formData);
            toast.success('Uploaded — extraction starting', { id: t });
            await fetchData(true);
        } catch (err: any) {
            console.error('Upload failed', err);
            toast.error(err?.message || 'Upload failed', { id: t });
        } finally {
            setUploadingType(null);
        }
    };

    if (loading) {
        return (
            <div className="h-full overflow-y-auto bg-gradient-to-b from-muted/20 to-background">
                <div className="max-w-4xl mx-auto p-6 space-y-5 animate-in fade-in duration-300">
                    <div className="rounded-xl border border-border bg-muted/10 p-5">
                        <Skeleton className="h-3 w-20 mb-3" />
                        <Skeleton className="h-8 w-72" />
                        <Skeleton className="h-3 w-48 mt-2" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-border bg-card p-5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-6 w-24 mt-3" />
                                <Skeleton className="h-3 w-32 mt-2" />
                            </div>
                        ))}
                    </div>
                    <div className="rounded-lg border border-border bg-card p-5">
                        <Skeleton className="h-4 w-40 mb-3" />
                        <div className="space-y-2">
                            <Skeleton className="h-9 w-full" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-3 text-warning" />
                        <p className="text-sm text-foreground">Request not found.</p>
                        <Link to="/requests" className="block mt-3">
                            <Button variant="outline" size="sm">Back to inbox</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // If readiness failed, fall back to an empty rollup so downstream sections render cleanly.
    const rd: ReadinessSummary = readiness || {
        overall: { status: 'waiting', headline: 'Readiness data unavailable.' },
        documents: { total: 0, received: 0, missing: 0, processing: 0, failed: 0, required_missing: 0, items: [] },
        internal_checks: { total: 0, passed: 0, failed: 0, pending: 0, error: 0 },
        external_checks: { total: 0, passed: 0, failed: 0, pending: 0, error: 0 },
        risk_flags: { total: 0, unresolved: 0, blocking: 0 },
    };

    const listItem = mapBackendRequestToListItem(request);
    const decision = mapBackendRequestDecision(request);
    const publication = mapBackendRequestPublication(request);

    const slaRemaining = calculateSlaRemaining(listItem.createdAt, listItem.priority);
    const slaStatus = getSlaStatus(slaRemaining, listItem.slaTargetHours);
    const slaText = slaRemaining > 0 ? `${slaRemaining}h left` : slaRemaining === 0 ? 'Due now' : `${Math.abs(slaRemaining)}h overdue`;

    // Completion: documents received + passing checks, over the total non-trivial items.
    const totalItems =
        rd.documents.total
        + rd.internal_checks.total
        + rd.external_checks.total;
    const completedItems =
        rd.documents.received
        + rd.internal_checks.passed
        + rd.external_checks.passed;
    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const missingDocs = rd.documents.items.filter(d => d.state === 'missing' && d.required);
    const failingDocs = rd.documents.items.filter(d => d.state === 'failed');

    // Risks come from the Request payload itself.
    const riskFlags = (request.risk_flags || []) as Array<{
        id: number;
        severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
        title: string;
        description: string;
        flag_type: string;
        document_type: string | null;
        resolved: boolean;
    }>;
    const openRisks = riskFlags.filter(r => !r.resolved);

    // Untyped attachments — landed via email but the classifier returned 'other'
    // (or an unknown slug). Operator can remap them inline.
    const knownDocTypes = new Set(docDefs.map((d: any) => d.doc_type));
    const untypedDocs = documents.filter((d: any) => d.doc_type === 'other' || !knownDocTypes.has(d.doc_type));
    const mappedDocs = documents.filter((d: any) => d.doc_type && d.doc_type !== 'other' && knownDocTypes.has(d.doc_type));

    const isComplete = pct === 100 && missingDocs.length === 0 && failingDocs.length === 0 && openRisks.length === 0;
    const heroGradient = isComplete
        ? 'from-success/15 via-background to-success/5'
        : slaStatus === 'red'
            ? 'from-destructive/15 via-background to-warning/5'
            : 'from-primary/10 via-background to-info/5';

    const hasConversation = Array.isArray((request as any).inbound_emails) && (request as any).inbound_emails.length > 0;

    return (
        <div className="h-full overflow-y-auto bg-gradient-to-b from-muted/20 to-background">
            <div className="max-w-6xl mx-auto p-4 sm:p-5 space-y-3 animate-in fade-in duration-500">
                {/* Hero — identity + headline metrics + verification strip, all in one panel */}
                <ParallaxHero
                    gradientClass={heroGradient}
                    orbClass={isComplete ? 'bg-success/15' : slaStatus === 'red' ? 'bg-destructive/15' : 'bg-primary/15'}
                    className="p-5"
                >
                    <Link to="/requests" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-2">
                        <ArrowLeft className="h-3 w-3" />
                        Back to inbox
                    </Link>
                    <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl font-semibold text-foreground tracking-tight truncate">{request.company_name}</h1>
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <span className={cn('inline-flex items-center px-2 h-5 rounded text-[11px] font-medium', STATUS_STYLES[request.status] || 'bg-muted text-foreground')}>
                                    {STATUS_LABEL[request.status] || request.status}
                                </span>
                                <Badge variant="outline" className={cn('text-[10px] uppercase tracking-wide h-5', OVERALL_STYLE[rd.overall.status])}>
                                    {rd.overall.status}
                                </Badge>
                                {request.priority === 'urgent' && (
                                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] h-5">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Urgent
                                    </Badge>
                                )}
                                {openRisks.length > 0 && (
                                    <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10 text-[10px] h-5">
                                        <ShieldAlert className="h-3 w-3 mr-1" />
                                        {openRisks.length} open {openRisks.length === 1 ? 'risk' : 'risks'}
                                    </Badge>
                                )}
                                {isComplete && (
                                    <Badge className="bg-success/15 text-success border border-success/30 text-[10px] h-5 gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        All clear
                                    </Badge>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground font-mono mt-2">
                                {request.smart_id || request.id?.slice(0, 8)} · Created {format(listItem.createdAt, 'dd MMM yyyy HH:mm')}
                            </p>
                            <div className="flex items-center gap-2 mt-4 flex-wrap">
                                <Button size="sm" className="h-8 gap-1.5 shadow-md shadow-primary/20" onClick={() => navigate(`/request/${requestId}/workbench`)}>
                                    Open workbench
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                                <Link to={`/request/${requestId}/evidence-pack`}>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-background/70 backdrop-blur">
                                        <FileCheck className="h-3.5 w-3.5" />
                                        Evidence pack
                                    </Button>
                                </Link>
                                {requestId && (
                                    <BulkZipUploadButton
                                        requestId={requestId}
                                        onComplete={() => fetchData(true)}
                                        className="h-8 bg-background/70 backdrop-blur"
                                    />
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 bg-background/70 backdrop-blur"
                                    onClick={handleRunChecks}
                                    disabled={runningChecks}
                                >
                                    {runningChecks
                                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        : <PlayCircle className="h-3.5 w-3.5" />}
                                    Run checks now
                                </Button>
                                {requestId && (
                                    <OutputTemplatePicker
                                        requestId={requestId}
                                        className="h-8 gap-1.5 bg-background/70 backdrop-blur"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Right-side stat panel: ring + SLA */}
                        <div className="shrink-0 flex items-center gap-5 pl-5 sm:border-l sm:border-border/50">
                            <div className="flex flex-col items-center gap-1">
                                <CompletionRing pct={pct} size={84} stroke={8} textClass="text-lg" />
                                <p className="text-[10px] text-muted-foreground tabular-nums">{completedItems}/{totalItems} ready</p>
                            </div>
                            <div className="flex flex-col items-start min-w-[88px]">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">SLA</p>
                                <p className={cn(
                                    'text-lg font-semibold tabular-nums leading-tight mt-0.5',
                                    slaStatus === 'red' && 'text-destructive',
                                    slaStatus === 'amber' && 'text-warning',
                                    slaStatus === 'green' && 'text-foreground',
                                )}>
                                    {slaText}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Target {listItem.slaTargetHours}h</p>
                            </div>
                        </div>
                    </div>

                    {/* Verification strip — thin progress bars across the bottom of the hero */}
                    <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        <MiniProgress
                            label="Documents"
                            value={rd.documents.received}
                            total={rd.documents.total}
                            sub={
                                missingDocs.length > 0
                                    ? `${missingDocs.length} required missing`
                                    : failingDocs.length > 0
                                        ? `${failingDocs.length} failed`
                                        : rd.documents.total > 0 ? 'All received' : 'No requirements'
                            }
                            subTone={missingDocs.length > 0 || failingDocs.length > 0 ? 'destructive' : rd.documents.total > 0 ? 'success' : 'muted'}
                        />
                        <MiniProgress
                            label="Internal checks"
                            value={rd.internal_checks.passed}
                            total={rd.internal_checks.total}
                            sub={
                                rd.internal_checks.failed > 0
                                    ? `${rd.internal_checks.failed} failed`
                                    : rd.internal_checks.pending + rd.internal_checks.error > 0
                                        ? `${rd.internal_checks.pending + rd.internal_checks.error} pending`
                                        : rd.internal_checks.total > 0 ? 'All passed' : 'No checks defined'
                            }
                            subTone={rd.internal_checks.failed > 0 ? 'destructive' : rd.internal_checks.total > 0 && rd.internal_checks.passed === rd.internal_checks.total ? 'success' : 'muted'}
                        />
                        <MiniProgress
                            label="External verifications"
                            value={rd.external_checks.passed}
                            total={rd.external_checks.total}
                            sub={
                                rd.external_checks.failed > 0
                                    ? `${rd.external_checks.failed} failed`
                                    : rd.external_checks.pending + rd.external_checks.error > 0
                                        ? `${rd.external_checks.pending + rd.external_checks.error} pending`
                                        : rd.external_checks.total > 0 ? 'All passed' : 'No checks defined'
                            }
                            subTone={rd.external_checks.failed > 0 ? 'destructive' : rd.external_checks.total > 0 && rd.external_checks.passed === rd.external_checks.total ? 'success' : 'muted'}
                        />
                    </div>
                </ParallaxHero>

                {/* Main 2-col layout: action items left, conversation right (when present) */}
                <div className={cn('grid gap-3', hasConversation ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
                    <div className={cn('space-y-3', hasConversation ? 'lg:col-span-2' : '')}>
                        {/* Documents — single section with Pending / Mapped / Missing Mapping tabs */}
                        <Card>
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <Files className="h-4 w-4 text-primary" />
                                    Documents
                                    <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                                        {mappedDocs.length} mapped · {missingDocs.length + failingDocs.length} pending
                                        {untypedDocs.length > 0 ? ` · ${untypedDocs.length} unmapped` : ''}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                                <Tabs defaultValue={
                                    (missingDocs.length + failingDocs.length) > 0 ? 'pending'
                                    : untypedDocs.length > 0 ? 'unmapped'
                                    : 'mapped'
                                }>
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="pending" className="gap-1.5 text-xs">
                                            <FileWarning className="h-3 w-3" />
                                            Pending
                                            <CountBadge n={missingDocs.length + failingDocs.length} tone="warning" />
                                        </TabsTrigger>
                                        <TabsTrigger value="mapped" className="gap-1.5 text-xs">
                                            <FileCheck className="h-3 w-3" />
                                            Mapped
                                            <CountBadge n={mappedDocs.length} tone="success" />
                                        </TabsTrigger>
                                        <TabsTrigger value="unmapped" className="gap-1.5 text-xs">
                                            <FileQuestion className="h-3 w-3" />
                                            Missing mapping
                                            <CountBadge n={untypedDocs.length} tone="info" />
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="pending" className="mt-3">
                                        {missingDocs.length === 0 && failingDocs.length === 0 ? (
                                            <div className="flex items-center gap-2 py-3 px-1 text-sm text-success">
                                                <CheckCircle2 className="h-4 w-4" />
                                                All required documents received.
                                            </div>
                                        ) : (
                                            <div className="space-y-0.5">
                                                {missingDocs.map(doc => {
                                                    const baseLabel = DOCUMENT_TYPE_LABELS[doc.doc_type as DocumentType] || doc.name || doc.doc_type;
                                                    const label = doc.party_name ? `${baseLabel} — ${doc.party_name}` : baseLabel;
                                                    const key = doc.party_requirement_id ? `party-${doc.party_requirement_id}` : `static-${doc.doc_type}`;
                                                    const uploadKey = doc.party_requirement_id ? `party:${doc.party_requirement_id}` : doc.doc_type;
                                                    return (
                                                        <CompactDocRow
                                                            key={key}
                                                            label={label}
                                                            tone="warning"
                                                            uploading={uploadingType === uploadKey}
                                                            onSelect={(file) => handleUpload(doc.doc_type, file, doc.party_requirement_id)}
                                                        />
                                                    );
                                                })}
                                                {failingDocs.map(doc => {
                                                    const baseLabel = DOCUMENT_TYPE_LABELS[doc.doc_type as DocumentType] || doc.name || doc.doc_type;
                                                    const label = doc.party_name ? `${baseLabel} — ${doc.party_name}` : baseLabel;
                                                    const key = doc.party_requirement_id ? `party-fail-${doc.party_requirement_id}` : `static-fail-${doc.doc_type}`;
                                                    const uploadKey = doc.party_requirement_id ? `party:${doc.party_requirement_id}` : doc.doc_type;
                                                    return (
                                                        <CompactDocRow
                                                            key={key}
                                                            label={label}
                                                            tone="destructive"
                                                            uploading={uploadingType === uploadKey}
                                                            onSelect={(file) => handleUpload(doc.doc_type, file, doc.party_requirement_id)}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="mapped" className="mt-3">
                                        {mappedDocs.length === 0 ? (
                                            <div className="flex items-center gap-2 py-3 px-1 text-sm text-muted-foreground">
                                                <FileCheck className="h-4 w-4" />
                                                Nothing uploaded yet.
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                {mappedDocs.map((doc: any) => (
                                                    <MappedDocRow key={doc.id} doc={doc} />
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="unmapped" className="mt-3">
                                        {untypedDocs.length === 0 ? (
                                            <div className="flex items-center gap-2 py-3 px-1 text-sm text-success">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Every uploaded file has a document type.
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-[11px] text-muted-foreground mb-2">
                                                    AI couldn't confidently match these to a type. Pick one to assign.
                                                </p>
                                                <div className="space-y-1.5">
                                                    {untypedDocs.map((doc: any) => (
                                                        <UntypedDocRow
                                                            key={doc.id}
                                                            doc={doc}
                                                            docDefs={docDefs}
                                                            busy={remappingId === doc.id}
                                                            onAssign={(t) => handleRemapDocType(doc.id, t)}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        {/* Open risks — own card, full width below the documents section */}
                        <Card>
                            <CardHeader className="pb-2 pt-4 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <ShieldAlert className={cn('h-4 w-4', openRisks.length > 0 ? 'text-destructive' : 'text-muted-foreground')} />
                                    Open risks
                                    <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                                        {openRisks.length} unresolved
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3">
                                {openRisks.length === 0 ? (
                                    <div className="flex items-center gap-2 py-2 px-1 text-sm text-success">
                                        <CheckCircle2 className="h-4 w-4" />
                                        No open flags.
                                    </div>
                                ) : (
                                    <div className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1">
                                        {openRisks
                                            .slice()
                                            .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
                                            .map(rf => (
                                                <RiskRow key={rf.id} flag={rf} />
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Decision / Publication trail */}
                        {(decision || publication) && (
                            <Card>
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Gavel className="h-4 w-4 text-primary" />
                                        Decision & publication
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 space-y-2">
                                    {decision && (
                                        <div className="border border-border rounded-md p-3">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <Badge className={cn(
                                                    'border-0',
                                                    decision.outcome === 'Approved' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
                                                )}>
                                                    {decision.outcome}
                                                </Badge>
                                                <span className="text-[11px] text-muted-foreground">
                                                    by <span className="font-medium text-foreground">{decision.by}</span> · {format(decision.at, 'dd MMM HH:mm')}
                                                </span>
                                            </div>
                                            {decision.comment && (
                                                <p className="text-sm text-foreground mt-2 whitespace-pre-line">{decision.comment}</p>
                                            )}
                                        </div>
                                    )}
                                    {publication && (
                                        <div className="border border-border rounded-md p-3 flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Send className="h-3.5 w-3.5 text-primary" />
                                                <span className="text-sm font-medium">Published to core</span>
                                            </div>
                                            <span className="text-[11px] text-muted-foreground">
                                                by <span className="font-medium text-foreground">{publication.by}</span> · {format(publication.at, 'dd MMM HH:mm')}
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Right column: conversation, sticky on desktop */}
                    {hasConversation && (
                        <div className="lg:col-span-1">
                            <div className="lg:sticky lg:top-4">
                                <ConversationPanel emails={(request as any).inbound_emails as InboundEmail[]} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


function CompletionRing({ pct, size = 54, stroke = 6, textClass = 'text-sm' }: { pct: number; size?: number; stroke?: number; textClass?: string }) {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (pct / 100) * circumference;
    const color = pct >= 80 ? 'stroke-success' : pct >= 40 ? 'stroke-warning' : 'stroke-destructive';

    return (
        <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    className="stroke-muted"
                    strokeWidth={stroke}
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    className={cn(color, 'transition-[stroke-dashoffset] duration-700 ease-out')}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span className={cn('absolute inset-0 flex items-center justify-center font-semibold tabular-nums', textClass)}>
                <AnimatedNumber value={pct} />%
            </span>
        </div>
    );
}

function MiniProgress({
    label, value, total, sub, subTone = 'muted',
}: {
    label: string; value: number; total: number; sub?: string; subTone?: 'success' | 'destructive' | 'muted';
}) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const barClass = pct === 100 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-destructive/70';
    const subClass =
        subTone === 'destructive' ? 'text-destructive'
            : subTone === 'success' ? 'text-success'
                : 'text-muted-foreground';
    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
                <span className="text-[11px] tabular-nums text-foreground">
                    {value}<span className="text-muted-foreground">/{total || 0}</span>
                </span>
            </div>
            <div className="h-1 bg-muted/70 rounded-full overflow-hidden">
                <div className={cn('h-full transition-[width] duration-700 ease-out', barClass)} style={{ width: `${pct}%` }} />
            </div>
            {sub && <p className={cn('text-[10px] mt-1 truncate', subClass)}>{sub}</p>}
        </div>
    );
}

function CountBadge({ n, tone }: { n: number; tone: 'warning' | 'success' | 'info' }) {
    if (n === 0) return null;
    const cls =
        tone === 'warning' ? 'bg-warning/15 text-warning'
            : tone === 'success' ? 'bg-success/15 text-success'
                : 'bg-info/15 text-info';
    return (
        <span className={cn('ml-1 text-[10px] font-semibold px-1.5 rounded tabular-nums', cls)}>
            {n}
        </span>
    );
}

function MappedDocRow({ doc }: { doc: any }) {
    const fileName = (doc.file_url || doc.file || '').split('/').pop()?.split('?')[0] || 'attachment';
    const label = DOCUMENT_TYPE_LABELS[doc.doc_type as DocumentType] || doc.doc_type;
    const uploadedAt = doc.uploaded_at ? new Date(doc.uploaded_at) : null;
    const status: string = doc.status || 'uploaded';
    const statusClass =
        status === 'processed' ? 'bg-success/10 text-success border-success/30'
            : status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/30'
                : status === 'processing' ? 'bg-info/10 text-info border-info/30'
                    : 'bg-muted text-muted-foreground border-border';
    const fileHref = doc.file_url || doc.file;
    return (
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-md border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors">
            <FileCheck className="h-3.5 w-3.5 text-success shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{label}</p>
                    <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 capitalize', statusClass)}>
                        {status}
                    </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                    <span className="font-mono">{fileName}</span>
                    {uploadedAt && <> · {format(uploadedAt, 'dd MMM HH:mm')}</>}
                </p>
            </div>
            {fileHref && (
                <a
                    href={fileHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Open file"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            )}
        </div>
    );
}

function CompactDocRow({
    label, tone, uploading, onSelect,
}: {
    label: string;
    tone: 'warning' | 'destructive';
    uploading: boolean;
    onSelect: (file: File) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const dotClass = tone === 'destructive' ? 'bg-destructive' : 'bg-warning';
    return (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotClass)} />
                <span className="text-sm text-foreground truncate">{label}</span>
            </div>
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onSelect(f);
                    e.target.value = '';
                }}
            />
            <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] gap-1 shrink-0"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
            >
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                Upload
            </Button>
        </div>
    );
}

function RiskRow({
    flag,
}: {
    flag: { id: number; severity: string; title: string; description: string; flag_type: string; document_type: string | null };
}) {
    const sevClass = SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.info;
    return (
        <div className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
            <Badge variant="outline" className={cn('text-[10px] uppercase shrink-0 mt-0.5', sevClass)}>
                {flag.severity}
            </Badge>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{flag.title}</p>
                {(flag.description || flag.document_type) && (
                    <p className="text-[11px] text-muted-foreground truncate">
                        {flag.document_type && <span className="font-mono">{flag.document_type}</span>}
                        {flag.document_type && flag.description ? ' · ' : ''}
                        {flag.description}
                    </p>
                )}
            </div>
        </div>
    );
}

function UntypedDocRow({
    doc, docDefs, busy, onAssign,
}: {
    doc: any;
    docDefs: any[];
    busy: boolean;
    onAssign: (docType: string) => void;
}) {
    const fileName = (doc.file || '').split('/').pop()?.split('?')[0] || 'attachment';
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border bg-muted/10">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileWarning className="h-3.5 w-3.5 text-info shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fileName}</p>
                    <p className="text-[11px] text-muted-foreground">
                        Currently typed as: <code className="text-[10px]">{doc.doc_type}</code>
                    </p>
                </div>
            </div>
            <Select onValueChange={onAssign} disabled={busy}>
                <SelectTrigger className="h-8 w-[200px] text-xs shrink-0">
                    <SelectValue placeholder={busy ? 'Saving…' : 'Assign type'} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                    {docDefs.map(d => (
                        <SelectItem key={d.id} value={d.doc_type}>
                            {d.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

