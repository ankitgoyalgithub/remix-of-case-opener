import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockRequests, getSlaRiskCount, RequestListItem } from '@/data/mockRequestsData';
import { Inbox, Filter, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlaRiskNotification } from '@/components/request/SlaRiskNotification';

export default function RequestsInbox() {
  const navigate = useNavigate();
  const slaRisk = getSlaRiskCount();

  const handleRowClick = (requestId: string) => {
    navigate(`/request/${requestId}`);
  };

  const getSlaStatusBadge = (status: RequestListItem['slaStatus'], remaining: number, targetHours: number) => {
    const displayText = remaining > 0 ? `${remaining}h` : remaining === 0 ? 'Due now' : `${Math.abs(remaining)}h overdue`;
    
    switch (status) {
      case 'green':
        return <Badge className="bg-success/20 text-success border-0">{displayText}</Badge>;
      case 'amber':
        return (
          <Badge className="bg-warning/20 text-warning border-0 gap-1">
            <Clock className="h-3 w-3" />
            {displayText}
          </Badge>
        );
      case 'red':
        return (
          <Badge className="bg-destructive/20 text-destructive border-0 gap-1">
            <AlertTriangle className="h-3 w-3" />
            {displayText}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: RequestListItem['status']) => {
    switch (status) {
      case 'New':
        return <Badge variant="secondary">New</Badge>;
      case 'In Review':
        return <Badge className="bg-info/20 text-info border-0">In Review</Badge>;
      case 'Missing Info':
        return <Badge className="bg-warning/20 text-warning border-0">Missing Info</Badge>;
      case 'Ready for Export':
        return <Badge className="bg-success/20 text-success border-0">Ready for Export</Badge>;
      case 'Issued':
        return <Badge className="bg-primary/20 text-primary border-0">Issued</Badge>;
    }
  };

  const getPriorityBadge = (priority: RequestListItem['priority']) => {
    if (priority === 'Urgent') {
      return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Urgent</Badge>;
    }
    return null;
  };

  const getRowClassName = (request: RequestListItem) => {
    if (request.slaStatus === 'red') {
      return "cursor-pointer bg-destructive/5 hover:bg-destructive/10";
    }
    if (request.slaStatus === 'amber') {
      return "cursor-pointer hover:bg-muted/50";
    }
    return "cursor-pointer hover:bg-muted/50";
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Inbox className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Requests Inbox</h1>
              <p className="text-sm text-muted-foreground">SME Health Policy Issuance Requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SlaRiskNotification 
              amberCount={slaRisk.amber} 
              redCount={slaRisk.red}
              onClick={() => {/* Could filter to show only at-risk requests */}}
            />
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Request ID</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Broker Name</TableHead>
                <TableHead className="w-[80px] text-center">Age</TableHead>
                <TableHead className="w-[130px]">SLA Remaining</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Queue</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRequests.map((request) => (
                <TableRow 
                  key={request.id}
                  className={getRowClassName(request)}
                  onClick={() => handleRowClick(request.id)}
                >
                  <TableCell className="font-medium text-primary hover:underline">
                    <div className="flex items-center gap-2">
                      {request.id}
                      {getPriorityBadge(request.priority)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{request.companyName}</TableCell>
                  <TableCell className="text-muted-foreground">{request.brokerName}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{request.age}d</TableCell>
                  <TableCell>{getSlaStatusBadge(request.slaStatus, request.slaRemaining, request.slaTargetHours)}</TableCell>
                  <TableCell className="text-muted-foreground">{request.currentStage}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{request.queue}</TableCell>
                  <TableCell className={cn(
                    request.owner === 'Unassigned' ? 'text-muted-foreground italic' : ''
                  )}>
                    {request.owner}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
