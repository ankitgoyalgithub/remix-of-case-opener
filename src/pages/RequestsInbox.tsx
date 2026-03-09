import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
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
import { RequestListItem } from '@/data/mockRequestsData';
import { api } from '@/lib/api';
import { mapBackendRequestToListItem } from '@/lib/mappers';
import { Inbox, Filter, RefreshCw, AlertTriangle, Clock, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlaRiskNotification } from '@/components/request/SlaRiskNotification';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RequestsInbox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.requests.list();
      const mappedData = data.map(mapBackendRequestToListItem);
      setRequests(mappedData);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load requests from server');
    } finally {
      setLoading(false);
    }
  };

  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestData, setNewRequestData] = useState({ companyName: '', priority: 'normal' });
  const [creating, setCreating] = useState(false);

  const handleCreateRequest = async () => {
    if (!newRequestData.companyName) {
      toast.error('Company Name is required');
      return;
    }
    try {
      setCreating(true);
      const res = await api.requests.create({
        company_name: newRequestData.companyName,
        priority: newRequestData.priority,
      });
      toast.success('Request created successfully');
      setIsNewRequestOpen(false);
      setNewRequestData({ companyName: '', priority: 'normal' });
      fetchRequests();
      navigate(`/request/${res.id}`);
    } catch (error) {
      console.error('Failed to create request:', error);
      toast.error('Failed to create request');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRequest = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    
    try {
      toast.loading('Deleting request...', { id: 'delete-request' });
      await api.requests.delete(requestId);
      toast.success('Request deleted successfully', { id: 'delete-request' });
      fetchRequests();
    } catch (error) {
      console.error('Failed to delete request:', error);
      toast.error('Failed to delete request', { id: 'delete-request' });
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const slaRisk = useMemo(() => {
    const amber = requests.filter(r => r.slaStatus === 'amber').length;
    const red = requests.filter(r => r.slaStatus === 'red').length;
    return { amber, red, total: amber + red };
  }, [requests]);

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
    <div className="h-full flex flex-col bg-background">
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
              onClick={() => {/* Could filter to show only at-risk requests */ }}
            />
            <Link to="/studio">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                AI Ops Studio
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={fetchRequests}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            
            <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4" />
                  New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Request</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="e.g. Acme Corp"
                      value={newRequestData.companyName}
                      onChange={(e) => setNewRequestData({ ...newRequestData, companyName: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newRequestData.priority}
                      onValueChange={(value) => setNewRequestData({ ...newRequestData, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateRequest} disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
              {loading && requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-50" />
                    Loading requests...
                  </TableCell>
                </TableRow>
              ) : requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                    No requests found in the system.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteRequest(e, request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
