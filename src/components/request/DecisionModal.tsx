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
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DecisionAction = 'approve' | 'reject';

interface DecisionModalProps {
    open: boolean;
    action: DecisionAction;
    companyName?: string;
    onCancel: () => void;
    onConfirm: (comment: string) => Promise<void> | void;
}

export function DecisionModal({ open, action, companyName, onCancel, onConfirm }: DecisionModalProps) {
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) setComment('');
    }, [open, action]);

    const isApprove = action === 'approve';
    const title = isApprove ? 'Approve request' : 'Reject request';
    const description = isApprove
        ? 'Approving will allow the request to be published to the core system. Your comment is logged for audit.'
        : 'Rejecting closes the request with your reason. Your comment is logged for audit.';
    const placeholder = isApprove
        ? 'e.g. All required documents verified, no blocking risk flags, entity screening clean.'
        : 'e.g. Trade licence and VAT certificate reference different entities; broker advised to resubmit.';

    const handleConfirm = async () => {
        const trimmed = comment.trim();
        if (!trimmed) return;
        setSubmitting(true);
        try {
            await onConfirm(trimmed);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isApprove ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-destructive" />}
                        {title}
                    </DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                {companyName && (
                    <div className="mt-1 text-sm bg-muted/40 rounded-md px-3 py-2">
                        <span className="text-xs text-muted-foreground">Request: </span>
                        <span className="font-medium">{companyName}</span>
                    </div>
                )}
                <div className="space-y-2 py-2">
                    <Label htmlFor="decision-comment" className="text-xs">Comment</Label>
                    <Textarea
                        id="decision-comment"
                        rows={4}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={placeholder}
                        className="text-sm resize-none"
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!comment.trim() || submitting}
                        className={cn(isApprove ? '' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground')}
                    >
                        {submitting ? 'Saving…' : isApprove ? 'Approve' : 'Reject'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
