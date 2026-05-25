import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { INBOUND_POLL_EVENT } from '@/components/layout/AppLayout';
import { mapBackendRequestToListItem } from '@/lib/mappers';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Filter, RefreshCw, Loader2, Plus, Trash2, AlertTriangle,
  Check, X as XIcon, ChevronUp, ChevronDown, ChevronRight, Keyboard, Sparkles,
  Bookmark, Save, Send, ArrowUpDown, Rows, LayoutList,
} from 'lucide-react';
import { useUiPref } from '@/hooks/useUiPref';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PageShell, PageHeader } from '@/components/layout/PageShell';

const STATUS_STYLES: Record<RequestListItem['status'], string> = {
  'New': 'bg-muted text-foreground',
  'In Review': 'bg-info/10 text-info',
  'Missing Info': 'bg-warning/10 text-warning',
  'Ready for Export': 'bg-success/10 text-success',
  'Issued': 'bg-primary/10 text-primary',
  'Approved': 'bg-success/10 text-success',
  'Rejected': 'bg-destructive/10 text-destructive',
  'Published': 'bg-primary/10 text-primary',
};

type SlaBucket = 'red' | 'amber' | 'green';
type SortKey = 'smartId' | 'companyName' | 'priority' | 'status' | 'owner' | 'slaRemaining' | 'createdAt';
type SortDir = 'asc' | 'desc';

interface FilterState {
  status: string[];
  priority: string[];
  sla: SlaBucket[];
  owner: string[];
}

interface SavedView {
  id: string;
  name: string;
  filters: FilterState;
}

const EMPTY_FILTERS: FilterState = { status: [], priority: [], sla: [], owner: [] };
const SAVED_VIEWS_KEY = 'insureauto.inbox.savedViews.v1';

function loadSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistSavedViews(views: SavedView[]) {
  localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
}

function filtersEqual(a: FilterState, b: FilterState) {
  const arrEq = (x: string[], y: string[]) => x.length === y.length && x.every(v => y.includes(v));
  return arrEq(a.status, b.status) && arrEq(a.priority, b.priority)
    && arrEq(a.sla, b.sla) && arrEq(a.owner, b.owner);
}

export default function RequestsInbox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('slaRemaining');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [showNlDialog, setShowNlDialog] = useState(false);
  const [nlQuery, setNlQuery] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const [nlExplain, setNlExplain] = useState<string | null>(null);
  const [bulkActing, setBulkActing] = useState(false);
  const [bulkCommentOpen, setBulkCommentOpen] = useState<null | 'approve' | 'reject'>(null);
  const [bulkComment, setBulkComment] = useState('');

  // View mode — Triage groups by SLA (default, decision-grade) vs Flat sortable
  // table (power-user). Persisted so the user's preference sticks.
  const [viewMode, setViewMode] = useUiPref<'triage' | 'flat'>('inbox.viewMode', 'triage');
  const [collapsedRed,   setCollapsedRed]   = useUiPref<boolean>('inbox.triage.red.collapsed', false);
  const [collapsedAmber, setCollapsedAmber] = useUiPref<boolean>('inbox.triage.amber.collapsed', false);
  const [collapsedGreen, setCollapsedGreen] = useUiPref<boolean>('inbox.triage.green.collapsed', false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  const fetchRequests = useCallback(async (opts?: { withInboundPoll?: boolean; toastResult?: boolean }) => {
    try {
      setLoading(true);
      // Optional: poll all connected mailboxes before refetching, so any new
      // submissions arriving via email show up on this same refresh.
      if (opts?.withInboundPoll) {
        try {
          const res = await api.inboundEmail.accounts.pollAll();
          if (opts.toastResult && res?.accounts_polled > 0) {
            toast.success(
              `Inbound polled — ${res.matched ?? 0} new request${res.matched === 1 ? '' : 's'}`,
              { description: `${res.fetched ?? 0} fetched · ${res.skipped ?? 0} skipped` },
            );
          }
        } catch {
          // Don't block the request refresh on inbound poll failures.
        }
      }
      const data = await api.requests.list();
      const mappedData = data.map(mapBackendRequestToListItem);
      setRequests(mappedData);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
      toast.error('Failed to load requests from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    setSavedViews(loadSavedViews());
  }, [fetchRequests]);

  // Refresh the inbox whenever the global auto-poller reports new matches.
  useEffect(() => {
    const onPolled = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.matched && detail.matched > 0) {
        fetchRequests();
      }
    };
    window.addEventListener(INBOUND_POLL_EVENT, onPolled);
    return () => window.removeEventListener(INBOUND_POLL_EVENT, onPolled);
  }, [fetchRequests]);

  // ─── Derived: filtered + sorted list ────────────────────────────
  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const out = requests.filter(req => {
      if (filters.status.length > 0 && !filters.status.includes(req.status)) return false;
      if (filters.priority.length > 0 && !filters.priority.includes(req.priority)) return false;
      if (filters.sla.length > 0 && !filters.sla.includes(req.slaStatus)) return false;
      if (filters.owner.length > 0 && !filters.owner.includes(req.owner)) return false;
      if (q) {
        const hay = `${req.companyName} ${req.smartId || req.id} ${req.brokerName || ''} ${req.owner || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...out].sort((a, b) => {
      let av: any = (a as any)[sortKey];
      let bv: any = (b as any)[sortKey];
      if (av instanceof Date) av = av.getTime();
      if (bv instanceof Date) bv = bv.getTime();
      if (av == null) av = sortDir === 'asc' ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 'asc' ? Infinity : -Infinity;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [requests, filters, searchQuery, sortKey, sortDir]);

  // ─── Triage groups (by SLA bucket) ──────────────────────────────
  const groups = useMemo(() => {
    const red:   RequestListItem[] = [];
    const amber: RequestListItem[] = [];
    const green: RequestListItem[] = [];
    for (const r of filteredRequests) {
      if (r.slaStatus === 'red') red.push(r);
      else if (r.slaStatus === 'amber') amber.push(r);
      else green.push(r);
    }
    return { red, amber, green };
  }, [filteredRequests]);

  // Rows actually visible in the table — flat mode shows all, triage mode
  // omits rows from collapsed groups. Keyboard nav (j/k) and rowRefs walk this.
  const visibleRows = useMemo(() => {
    if (viewMode === 'flat') return filteredRequests;
    return [
      ...(collapsedRed   ? [] : groups.red),
      ...(collapsedAmber ? [] : groups.amber),
      ...(collapsedGreen ? [] : groups.green),
    ];
  }, [viewMode, filteredRequests, groups, collapsedRed, collapsedAmber, collapsedGreen]);

  // ─── Derived: counts ────────────────────────────────────────────
  const slaRisk = useMemo(() => {
    const amber = requests.filter(r => r.slaStatus === 'amber').length;
    const red = requests.filter(r => r.slaStatus === 'red').length;
    return { amber, red };
  }, [requests]);

  const ownersList = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => r.owner && set.add(r.owner));
    return Array.from(set).sort();
  }, [requests]);

  const activeFilterCount = filters.status.length + filters.priority.length + filters.sla.length + filters.owner.length;

  // ─── Selection logic ────────────────────────────────────────────
  const allVisibleSelected = filteredRequests.length > 0 && filteredRequests.every(r => selectedIds.has(r.id));
  const someVisibleSelected = !allVisibleSelected && filteredRequests.some(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect those currently visible
      const next = new Set(selectedIds);
      filteredRequests.forEach(r => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      filteredRequests.forEach(r => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const toggleRowSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Saved views ────────────────────────────────────────────────
  const applySavedView = (view: SavedView) => {
    setFilters(view.filters);
    toast.success(`Applied view: ${view.name}`);
  };
  const deleteSavedView = (id: string) => {
    const next = savedViews.filter(v => v.id !== id);
    setSavedViews(next);
    persistSavedViews(next);
  };
  const saveCurrentAsView = () => {
    const name = newViewName.trim();
    if (!name) return;
    const view: SavedView = { id: `v-${Date.now()}`, name, filters };
    const next = [...savedViews, view];
    setSavedViews(next);
    persistSavedViews(next);
    setShowSaveViewDialog(false);
    setNewViewName('');
    toast.success(`Saved view: ${name}`);
  };

  // ─── Bulk actions ───────────────────────────────────────────────
  const runBulk = async (action: 'approve' | 'reject' | 'delete' | 'publish', comment?: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActing(true);
    const t = toast.loading(`${action === 'delete' ? 'Deleting' : action === 'publish' ? 'Publishing' : action + 'ing'} ${ids.length} request${ids.length > 1 ? 's' : ''}…`);
    let ok = 0;
    let fail = 0;
    for (const id of ids) {
      try {
        if (action === 'approve') await api.requests.approve(id, comment || 'Bulk-approved');
        else if (action === 'reject') await api.requests.reject(id, comment || 'Bulk-rejected');
        else if (action === 'publish') await api.requests.publish(id);
        else if (action === 'delete') await api.requests.delete(id);
        ok++;
      } catch (err) {
        console.error('Bulk action failed for', id, err);
        fail++;
      }
    }
    toast.dismiss(t);
    if (fail === 0) toast.success(`${action === 'delete' ? 'Deleted' : action === 'publish' ? 'Published' : action + 'd'} ${ok} request${ok > 1 ? 's' : ''}`);
    else toast.error(`${ok} succeeded, ${fail} failed`);
    setBulkActing(false);
    clearSelection();
    fetchRequests();
  };

  // ─── NL filter ─────────────────────────────────────────────────
  const runNlQuery = async () => {
    const q = nlQuery.trim();
    if (!q) return;
    setNlBusy(true);
    setNlExplain(null);
    try {
      const res = await api.requests.nlFilter(q);
      if (res?.filters) {
        setFilters({
          status: res.filters.status || [],
          priority: res.filters.priority || [],
          sla: res.filters.sla || [],
          owner: res.filters.owner || [],
        });
        if (res.search) setSearchQuery(res.search);
        setNlExplain(res.explanation || null);
        toast.success('Filter applied');
        if (!res.explanation) setShowNlDialog(false);
      } else {
        toast.error('Could not translate query');
      }
    } catch (err: any) {
      console.error('NL filter failed', err);
      toast.error(err?.message || 'Natural-language search failed');
    } finally {
      setNlBusy(false);
    }
  };

  // ─── New request (unchanged) ────────────────────────────────────
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestData, setNewRequestData] = useState({ companyName: '', entityName: '', priority: 'normal' });
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
        entity_name: newRequestData.entityName.trim() || newRequestData.companyName.trim(),
        priority: newRequestData.priority,
      });
      toast.success('Request created successfully');
      setIsNewRequestOpen(false);
      setNewRequestData({ companyName: '', entityName: '', priority: 'normal' });
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

  // ─── Keyboard shortcuts ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // `/` focuses search from anywhere
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Escape: clear selection / blur
      if (e.key === 'Escape' && !isTyping) {
        if (selectedIds.size > 0) clearSelection();
        return;
      }
      if (isTyping) return;

      // j/k to move focus, Enter to open, Space to toggle select, x to delete
      if (visibleRows.length === 0) return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = i == null ? 0 : Math.min(i + 1, visibleRows.length - 1);
          rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => {
          const next = i == null ? 0 : Math.max(i - 1, 0);
          rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'Enter' && focusedIndex != null) {
        e.preventDefault();
        const row = visibleRows[focusedIndex];
        if (row) navigate(`/request/${row.id}`);
      } else if (e.key === ' ' && focusedIndex != null) {
        e.preventDefault();
        const row = visibleRows[focusedIndex];
        if (row) toggleRowSelect(row.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visibleRows, focusedIndex, selectedIds, navigate]);

  const handleRowClick = (requestId: string) => {
    navigate(`/request/${requestId}`);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />;
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

  const selectionCount = selectedIds.size;

  return (
    <PageShell fullBleed>
      {/* Page header — calm, decision-grade */}
      <div className="border-b border-border bg-background px-4 md:px-6 lg:px-8 py-5">
        <PageHeader
          eyebrow="Operations · Inbox"
          title="Requests"
          description={
            loading
              ? 'Loading…'
              : slaRisk.red > 0
                ? `${slaRisk.red} overdue · ${slaRisk.amber} at risk · ${requests.length} total`
                : slaRisk.amber > 0
                  ? `${slaRisk.amber} at risk · ${requests.length} total`
                  : `${requests.length} total · all on track`
          }
          actions={
            <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  New request
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
                  <Label htmlFor="entityName" className="text-xs">Entity Name (optional, for AML screening)</Label>
                  <Input
                    id="entityName"
                    placeholder="Defaults to Company Name if blank"
                    value={newRequestData.entityName}
                    onChange={(e) => setNewRequestData({ ...newRequestData, entityName: e.target.value })}
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
          }
        />
      </div>

      {/* Toolbar */}
      <div className="border-b border-border bg-background px-4 md:px-6 lg:px-8 py-2.5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Input
            ref={searchInputRef}
            placeholder="Search by company, ID, broker… (press /)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* View mode toggle — Triage (grouped by SLA) vs Flat (sortable table) */}
        <div className="inline-flex items-center rounded-md border border-border bg-background overflow-hidden h-8" role="tablist" aria-label="View mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'triage'}
            onClick={() => setViewMode('triage')}
            className={cn(
              'h-full px-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors',
              viewMode === 'triage'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            title="Triage view — grouped by SLA"
          >
            <LayoutList className="h-3.5 w-3.5" />
            Triage
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'flat'}
            onClick={() => setViewMode('flat')}
            className={cn(
              'h-full px-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors border-l border-border',
              viewMode === 'flat'
                ? 'bg-foreground text-background border-l-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
            title="Flat view — single sortable table"
          >
            <Rows className="h-3.5 w-3.5" />
            Flat
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setShowNlDialog(true)}
          title="Filter with natural language"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Ask AI
        </Button>

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
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['New', 'In Review', 'Missing Info', 'Ready for Export', 'Issued', 'Approved', 'Rejected', 'Published'] as const).map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.status.includes(status)}
                onCheckedChange={(checked) => {
                  setFilters(f => ({ ...f, status: checked ? [...f.status, status] : f.status.filter(s => s !== status) }));
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
                checked={filters.priority.includes(priority)}
                onCheckedChange={(checked) => {
                  setFilters(f => ({ ...f, priority: checked ? [...f.priority, priority] : f.priority.filter(p => p !== priority) }));
                }}
              >
                {priority}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs">SLA</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {([
              { v: 'red' as const, label: 'Overdue' },
              { v: 'amber' as const, label: 'At risk' },
              { v: 'green' as const, label: 'On track' },
            ]).map(({ v, label }) => (
              <DropdownMenuCheckboxItem
                key={v}
                checked={filters.sla.includes(v)}
                onCheckedChange={(checked) => {
                  setFilters(f => ({ ...f, sla: checked ? [...f.sla, v] : f.sla.filter(s => s !== v) }));
                }}
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
            {ownersList.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">Owner</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ownersList.map(o => (
                  <DropdownMenuCheckboxItem
                    key={o}
                    checked={filters.owner.includes(o)}
                    onCheckedChange={(checked) => {
                      setFilters(f => ({ ...f, owner: checked ? [...f.owner, o] : f.owner.filter(x => x !== o) }));
                    }}
                  >
                    {o}
                  </DropdownMenuCheckboxItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Saved views */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              Views
              {savedViews.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-0.5">({savedViews.length})</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="text-xs">Saved views</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {savedViews.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No saved views yet.</div>
            ) : (
              savedViews.map(v => (
                <div key={v.id} className="group flex items-center justify-between px-2 py-1 hover:bg-muted/50 rounded">
                  <button
                    onClick={() => applySavedView(v)}
                    className="flex-1 text-left text-sm flex items-center gap-1.5"
                  >
                    {filtersEqual(filters, v.filters) && <Check className="h-3 w-3 text-primary" />}
                    <span className={cn(filtersEqual(filters, v.filters) ? 'font-medium' : '')}>{v.name}</span>
                  </button>
                  <button
                    onClick={() => deleteSavedView(v.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => { setNewViewName(''); setShowSaveViewDialog(true); }}
              disabled={activeFilterCount === 0 && !searchQuery}
              className="text-sm"
            >
              <Save className="h-3.5 w-3.5 mr-2" />
              Save current as view…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            Clear filters
          </Button>
        )}

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          title="Keyboard shortcuts: / search · j/k nav · Enter open · Space select · x delete"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground"
          onClick={() => fetchRequests({ withInboundPoll: true, toastResult: true })}
          disabled={loading}
          title="Refresh — also polls connected mailboxes"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Active filter chips */}
      {(activeFilterCount > 0 || nlExplain) && (
        <div className="border-b border-border bg-muted/20 px-4 md:px-6 lg:px-8 py-2 flex items-center gap-1.5 flex-wrap">
          {filters.status.map(s => (
            <FilterChip key={`s-${s}`} label={s} onRemove={() => setFilters(f => ({ ...f, status: f.status.filter(x => x !== s) }))} />
          ))}
          {filters.priority.map(p => (
            <FilterChip key={`p-${p}`} label={`Priority: ${p}`} onRemove={() => setFilters(f => ({ ...f, priority: f.priority.filter(x => x !== p) }))} />
          ))}
          {filters.sla.map(s => (
            <FilterChip key={`sla-${s}`} label={`SLA: ${s === 'red' ? 'Overdue' : s === 'amber' ? 'At risk' : 'On track'}`} onRemove={() => setFilters(f => ({ ...f, sla: f.sla.filter(x => x !== s) }))} />
          ))}
          {filters.owner.map(o => (
            <FilterChip key={`o-${o}`} label={`Owner: ${o}`} onRemove={() => setFilters(f => ({ ...f, owner: f.owner.filter(x => x !== o) }))} />
          ))}
          {nlExplain && (
            <span className="text-xs text-muted-foreground italic inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              {nlExplain}
            </span>
          )}
        </div>
      )}

      {/* Bulk actions bar */}
      {selectionCount > 0 && (
        <div className="border-b border-border bg-muted/40 px-4 md:px-6 lg:px-8 py-2 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{selectionCount} selected</span>
          <Button size="sm" variant="outline" className="h-7 gap-1" onClick={clearSelection}>
            Clear
          </Button>
          <div className="flex-1" />
          <Button
            size="sm" variant="outline"
            className="h-7 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => { setBulkComment(''); setBulkCommentOpen('reject'); }}
            disabled={bulkActing}
          >
            <XIcon className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => { setBulkComment(''); setBulkCommentOpen('approve'); }}
            disabled={bulkActing}
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm" variant="outline" className="h-7 gap-1.5"
            onClick={() => runBulk('publish')}
            disabled={bulkActing}
          >
            <Send className="h-3.5 w-3.5" /> Publish
          </Button>
          <Button
            size="sm" variant="ghost" className="h-7 gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={() => { if (window.confirm(`Delete ${selectionCount} request${selectionCount > 1 ? 's' : ''}?`)) runBulk('delete'); }}
            disabled={bulkActing}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="h-9 w-10 text-xs font-medium">
                <Checkbox
                  checked={allVisibleSelected || (someVisibleSelected && 'indeterminate')}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHead label="Request" active={sortKey === 'smartId'} dir={sortDir} onClick={() => toggleSort('smartId')} className="w-[140px]" />
              <SortableHead label="Company" active={sortKey === 'companyName'} dir={sortDir} onClick={() => toggleSort('companyName')} />
              <TableHead className="h-9 hidden lg:table-cell text-xs font-medium">Broker</TableHead>
              <SortableHead label="SLA" active={sortKey === 'slaRemaining'} dir={sortDir} onClick={() => toggleSort('slaRemaining')} className="w-[120px]" />
              <TableHead className="h-9 hidden md:table-cell text-xs font-medium">Stage</TableHead>
              <SortableHead label="Status" active={sortKey === 'status'} dir={sortDir} onClick={() => toggleSort('status')} className="w-[140px]" />
              <SortableHead label="Owner" active={sortKey === 'owner'} dir={sortDir} onClick={() => toggleSort('owner')} className="hidden sm:table-cell" />
              <TableHead className="h-9 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && requests.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skel-${idx}`} className="hover:bg-transparent border-border">
                  <TableCell className="py-2.5 w-10"><Skeleton className="h-4 w-4 rounded-sm" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-3.5 w-44" /></TableCell>
                  <TableCell className="py-2.5 hidden lg:table-cell"><Skeleton className="h-3 w-32" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-3 w-16" /></TableCell>
                  <TableCell className="py-2.5 hidden md:table-cell"><Skeleton className="h-3 w-20" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                  <TableCell className="py-2.5 hidden sm:table-cell"><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell className="py-2.5"></TableCell>
                </TableRow>
              ))
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                    <div className="h-10 w-10 rounded-md border border-border bg-muted/40 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {searchQuery || activeFilterCount > 0 ? 'No matches' : 'Inbox zero'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {searchQuery || activeFilterCount > 0
                          ? 'Try adjusting your filters or clearing the search.'
                          : 'No requests yet — create one to get started.'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : viewMode === 'triage' ? (
              <>
                <TriageGroup
                  bucket="red"
                  label="Overdue"
                  rows={groups.red}
                  startIdx={0}
                  collapsed={collapsedRed}
                  onToggle={() => setCollapsedRed(v => !v)}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  rowRefs={rowRefs}
                  onRowClick={handleRowClick}
                  onRowSelect={toggleRowSelect}
                  onRowDelete={handleDeleteRequest}
                  renderSlaDot={renderSlaDot}
                  renderSlaTime={renderSlaTime}
                />
                <TriageGroup
                  bucket="amber"
                  label="Due 24h"
                  rows={groups.amber}
                  startIdx={collapsedRed ? 0 : groups.red.length}
                  collapsed={collapsedAmber}
                  onToggle={() => setCollapsedAmber(v => !v)}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  rowRefs={rowRefs}
                  onRowClick={handleRowClick}
                  onRowSelect={toggleRowSelect}
                  onRowDelete={handleDeleteRequest}
                  renderSlaDot={renderSlaDot}
                  renderSlaTime={renderSlaTime}
                />
                <TriageGroup
                  bucket="green"
                  label="On track"
                  rows={groups.green}
                  startIdx={(collapsedRed ? 0 : groups.red.length) + (collapsedAmber ? 0 : groups.amber.length)}
                  collapsed={collapsedGreen}
                  onToggle={() => setCollapsedGreen(v => !v)}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  rowRefs={rowRefs}
                  onRowClick={handleRowClick}
                  onRowSelect={toggleRowSelect}
                  onRowDelete={handleDeleteRequest}
                  renderSlaDot={renderSlaDot}
                  renderSlaTime={renderSlaTime}
                />
              </>
            ) : (
              filteredRequests.map((request, idx) =>
                renderInboxRow({
                  request, idx,
                  isSelected: selectedIds.has(request.id),
                  isFocused: focusedIndex === idx,
                  rowRefs,
                  onRowClick: handleRowClick,
                  onRowSelect: toggleRowSelect,
                  onRowDelete: handleDeleteRequest,
                  renderSlaDot,
                  renderSlaTime,
                })
              )
            )}
          </TableBody>
        </Table>
      </div>

      {/* Save view dialog */}
      <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Save current view</DialogTitle>
            <DialogDescription>Give this filter combination a name so you can re-apply it later.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. My queue · Urgent overdue"
            value={newViewName}
            onChange={(e) => setNewViewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') saveCurrentAsView(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveViewDialog(false)}>Cancel</Button>
            <Button onClick={saveCurrentAsView} disabled={!newViewName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Natural-language search dialog */}
      <Dialog open={showNlDialog} onOpenChange={(v) => { setShowNlDialog(v); if (!v) setNlExplain(null); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Ask about the inbox
            </DialogTitle>
            <DialogDescription>
              Describe what you want to see in plain English. The AI translates it into inbox filters.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            rows={3}
            placeholder={`e.g. "urgent requests overdue on SLA" · "anything rejected this week" · "requests missing info owned by Sarah"`}
            className="text-sm resize-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runNlQuery(); }}
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ctrl/Cmd+Enter to run</span>
            {nlExplain && <span className="italic max-w-[320px] truncate">{nlExplain}</span>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNlDialog(false)}>Cancel</Button>
            <Button onClick={runNlQuery} disabled={!nlQuery.trim() || nlBusy} className="gap-1.5">
              {nlBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk approve/reject with comment */}
      <Dialog open={bulkCommentOpen !== null} onOpenChange={(v) => { if (!v) setBulkCommentOpen(null); }}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>
              {bulkCommentOpen === 'approve' ? 'Approve' : 'Reject'} {selectionCount} request{selectionCount > 1 ? 's' : ''}
            </DialogTitle>
            <DialogDescription>
              Your comment is stamped on every selected request for audit.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={bulkComment}
            onChange={(e) => setBulkComment(e.target.value)}
            rows={3}
            placeholder={bulkCommentOpen === 'approve'
              ? 'e.g. Docs verified, risk checks clean'
              : 'e.g. KYC failed; broker to resubmit'}
            className="text-sm resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkCommentOpen(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const action = bulkCommentOpen!;
                setBulkCommentOpen(null);
                await runBulk(action, bulkComment.trim());
              }}
              disabled={!bulkComment.trim()}
              className={cn(bulkCommentOpen === 'reject' && 'bg-destructive hover:bg-destructive/90 text-destructive-foreground')}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function SortableHead({ label, active, dir, onClick, className }: {
  label: string; active: boolean; dir: SortDir; onClick: () => void; className?: string;
}) {
  return (
    <TableHead className={cn('h-9 text-xs font-medium cursor-pointer select-none hover:bg-muted/40', className)} onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? (dir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />)
          : <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />}
      </span>
    </TableHead>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-background border border-border text-xs">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground">
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

// Restrained palette — flat, low-saturation single colors. Avatars should
// help distinguish rows at a glance without competing with status/priority.
const AVATAR_PALETTE = [
  'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
];

function OwnerChip({ name }: { name: string }) {
  if (!name || name === 'Unassigned') {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground text-sm">
        <span className="h-6 w-6 rounded-full border border-dashed border-border" />
        Unassigned
      </span>
    );
  }
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  // Stable palette pick by name hash
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const palette = AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <span className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold', palette)}>
        {initials}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

// ─── Triage rendering ──────────────────────────────────────────────
// Group of rows that share an SLA bucket. Renders a sticky-style header row
// (clickable to collapse) + the data rows. Fragment children flow up to the
// enclosing <TableBody>.

interface RowRender {
  rowRefs: React.MutableRefObject<Array<HTMLTableRowElement | null>>;
  onRowClick: (id: string) => void;
  onRowSelect: (id: string) => void;
  onRowDelete: (e: React.MouseEvent, id: string) => void;
  renderSlaDot: (s: RequestListItem['slaStatus']) => React.ReactNode;
  renderSlaTime: (n: number) => string;
}

interface GroupCtx extends RowRender {
  selectedIds: Set<string>;
  focusedIndex: number | null;
}

function TriageGroup({
  bucket, label, rows, startIdx, collapsed, onToggle, ...ctx
}: {
  bucket: 'red' | 'amber' | 'green';
  label: string;
  rows: RequestListItem[];
  startIdx: number;
  collapsed: boolean;
  onToggle: () => void;
} & GroupCtx) {
  if (rows.length === 0) return null;

  const tone = {
    red:   { dot: 'bg-destructive', text: 'text-destructive', tint: 'bg-destructive/[0.04]' },
    amber: { dot: 'bg-warning',     text: 'text-warning',     tint: 'bg-warning/[0.04]' },
    green: { dot: 'bg-success',     text: 'text-muted-foreground', tint: 'bg-muted/30' },
  }[bucket];

  return (
    <>
      <TableRow
        className={cn('hover:bg-transparent border-border cursor-pointer', tone.tint)}
        onClick={onToggle}
      >
        <TableCell colSpan={9} className="py-1.5">
          <div className="flex items-center gap-2 px-1">
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} />
            <span className={cn('text-[11px] font-semibold uppercase tracking-wider', tone.text)}>
              {label}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              · {rows.length}
            </span>
          </div>
        </TableCell>
      </TableRow>

      {!collapsed && rows.map((request, i) => {
        const visibleIdx = startIdx + i;
        return renderInboxRow({
          request,
          idx: visibleIdx,
          isSelected: ctx.selectedIds.has(request.id),
          isFocused: ctx.focusedIndex === visibleIdx,
          rowRefs: ctx.rowRefs,
          onRowClick: ctx.onRowClick,
          onRowSelect: ctx.onRowSelect,
          onRowDelete: ctx.onRowDelete,
          renderSlaDot: ctx.renderSlaDot,
          renderSlaTime: ctx.renderSlaTime,
        });
      })}
    </>
  );
}

function renderInboxRow({
  request, idx, isSelected, isFocused, rowRefs,
  onRowClick, onRowSelect, onRowDelete, renderSlaDot, renderSlaTime,
}: {
  request: RequestListItem;
  idx: number;
  isSelected: boolean;
  isFocused: boolean;
} & RowRender) {
  return (
    <TableRow
      key={request.id}
      ref={(el) => (rowRefs.current[idx] = el)}
      className={cn(
        'group cursor-pointer border-border hover:bg-muted/40 transition-colors',
        request.slaStatus === 'red' && 'bg-destructive/[0.03]',
        isSelected && 'bg-primary/5',
        isFocused && 'ring-1 ring-inset ring-primary/50',
      )}
      onClick={() => onRowClick(request.id)}
    >
      <TableCell className="py-2.5 w-10" onClick={(e) => { e.stopPropagation(); onRowSelect(request.id); }}>
        <Checkbox checked={isSelected} aria-label="Select row" />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
        {request.smartId || request.id.slice(0, 8)}
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{request.companyName}</span>
          {request.priority === 'Urgent' && (
            <Badge variant="critical" className="h-4 px-1 text-[10px]">
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
      <TableCell className="hidden sm:table-cell py-2.5">
        <OwnerChip name={request.owner} />
      </TableCell>
      <TableCell className="py-2.5" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
          onClick={(e) => onRowDelete(e, request.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
