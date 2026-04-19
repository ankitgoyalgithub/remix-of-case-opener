import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';

interface BypassReasonModalProps {
  item: { id: string; label: string } | null;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function BypassReasonModal({ item, onCancel, onConfirm }: BypassReasonModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) setReason('');
  }, [item?.id]);

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <DialogTitle>Bypass failed check</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            This check failed automated validation. To mark it as done anyway, enter a short reason. The reason is logged against the request for audit.
          </DialogDescription>
        </DialogHeader>
        {item && (
          <div className="mt-2 text-sm text-foreground bg-muted/40 rounded-md px-3 py-2">
            <span className="text-xs text-muted-foreground">Check: </span>
            <span className="font-medium">{item.label}</span>
          </div>
        )}
        <div className="space-y-2 py-2">
          <Label htmlFor="bypass-reason" className="text-xs">Reason</Label>
          <Textarea
            id="bypass-reason"
            rows={4}
            placeholder="e.g. Broker confirmed the mismatch is a legal-name change; confirmation email attached."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-sm resize-none"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!reason.trim() || submitting}>
            {submitting ? 'Saving…' : 'Override & mark done'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
