import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, UserPlus, Mail, Trash2, MoreHorizontal,
    AlertTriangle, Check, X, Send, ArrowRight, MessageSquare, ShieldAlert,
    Clock3, CheckCircle2, CircleDot,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ReactNode, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { requestStatusMeta, slaMeta, type StatusIconName } from '@/lib/status';
import { NotifyBrokerDialog } from './NotifyBrokerDialog';

// Non-colour cue icons for the SLA badge, looked up by the name `slaMeta` returns.
const SLA_ICONS: Record<StatusIconName, typeof AlertTriangle> = {
  AlertTriangle, Clock3, CheckCircle2, CircleDot,
  AlertCircle: AlertTriangle, ShieldAlert,
};

interface RequestDetailHeaderProps {
  requestId: string;
  companyName: string;
  brokerName: string;
  priority: 'Urgent' | 'Normal';
  slaRemaining: number;
  slaTargetHours: number;
  slaStatus: 'green' | 'amber' | 'red';
  currentStage: string;
  status: string;
  owner: string;
  queue: 'Senior Ops Queue' | 'Standard Ops Queue';
  hasMissingDocuments: boolean;
  onAssignOwner?: () => void;
  onRequestMissingInfo?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPublish?: () => void;
  timelineDrawer?: ReactNode;
  openRiskCount?: number;
  onOpenConversation?: () => void;
}

export function RequestDetailHeader({
  requestId,
  companyName,
  brokerName,
  priority,
  slaRemaining,
  slaStatus,
  currentStage,
  status,
  owner,
  queue,
  hasMissingDocuments,
  onAssignOwner,
  onRequestMissingInfo,
  onDelete,
  onApprove,
  onReject,
  onPublish,
  timelineDrawer,
  openRiskCount = 0,
  onOpenConversation,
}: RequestDetailHeaderProps) {
  const navigate = useNavigate();
  const { requestId: routeRequestId } = useParams();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const slaText = slaRemaining > 0
    ? `${slaRemaining}h left`
    : slaRemaining === 0
    ? 'Due now'
    : `${Math.abs(slaRemaining)}h overdue`;

  // Route deadline presentation through the shared helper so the icon (a non-colour
  // cue) and colour agree with the rest of the app.
  const sla = slaMeta(slaStatus);
  const SlaIcon = SLA_ICONS[sla.icon];
  const slaTextColor =
    slaStatus === 'red' ? 'text-destructive font-medium' : slaStatus === 'amber' ? 'text-warning' : 'text-muted-foreground';

  // One canonical, plain-language status label + variant everywhere.
  const statusMeta = requestStatusMeta(status);

  const shortId = requestId?.startsWith('REQ-') ? requestId : requestId.split('-')[0];

  const statusLc = status.toLowerCase();
  const canApproveOrReject = !['approved', 'rejected', 'published', 'issued'].includes(statusLc);
  const canPublish = statusLc === 'approved';

  // Stage-aware "next action" hint — surfaced as a tiny pill before the buttons,
  // so the underwriter sees what to do next without scanning a row of buttons.
  const nextActionHint: { label: string; tone: 'critical' | 'warning' | 'info' | 'success' } | null = (() => {
    if (canPublish) return { label: 'Send to insurer', tone: 'info' };
    if (statusLc === 'rejected' || statusLc === 'published' || statusLc === 'issued') return null;
    if (hasMissingDocuments) return { label: 'Ask broker for documents', tone: 'warning' };
    if (slaStatus === 'red') return { label: 'Overdue — needs attention', tone: 'critical' };
    if (canApproveOrReject) return { label: 'Ready to decide', tone: 'success' };
    return null;
  })();

  return (
    <div className="relative border-b border-border px-4 md:px-6 lg:px-8 py-3 shrink-0 bg-background">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 -ml-2"
          onClick={() => navigate(routeRequestId ? `/request/${routeRequestId}` : '/requests')}
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Primary info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[17px] font-semibold text-foreground truncate tracking-tight" title={companyName}>{companyName}</h1>
            {priority === 'Urgent' && (
              <Badge variant="critical" className="gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Urgent
              </Badge>
            )}
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            {openRiskCount > 0 && (
              <Badge variant="critical" className="gap-1">
                <ShieldAlert className="h-2.5 w-2.5" />
                {openRiskCount} risk{openRiskCount === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{shortId}</span>
            {/* Broker name only renders when the backend actually supplies one. */}
            {brokerName && (
              <>
                <span className="text-border">·</span>
                <span className="truncate max-w-[180px]" title={brokerName}>{brokerName}</span>
              </>
            )}
            <span className="text-border">·</span>
            <span className="truncate" title={queue}>{queue}</span>
            <span className="text-border">·</span>
            <span className={owner ? '' : 'italic'}>{owner || 'Unassigned'}</span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <SlaIcon className={cn('h-3 w-3 shrink-0', slaTextColor)} aria-hidden="true" />
              <span className={slaTextColor}>{slaText}</span>
              <span className="sr-only">({sla.label})</span>
            </span>
            <span className="text-border">·</span>
            <span>{currentStage}</span>
          </div>
        </div>

        {/* Next-action hint — small, calm, scannable */}
        {nextActionHint && (
          <NextHint label={nextActionHint.label} tone={nextActionHint.tone} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenConversation && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenConversation}>
              <MessageSquare className="h-3.5 w-3.5" />
              Conversation
            </Button>
          )}

          {/* Notify broker — sends a real email (HTML body + broker portal link).
              `default` variant when there's something to convey, `outline` otherwise. */}
          <Button
            variant={hasMissingDocuments || openRiskCount > 0 ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setNotifyOpen(true)}
            title="Email the broker the open risks + missing documents with a portal link"
          >
            <Mail className="h-3.5 w-3.5" />
            Notify broker
          </Button>
          {timelineDrawer}

          {canApproveOrReject && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={onReject}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                variant="success"
                size="sm"
                className="gap-1.5"
                onClick={onApprove}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
            </>
          )}

          {canPublish && (
            <Button size="sm" className="gap-1.5" onClick={onPublish}>
              <Send className="h-3.5 w-3.5" />
              Send to insurer
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Overflow menu — everything that's not the primary path */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="cursor-pointer text-sm" onClick={onAssignOwner}>
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                Assign owner
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer text-sm"
                onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete request
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <NotifyBrokerDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        requestId={routeRequestId || requestId || ''}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes <span className="font-medium text-foreground">{companyName}</span> and its
              documents, checks and decision history. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep request</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete?.()}
            >
              Delete request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NextHint({
    label, tone,
}: {
    label: string;
    tone: 'critical' | 'warning' | 'info' | 'success';
}) {
    const map = {
        critical: 'border-destructive/30 bg-destructive/5 text-destructive',
        warning:  'border-warning/30 bg-warning/5 text-warning',
        info:     'border-info/30 bg-info/5 text-info',
        success:  'border-success/30 bg-success/5 text-success',
    }[tone];

    const dot = {
        critical: 'bg-destructive',
        warning:  'bg-warning',
        info:     'bg-info',
        success:  'bg-success',
    }[tone];

    return (
        <span className={cn('hidden lg:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11.5px] font-medium', map)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', dot)} />
            Next: {label}
        </span>
    );
}
