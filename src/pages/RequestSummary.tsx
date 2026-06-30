import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Loader2, ArrowLeft, ArrowRight, AlertTriangle, AlertCircle, CheckCircle2, XCircle, Clock, Clock3,
    FileCheck, ShieldAlert, Upload, Sparkles, FileText, Files, Gauge, RefreshCw,
    Layers, Activity as ActivityIcon, MessageSquare, Check, X,
    ExternalLink, ChevronRight, ChevronDown, ScanSearch, Send, CircleDot, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DocumentType, calculateSlaRemaining, getSlaStatus } from '@/types/case';
import { mapBackendRequestToListItem, mapBackendRequestDecision, mapBackendRequestPublication } from '@/lib/mappers';
import { ConversationDrawer } from '@/components/workbench/ConversationDrawer';
import { MissingInfoEmailModal } from '@/components/request/MissingInfoEmailModal';
import { NotifyBrokerDialog } from '@/components/request/NotifyBrokerDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BulkZipUploadButton } from '@/components/request/BulkZipUploadButton';
import { Skeleton } from '@/components/ui/skeleton';
import { PageShell } from '@/components/layout/PageShell';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { requestStatusMeta, severityMeta, slaMeta, bySeverity, type StatusIconName } from '@/lib/status';
import { DecisionModal, type DecisionAction } from '@/components/request/DecisionModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface CheckItem {
    id: string; name: string; item_type: string; handler: string;
    stage_id: number; stage_name: string; required: boolean;
    status: string; summary?: string | null; run_at?: string | null;
}
interface ReadinessSummary {
    overall: { status: 'ready' | 'blocked' | 'review' | 'waiting'; headline: string };
    documents: {
        total: number; received: number; missing: number; processing: number; failed: number; required_missing: number;
        items: Array<{ doc_type: string; name: string; required: boolean; state: 'received' | 'processing' | 'failed' | 'missing'; party_name?: string | null; party_requirement_id?: string | null; }>;
    };
    internal_checks: { total: number; passed: number; failed: number; pending: number; error: number; items?: CheckItem[] };
    external_checks: { total: number; passed: number; failed: number; pending: number; error: number; items?: CheckItem[] };
    risk_flags: { total: number; unresolved: number; blocking: number };
}

// Non-colour cue icons returned by the shared status helpers (severity/SLA).
// Status meaning is carried by text + variant + this icon — never colour alone.
const STATUS_ICONS: Record<StatusIconName, typeof Check> = {
    AlertTriangle, AlertCircle, Clock3, CheckCircle2, CircleDot, ShieldAlert,
};

// Severity badge routed entirely through the shared severityMeta helper so a
// "Critical" flag looks and reads identically here, in the workbench and the
// evidence pack. Carries a plain-language label + a non-colour icon cue.
function SeverityBadge({ sev }: { sev: string }) {
    const m = severityMeta(sev);
    const Icon = m.icon ? STATUS_ICONS[m.icon] : null;
    return (
        <Badge variant={m.variant} className="text-[10px] uppercase font-bold shrink-0">
            {Icon && <Icon className="h-3 w-3 mr-1" aria-hidden="true" />}{m.label}
        </Badge>
    );
}

// Friendly plural labels so a batch of identical flags collapses to one line
// (e.g. 106 MOL employee mismatches -> "106 employees not found in MOL").
const FLAG_TYPE_LABEL: Record<string, string> = {
    employee_count_mismatch: 'employees not found in MOL',
    sanctions_risk: 'sanctions hits',
    pep_risk: 'PEP matches',
    expired_document: 'expired documents',
    expiring_soon: 'documents expiring soon',
    name_mismatch: 'name mismatches',
    missing_document: 'missing documents',
    high_risk_activity: 'high-risk activities',
    offshore_entity: 'offshore entity flags',
    incomplete_extraction: 'incomplete extractions',
    data_inconsistency: 'data inconsistencies',
    low_confidence: 'low-confidence extractions',
    manual_review_required: 'manual reviews required',
    wrong_document_type: 'wrong document type uploaded',
};
const humanizeFlag = (t: string) => FLAG_TYPE_LABEL[t] || (t || 'risk flags').replace(/_/g, ' ');

// RequestStage.status -> step display (plain language, aligned with the shared
// stageMeta wording so a step reads the same everywhere).
const STAGE_STATUS: Record<string, { label: string; tone: 'success' | 'destructive' | 'info' | 'muted'; icon: typeof Check }> = {
    completed: { label: 'Done', tone: 'success', icon: Check },
    missing_info: { label: 'Needs review', tone: 'destructive', icon: AlertTriangle },
    in_review: { label: 'In progress', tone: 'info', icon: CircleDot },
    pending: { label: 'Not started', tone: 'muted', icon: Clock },
    skipped: { label: 'Skipped', tone: 'muted', icon: Clock },
};
const TONE_TEXT: Record<string, string> = {
    success: 'text-success', destructive: 'text-destructive', info: 'text-info', muted: 'text-muted-foreground',
};
const TONE_BAR: Record<string, string> = {
    success: 'bg-success', destructive: 'bg-destructive', info: 'bg-info', muted: 'bg-muted-foreground/40',
};

type TabKey = 'overview' | 'documents' | 'risks' | 'pipeline' | 'activity';

// Server-side activity feed contract (see core/timeline_service.py)
interface TimelineEvent {
    id: string;
    type: string;          // 'request_created' | 'email_in' | 'email_out' | 'document_uploaded' | ...
    title: string;
    description?: string | null;
    at: string;            // ISO8601
    actor?: string | null;
    severity?: string | null;
    tone?: 'success' | 'destructive' | 'warning' | 'info' | 'muted' | string | null;
}

// One place to map event type -> icon + default tone. New event types added
// on the BE will render with the generic Activity icon until added here.
const TIMELINE_ICONS: Record<string, typeof Check> = {
    request_created: Sparkles,
    email_in: MessageSquare,
    email_out: Send,
    email_out_failed: XCircle,
    document_uploaded: Upload,
    extraction_completed: ScanSearch,
    risk_raised: ShieldAlert,
    risk_resolved: CheckCircle2,
    stage_completed: Check,
    portal_accessed: ExternalLink,
    approved: CheckCircle2,
    rejected: XCircle,
    published: Send,
    // Operator-driven events written via ActivityLog
    check_overridden: ShieldAlert,
    check_marked_passed: Check,
    check_unmarked: X,
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
    const [tab, setTab] = useState<TabKey>('overview');
    const [docFilter, setDocFilter] = useState<'pending' | 'mapped' | 'unmapped' | 'optional'>('pending');
    const [remappingId, setRemappingId] = useState<string | null>(null);
    const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high'>('all');
    const [convoOpen, setConvoOpen] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [notifyOpen, setNotifyOpen] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    // Which approve/reject/send confirmation is open (null = none). Replaces the
    // old window.prompt flow with the shared, audit-logged DecisionModal.
    const [decisionAction, setDecisionAction] = useState<DecisionAction | null>(null);
    // Risk being dismissed via the styled note dialog (replaces window.prompt).
    const [dismissTarget, setDismissTarget] = useState<{ id: number; label: string } | null>(null);
    // Per-source load failures so a failed fetch is surfaced inline (with Retry)
    // instead of silently falling back to a safe-looking "all clear". `request`
    // distinguishes a genuine 404 from a transient/network error.
    const [loadError, setLoadError] = useState<{
        request: 'notfound' | 'error' | null;
        readiness: boolean;
        documents: boolean;
        timeline: boolean;
    }>({ request: null, readiness: false, documents: false, timeline: false });
    // Surfaces the BE's content-classifier warning right after upload so the
    // operator can react before the file is silently filed under the wrong slot.
    const [classifierWarning, setClassifierWarning] = useState<{
        documentId: string;
        claimedDocType: string;
        claimedDocName: string;
        classifiedAs: string;
        classifiedName: string;
        message: string;
    } | null>(null);

    const fetchData = async (silent = false) => {
        if (!requestId) return;
        if (!silent) setLoading(true);
        const [reqResult, rdResult, docsResult, defsResult, tlResult] = await Promise.allSettled([
            api.requests.get(requestId),
            api.requests.readiness(requestId),
            api.documents.list({ requestId }),
            api.studio.documents.list(),
            api.requests.timeline(requestId),
        ]);
        // Engineering details (status codes, stack traces) go to the console only;
        // the UI gets plain-language, audience-appropriate copy + a Retry.
        const nextErr: typeof loadError = { request: null, readiness: false, documents: false, timeline: false };

        if (reqResult.status === 'fulfilled') setRequest(reqResult.value);
        else {
            const msg = String(reqResult.reason?.message || '');
            nextErr.request = /\b404\b|not found/i.test(msg) ? 'notfound' : 'error';
            console.error('Failed to load request', reqResult.reason);
        }
        if (rdResult.status === 'fulfilled') setReadiness(rdResult.value);
        else { nextErr.readiness = true; console.error('Failed to load readiness', rdResult.reason); }
        if (docsResult.status === 'fulfilled') {
            const target = String(requestId).toLowerCase();
            setDocuments((docsResult.value as any[]).filter((d) => {
                const r = d?.request; if (r == null) return false;
                const rid = typeof r === 'object' ? r.id ?? r.pk : r;
                return rid && String(rid).toLowerCase() === target;
            }));
        } else { nextErr.documents = true; console.error('Failed to load documents', docsResult.reason); }
        if (defsResult.status === 'fulfilled') setDocDefs(defsResult.value);
        else { nextErr.documents = true; console.error('Failed to load document catalog', defsResult.reason); }
        if (tlResult.status === 'fulfilled') {
            setTimelineEvents(((tlResult.value as any)?.events as TimelineEvent[]) || []);
        } else { nextErr.timeline = true; console.error('Failed to load timeline', tlResult.reason); }

        setLoadError(nextErr);
        if (!silent) setLoading(false);
    };

    useEffect(() => { fetchData(); }, [requestId]);

    const handleUpload = async (docType: string, file: File, partyReqId?: string | null) => {
        if (!requestId) return;
        setUploadingType(partyReqId ? `party:${partyReqId}` : docType);
        const formData = new FormData();
        formData.append('request', requestId);
        formData.append('file', file);
        formData.append('doc_type', docType);
        if (partyReqId) formData.append('party_requirement_id', partyReqId);
        const t = toast.loading(`Uploading ${file.name}…`);
        try {
            const res: any = await api.documents.upload(formData);
            await fetchData(true);
            if (res?.classifier_warning) {
                // Demote the toast — we'll surface the actionable dialog instead.
                toast.warning(`Uploaded — but this file may be the wrong type`, { id: t });
                setClassifierWarning({
                    documentId: res.id,
                    claimedDocType: res.classifier_warning.claimed_doc_type,
                    claimedDocName: res.classifier_warning.claimed_doc_name,
                    classifiedAs: res.classifier_warning.classified_as,
                    classifiedName: res.classifier_warning.classified_name,
                    message: res.classifier_warning.message,
                });
            } else {
                toast.success('Uploaded — reading the document now', { id: t });
            }
        } catch (err: any) {
            console.error('Upload failed', err);
            toast.error("We couldn't upload that file. Check your connection and try again.", { id: t });
        } finally { setUploadingType(null); }
    };

    const handleReplace = async (docId: string, docTypeForToast: string, file: File) => {
        const t = toast.loading(`Replacing ${file.name}…`);
        try {
            const res: any = await api.documents.replaceFile(docId, file);
            await fetchData(true);
            if (res?.classifier_warning) {
                toast.warning('Replaced — but the new file may still be the wrong type', { id: t });
                setClassifierWarning({
                    documentId: res.id || docId,
                    claimedDocType: res.classifier_warning.claimed_doc_type,
                    claimedDocName: res.classifier_warning.claimed_doc_name,
                    classifiedAs: res.classifier_warning.classified_as,
                    classifiedName: res.classifier_warning.classified_name,
                    message: res.classifier_warning.message,
                });
            } else {
                toast.success(`Replaced — re-reading ${docTypeForToast}`, { id: t });
            }
        } catch (err: any) {
            console.error('Replace failed', err);
            toast.error("We couldn't replace that file. Check your connection and try again.", { id: t });
        }
    };

    // Actions for the classifier-warning dialog
    const acceptClassifierSuggestion = async () => {
        if (!classifierWarning) return;
        try {
            await api.documents.update(classifierWarning.documentId, { doc_type: classifierWarning.classifiedAs });
            toast.success(`Document type set to "${classifierWarning.classifiedName}"`);
            setClassifierWarning(null);
            await fetchData(true);
        } catch (err: any) {
            console.error('Failed to change document type', err);
            toast.error("We couldn't change the document type. Please try again.");
        }
    };
    const discardWrongUpload = async () => {
        if (!classifierWarning) return;
        try {
            await api.documents.delete(classifierWarning.documentId);
            toast.success('File removed — pick the correct one and upload again.');
            setClassifierWarning(null);
            await fetchData(true);
        } catch (err: any) {
            console.error('Failed to remove the file', err);
            toast.error("We couldn't remove the file. Please try again.");
        }
    };
    // Honest behaviour: keeping the file simply leaves its type unchanged. We make
    // no flag/tracking call here, so we don't claim one (the old copy did).
    const keepAsIs = () => {
        toast.info(`Kept as ${classifierWarning?.claimedDocName}. You can change the type later under Documents.`);
        setClassifierWarning(null);
    };

    // Set the type on a document our auto-sort couldn't recognise. PATCHing doc_type
    // makes the backend re-read the file for the new type and re-run its checks.
    const handleRemap = async (docId: string, docType: string) => {
        setRemappingId(docId);
        const t = toast.loading('Setting the document type…');
        try {
            await api.documents.update(docId, { doc_type: docType });
            toast.success('Type set — re-reading the document', { id: t });
            await fetchData(true);
        } catch (err: any) {
            console.error('Could not set document type', err);
            toast.error("We couldn't set the document type. Please try again.", { id: t });
        } finally { setRemappingId(null); }
    };

    // Single approve / reject / send-to-insurer path via the shared DecisionModal.
    // A reason is captured and saved to the audit trail; readiness gating + the
    // override acknowledgement are handled by the modal props below.
    const submitDecision = async (reason: string) => {
        if (!requestId || !decisionAction) return;
        const verb = decisionAction === 'approve' ? 'Approving' : decisionAction === 'reject' ? 'Rejecting' : 'Sending to insurer';
        const done = decisionAction === 'approve' ? 'Request approved' : decisionAction === 'reject' ? 'Request rejected' : 'Sent to insurer';
        const t = toast.loading(`${verb}…`);
        try {
            if (decisionAction === 'approve') await api.requests.approve(requestId, reason);
            else if (decisionAction === 'reject') await api.requests.reject(requestId, reason);
            else await api.requests.publish(requestId);
            toast.success(done, { id: t });
            setDecisionAction(null);
            await fetchData(true);
        } catch (err: any) {
            console.error('Could not record decision', err);
            toast.error("We couldn't save your decision. Please try again.", { id: t });
        }
    };

    const confirmDismiss = async (note: string) => {
        if (!dismissTarget) return;
        try {
            await api.workflow.resolveRiskFlag(dismissTarget.id, note);
            toast.success('Risk dismissed and recorded');
            setDismissTarget(null);
            await fetchData(true);
        } catch (err: any) {
            console.error('Could not dismiss risk', err);
            toast.error("We couldn't dismiss this risk. Please try again.");
        }
    };

    if (loading) {
        return (
            <PageShell>
                <Skeleton className="h-8 w-80" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-64 w-full rounded-lg" />
            </PageShell>
        );
    }
    if (!request) {
        // Distinguish a genuine 404 (request gone) from a transient/network error,
        // so we never dead-end an underwriter on a request that's simply slow to load.
        const isNotFound = loadError.request === 'notfound';
        return (
            <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-3 text-warning" aria-hidden="true" />
                    <p className="text-sm font-medium text-foreground">
                        {isNotFound ? "We couldn't find this request" : "We couldn't load this request"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {isNotFound
                            ? 'It may have been removed, or the link is out of date.'
                            : 'Check your connection and try again — nothing has been lost.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                        {!isNotFound && (
                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fetchData()}>
                                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Try again
                            </Button>
                        )}
                        <Link to="/requests"><Button variant={isNotFound ? 'outline' : 'ghost'} size="sm">Back to inbox</Button></Link>
                    </div>
                </div>
            </div>
        );
    }

    const rd: ReadinessSummary = readiness || {
        overall: { status: 'waiting', headline: '' },
        documents: { total: 0, received: 0, missing: 0, processing: 0, failed: 0, required_missing: 0, items: [] },
        internal_checks: { total: 0, passed: 0, failed: 0, pending: 0, error: 0, items: [] },
        external_checks: { total: 0, passed: 0, failed: 0, pending: 0, error: 0, items: [] },
        risk_flags: { total: 0, unresolved: 0, blocking: 0 },
    };

    const listItem = mapBackendRequestToListItem(request);
    const statusMeta = requestStatusMeta(request.status);
    // Single SLA source: prefer the backend deadline; only fall back to the
    // local estimate when the backend hasn't sent one. We derive the bucket
    // once (getSlaStatus) and present it via the shared slaMeta helper.
    const slaRemaining = calculateSlaRemaining(listItem.createdAt, listItem.priority);
    const slaDeadline = request.sla_deadline ? new Date(request.sla_deadline) : null;
    const hoursLeft = slaDeadline
        ? Math.round((slaDeadline.getTime() - Date.now()) / 3600000)
        : slaRemaining;
    const slaStatus = getSlaStatus(hoursLeft, listItem.slaTargetHours);
    // getSlaStatus returns 'red' for both genuinely-overdue and due-soon. Only call
    // it "Overdue" when truly past due; otherwise the precise "time left" text below
    // carries the urgency and the badge reads "At risk".
    const slaBucket = hoursLeft <= 0 ? 'red' : slaStatus === 'red' ? 'amber' : slaStatus;
    const sla = slaMeta(slaBucket);
    const SlaIcon = STATUS_ICONS[sla.icon];
    const slaText = hoursLeft > 0 ? `${hoursLeft}h left` : hoursLeft === 0 ? 'Due now' : `${Math.abs(hoursLeft)}h overdue`;

    // Where this request sits in its lifecycle — drives which decision controls show.
    const rawStatus = String(request.status || '');
    const isRejected = rawStatus === 'rejected';
    const isApproved = rawStatus === 'approved' || rawStatus === 'ready_for_export';
    const isSent = rawStatus === 'issued' || rawStatus === 'exported' || rawStatus === 'published';
    const isDecided = isRejected || isApproved || isSent;

    const riskFlags = (request.risk_flags || []) as Array<{ id: number; severity: string; title: string; description: string; flag_type: string; document_type: string | null; resolved: boolean; created_at?: string }>;
    const openRisks = riskFlags.filter(r => !r.resolved).sort(bySeverity(r => r.severity));
    const criticalRisks = openRisks.filter(r => ['critical', 'high'].includes(r.severity));

    // Pipeline from request stages
    const stages = ((request.request_stages || []) as any[])
        .map(rs => ({ id: rs.stage, name: rs.stage_name, order: rs.stage_order ?? 0, status: rs.status as string }))
        .sort((a, b) => a.order - b.order);
    const stageDone = stages.filter(s => s.status === 'completed').length;
    const stageBlocked = stages.filter(s => s.status === 'missing_info').length;
    const pipelinePct = stages.length > 0 ? Math.round((stageDone / stages.length) * 100) : 0;

    // Checks grouped per stage (from readiness items)
    const allChecks: CheckItem[] = [...(rd.internal_checks.items || []), ...(rd.external_checks.items || [])];
    const checksByStage = new Map<number, { total: number; passed: number; failed: number }>();
    for (const c of allChecks) {
        const e = checksByStage.get(c.stage_id) || { total: 0, passed: 0, failed: 0 };
        e.total++;
        if (c.status === 'passed') e.passed++;
        if (c.status === 'failed' || c.status === 'error') e.failed++;
        checksByStage.set(c.stage_id, e);
    }
    // Evidence = checks that have actually run
    const evidence = allChecks.filter(c => c.status && c.status !== 'not_run').slice(0, 8);

    const missingDocs = rd.documents.items.filter(d => d.state === 'missing' && d.required);
    const optionalDocs = rd.documents.items.filter(d => d.state === 'missing' && !d.required);
    const failingDocs = rd.documents.items.filter(d => d.state === 'failed');
    const knownTypes = new Set(docDefs.map((d: any) => d.doc_type));
    const isMapped = (d: any) => d.doc_type && d.doc_type !== 'other' && knownTypes.has(d.doc_type);
    const mappedDocs = documents.filter(isMapped);
    // Files that auto-classification left unmapped (doc_type 'other', empty, or not in the
    // studio catalog) — uploaded but satisfying no requirement until an operator assigns a type.
    // Guard on a loaded catalog: if docDefs failed to load, knownTypes is empty and EVERY doc
    // would look unmapped — suppress the bucket rather than show a false flood with no options.
    const catalogReady = docDefs.length > 0;
    const unmappedDocs = catalogReady ? documents.filter((d: any) => !isMapped(d)) : [];
    // Re-mapping targets: the configured studio doc types (the exact set that makes a
    // document count as "mapped"). Deduped by slug, sorted by label.
    const docTypeOptions = Array.from(
        new Map(docDefs.map((d: any) => [d.doc_type, d.name || DOCUMENT_TYPE_LABELS[d.doc_type as DocumentType] || d.doc_type])).entries()
    ).map(([value, label]) => ({ value: value as string, label: label as string }))
        .filter((o) => o.value) // Radix SelectItem rejects an empty value
        .sort((a, b) => a.label.localeCompare(b.label));

    // Activity feed — server-side timeline (richer than what we can synthesize).
    // Falls back to a minimal "Request created" row if the endpoint is empty
    // (rare — that only happens for a freshly-created request with no events).
    const activity = (timelineEvents.length > 0
        ? timelineEvents.map(e => ({
            id: e.id,
            icon: TIMELINE_ICONS[e.type] || ActivityIcon,
            tone: (e.tone || 'muted') as string,
            title: e.title,
            description: e.description || undefined,
            actor: e.actor || undefined,
            at: new Date(e.at),
        }))
        : [{ id: 'created', icon: Sparkles, tone: 'muted', title: 'Request created',
              actor: listItem.brokerEmail || 'Broker', at: listItem.createdAt,
              description: undefined }]
    );

    const statusBlocked = rd.overall.status === 'blocked' || stageBlocked > 0;
    const nextAction = missingDocs.length > 0
        ? { headline: 'Documents still needed from the broker', sub: `${missingDocs.length} required document${missingDocs.length === 1 ? '' : 's'} still needed${criticalRisks.length ? ` · ${criticalRisks.length} risk${criticalRisks.length === 1 ? '' : 's'} to review` : ''}` }
        : criticalRisks.length > 0
        ? { headline: 'Review the open risks', sub: `${criticalRisks.length} risk${criticalRisks.length === 1 ? '' : 's'} to review before you can approve` }
        : stageDone === stages.length && stages.length > 0
        ? { headline: 'Ready to decide', sub: 'All steps complete — approve or reject' }
        : null;

    // Readiness gating for Approve: open blocking risks + required docs still
    // missing. When readiness couldn't load we also can't confirm it's safe, so
    // we treat that as a blocker the user must explicitly acknowledge.
    const approvalBlockerParts: string[] = [];
    if (missingDocs.length > 0) approvalBlockerParts.push(`${missingDocs.length} required document${missingDocs.length === 1 ? '' : 's'} still needed`);
    if (criticalRisks.length > 0) approvalBlockerParts.push(`${criticalRisks.length} risk${criticalRisks.length === 1 ? '' : 's'} still open`);
    const hasApprovalBlockers = approvalBlockerParts.length > 0;
    const readinessUnknown = loadError.readiness;
    const approveNeedsOverride = decisionAction === 'approve' && (hasApprovalBlockers || readinessUnknown);
    const approveWarning = decisionAction !== 'approve'
        ? undefined
        : readinessUnknown
        ? <>We couldn't check this request's readiness, so we can't confirm it's safe to approve. You can approve anyway, but please confirm you've reviewed it yourself.</>
        : hasApprovalBlockers
        ? <>This request isn't ready to approve yet: {approvalBlockerParts.join(' · ')}. Approving now overrides these checks.</>
        : undefined;
    const approveDescription = decisionAction === 'approve' && !readinessUnknown && !hasApprovalBlockers
        ? `${rd.documents.received}/${rd.documents.total} documents received · no open risks. Your reason is saved to the audit trail.`
        : undefined;

    return (
        <PageShell>
            {/* Header */}
            <div>
                <Link to="/requests" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-2">
                    <ArrowLeft className="h-3 w-3" /> All requests
                </Link>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <p className="text-[11px] text-muted-foreground font-mono">
                            {request.smart_id || request.id?.slice(0, 8)} · Created {format(listItem.createdAt, 'dd MMM yyyy · HH:mm')}
                        </p>
                        <h1 className="page-title mt-1 truncate">{request.company_name}</h1>
                        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap mt-2 text-xs text-muted-foreground">
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            {statusBlocked && <Chip tone="destructive" dot>Needs review</Chip>}
                            {rd.documents.required_missing > 0 && <Chip tone="warning">Awaiting info</Chip>}
                            {listItem.brokerEmail && <Meta label="Broker" value={listItem.brokerEmail} />}
                            <Meta label="Team" value={listItem.queue} />
                            {listItem.owner && <Meta label="Owner" value={listItem.owner} />}
                            <span
                                className={cn('inline-flex items-center gap-1', slaStatus === 'red' ? 'text-destructive font-medium' : slaStatus === 'amber' ? 'text-warning' : '')}
                                title={sla.label}
                                aria-label={`Deadline: ${sla.label}, ${slaText}`}
                            >
                                <SlaIcon className="h-3 w-3" aria-hidden="true" /> {slaText}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 shrink-0 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setConvoOpen(true)}><MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> Message</Button>
                        {!isDecided && (
                            <>
                                <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDecisionAction('reject')}><X className="h-3.5 w-3.5" aria-hidden="true" /> Reject</Button>
                                <Button variant="success" size="sm" className="gap-1.5" onClick={() => setDecisionAction('approve')}><Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve</Button>
                            </>
                        )}
                        {isApproved && (
                            <Button size="sm" className="gap-1.5" onClick={() => setDecisionAction('publish')}><Send className="h-3.5 w-3.5" aria-hidden="true" /> Send to insurer</Button>
                        )}
                        <Button variant={isDecided && !isApproved ? 'default' : 'outline'} size="sm" className="gap-1.5" onClick={() => navigate(`/request/${requestId}/workbench`)}>Open workbench <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Button>
                    </div>
                </div>
            </div>

            {/* KPI strip — when readiness can't load we surface an inline error +
                Retry instead of rendering all-zero cards that read as "all clear". */}
            {loadError.readiness ? (
                <InlineLoadError
                    message="We couldn't load this request's readiness."
                    detail="The document, check and risk summary below may be missing. Please don't decide until it loads."
                    onRetry={() => fetchData()}
                />
            ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
                <KpiCard icon={FileText} label="Documents" value={`${rd.documents.received}/${rd.documents.total}`} sub={rd.documents.required_missing > 0 ? `${rd.documents.required_missing} still needed` : 'All received'} subTone={rd.documents.required_missing > 0 ? 'destructive' : 'success'} bar={pct(rd.documents.received, rd.documents.total)} />
                <KpiCard icon={ListChecks} label="Checks" value={`${rd.internal_checks.passed + rd.external_checks.passed}/${rd.internal_checks.total + rd.external_checks.total}`} sub={(rd.internal_checks.failed + rd.external_checks.failed) > 0 ? `${rd.internal_checks.failed + rd.external_checks.failed} failed` : (rd.internal_checks.pending + rd.external_checks.pending) > 0 ? `${rd.internal_checks.pending + rd.external_checks.pending} pending` : 'All passed'} subTone={(rd.internal_checks.failed + rd.external_checks.failed) > 0 ? 'destructive' : 'muted'} bar={pct(rd.internal_checks.passed + rd.external_checks.passed, rd.internal_checks.total + rd.external_checks.total)} />
                <KpiCard icon={ShieldAlert} label="Open risks" value={`${openRisks.length}`} sub={rd.risk_flags.blocking > 0 ? `${rd.risk_flags.blocking} to review before approval` : openRisks.length ? 'review needed' : 'none'} subTone={openRisks.length ? 'destructive' : 'success'} />
                <KpiCard icon={Layers} label="Progress" value={`${pipelinePct}%`} sub={`${stageDone}/${stages.length} steps${stageBlocked > 0 ? ` · ${stageBlocked} need review` : ''}`} subTone={stageBlocked > 0 ? 'destructive' : 'muted'} bar={pipelinePct} />
            </div>
            )}

            {/* Next best action */}
            {/* Tabs */}
            <div className="flex items-center justify-between gap-3 border-b border-border">
                <div className="flex items-center gap-1">
                    <Tab id="overview" tab={tab} setTab={setTab} icon={Gauge}>Overview</Tab>
                    <Tab id="documents" tab={tab} setTab={setTab} icon={Files} count={rd.documents.total}>Documents</Tab>
                    <Tab id="risks" tab={tab} setTab={setTab} icon={ShieldAlert} count={openRisks.length}>Risks</Tab>
                    <Tab id="pipeline" tab={tab} setTab={setTab} icon={Layers}>Progress</Tab>
                    <Tab id="activity" tab={tab} setTab={setTab} icon={ActivityIcon} count={activity.length}>Activity</Tab>
                </div>
                <div className="hidden md:flex items-center gap-1.5 pb-1.5">
                    <Link to={`/request/${requestId}/evidence-pack`}><Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"><FileCheck className="h-3.5 w-3.5" aria-hidden="true" /> Decision file</Button></Link>
                </div>
            </div>

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
                <div className="space-y-4">
                    {/* NBA banner — only shown on Overview where it's actionable */}
                    {nextAction && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-4">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-background/60 text-primary"><Sparkles className="h-4 w-4" /></div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">{nextAction.headline}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{nextAction.sub}</p>
                            </div>
                            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setNotifyOpen(true)}><Send className="h-3.5 w-3.5" /> Notify broker</Button>
                        </div>
                    )}

                    <Section title="Critical risks" action={openRisks.length > 4 ? { label: 'View all', onClick: () => setTab('risks') } : undefined}>
                        {criticalRisks.length === 0 ? <Empty icon={CheckCircle2} tone="success">No critical risks.</Empty> : (() => {
                            const byType = new Map<string, typeof criticalRisks>();
                            for (const r of criticalRisks) { const a = byType.get(r.flag_type) || []; a.push(r); byType.set(r.flag_type, a); }
                            const entries = Array.from(byType.entries())
                                .sort(bySeverity((e) => e[1][0].severity))
                                .slice(0, 4);
                            return (
                                <div className="divide-y divide-border">
                                    {entries.map(([ftype, items]) => {
                                        const r0 = items[0];
                                        const grouped = items.length > 1;
                                        return (
                                            <div key={ftype} className="flex items-start gap-3 py-2.5">
                                                <SeverityBadge sev={r0.severity} />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-foreground">{grouped ? `${items.length} ${humanizeFlag(ftype)}` : r0.title}</p>
                                                    {(grouped ? (r0.description || r0.title) : r0.description) && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{grouped ? `e.g. ${r0.description || r0.title}` : r0.description}</p>}
                                                </div>
                                                <button onClick={() => navigate(`/request/${requestId}/workbench`)} className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-0.5">Review <ArrowRight className="h-3 w-3" aria-hidden="true" /></button>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </Section>

                    <Section title="Documents still needed" action={missingDocs.length > 8 ? { label: 'View all', onClick: () => setTab('documents') } : undefined}>
                        {missingDocs.length === 0 ? <Empty icon={CheckCircle2} tone="success">All required documents received.</Empty> : (
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
                                {missingDocs.slice(0, 8).map(d => (
                                    <DocUploadRow key={d.party_requirement_id || d.doc_type} label={DOCUMENT_TYPE_LABELS[d.doc_type as DocumentType] || d.name || d.doc_type} required uploading={uploadingType === (d.party_requirement_id ? `party:${d.party_requirement_id}` : d.doc_type)} onSelect={(f) => handleUpload(d.doc_type, f, d.party_requirement_id)} />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>
            )}

            {/* ── DOCUMENTS ── */}
            {tab === 'documents' && (
                <Section title="Documents" right={`${mappedDocs.length} recognised${unmappedDocs.length ? ` · ${unmappedDocs.length} need a type` : ''} · ${missingDocs.length + failingDocs.length} still needed`}>
                    {(loadError.documents || loadError.readiness) && (
                        <div className="mb-3">
                            <InlineLoadError
                                message="We couldn't load the full document list."
                                detail="Some documents or requirements may be missing below."
                                onRetry={() => fetchData()}
                            />
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <FilterPill active={docFilter === 'pending'} onClick={() => setDocFilter('pending')} count={missingDocs.length + failingDocs.length}>Still needed</FilterPill>
                            <FilterPill active={docFilter === 'mapped'} onClick={() => setDocFilter('mapped')} count={mappedDocs.length}>Recognised</FilterPill>
                            <FilterPill active={docFilter === 'unmapped'} onClick={() => setDocFilter('unmapped')} count={unmappedDocs.length}>Needs a type</FilterPill>
                            <FilterPill active={docFilter === 'optional'} onClick={() => setDocFilter('optional')} count={optionalDocs.length}>Optional</FilterPill>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {requestId && <BulkZipUploadButton requestId={requestId} onComplete={() => fetchData(true)} className="h-7 text-xs" />}
                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setComposeOpen(true)}><Send className="h-3.5 w-3.5" aria-hidden="true" /> Ask broker for documents</Button>
                        </div>
                    </div>
                    {docFilter === 'pending' && (missingDocs.length + failingDocs.length === 0 ? <Empty icon={CheckCircle2} tone="success">All required documents received.</Empty> : (
                        <div className="divide-y divide-border max-h-[58vh] overflow-y-auto">
                            {[...missingDocs, ...failingDocs].map(d => (
                                <DocUploadRow key={(d.party_requirement_id || d.doc_type) + d.state} label={DOCUMENT_TYPE_LABELS[d.doc_type as DocumentType] || d.name || d.doc_type} required={d.required} failed={d.state === 'failed'} uploading={uploadingType === (d.party_requirement_id ? `party:${d.party_requirement_id}` : d.doc_type)} onSelect={(f) => handleUpload(d.doc_type, f, d.party_requirement_id)} wide />
                            ))}
                        </div>
                    ))}
                    {docFilter === 'mapped' && (mappedDocs.length === 0 ? <Empty icon={Files} tone="muted">Nothing uploaded yet.</Empty> : (
                        <div className="divide-y divide-border max-h-[58vh] overflow-y-auto">{mappedDocs.map((d: any) => <MappedRow key={d.id} doc={d} onReplace={handleReplace} />)}</div>
                    ))}
                    {docFilter === 'unmapped' && (unmappedDocs.length === 0 ? <Empty icon={CheckCircle2} tone="success">We sorted every uploaded file automatically.</Empty> : (
                        <>
                            <p className="text-[11px] text-muted-foreground mb-2">We couldn't tell what these files are. Choose the document type for each so we can run its checks.</p>
                            <div className="divide-y divide-border max-h-[58vh] overflow-y-auto">
                                {unmappedDocs.map((d: any) => (
                                    <UnmappedRow key={d.id} doc={d} options={docTypeOptions} busy={remappingId === String(d.id)} onRemap={(docType) => handleRemap(String(d.id), docType)} onReplace={handleReplace} />
                                ))}
                            </div>
                        </>
                    ))}
                    {docFilter === 'optional' && (optionalDocs.length === 0 ? <Empty icon={Files} tone="muted">No optional documents outstanding.</Empty> : (
                        <div className="divide-y divide-border max-h-[58vh] overflow-y-auto">
                            {optionalDocs.map(d => (
                                <DocUploadRow key={d.doc_type} label={DOCUMENT_TYPE_LABELS[d.doc_type as DocumentType] || d.name || d.doc_type} uploading={uploadingType === d.doc_type} onSelect={(f) => handleUpload(d.doc_type, f)} wide />
                            ))}
                        </div>
                    ))}
                </Section>
            )}

            {/* ── RISKS ── */}
            {tab === 'risks' && (
                <Section title="Risks" right={`${openRisks.length} open · ${rd.risk_flags.blocking} to review before approval`}>
                    <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <FilterPill active={riskFilter === 'all'} onClick={() => setRiskFilter('all')} count={openRisks.length}>All</FilterPill>
                        <FilterPill active={riskFilter === 'critical'} onClick={() => setRiskFilter('critical')} count={openRisks.filter(r => r.severity === 'critical').length}>Critical</FilterPill>
                        <FilterPill active={riskFilter === 'high'} onClick={() => setRiskFilter('high')} count={openRisks.filter(r => r.severity === 'high').length}>High</FilterPill>
                    </div>
                    {(() => {
                        const list = openRisks.filter(r => riskFilter === 'all' || r.severity === riskFilter);
                        if (list.length === 0) return <Empty icon={CheckCircle2} tone="success">No {riskFilter === 'all' ? 'open' : riskFilter} risks.</Empty>;
                        // Collapse high-volume flag types (e.g. 100+ MOL mismatches) into one
                        // summary row; show low-volume types individually.
                        const byType = new Map<string, typeof list>();
                        for (const r of list) { const a = byType.get(r.flag_type) || []; a.push(r); byType.set(r.flag_type, a); }
                        const groups = Array.from(byType.entries())
                            .sort(bySeverity((e) => e[1][0].severity));
                        return (
                            <div className="divide-y divide-border max-h-[58vh] overflow-y-auto">
                                {groups.flatMap(([ftype, items]) =>
                                    items.length > 5
                                        ? [<GroupedRiskRow key={`g-${ftype}`} label={humanizeFlag(ftype)} items={items} onReview={() => navigate(`/request/${requestId}/workbench`)} onDismiss={(id, label) => setDismissTarget({ id, label })} />]
                                        : items.map(r => <RiskItemRow key={r.id} r={r} onDismiss={() => setDismissTarget({ id: r.id, label: r.title })} onReview={() => navigate(`/request/${requestId}/workbench`)} />)
                                )}
                            </div>
                        );
                    })()}
                </Section>
            )}

            {/* ── PROGRESS (steps) ── */}
            {tab === 'pipeline' && (
                <Section title="Progress through the steps" action={{ label: 'Open in workbench', onClick: () => navigate(`/request/${requestId}/workbench`) }}>
                    {loadError.readiness && (
                        <div className="mb-3">
                            <InlineLoadError message="We couldn't load each step's checks." detail="Step status is shown, but check counts may be missing." onRetry={() => fetchData()} />
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                        {stages.map(s => {
                            const cfg = STAGE_STATUS[s.status] || STAGE_STATUS.pending;
                            const c = checksByStage.get(s.id) || { total: 0, passed: 0, failed: 0 };
                            const StageIcon = cfg.icon;
                            return (
                                <div key={s.id} className="rounded-lg border border-border bg-card p-3 card-interactive">
                                    <div className="flex items-center gap-2">
                                        <span className={cn('flex items-center justify-center w-5 h-5 rounded-full border shrink-0', TONE_TEXT[cfg.tone], cfg.tone === 'success' && 'bg-success/10 border-success/30', cfg.tone === 'destructive' && 'bg-destructive/10 border-destructive/30', cfg.tone === 'info' && 'bg-info/10 border-info/30', cfg.tone === 'muted' && 'border-border')}><StageIcon className="h-3 w-3" aria-hidden="true" /></span>
                                        <p className="text-sm font-medium text-foreground truncate flex-1">{s.name}</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-2">{c.total} check{c.total === 1 ? '' : 's'} · <span className={TONE_TEXT[cfg.tone]}>{cfg.label}</span></p>
                                    <div className="h-1 bg-muted/70 rounded-full overflow-hidden mt-2">
                                        <div className={cn('h-full', TONE_BAR[cfg.tone])} style={{ width: `${c.total ? Math.round((c.passed / c.total) * 100) : (s.status === 'completed' ? 100 : 0)}%` }} />
                                    </div>
                                    {c.failed > 0 && <p className="text-[10px] text-destructive mt-1.5">{c.failed} failed</p>}
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* ── ACTIVITY ── */}
            {tab === 'activity' && (
                <Section title="Activity timeline">
                    {loadError.timeline ? (
                        <InlineLoadError message="We couldn't load the activity timeline." onRetry={() => fetchData()} />
                    ) : (
                        <div className="max-h-[64vh] overflow-y-auto pr-1">
                            <ActivityFeed items={activity} />
                        </div>
                    )}
                </Section>
            )}

            <ConversationDrawer open={convoOpen} onOpenChange={setConvoOpen} requestId={requestId!} onCompose={() => { setConvoOpen(false); setComposeOpen(true); }} />
            <MissingInfoEmailModal open={composeOpen} onOpenChange={setComposeOpen} requestId={requestId!} companyName={request.company_name} brokerEmail={listItem.brokerEmail} missingDocuments={missingDocs.map(d => d.doc_type as DocumentType)} onMarkAsSent={() => fetchData(true)} />
            <NotifyBrokerDialog open={notifyOpen} onOpenChange={setNotifyOpen} requestId={requestId!} />

            {/* One decision flow for approve / reject / send-to-insurer. Approve is
                readiness-gated: when there are open blockers (or readiness couldn't
                load) the user must enter a reason AND tick an override box, and that
                reason is saved to the audit trail. */}
            <DecisionModal
                open={decisionAction !== null}
                action={decisionAction ?? 'approve'}
                companyName={request.company_name}
                description={decisionAction === 'publish' ? 'This sends the approved details to the insurer.' : approveDescription}
                reasonLabel={decisionAction === 'publish' ? 'Note (not recorded)' : undefined}
                warning={approveWarning}
                requireAcknowledge={approveNeedsOverride}
                acknowledgeLabel="Approve anyway — I take responsibility for this override."
                onCancel={() => setDecisionAction(null)}
                onConfirm={submitDecision}
            />

            {/* Styled, audit-logged risk dismissal (replaces window.prompt). A note
                is required, and the action is recorded — it can't be silently undone. */}
            <RiskDismissDialog target={dismissTarget} onCancel={() => setDismissTarget(null)} onConfirm={confirmDismiss} />

            {/* "Wrong file" warning surfaced right after upload. Default focus lands
                on the recommended fix ("Change to …"); the destructive "Remove file"
                is kept out of the primary-confirm slot. */}
            <AlertDialog open={!!classifierWarning} onOpenChange={(v) => { if (!v) setClassifierWarning(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>This may be the wrong document</AlertDialogTitle>
                        <AlertDialogDescription className="leading-relaxed">
                            {classifierWarning?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between sm:gap-2">
                        <Button
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
                            onClick={discardWrongUpload}
                            aria-label={`Remove the uploaded file${classifierWarning ? ` (${classifierWarning.claimedDocName})` : ''}`}
                        >
                            Remove file
                        </Button>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
                            <AlertDialogCancel onClick={keepAsIs}>
                                Keep as {classifierWarning?.claimedDocName}
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={acceptClassifierSuggestion}>
                                Change to {classifierWarning?.classifiedName}
                            </AlertDialogAction>
                        </div>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageShell>
    );
}

// Inline, plain-language load-failure notice with a Retry. Used wherever a
// partial fetch failure would otherwise render a misleading "all clear".
function InlineLoadError({ message, detail, onRetry }: { message: string; detail?: string; onRetry: () => void }) {
    return (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{detail ? `${detail} ` : ''}Check your connection and try again — nothing has been lost.</p>
            </div>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs shrink-0" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
            </Button>
        </div>
    );
}

// Styled note dialog for dismissing a risk. Confirm stays disabled until a note
// is entered (clear feedback instead of a silent no-op), and the note is saved
// to the audit trail.
function RiskDismissDialog({ target, onCancel, onConfirm }: { target: { id: number; label: string } | null; onCancel: () => void; onConfirm: (note: string) => Promise<void> | void }) {
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const noteId = useId();
    useEffect(() => { if (target) { setNote(''); setSubmitting(false); } }, [target]);
    const canConfirm = note.trim().length > 0 && !submitting;
    const handle = async () => {
        if (!canConfirm) return;
        setSubmitting(true);
        try { await onConfirm(note.trim()); } finally { setSubmitting(false); }
    };
    return (
        <Dialog open={!!target} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-warning" aria-hidden="true" /> Dismiss this risk
                    </DialogTitle>
                    <DialogDescription>
                        Mark this risk as reviewed. Add a short note explaining why it's safe to dismiss — it's saved to the audit trail and can't be silently undone.
                    </DialogDescription>
                </DialogHeader>
                {target && (
                    <div className="text-sm bg-muted/40 rounded-md px-3 py-2">
                        <span className="text-xs text-muted-foreground">Risk: </span>
                        <span className="font-medium">{target.label}</span>
                    </div>
                )}
                <div className="space-y-2 py-1">
                    <Label htmlFor={noteId} className="text-xs">Why are you dismissing this?</Label>
                    <Textarea
                        id={noteId}
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="e.g. Checked against the trade licence — the names refer to the same company."
                        className="text-sm resize-none"
                        autoFocus
                    />
                    {note.trim().length === 0 && (
                        <p className="text-[11px] text-muted-foreground">A note is required so the decision stays auditable.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
                    <Button onClick={handle} disabled={!canConfirm}>{submitting ? 'Saving…' : 'Dismiss risk'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

const pct = (v: number, t: number) => (t > 0 ? Math.round((v / t) * 100) : 0);

function Chip({ children, tone, dot }: { children: React.ReactNode; tone: 'destructive' | 'warning'; dot?: boolean }) {
    const cls = tone === 'destructive' ? 'text-destructive border-destructive/30 bg-destructive/10' : 'text-warning border-warning/30 bg-warning/10';
    return <span className={cn('inline-flex items-center gap-1 h-5 px-2 rounded-full border text-[10px] font-semibold uppercase tracking-wide', cls)}>{dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}{children}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
    return <span className="inline-flex items-center gap-1"><span className="text-muted-foreground/60">{label}</span><span className="text-foreground/80 font-medium truncate max-w-[160px]">{value}</span></span>;
}

function KpiCard({ icon: Icon, label, value, sub, subTone = 'muted', ring, ringTone = 'info', bar }: {
    icon: typeof Gauge; label: string; value: string; sub?: string; subTone?: 'destructive' | 'success' | 'muted'; ring?: number; ringTone?: 'success' | 'warning' | 'destructive' | 'info'; bar?: number;
}) {
    const subCls = subTone === 'destructive' ? 'text-destructive' : subTone === 'success' ? 'text-success' : 'text-muted-foreground';
    return (
        <div className="rounded-lg border border-border bg-card p-3.5 flex flex-col refined-in card-interactive">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] font-semibold uppercase tracking-widest truncate">{label}</span></div>
                    <p className="text-[22px] font-semibold tracking-tight text-foreground mt-1.5 tabular-nums font-display leading-none">{value}</p>
                </div>
                {ring !== undefined && <Ring pct={ring} tone={ringTone} />}
            </div>
            {bar !== undefined && (
                <div className="h-1 bg-muted/70 rounded-full overflow-hidden mt-2.5">
                    <div className={cn('h-full', bar === 100 ? 'bg-success' : bar >= 50 ? 'bg-info' : 'bg-warning')} style={{ width: `${bar}%` }} />
                </div>
            )}
            {sub && <p className={cn('text-[10.5px] mt-2 truncate', subCls)}>{sub}</p>}
        </div>
    );
}

function Ring({ pct, tone, size = 34, stroke = 4 }: { pct: number; tone: 'success' | 'warning' | 'destructive' | 'info'; size?: number; stroke?: number }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(100, pct) / 100) * circ;
    const stroke_ = tone === 'success' ? 'stroke-success' : tone === 'warning' ? 'stroke-warning' : tone === 'destructive' ? 'stroke-destructive' : 'stroke-info';
    return (
        <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} className="stroke-muted" strokeWidth={stroke} fill="none" />
                <circle cx={size / 2} cy={size / 2} r={r} className={cn(stroke_, 'transition-[stroke-dashoffset] duration-700')} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={circ} strokeDashoffset={offset} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums">{Math.round(pct)}</span>
        </div>
    );
}

function Tab({ id, tab, setTab, icon: Icon, count, children }: { id: TabKey; tab: TabKey; setTab: (t: TabKey) => void; icon: typeof Gauge; count?: number; children: React.ReactNode }) {
    const active = tab === id;
    return (
        <button onClick={() => setTab(id)} className={cn('focus-ring inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium border-b-2 -mb-px transition-colors', active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <Icon className="h-3.5 w-3.5" />{children}
            {count !== undefined && count > 0 && <span className={cn('text-[10px] tabular-nums px-1 rounded', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{count}</span>}
        </button>
    );
}

function Section({ title, action, right, children }: { title: string; action?: { label: string; onClick: () => void }; right?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-lg border border-border bg-card refined-in">
            <div className="flex items-center justify-between gap-2 px-4 h-11 border-b border-border">
                <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
                {right && <span className="text-[11px] text-muted-foreground">{right}</span>}
                {action && <button onClick={action.onClick} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">{action.label} <ArrowRight className="h-3 w-3" /></button>}
            </div>
            <div className="px-4 py-3">{children}</div>
        </div>
    );
}

function Empty({ icon: Icon, tone, children }: { icon: typeof Check; tone: 'success' | 'muted'; children: React.ReactNode }) {
    return <div className={cn('flex items-center gap-2 py-3 text-sm', tone === 'success' ? 'text-success' : 'text-muted-foreground')}><Icon className="h-4 w-4 shrink-0" />{children}</div>;
}

function StatusDot({ status }: { status: string }) {
    const ok = status === 'passed';
    const bad = status === 'failed' || status === 'error';
    const Icon = ok ? Check : bad ? X : Clock;
    const cls = ok ? 'text-success bg-success/10 border-success/30' : bad ? 'text-destructive bg-destructive/10 border-destructive/30' : 'text-muted-foreground border-border';
    return <span className={cn('flex items-center justify-center w-4 h-4 rounded-full border shrink-0 mt-0.5', cls)}><Icon className="h-2.5 w-2.5" /></span>;
}

function FilterPill({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
    return (
        <button onClick={onClick} className={cn('focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors', active ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>
            {children}<span className="text-[10px] tabular-nums opacity-70">{count}</span>
        </button>
    );
}

function DocUploadRow({ label, required, failed, uploading, onSelect, wide }: { label: string; required?: boolean; failed?: boolean; uploading: boolean; onSelect: (f: File) => void; wide?: boolean }) {
    const ref = useRef<HTMLInputElement>(null);
    return (
        <div className={cn('flex items-center justify-between gap-2', wide ? 'py-2.5' : 'py-1.5')}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', failed ? 'bg-destructive' : required ? 'bg-warning' : 'bg-muted-foreground/40')} />
                <span className="text-sm text-foreground truncate">{label}</span>
                {required && <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 h-4 bg-destructive/5 text-destructive border-destructive/20 shrink-0">Req</Badge>}
            </div>
            <input ref={ref} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ''; }} />
            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1 shrink-0" onClick={() => ref.current?.click()} disabled={uploading} aria-label={`Upload ${label}`}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Upload className="h-3 w-3" aria-hidden="true" />} Upload
            </Button>
        </div>
    );
}

function MappedRow({ doc, onReplace }: { doc: any; onReplace?: (docId: string, docTypeLabel: string, file: File) => void }) {
    const label = DOCUMENT_TYPE_LABELS[doc.doc_type as DocumentType] || doc.doc_type;
    const fileName = (doc.file_url || doc.file || '').split('/').pop()?.split('?')[0] || 'attachment';
    const status = doc.status || 'uploaded';
    const cls = status === 'processed' ? 'bg-success/10 text-success border-success/30' : status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-muted text-muted-foreground border-border';
    // Route preview through the BE proxy so missing files show a friendly 404
    // page instead of raw S3 XML, and CORS isn't a concern.
    const previewHref = doc.id ? `${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')}/documents/files/${doc.id}/stream/` : (doc.file_url || doc.file);
    const replaceInputId = `replace-${doc.id}`;
    return (
        <div className="flex items-center gap-3 py-2.5">
            <FileCheck className="h-3.5 w-3.5 text-success shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="text-sm font-medium text-foreground truncate">{label}</p><Badge variant="outline" className={cn('text-[10px] h-4 px-1.5 capitalize', cls)}>{status}</Badge></div>
                <p className="text-[11px] text-muted-foreground truncate font-mono">{fileName}</p>
            </div>
            {onReplace && (
                <>
                    <input
                        id={replaceInputId}
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onReplace(String(doc.id), label, f);
                            e.target.value = '';
                        }}
                    />
                    <label
                        htmlFor={replaceInputId}
                        className="shrink-0 h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-within:ring-2 focus-within:ring-ring/60"
                        title="Upload a new file in place of the current one"
                        aria-label={`Replace the file for ${label}`}
                    >
                        <Upload className="h-3 w-3" aria-hidden="true" />
                        Replace
                    </label>
                </>
            )}
            {previewHref && <a href={previewHref} target="_blank" rel="noreferrer" aria-label={`Open ${label} in a new tab`} className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-ring"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
        </div>
    );
}

function UnmappedRow({ doc, options, busy, onRemap, onReplace }: { doc: any; options: Array<{ value: string; label: string }>; busy: boolean; onRemap: (docType: string) => void; onReplace?: (docId: string, docTypeLabel: string, file: File) => void }) {
    // Bump on each attempt to remount the (uncontrolled) Select, so re-picking the SAME
    // type after a failed remap still fires onValueChange and retries the PATCH.
    const [nonce, setNonce] = useState(0);
    const fileName = (doc.file_url || doc.file || '').split('/').pop()?.split('?')[0] || 'attachment';
    const current = doc.doc_type && doc.doc_type !== 'other' ? (DOCUMENT_TYPE_LABELS[doc.doc_type as DocumentType] || doc.doc_type) : 'Needs a type';
    const previewHref = doc.id ? `${(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')}/documents/files/${doc.id}/stream/` : (doc.file_url || doc.file);
    const replaceInputId = `replace-unmapped-${doc.id}`;
    return (
        <div className="flex items-center gap-3 py-2.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate font-mono">{fileName}</p>
                <Badge variant="warning" className="text-[10px] h-4 px-1.5 shrink-0">{current}</Badge>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <Select key={nonce} disabled={busy || options.length === 0} onValueChange={(v) => { onRemap(v); setNonce((n) => n + 1); }}>
                    <SelectTrigger className="h-7 w-[150px] sm:w-[190px] px-2 text-xs" aria-label={`Set the document type for ${fileName}`}>
                        {busy ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Setting type…</span> : <SelectValue placeholder="Set the type" />}
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                {onReplace && (
                    <>
                        <input
                            id={replaceInputId}
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) onReplace(String(doc.id), current, f);
                                e.target.value = '';
                            }}
                        />
                        <label
                            htmlFor={replaceInputId}
                            className="shrink-0 h-7 px-2 inline-flex items-center gap-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus-within:ring-2 focus-within:ring-ring/60"
                            title="Upload a new file in place of the current one"
                            aria-label={`Replace the file ${fileName}`}
                        >
                            <Upload className="h-3 w-3" aria-hidden="true" />
                            Replace
                        </label>
                    </>
                )}
                {previewHref && <a href={previewHref} target="_blank" rel="noreferrer" aria-label={`Open ${fileName} in a new tab`} className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted focus-ring"><ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a>}
            </div>
        </div>
    );
}

function RiskItemRow({ r, onDismiss, onReview }: { r: { id: number; severity: string; title: string; description: string; flag_type: string; document_type: string | null }; onDismiss: () => void; onReview: () => void }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <SeverityBadge sev={r.severity} />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                {r.flag_type && <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 mt-1">{r.flag_type.replace(/_/g, ' ')}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onDismiss}>Dismiss</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onReview}>Review in workbench <ArrowRight className="h-3 w-3" aria-hidden="true" /></Button>
            </div>
        </div>
    );
}

function GroupedRiskRow({ label, items, onReview, onDismiss }: { label: string; items: Array<{ id: number; severity: string; title: string; description: string; flag_type: string; document_type: string | null }>; onReview: () => void; onDismiss: (id: number, label: string) => void }) {
    const [open, setOpen] = useState(false);
    const severity = items[0].severity;
    const sample = items[0].description || items[0].title;
    const shown = items.slice(0, 30);
    return (
        <div>
            <div className="flex items-start gap-3 py-3">
                <SeverityBadge sev={severity} />
                <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="focus-ring rounded min-w-0 flex-1 text-left">
                    <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />}
                        {items.length} {label}
                    </p>
                    {sample && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 pl-5">e.g. {sample}</p>}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1 pl-5">{open ? 'Collapse' : 'Show all'}</p>
                </button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0" onClick={onReview}>Review in workbench <ArrowRight className="h-3 w-3" aria-hidden="true" /></Button>
            </div>
            {open && (
                <div className="ml-2 pl-4 border-l border-border divide-y divide-border/60">
                    {shown.map(r => <RiskItemRow key={r.id} r={r} onDismiss={() => onDismiss(r.id, r.title)} onReview={onReview} />)}
                    {items.length > shown.length && (
                        <p className="text-xs text-muted-foreground py-2.5">+{items.length - shown.length} more — open the workbench to review the full list.</p>
                    )}
                </div>
            )}
        </div>
    );
}

function ActivityFeed({ items, compact }: { items: Array<{ id: string; icon: typeof Check; tone: string; title: string; description?: string; actor?: string; at: Date }>; compact?: boolean }) {
    if (items.length === 0) return <Empty icon={ActivityIcon} tone="muted">No activity yet.</Empty>;
    return (
        <div className="space-y-0">
            {items.map((e, i) => {
                const Icon = e.icon;
                return (
                    <div key={e.id} className="flex gap-3 relative">
                        <div className="flex flex-col items-center">
                            <span className={cn('flex items-center justify-center w-6 h-6 rounded-full border shrink-0 bg-card',
                                TONE_TEXT[e.tone] || 'text-muted-foreground',
                                e.tone === 'destructive' && 'border-destructive/30',
                                e.tone === 'success' && 'border-success/30',
                                e.tone === 'info' && 'border-info/30',
                                e.tone === 'warning' && 'border-warning/30',
                                (!e.tone || e.tone === 'muted') && 'border-border')}>
                              <Icon className="h-3 w-3" />
                            </span>
                            {i < items.length - 1 && <span className="w-px flex-1 bg-border my-1" />}
                        </div>
                        <div className={cn('min-w-0 flex-1', compact ? 'pb-3' : 'pb-4')}>
                            <p className="text-[13px] font-medium text-foreground" title={e.title}>{e.title}</p>
                            {e.description && (
                                <p className="text-[12px] text-muted-foreground mt-0.5 break-words leading-snug" title={e.description}>
                                    {e.description}
                                </p>
                            )}
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                {e.actor ? `${e.actor} · ` : ''}{format(e.at, 'dd MMM yyyy · HH:mm')}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Detail({ k, v, mono, tone }: { k: string; v: string; mono?: boolean; tone?: 'destructive' }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={cn('font-medium text-right truncate', mono && 'font-mono text-[11px]', tone === 'destructive' ? 'text-destructive' : 'text-foreground')}>{v}</dd>
        </div>
    );
}
