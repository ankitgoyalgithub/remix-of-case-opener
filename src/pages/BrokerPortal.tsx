import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertCircle, Check, Loader2, Upload, FileWarning, Send, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

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

const SEV_COLOR: Record<string, string> = {
  critical: 'bg-red-100 text-red-900 border-red-200',
  high: 'bg-red-50 text-red-700 border-red-100',
  medium: 'bg-amber-50 text-amber-800 border-amber-100',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
};

export default function BrokerPortal() {
  const { token = '' } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);

  // Per-row upload state
  const [uploading, setUploading] = useState<string | null>(null);

  // Reply box
  const [note, setNote] = useState('');
  const [noteEmail, setNoteEmail] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.portal.summary(token);
      setData(res as PortalData);
    } catch (err: any) {
      setError(err?.message || 'This link is invalid or has expired.');
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
      toast.error(err?.message || 'Upload failed.');
    } finally {
      setUploading(null);
    }
  };

  const submitNote = async () => {
    if (!note.trim()) { toast.error('Write a message first.'); return; }
    setSendingNote(true);
    try {
      await api.portal.note(token, { body: note.trim(), from_address: noteEmail.trim() });
      toast.success('Message sent.');
      setNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send the message.');
    } finally {
      setSendingNote(false);
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
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </PortalShell>
    );
  }
  if (error || !data) {
    return (
      <PortalShell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-red-900">Link unavailable</h2>
          <p className="text-sm text-red-700 mt-1">{error || 'This link is invalid or has expired.'}</p>
          <p className="text-xs text-red-600/80 mt-3">Please contact your underwriting team for a new link.</p>
        </div>
      </PortalShell>
    );
  }

  const nothingToDo = data.missing_documents.length === 0 && data.flagged_documents.length === 0;

  return (
    <PortalShell>
      {/* Header */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">Broker Portal</p>
        <h1 className="text-xl font-semibold text-slate-900 mt-0.5">{data.company_name || 'Insurance request'}</h1>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
          <span className="font-mono">{data.smart_id}</span>
          <span>·</span>
          <Clock className="h-3 w-3" />
          <span>Link valid until {expiresLabel}</span>
        </div>
      </div>

      {nothingToDo && (
        <Card className="p-6 text-center mb-6">
          <Check className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
          <h2 className="text-base font-semibold text-slate-900">Nothing to upload right now</h2>
          <p className="text-sm text-slate-600 mt-1">
            All required documents have been received and no issues are open.
            You can still send a message below if you need to.
          </p>
        </Card>
      )}

      {/* Missing documents */}
      {data.missing_documents.length > 0 && (
        <section className="mb-7">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Missing documents
            <span className="ml-2 text-xs font-medium text-slate-500">
              {data.missing_documents.length} required
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
            Documents with issues
            <span className="ml-2 text-xs font-medium text-slate-500">
              {data.flagged_documents.length}
            </span>
          </h2>
          <div className="space-y-3">
            {data.flagged_documents.map((d) => (
              <Card key={d.document_id} className="p-4">
                <div className="flex items-start gap-3">
                  <FileWarning className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{d.doc_type_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate" title={d.file_name}>
                        {d.file_name || 'uploaded file'}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {d.risks.map((r, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs">
                          <span className={cn('shrink-0 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border text-[10px]', SEV_COLOR[r.severity] || SEV_COLOR.info)}>
                            {r.severity}
                          </span>
                          <span className="text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">{r.title}.</strong>{' '}
                            {r.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <UploadRow
                        kind="replace"
                        label="Replace this document"
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
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Upload something else</h2>
        <p className="text-xs text-slate-500 mb-2">If your underwriter asked for another document type, you can upload it here.</p>
        <FreeformUpload
          options={data.doc_type_options}
          busy={uploading === '__free__'}
          onUpload={(file, dt) => handleUpload('__free__', file, dt)}
        />
      </section>

      {/* Reply */}
      <section>
        <h2 className="text-sm font-semibold text-slate-900 mb-2">Reply to the underwriting team</h2>
        <Card className="p-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Your email (optional)</Label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={noteEmail}
              onChange={(e) => setNoteEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-700">Message</Label>
            <Textarea
              rows={5}
              placeholder="Add a note for the underwriting team…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={submitNote} disabled={!note.trim() || sendingNote} className="gap-1.5">
              {sendingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send message
            </Button>
          </div>
        </Card>
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
  const inputId = `upload-${Math.random().toString(36).slice(2, 9)}`;
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
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {kind === 'missing' ? 'Upload' : 'Replace file'}
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
  const inputId = 'upload-free';
  return (
    <Card className="p-3 flex items-center gap-3">
      <Select value={docType} onValueChange={setDocType}>
        <SelectTrigger className="h-9 text-sm w-full sm:w-[260px]">
          <SelectValue placeholder="Pick a document type" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => (
            <SelectItem key={o.doc_type} value={o.doc_type}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </label>
      </Button>
    </Card>
  );
}
