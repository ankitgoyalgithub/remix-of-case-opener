import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  onSent?: () => void;
}

interface Draft {
  to: string;
  subject: string;
  body: string;
  account_email: string;
  has_account: boolean;
  needs_reconnect?: boolean;
  risk_count: number;
  missing_doc_count: number;
}

export function NotifyBrokerDialog({ open, onOpenChange, requestId, onSent }: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDraft(null);
    api.requests.notifyBrokerDraft(requestId)
      .then((d: any) => {
        setDraft(d);
        setTo(d.to || '');
        setSubject(d.subject || '');
        setBody(d.body || '');
      })
      .catch((err: any) => {
        toast.error(err?.message || 'Failed to prepare the email draft');
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, requestId]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      toast.error('Recipient, subject and body are all required.');
      return;
    }
    setSending(true);
    try {
      await api.requests.notifyBroker(requestId, { to: to.trim(), subject: subject.trim(), body });
      toast.success('Email sent to broker.');
      onSent?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send the email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-left text-base">Notify broker</DialogTitle>
          <p className="text-[11px] text-muted-foreground">
            Sends from the connected Gmail mailbox{draft?.account_email ? ` (${draft.account_email})` : ''}.
            Review and edit before sending.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading && (
            <div className="flex items-center gap-2 py-12 justify-center text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing draft…
            </div>
          )}

          {!loading && draft && !draft.has_account && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 flex gap-2.5">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-foreground">No connected mailbox</p>
                <p className="text-muted-foreground mt-1">
                  Connect a Gmail account in <strong>Studio → Integrations</strong> first.
                  The dialog will let you draft, but Send will fail until then.
                </p>
              </div>
            </div>
          )}

          {!loading && draft && draft.has_account && draft.needs_reconnect && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex gap-2.5">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed flex-1">
                <p className="font-medium text-foreground">Mailbox needs to be reconnected</p>
                <p className="text-muted-foreground mt-1">
                  <strong>{draft.account_email}</strong> was connected before send-email support was
                  added, so the OAuth grant is missing the <code className="text-[10px] px-1 rounded bg-muted">gmail.send</code> scope.
                  Reconnect once to allow outbound mail — Send will fail until then.
                </p>
                <a
                  href="/studio/integrations"
                  className="inline-flex items-center mt-1.5 text-destructive hover:underline font-medium"
                >
                  Open Studio → Integrations →
                </a>
              </div>
            </div>
          )}

          {!loading && draft && (draft.risk_count > 0 || draft.missing_doc_count > 0) && (
            <p className="text-[11px] text-muted-foreground">
              Bundled <strong>{draft.risk_count}</strong> open risk{draft.risk_count === 1 ? '' : 's'}
              {' and '}
              <strong>{draft.missing_doc_count}</strong> missing document{draft.missing_doc_count === 1 ? '' : 's'}.
            </p>
          )}

          {!loading && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">To</Label>
                <Input
                  type="email"
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  placeholder="broker@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subject</Label>
                <Input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Body</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={18}
                  className="text-sm font-mono leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground">Plain text. Edit freely before sending.</p>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={loading || sending || !to.trim() || !subject.trim() || !body.trim() || !!draft?.needs_reconnect || (draft ? !draft.has_account : false)}
            className="gap-1.5"
            title={draft?.needs_reconnect ? 'Reconnect the mailbox to grant the gmail.send scope' : undefined}
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
