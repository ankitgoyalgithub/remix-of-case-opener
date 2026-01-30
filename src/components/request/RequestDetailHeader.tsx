import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Hash, Clock, User, ArrowLeft, UserPlus, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface RequestDetailHeaderProps {
  requestId: string;
  companyName: string;
  brokerName: string;
  priority: 'High' | 'Medium' | 'Low';
  slaRemaining: number;
  slaStatus: 'green' | 'amber' | 'red';
  currentStage: string;
  status: string;
  owner: string;
  onAssignOwner?: () => void;
  onRequestMissingInfo?: () => void;
  onEscalate?: () => void;
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
  onAssignOwner,
  onRequestMissingInfo,
  onEscalate,
}: RequestDetailHeaderProps) {
  const navigate = useNavigate();

  const getSlaDisplay = () => {
    if (slaRemaining > 0) return `${slaRemaining}h remaining`;
    if (slaRemaining === 0) return 'Due now';
    return `${Math.abs(slaRemaining)}h overdue`;
  };

  const getSlaColorClass = () => {
    switch (slaStatus) {
      case 'green': return 'bg-success/20 text-success';
      case 'amber': return 'bg-warning/20 text-warning';
      case 'red': return 'bg-destructive/20 text-destructive';
    }
  };

  const getPriorityBadge = () => {
    switch (priority) {
      case 'High':
        return <Badge className="bg-destructive/20 text-destructive border-0">High Priority</Badge>;
      case 'Medium':
        return <Badge className="bg-warning/20 text-warning border-0">Medium Priority</Badge>;
      case 'Low':
        return <Badge variant="secondary">Low Priority</Badge>;
    }
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => navigate('/requests')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{companyName}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  {requestId}
                </span>
                <span>Broker: {brokerName}</span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {owner}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            {getPriorityBadge()}
            <Badge className={cn("border-0", getSlaColorClass())}>
              <Clock className="h-3 w-3 mr-1" />
              {getSlaDisplay()}
            </Badge>
            <Badge variant="outline">{currentStage}</Badge>
            <Badge className="bg-info/20 text-info border-0">{status}</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onAssignOwner}>
              <UserPlus className="h-3.5 w-3.5" />
              Assign Owner
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onRequestMissingInfo}>
              <AlertCircle className="h-3.5 w-3.5" />
              Request Missing Info
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={onEscalate}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Escalate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
