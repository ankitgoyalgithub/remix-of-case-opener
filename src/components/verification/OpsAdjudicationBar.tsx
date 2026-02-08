import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { OverallDecision } from '@/types/verificationChecks';
import { Check, X, Mail, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OpsAdjudicationBarProps {
  visible: boolean;
  decision: OverallDecision;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestMissingInfo: () => void;
}

export function OpsAdjudicationBar({
  visible,
  decision,
  onApprove,
  onReject,
  onRequestMissingInfo,
}: OpsAdjudicationBarProps) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  if (!visible) return null;

  const isBlocked = decision === 'blocked';
  const needsOverride = decision === 'requires-review';

  const handleApproveClick = () => {
    if (needsOverride) {
      setOverrideOpen(true);
    } else {
      onApprove();
    }
  };

  const handleOverrideApprove = () => {
    if (!overrideReason.trim()) return;
    onApprove();
    setOverrideOpen(false);
    setOverrideReason('');
    toast.success('Request approved with override', {
      description: 'Override reason logged to timeline',
    });
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    onReject(rejectReason.trim());
    setRejectOpen(false);
    setRejectReason('');
  };

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t-2 border-border bg-card/95 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Ops Adjudication</span>
            {isBlocked && (
              <span className="text-xs text-destructive font-medium ml-2">
                — Hard stop active. Approval blocked.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={onRequestMissingInfo}
            >
              <Mail className="h-3.5 w-3.5" />
              Request Missing Info
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setRejectOpen(true)}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>

            <Button
              size="sm"
              className={cn(
                'gap-1.5',
                isBlocked && 'opacity-50 cursor-not-allowed'
              )}
              disabled={isBlocked}
              onClick={handleApproveClick}
            >
              <Check className="h-3.5 w-3.5" />
              {needsOverride ? 'Approve with Override' : 'Approve'}
            </Button>
          </div>
        </div>
      </div>

      {/* Override Reason Modal */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Override Reason Required</DialogTitle>
            <DialogDescription>
              This request has items requiring review. Please provide a reason for approving despite outstanding review items.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="override-reason">Reason for Override</Label>
            <Textarea
              id="override-reason"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this approval is safe despite review flags..."
              className="mt-1.5 min-h-[100px]"
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleOverrideApprove} disabled={!overrideReason.trim()}>
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Reason Modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this request. This will be logged in the timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-reason">Reason for Rejection</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Specify the rejection reason..."
              className="mt-1.5 min-h-[100px]"
              maxLength={1000}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
