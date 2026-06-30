import { useEffect, useId, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, Check, Loader2, Upload, FileWarning, Clock,
  RefreshCw, AlertTriangle, CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { severityMeta, type StatusIconName } from '@/lib/status';

interface MissingDoc { doc_type: string; name: string; category: string; description?: string }
interface RiskItem { severity: string; title: string; description: string }
interface FlaggedDoc {
  document_id: string;
  doc_type: string;
  doc_type_name: string;
  file_name: string;
  uploaded_at: string | null;
  risks: RiskItem[];
}
interface DocTypeOption { doc_type: string; name: string; category: string }
interface PortalData {
  request_id: string;
  smart_id: string;
  company_name: string;
  missing_documents: MissingDoc[];
  flagged_documents: FlaggedDoc[];
  doc_type_options: DocTypeOption[];
  expires_at: string;
}

// Non-colour cue for each severity, so the issue level is never carried by
// colour alone. Names come from the shared status helper.
const SEV_ICONS: Record<StatusIconName, typeof AlertTriangle> = {
  AlertTriangle, AlertCircle, Clock3: Clock, CheckCircle2: Check, CircleDot, ShieldAlert: AlertTriangle,
};

type ErrorKind = 'expired' | 'network';

export default function BrokerPortal() {
  const { token = '' } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [data, setData] = useState<PortalData | null>(null);

  // Per-row upload state
  const [uploading, setUploading] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setErrorKind(null);
    try {
      const res = await api.portal.summary(token);
      setData(res as PortalData);
    } catch (err: any) {
      // Never show the broker the raw technical reason — log it, then decide
      // between "the link is no longer valid" and "something went wrong, retry".
      console.error('Broker portal: failed to load summary', err);
      const msg = String(err?.message || '');
      const transient = /failed to fetch|networkerror|load failed|timeout|api error: 5\d\d/i.test(msg);
      setErrorKind(transient ? 'network' : 'expired');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [token]);

  const handleUpload = async (key: string, file: File, docType: string, replacesId?: string) => {
    setUploading(key);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);
      if (replacesId) fd.append('replaces_document_id', replacesId);
      await api.portal.upload(token, fd);
      toast.success('Document uploaded.');
      await fetchSummary();
    } catch (err: any) {
      console.error('Broker portal: upload failed', err);
      toast.error("We couldn't upload that file. Please check your connection and try again.");
    } finally {
      setUploading(null);
    }
  };

  const expiresLabel = useMemo(() => {
    if (!data?.expires_at) return '';
    const d = new Date(data.expires_at);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }, [data?.expires_at]);

  // ── Loading / error states ───────────────────────────────────────
  if (loading) {
    return (
      <PortalShell>
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your request…
        </div>
      </PortalShell>
    );
  }

  if (errorKind === 'expired') {
    // The link itself is no longer usable — retry won't help, so guide recovery.
    return (
      <PortalShell>
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" aria-hidden />
          <h2 className="text-base font-semibold text-red-900">This link has expired</h2>
          <p className="text-sm text-red-700 mt-1">
            For your security, upload links stop working after a while or once your request is complete.
          </p>
          <p className="text-xs text-red-600/90 mt-3">
            Nothing is lost. Just ask your underwriter to send you a new link, and you can pick up where you left off.
          </p>
        </div>
      </PortalShell>
    );
  }

  if (errorKind === 'network' || !data) {
    // Transient: something went wrong fetching — a retry usually fixes it.
    return (
      <PortalShell>
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" aria-hidden />
          <h2 className="text-base font-semibold text-amber-900">We couldn't load your request</h2>
          <p className="text-sm text-amber-800 mt-1">
            This is usually a brief connection problem, not a problem with your documents.
          </p>
          <p className="text-xs text-amber-700/90 mt-2">
            Please check your internet connection and try again.
          </p>
          <Button onClick={fetchSummary} size="sm" variant="outline" className="mt-4 gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Try again
          </Button>
        </div>
      </PortalShell>
    );
  }

  const nothingToDo = data.missing_documents.length === 0 && data.flagged_documents.length === 0;

  return (
    <PortalShell>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Broker portal</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">{data.company_name || 'Insurance request'}</h1>
        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span>Reference</span>
          <span className="font-mono text-slate-700">{data.smart_id}</span>
          {expiresLabel && (
            <>
              <span aria-hidden>·</span>
              <Clock className="h-3 w-3" aria-hidden />
              <span>Link valid until {expiresLabel}</span>
            </>
          )}
        </div>
      </div>

      {nothingToDo && (
        <Card className="p-6 text-center mb-6">
          <Check className="h-8 w-8 text-emerald-600 mx-auto mb-2" aria-hidden />
          <h2 className="text-base font-semibold text-slate-900">Nothing to upload right now</h2>
          <p className="text-sm text-slate-600 mt-1">
            We have everything we need for now, and there are no open issues.
            You can still upload another document below if your underwriter asked for one.
          </p>
        </Card>
      )}

      {/* Missing documents */}
      {data.missing_documents.length > 0 && (
        <section className="mb-7">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Documents we still need
            <span className="ml-2 text-xs font-medium text-slate-500">
              {data.missing_documents.length} to upload
            </span>
          </h2>
          <div className="space-y-2">
            {data.missing_documents.map((d) => (
              <UploadRow
                key={d.doc_type}
                label={d.name}
                hint={d.description}
                kind="missing"
                accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                busy={uploading === d.doc_type}
                onUpload={(file) => handleUpload(d.doc_type, file, d.doc_type)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Documents with issues */}
      {data.flagged_documents.length > 0 && (
        <section className="mb-7">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Documents that need a fix
            <span className="ml-2 text-xs font-medium text-slate-500">
              {data.flagged_documents.length}
            </span>
          </h2>
          <div className="space-y-3">
            {data.flagged_documents.map((d) => (
              <Card key={d.document_id} className="p-4">
                <div className="flex items-start gap-3">
                  <FileWarning className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{d.doc_type_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate" title={d.file_name}>
                        {d.file_name || 'uploaded file'}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {d.risks.map((r, idx) => {
                        const sev = severityMeta(r.severity);
                        const SevIcon = sev.icon ? SEV_ICONS[sev.icon] : null;
                        return (
                          <li key={idx} className="flex items-start gap-2 text-xs">
                            <Badge variant={sev.variant} className="shrink-0 gap-1">
                              {SevIcon && <SevIcon className="h-2.5 w-2.5" aria-hidden />}
                              {sev.label}
                            </Badge>
                            <span className="text-slate-700 leading-relaxed">
                              <strong className="text-slate-900">{r.title}.</strong>{' '}
                              {r.description}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-3">
                      <UploadRow
                        kind="replace"
                        label="Upload a corrected version"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                        busy={uploading === d.document_id}
                        onUpload={(file) => handleUpload(d.document_id, file, d.doc_type, d.document_id)}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Catch-all upload */}
      <section className="mb-7">
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Upload another document</h2>
        <p className="text-xs text-slate-500 mb-2">
          If your underwriter asked for a document that isn't listed above, choose its type and upload it here.
        </p>
        <FreeformUpload
          options={data.doc_type_options}
          busy={uploading === '__free__'}
          onUpload={(file, dt) => handleUpload('__free__', file, dt)}
        />
      </section>

    </PortalShell>
  );
}


// ── Layout shell ────────────────────────────────────────────────────
function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {children}
        <p className="text-center text-[11px] text-slate-400 mt-10">
          Secure broker portal · This link is unique to your request and will expire automatically.
        </p>
      </div>
    </div>
  );
}


// ── Upload row used by the missing-docs and replace-flagged-doc cases ──
function UploadRow({
  label, hint, kind, accept, busy, onUpload,
}: {
  label: string;
  hint?: string;
  kind: 'missing' | 'replace';
  accept: string;
  busy: boolean;
  onUpload: (file: File) => void;
}) {
  const inputId = useId();
  return (
    <Card className={cn('p-3 flex items-center gap-3', kind === 'missing' && 'bg-white')}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 truncate" title={label}>{label}</p>
        {hint && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1" title={hint}>{hint}</p>}
      </div>
      <input
        id={inputId}
        type="file"
        className="hidden"
        accept={accept}
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = '';
        }}
      />
      <Button
        asChild
        size="sm"
        variant={kind === 'missing' ? 'default' : 'outline'}
        className="gap-1.5 shrink-0"
        disabled={busy}
      >
        <label htmlFor={inputId} className={cn(busy ? 'pointer-events-none opacity-70' : 'cursor-pointer')}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
          {kind === 'missing' ? 'Upload' : 'Upload fix'}
        </label>
      </Button>
    </Card>
  );
}


function FreeformUpload({
  options, busy, onUpload,
}: {
  options: DocTypeOption[];
  busy: boolean;
  onUpload: (file: File, docType: string) => void;
}) {
  const [docType, setDocType] = useState<string>('');
  const inputId = useId();
  const selectId = useId();
  return (
    <Card className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <Label htmlFor={selectId} className="sr-only">Document type</Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger id={selectId} aria-label="Document type" className="h-9 text-sm w-full sm:w-[260px]">
            <SelectValue placeholder="Choose the document type" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {options.map((o) => (
              <SelectItem key={o.doc_type} value={o.doc_type}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <input
        id={inputId}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
        disabled={busy || !docType}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && docType) onUpload(f, docType);
          e.target.value = '';
        }}
      />
      <Button asChild size="sm" className="gap-1.5 shrink-0" disabled={busy || !docType}>
        <label htmlFor={inputId} className={cn((busy || !docType) ? 'pointer-events-none opacity-70' : 'cursor-pointer')}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="h-3.5 w-3.5" aria-hidden />}
          Upload
        </label>
      </Button>
    </Card>
  );
}
