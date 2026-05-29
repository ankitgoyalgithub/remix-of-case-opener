import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, UserPlus, Mail, Trash2, MoreHorizontal,
    AlertTriangle, Check, X, Send, ArrowRight, MessageSquare, ShieldAlert,
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
import { NotifyBrokerDialog } from './NotifyBrokerDialog';

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
  onEscalate?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPublish?: () => void;
  timelineDrawer?: ReactNode;
  openRiskCount?: number;
  onOpenConversation?: () => void;
}

// Map raw status string → semantic Badge variant. One badge system everywhere.
function badgeVariantForStatus(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'critical' {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'ready for export') return 'success';
  if (s === 'rejected') return 'critical';
  if (s === 'missing info') return 'warning';
  if (s === 'in review') return 'info';
  if (s === 'published' || s === 'issued') return 'info';
  return 'neutral';
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

  const slaText = slaRemaining > 0
    ? `${slaRemaining}h left`
    : slaRemaining === 0
    ? 'Due now'
    : `${Math.abs(slaRemaining)}h overdue`;

  const slaDotColor =
    slaStatus === 'red' ? 'bg-destructive' : slaStatus === 'amber' ? 'bg-warning' : 'bg-success';
  const slaTextColor =
    slaStatus === 'red' ? 'text-destructive font-medium' : slaStatus === 'amber' ? 'text-warning' : 'text-muted-foreground';

  const shortId = requestId?.startsWith('REQ-') ? requestId : requestId.split('-')[0];

  const statusLc = status.toLowerCase();
  const canApproveOrReject = !['approved', 'rejected', 'published', 'issued'].includes(statusLc);
  const canPublish = statusLc === 'approved';

  // Stage-aware "next action" hint — surfaced as a tiny pill before the buttons,
  // so the underwriter sees what to do next without scanning a row of buttons.
  const nextActionHint: { label: string; tone: 'critical' | 'warning' | 'info' | 'success' } | null = (() => {
    if (canPublish) return { label: 'Publish to insurer', tone: 'info' };
    if (statusLc === 'rejected' || statusLc === 'published' || statusLc === 'issued') return null;
    if (hasMissingDocuments) return { label: 'Request info from broker', tone: 'warning' };
    if (slaStatus === 'red') return { label: 'Triage — case overdue', tone: 'critical' };
    if (canApproveOrReject) return { label: 'Ready to adjudicate', tone: 'success' };
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
            <Badge variant={badgeVariantForStatus(status)}>{status}</Badge>
            {openRiskCount > 0 && (
              <Badge variant="critical" className="gap-1">
                <ShieldAlert className="h-2.5 w-2.5" />
                {openRiskCount} risk{openRiskCount === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-x-2.5 gap-y-1 flex-wrap mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{shortId}</span>
            <span className="text-border">·</span>
            <span className="truncate max-w-[180px]" title={brokerName}>{brokerName}</span>
            <span className="text-border">·</span>
            <span className="truncate" title={queue}>{queue}</span>
            <span className="text-border">·</span>
            <span className={owner === 'Unassigned' ? 'italic' : ''}>{owner || 'Unassigned'}</span>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full', slaDotColor)} />
              <span className={slaTextColor}>{slaText}</span>
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

          {/* Inline secondary action: surface "Request Info" only when blocked
              by missing docs — otherwise it lives in the overflow menu. */}
          {hasMissingDocuments && !canPublish && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onRequestMissingInfo}>
              <Mail className="h-3.5 w-3.5" />
              Request info
            </Button>
          )}

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
              Publish data
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
              {!hasMissingDocuments && (
                <DropdownMenuItem className="cursor-pointer text-sm" onClick={onRequestMissingInfo}>
                  <Mail className="h-3.5 w-3.5 mr-2" />
                  Request info from broker
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer text-sm"
                onClick={() => {
                  if (window.confirm('Delete this request? This cannot be undone.')) {
                    onDelete?.();
                  }
                }}
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
        requestId={requestId || routeRequestId || ''}
      />
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
