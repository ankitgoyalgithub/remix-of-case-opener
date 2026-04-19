import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Mail, Trash2, MoreHorizontal, AlertTriangle, Check, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
}

const STATUS_STYLES: Record<string, string> = {
  'New': 'bg-muted text-foreground',
  'In Review': 'bg-info/10 text-info',
  'Missing Info': 'bg-warning/10 text-warning',
  'Ready for Export': 'bg-success/10 text-success',
  'Approved': 'bg-success/10 text-success',
  'Rejected': 'bg-destructive/10 text-destructive',
  'Published': 'bg-primary/10 text-primary',
  'Issued': 'bg-primary/10 text-primary',
};

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
  onAssignOwner,
  onRequestMissingInfo,
  onDelete,
  onApprove,
  onReject,
  onPublish,
  timelineDrawer,
}: RequestDetailHeaderProps) {
  const navigate = useNavigate();

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

  return (
    <div className="bg-background border-b border-border px-6 py-3 shrink-0">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 -ml-2"
          onClick={() => navigate('/requests')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Primary info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-foreground truncate">{companyName}</h1>
            {priority === 'Urgent' && (
              <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[11px] font-medium bg-destructive/10 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Urgent
              </span>
            )}
            <span className={cn('inline-flex items-center px-2 h-5 rounded text-[11px] font-medium', STATUS_STYLES[status] || 'bg-muted text-foreground')}>
              {status}
            </span>
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{shortId}</span>
            <span>·</span>
            <span>{brokerName}</span>
            <span>·</span>
            <span>{queue}</span>
            <span>·</span>
            <span className={owner === 'Unassigned' ? 'italic' : ''}>{owner || 'Unassigned'}</span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <span className={cn('inline-block w-1.5 h-1.5 rounded-full', slaDotColor)} />
              <span className={slaTextColor}>{slaText}</span>
            </span>
            <span>·</span>
            <span>{currentStage}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {timelineDrawer}
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onAssignOwner}>
            <UserPlus className="h-3.5 w-3.5" />
            Assign
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onRequestMissingInfo}>
            <Mail className="h-3.5 w-3.5" />
            Request Info
          </Button>

          {canApproveOrReject && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={onReject}
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-success hover:bg-success/90 text-white"
                onClick={onApprove}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
            </>
          )}

          {canPublish && (
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={onPublish}
            >
              <Send className="h-3.5 w-3.5" />
              Publish Data
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive text-sm"
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
    </div>
  );
}
