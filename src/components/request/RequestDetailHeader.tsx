import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Hash, Clock, User, ArrowLeft, UserPlus, AlertCircle, ArrowUpRight, Users, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

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
  timelineDrawer?: ReactNode;
}

export function RequestDetailHeader({
  requestId,
  companyName,
  brokerName,
  priority,
  slaRemaining,
  slaTargetHours,
  slaStatus,
  currentStage,
  status,
  owner,
  queue,
  hasMissingDocuments,
  onAssignOwner,
  onRequestMissingInfo,
  onEscalate,
  onDelete,
  timelineDrawer,
}: RequestDetailHeaderProps) {
  const navigate = useNavigate();

  const getSlaDisplay = () => {
    if (slaRemaining > 0) return `${slaRemaining}h remaining`;
    if (slaRemaining === 0) return 'Due now';
    return `${Math.abs(slaRemaining)}h overdue`;
  };

  const getSlaColorClass = () => {
    switch (slaStatus) {
      case 'green': return 'bg-success/15 text-success border-success/30';
      case 'amber': return 'bg-warning/15 text-warning border-warning/30';
      case 'red': return 'bg-destructive/15 text-destructive border-destructive/30';
    }
  };

  const getPriorityBadge = () => {
    if (priority === 'Urgent') {
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20 transition-colors">Urgent</Badge>;
    }
    return <Badge variant="secondary" className="bg-secondary/50 border-border/50 text-secondary-foreground hover:bg-secondary/80 transition-colors">Normal</Badge>;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'Missing Info':
        return <Badge className="bg-warning/15 text-warning border-warning/30">{status}</Badge>;
      case 'Ready for Export':
        return <Badge className="bg-success/15 text-success border-success/30">{status}</Badge>;
      case 'Issued':
        return <Badge className="bg-primary/15 text-primary border-primary/30">{status}</Badge>;
      default:
        return <Badge className="bg-info/15 text-info border-info/30">{status}</Badge>;
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-5 shadow-sm relative z-10">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 hover:bg-secondary rounded-full"
            onClick={() => navigate('/requests')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{companyName}</h1>
              {getPriorityBadge()}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground ml-14">
              <span className="flex items-center gap-1.5 text-foreground/80 font-medium">
                <Hash className="h-3.5 w-3.5 opacity-70" />
                {requestId.startsWith('REQ-') ? requestId : requestId.split('-')[0] + '...'}
              </span>
              <span className="flex items-center gap-1.5">
                Broker: <span className="text-foreground/80 font-medium">{brokerName}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 opacity-70" />
                {queue}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 opacity-70" />
                {owner || 'Unassigned'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-2">
            <Badge className={cn("px-2.5 py-0.5", getSlaColorClass())}>
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {getSlaDisplay()}
            </Badge>
            <Badge variant="outline" className="px-2.5 py-0.5 bg-background border-border/60 text-foreground/80 shadow-sm">{currentStage}</Badge>
            {getStatusBadge()}
          </div>

          <div className="flex items-center gap-2">
            {timelineDrawer}
            <Button variant="outline" size="sm" className="gap-2 h-9 border-border/60 hover:bg-secondary" onClick={onAssignOwner}>
              <UserPlus className="h-4 w-4" />
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 h-9 transition-colors",
                hasMissingDocuments
                  ? "border-warning/50 text-warning hover:bg-warning/10 hover:border-warning"
                  : "border-border/60 hover:bg-secondary"
              )}
              onClick={onRequestMissingInfo}
            >
              <AlertCircle className="h-4 w-4" />
              Missing Info
            </Button>
            <Button variant="outline" size="sm" className="gap-2 h-9 border-destructive/20 text-destructive hover:bg-destructive/10 hover:border-destructive/40" onClick={onEscalate}>
              <ArrowUpRight className="h-4 w-4" />
              Escalate
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 h-9 border-destructive/40 text-destructive hover:bg-destructive/20 hover:border-destructive"
                onClick={() => {
                    if (window.confirm('Are you sure you want to delete this request? This will permanently remove all associated data and documents.')) {
                        onDelete?.();
                    }
                }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
