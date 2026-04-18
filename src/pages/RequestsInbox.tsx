import { useNavigate } from 'react-router-dom';
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
import { Filter, RefreshCw, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const STATUS_STYLES: Record<RequestListItem['status'], string> = {
  'New': 'bg-muted text-foreground',
  'In Review': 'bg-info/10 text-info',
  'Missing Info': 'bg-warning/10 text-warning',
  'Ready for Export': 'bg-success/10 text-success',
  'Issued': 'bg-primary/10 text-primary',
};

export default function RequestsInbox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter(req => {
      if (statusFilter.length > 0 && !statusFilter.includes(req.status)) return false;
      if (priorityFilter.length > 0 && !priorityFilter.includes(req.priority)) return false;
      if (q) {
        const hay = `${req.companyName} ${req.smartId || req.id} ${req.brokerName || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requests, statusFilter, priorityFilter, searchQuery]);

  const slaRisk = useMemo(() => {
    const amber = requests.filter(r => r.slaStatus === 'amber').length;
    const red = requests.filter(r => r.slaStatus === 'red').length;
    return { amber, red };
  }, [requests]);

  const handleRowClick = (requestId: string) => {
    navigate(`/request/${requestId}`);
  };

  const renderSlaDot = (status: RequestListItem['slaStatus']) => {
    const color = status === 'red' ? 'bg-destructive' : status === 'amber' ? 'bg-warning' : 'bg-success';
    return <span className={cn('inline-block w-2 h-2 rounded-full', color)} />;
  };

  const renderSlaTime = (remaining: number) => {
    if (remaining > 0) return `${remaining}h left`;
    if (remaining === 0) return 'Due now';
    return `${Math.abs(remaining)}h overdue`;
  };

  const activeFilterCount = statusFilter.length + priorityFilter.length;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Requests</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? 'Loading…' : `${requests.length} total`}
              {slaRisk.red > 0 && <span className="text-destructive ml-2">· {slaRisk.red} overdue</span>}
              {slaRisk.amber > 0 && <span className="text-warning ml-2">· {slaRisk.amber} at risk</span>}
            </p>
          </div>

          <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 h-8">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Create New Request</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="companyName" className="text-xs">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="e.g. Acme Corp"
                    value={newRequestData.companyName}
                    onChange={(e) => setNewRequestData({ ...newRequestData, companyName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority" className="text-xs">Priority</Label>
                  <Select
                    value={newRequestData.priority}
                    onValueChange={(value) => setNewRequestData({ ...newRequestData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-border bg-background px-6 py-2.5 flex items-center gap-2">
        <Input
          placeholder="Search by company, ID, or broker…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 max-w-sm text-sm"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Filter className="h-3.5 w-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary text-primary-foreground leading-none">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['New', 'In Review', 'Missing Info', 'Ready for Export', 'Issued'] as const).map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={statusFilter.includes(status)}
                onCheckedChange={(checked) => {
                  setStatusFilter(checked ? [...statusFilter, status] : statusFilter.filter((s) => s !== status));
                }}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['Normal', 'Urgent'] as const).map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority}
                checked={priorityFilter.includes(priority)}
                onCheckedChange={(checked) => {
                  setPriorityFilter(checked ? [...priorityFilter, priority] : priorityFilter.filter((p) => p !== priority));
                }}
              >
                {priority}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { setStatusFilter([]); setPriorityFilter([]); }}
          >
            Clear
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground"
          onClick={fetchRequests}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="h-9 w-[140px] text-xs font-medium">Request</TableHead>
              <TableHead className="h-9 text-xs font-medium">Company</TableHead>
              <TableHead className="h-9 hidden lg:table-cell text-xs font-medium">Broker</TableHead>
              <TableHead className="h-9 w-[100px] text-xs font-medium">SLA</TableHead>
              <TableHead className="h-9 hidden md:table-cell text-xs font-medium">Stage</TableHead>
              <TableHead className="h-9 w-[140px] text-xs font-medium">Status</TableHead>
              <TableHead className="h-9 hidden sm:table-cell text-xs font-medium">Owner</TableHead>
              <TableHead className="h-9 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-50" />
                  <span className="text-sm">Loading requests…</span>
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-sm text-muted-foreground">
                  {searchQuery || activeFilterCount > 0 ? 'No requests match your filters.' : 'No requests yet.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className={cn(
                    'cursor-pointer border-border hover:bg-muted/40 transition-colors',
                    request.slaStatus === 'red' && 'bg-destructive/[0.03]'
                  )}
                  onClick={() => handleRowClick(request.id)}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                    {request.smartId || request.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{request.companyName}</span>
                      {request.priority === 'Urgent' && (
                        <Badge variant="outline" className="h-4 px-1 text-[10px] text-destructive border-destructive/30 bg-destructive/5">
                          <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground lg:hidden">{request.brokerName}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground py-2.5">
                    {request.brokerName}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      {renderSlaDot(request.slaStatus)}
                      <span className={cn(
                        'text-xs',
                        request.slaStatus === 'red' && 'text-destructive font-medium',
                        request.slaStatus === 'amber' && 'text-warning',
                        request.slaStatus === 'green' && 'text-muted-foreground'
                      )}>
                        {renderSlaTime(request.slaRemaining)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2.5">
                    {request.currentStage}
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className={cn('inline-flex items-center px-2 h-5 rounded text-[11px] font-medium', STATUS_STYLES[request.status])}>
                      {request.status}
                    </span>
                  </TableCell>
                  <TableCell className={cn('hidden sm:table-cell text-sm py-2.5', request.owner === 'Unassigned' ? 'text-muted-foreground italic' : 'text-foreground')}>
                    {request.owner}
                  </TableCell>
                  <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
                      onClick={(e) => handleDeleteRequest(e, request.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
