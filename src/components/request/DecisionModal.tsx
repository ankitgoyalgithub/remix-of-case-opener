import { useEffect, useId, useState, type ReactNode } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Check, X, Send, AlertTriangle } from 'lucide-react';

/**
 * The single, reusable decision component for the whole app. Use it for every
 * approve / reject / "send to insurer" confirmation — Inbox (row + bulk),
 * Summary and Workbench — instead of `window.prompt` / `window.confirm` or a
 * bespoke dialog. A reason is logged to the audit trail.
 */
export type DecisionAction = 'approve' | 'reject' | 'publish';

interface ActionDefaults {
    title: string;
    description: string;
    confirmLabel: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    buttonVariant: 'success' | 'destructive' | 'primary';
    icon: ReactNode;
    /** Whether a reason is required by default for this action. */
    reasonRequired: boolean;
}

const ACTION_DEFAULTS: Record<DecisionAction, ActionDefaults> = {
    approve: {
        title: 'Approve request',
        description: 'Approving lets this request move forward. Your reason is saved to the audit trail.',
        confirmLabel: 'Approve',
        reasonLabel: 'Reason',
        reasonPlaceholder:
            'e.g. All required documents received, no open risk flags, background check clean.',
        buttonVariant: 'success',
        icon: <Check className="h-4 w-4 text-success" />,
        reasonRequired: true,
    },
    reject: {
        title: 'Reject request',
        description: 'Rejecting closes this request with your reason. Your reason is saved to the audit trail.',
        confirmLabel: 'Reject',
        reasonLabel: 'Reason',
        reasonPlaceholder:
            'e.g. Trade licence and tax certificate name different companies; broker asked to resubmit.',
        buttonVariant: 'destructive',
        icon: <X className="h-4 w-4 text-destructive" />,
        reasonRequired: true,
    },
    publish: {
        title: 'Send to insurer',
        description: 'This sends the approved details to the insurer. A note is saved to the audit trail.',
        confirmLabel: 'Send to insurer',
        reasonLabel: 'Note (optional)',
        reasonPlaceholder: 'e.g. Sending the final, verified details to the insurer.',
        buttonVariant: 'primary',
        icon: <Send className="h-4 w-4 text-primary" />,
        reasonRequired: false,
    },
};

interface DecisionModalProps {
    open: boolean;
    action: DecisionAction;
    /** Shown in a small "Request: …" context strip. */
    companyName?: string;
    /** Override the auto-generated title. */
    title?: string;
    /** Override the auto-generated description. */
    description?: string;
    /** Override the confirm button label. */
    confirmLabel?: string;
    /** Override the reason field label. */
    reasonLabel?: string;
    /** Override the reason textarea placeholder. */
    reasonPlaceholder?: string;
    /**
     * Whether the reason is mandatory. Defaults to REQUIRED for approve/reject
     * and OPTIONAL for publish. Pass `false` to make approve/reject optional, or
     * `true` to force a note on publish.
     */
    reasonRequired?: boolean;
    /**
     * Optional readiness warning shown above the reason field — e.g.
     * "2 critical risks are still open." Pass any node (text or JSX).
     */
    warning?: ReactNode;
    /**
     * When true (and `warning` is set), the user must tick an acknowledgement
     * box before confirm enables. Use when `warning` describes a blocking
     * condition the user is explicitly overriding.
     */
    requireAcknowledge?: boolean;
    /** Label for the acknowledgement checkbox. */
    acknowledgeLabel?: string;
    onCancel: () => void;
    onConfirm: (reason: string) => Promise<void> | void;
}

export function DecisionModal({
    open,
    action,
    companyName,
    title,
    description,
    confirmLabel,
    reasonLabel,
    reasonPlaceholder,
    reasonRequired,
    warning,
    requireAcknowledge = false,
    acknowledgeLabel = 'I understand and want to continue.',
    onCancel,
    onConfirm,
}: DecisionModalProps) {
    const [reason, setReason] = useState('');
    const [acknowledged, setAcknowledged] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const reasonId = useId();
    const ackId = useId();

    useEffect(() => {
        if (open) {
            setReason('');
            setAcknowledged(false);
        }
    }, [open, action]);

    const defaults = ACTION_DEFAULTS[action];
    const isReasonRequired = reasonRequired ?? defaults.reasonRequired;
    const showAcknowledge = !!warning && requireAcknowledge;

    const reasonOk = !isReasonRequired || reason.trim().length > 0;
    const ackOk = !showAcknowledge || acknowledged;
    const canConfirm = reasonOk && ackOk && !submitting;

    const handleConfirm = async () => {
        if (!canConfirm) return;
        setSubmitting(true);
        try {
            await onConfirm(reason.trim());
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {defaults.icon}
                        {title ?? defaults.title}
                    </DialogTitle>
                    <DialogDescription>{description ?? defaults.description}</DialogDescription>
                </DialogHeader>

                {companyName && (
                    <div className="mt-1 text-sm bg-muted/40 rounded-md px-3 py-2">
                        <span className="text-xs text-muted-foreground">Request: </span>
                        <span className="font-medium">{companyName}</span>
                    </div>
                )}

                {warning && (
                    <div
                        role="alert"
                        className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
                    >
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 text-foreground">{warning}</div>
                    </div>
                )}

                <div className="space-y-2 py-2">
                    <Label htmlFor={reasonId} className="text-xs">
                        {reasonLabel ?? defaults.reasonLabel}
                    </Label>
                    <Textarea
                        id={reasonId}
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={reasonPlaceholder ?? defaults.reasonPlaceholder}
                        className="text-sm resize-none"
                        autoFocus
                    />
                </div>

                {showAcknowledge && (
                    <div className="flex items-start gap-2">
                        <Checkbox
                            id={ackId}
                            checked={acknowledged}
                            onCheckedChange={(v) => setAcknowledged(v === true)}
                            className="mt-0.5"
                        />
                        <Label htmlFor={ackId} className="text-sm font-normal leading-snug cursor-pointer">
                            {acknowledgeLabel}
                        </Label>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant={defaults.buttonVariant}
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                    >
                        {submitting ? 'Saving…' : confirmLabel ?? defaults.confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
