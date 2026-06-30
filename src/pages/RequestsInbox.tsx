import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Clock3, CheckCircle2, AlertCircle, CircleDot, ShieldAlert, WifiOff,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { DecisionModal, type DecisionAction } from '@/components/request/DecisionModal';
import { requestStatusMeta, slaMeta, type StatusIconName } from '@/lib/status';

// Lucide icon lookup for the SLA "time left" cue (icon + text, never colour-only).
const SLA_ICONS: Record<StatusIconName, typeof Clock3> = {
  AlertTriangle, AlertCircle, Clock3, CheckCircle2, CircleDot, ShieldAlert,
};

// ONE canonical, plain-language status set — drives the Filter menu and chips.
// Underlying rows still carry the raw display value; we compare via the shared
// helper so "Issued" / "Published" both read as "Sent to insurer", etc.
const STATUS_FILTER_OPTIONS = ['New', 'In review', 'Awaiting info', 'Approved', 'Sent to insurer', 'Rejected'] as const;

const slaTextClass = (s: RequestListItem['slaStatus']) =>
  s === 'red' ? 'text-destructive' : s === 'amber' ? 'text-warning' : 'text-success';

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
const UNDO_WINDOW_MS = 6000;

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

// Read pre-applied filters carried in from the Dashboard KPI tiles, e.g.
// /requests?status=Awaiting%20info  ·  /requests?sla=red.
function filtersFromParams(params: URLSearchParams): FilterState {
  const multi = (key: string) => params.getAll(key).flatMap(v => v.split(',')).map(v => v.trim()).filter(Boolean);
  const status = multi('status');
  const priority = multi('priority');
  const sla = multi('sla').filter((v): v is SlaBucket => v === 'red' || v === 'amber' || v === 'green');
  const owner = multi('owner');
  if (!status.length && !priority.length && !sla.length && !owner.length) return EMPTY_FILTERS;
  return { status, priority, sla, owner };
}

export default function RequestsInbox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filters, setFilters] = useState<FilterState>(() => filtersFromParams(searchParams));
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

  // Unified decision flow (shared DecisionModal) for row + bulk approve/reject/send.
  const [rowDecision, setRowDecision] = useState<{ id: string; companyName: string; action: DecisionAction } | null>(null);
  const [bulkDecision, setBulkDecision] = useState<DecisionAction | null>(null);
  // Styled delete confirm (replaces window.confirm); paired with an Undo toast.
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[]; label: string } | null>(null);

  // View mode — Triage groups by SLA (default, decision-grade) vs Flat sortable
  // table (power-user). Persisted so the user's preference sticks.
  const [viewMode, setViewMode] = useUiPref<'triage' | 'flat'>('inbox.viewMode', 'triage');
  const [collapsedRed,   setCollapsedRed]   = useUiPref<boolean>('inbox.triage.red.collapsed', false);
  const [collapsedAmber, setCollapsedAmber] = useUiPref<boolean>('inbox.triage.amber.collapsed', false);
  const [collapsedGreen, setCollapsedGreen] = useUiPref<boolean>('inbox.triage.green.collapsed', false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);
  const undoTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
              `Checked the mailbox — ${res.matched ?? 0} new request${res.matched === 1 ? '' : 's'}`,
              { description: `${res.fetched ?? 0} received · ${res.skipped ?? 0} skipped` },
            );
          }
        } catch {
          // Don't block the request refresh on mailbox-check failures.
        }
      }
      const data = await api.requests.list();
      const mappedData = data.map(mapBackendRequestToListItem);
      setRequests(mappedData);
      setLoadError(false);
      setLastUpdated(new Date());
    } catch (error) {
      // Engineering detail goes to the console only — never to the user.
      console.error('Failed to fetch requests:', error);
      setLoadError(true);
      // Keep any previously-loaded rows on screen so an outage never reads as
      // "inbox zero". Only surface a toast when the user explicitly refreshed.
      if (opts?.toastResult) {
        toast.error("We couldn't load your requests. Check your connection and try again.");
      }
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
      if (filters.status.length > 0 && !filters.status.includes(requestStatusMeta(req.status).label)) return false;
      if (filters.priority.length > 0 && !filters.priority.includes(req.priority)) return false;
      if (filters.sla.length > 0 && !filters.sla.includes(req.slaStatus)) return false;
      if (filters.owner.length > 0 && !filters.owner.includes(req.owner)) return false;
      if (q) {
        const hay = `${req.companyName} ${req.smartId || req.id} ${req.brokerName || ''} ${req.owner || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sortVal = (r: RequestListItem): any => {
      if (sortKey === 'status') return requestStatusMeta(r.status).label;
      return (r as any)[sortKey];
    };

    const sorted = [...out].sort((a, b) => {
      let av: any = sortVal(a);
      let bv: any = sortVal(b);
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
  // omits rows from collapsed groups. Keyboard nav (j/k), select-all and
  // rowRefs all walk this list so they never touch hidden rows.
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

  // Broker / owner data isn't sent by the backend yet (empty string). Hide the
  // columns + their filters/sorts entirely until real data arrives, rather than
  // render blank cells or a fake "Unassigned".
  const ownersList = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => r.owner && set.add(r.owner));
    return Array.from(set).sort();
  }, [requests]);
  const hasOwners = ownersList.length > 0;
  const hasBrokers = useMemo(() => requests.some(r => r.brokerName), [requests]);

  // checkbox + Request + Company + (Broker?) + Time left + Stage + Status + (Owner?) + Actions
  const colCount = 7 + (hasBrokers ? 1 : 0) + (hasOwners ? 1 : 0);

  const activeFilterCount = filters.status.length + filters.priority.length + filters.sla.length + filters.owner.length;

  // ─── Selection logic (only ever acts on truly-visible rows) ──────
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(r => selectedIds.has(r.id));
  const someVisibleSelected = !allVisibleSelected && visibleRows.some(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) visibleRows.forEach(r => next.delete(r.id));
    else visibleRows.forEach(r => next.add(r.id));
    setSelectedIds(next);
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

  // ─── Decision flow (shared DecisionModal) ───────────────────────
  const runRowDecision = async (id: string, action: DecisionAction, reason: string) => {
    const name = requests.find(r => r.id === id)?.companyName || 'this request';
    try {
      if (action === 'approve') await api.requests.approve(id, reason || 'Approved');
      else if (action === 'reject') await api.requests.reject(id, reason || 'Rejected');
      else await api.requests.publish(id);
      toast.success(
        action === 'publish' ? `${name} sent to insurer`
          : action === 'approve' ? `${name} approved`
          : `${name} rejected`,
      );
      fetchRequests();
    } catch (err: any) {
      console.error('Decision failed for', id, err);
      if (err?.code === 'readiness_blocked') {
        toast.error(`${name} isn't ready: ${err.message}`, {
          description: 'Open the request to review the blockers and override if needed.',
        });
      } else {
        const verb = action === 'publish' ? 'send' : action;
        toast.error(`We couldn't ${verb} ${name}. Please try again — if it keeps happening, contact support.`);
      }
    }
  };

  // Bulk approve / reject / send. Collects which items failed and offers a
  // one-click retry for just those, instead of a bare "X ok, Y failed".
  const runBulk = async (action: DecisionAction, reason: string, idsOverride?: string[]) => {
    const ids = idsOverride ?? Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkActing(true);
    const ing = action === 'publish' ? 'Sending' : action === 'approve' ? 'Approving' : 'Rejecting';
    const t = toast.loading(`${ing} ${ids.length} request${ids.length > 1 ? 's' : ''}…`);
    const failedIds: string[] = [];
    for (const id of ids) {
      try {
        if (action === 'approve') await api.requests.approve(id, reason || 'Approved');
        else if (action === 'reject') await api.requests.reject(id, reason || 'Rejected');
        else await api.requests.publish(id);
      } catch (err) {
        console.error('Bulk action failed for', id, err);
        failedIds.push(id);
      }
    }
    toast.dismiss(t);
    const okCount = ids.length - failedIds.length;
    const done = action === 'publish' ? 'Sent to insurer' : action === 'approve' ? 'Approved' : 'Rejected';
    if (failedIds.length === 0) {
      toast.success(`${done} ${okCount} request${okCount !== 1 ? 's' : ''}`);
    } else {
      const failedNames = failedIds.map(id => requests.find(r => r.id === id)?.companyName || id);
      toast.error(
        okCount > 0
          ? `${done} ${okCount}, but ${failedIds.length} didn't go through.`
          : `${failedIds.length} request${failedIds.length > 1 ? 's' : ''} didn't go through.`,
        {
          description: `Not done: ${failedNames.join(', ')}. You can retry just these.`,
          duration: 12000,
          action: { label: 'Retry failed', onClick: () => runBulk(action, reason, failedIds) },
        },
      );
    }
    setBulkActing(false);
    if (!idsOverride) clearSelection();
    fetchRequests();
  };

  // ─── Soft delete with Undo ──────────────────────────────────────
  // Optimistically removes the rows, shows an Undo toast, and only calls the
  // API after the undo window closes. Failures restore the rows and explain.
  const finalizeDelete = async (ids: string[], removed: RequestListItem[]) => {
    const failed: RequestListItem[] = [];
    await Promise.all(ids.map(async id => {
      try {
        await api.requests.delete(id);
      } catch (err) {
        console.error('Delete failed for', id, err);
        const item = removed.find(r => r.id === id);
        if (item) failed.push(item);
      }
    }));
    if (failed.length) {
      setRequests(prev => {
        const have = new Set(prev.map(r => r.id));
        return [...failed.filter(r => !have.has(r.id)), ...prev];
      });
      toast.error(
        failed.length === 1
          ? `We couldn't delete ${failed[0].companyName}. It's back in your list — please try again.`
          : `We couldn't delete ${failed.length} requests. They're back in your list — please try again.`,
        { description: failed.length > 1 ? failed.map(f => f.companyName).join(', ') : undefined },
      );
    }
  };

  const softDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    const removed = requests.filter(r => ids.includes(r.id));
    setRequests(prev => prev.filter(r => !ids.includes(r.id)));
    setSelectedIds(prev => {
      const n = new Set(prev);
      ids.forEach(id => n.delete(id));
      return n;
    });
    const token = `del-${Date.now()}`;
    const label = ids.length === 1
      ? `${removed[0]?.companyName || 'Request'} deleted`
      : `${ids.length} requests deleted`;
    undoTimers.current[token] = setTimeout(() => {
      delete undoTimers.current[token];
      finalizeDelete(ids, removed);
    }, UNDO_WINDOW_MS);
    toast(label, {
      id: token,
      duration: UNDO_WINDOW_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(undoTimers.current[token]);
          delete undoTimers.current[token];
          setRequests(prev => {
            const have = new Set(prev.map(r => r.id));
            return [...removed.filter(r => !have.has(r.id)), ...prev];
          });
          toast.dismiss(token);
        },
      },
    });
  };

  // Flush any pending deletes on unmount so they aren't silently lost.
  useEffect(() => () => {
    Object.values(undoTimers.current).forEach(clearTimeout);
  }, []);

  // ─── NL filter ─────────────────────────────────────────────────
  const runNlQuery = async () => {
    const q = nlQuery.trim();
    if (!q) return;
    setNlBusy(true);
    setNlExplain(null);
    try {
      const res = await api.requests.nlFilter(q);
      if (res?.filters) {
        // Backend returns raw display statuses — translate to canonical labels
        // so they line up with the simplified Filter menu.
        const status = (res.filters.status || []).map((s: string) => requestStatusMeta(s).label);
        setFilters({
          status,
          priority: res.filters.priority || [],
          sla: res.filters.sla || [],
          owner: res.filters.owner || [],
        });
        if (res.search) setSearchQuery(res.search);
        setNlExplain(res.explanation || null);
        toast.success('Filter applied');
        if (!res.explanation) setShowNlDialog(false);
      } else {
        toast.error("We couldn't turn that into a filter. Try rephrasing it.");
      }
    } catch (err: any) {
      console.error('NL filter failed', err);
      toast.error("Search didn't work this time. Please try again.");
    } finally {
      setNlBusy(false);
    }
  };

  // ─── New request (unchanged logic) ──────────────────────────────
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestData, setNewRequestData] = useState({ companyName: '', entityName: '', priority: 'normal' });
  const [creating, setCreating] = useState(false);

  const handleCreateRequest = async () => {
    if (!newRequestData.companyName) {
      toast.error('Please enter a company name to continue.');
      return;
    }
    try {
      setCreating(true);
      const res = await api.requests.create({
        company_name: newRequestData.companyName,
        entity_name: newRequestData.entityName.trim() || newRequestData.companyName.trim(),
        priority: newRequestData.priority,
      });
      toast.success('Request created');
      setIsNewRequestOpen(false);
      setNewRequestData({ companyName: '', entityName: '', priority: 'normal' });
      fetchRequests();
      navigate(`/request/${res.id}`);
    } catch (error) {
      console.error('Failed to create request:', error);
      toast.error("We couldn't create the request. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const requestDelete = (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    const r = requests.find(x => x.id === requestId);
    setConfirmDelete({ ids: [requestId], label: r?.companyName || 'this request' });
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
      } else if (e.key === 'x' && focusedIndex != null) {
        e.preventDefault();
        const row = visibleRows[focusedIndex];
        if (row) setConfirmDelete({ ids: [row.id], label: row.companyName });
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

  const renderSlaTime = (remaining: number) => {
    if (remaining > 0) return `${remaining}h left`;
    if (remaining === 0) return 'Due now';
    return `${Math.abs(remaining)}h overdue`;
  };

  const renderSlaCell = (request: RequestListItem) => {
    const meta = slaMeta(request.slaStatus);
    const Icon = SLA_ICONS[meta.icon];
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5 shrink-0', slaTextClass(request.slaStatus))} aria-hidden />
        <span className={cn('text-xs', slaTextClass(request.slaStatus), request.slaStatus === 'green' && 'text-muted-foreground')}>
          {renderSlaTime(request.slaRemaining)}
        </span>
      </div>
    );
  };

  const selectionCount = selectedIds.size;

  const rowCtx: RowRender = {
    rowRefs,
    hasBrokers,
    hasOwners,
    onRowClick: handleRowClick,
    onRowSelect: toggleRowSelect,
    onRowDelete: requestDelete,
    onRowApprove: (r) => setRowDecision({ id: r.id, companyName: r.companyName, action: 'approve' }),
    onRowReject: (r) => setRowDecision({ id: r.id, companyName: r.companyName, action: 'reject' }),
    renderSlaCell,
  };

  const bulkTitle = bulkDecision === 'reject'
    ? `Reject ${selectionCount} request${selectionCount > 1 ? 's' : ''}`
    : bulkDecision === 'publish'
      ? `Send ${selectionCount} request${selectionCount > 1 ? 's' : ''} to insurer`
      : `Approve ${selectionCount} request${selectionCount > 1 ? 's' : ''}`;
  const bulkDesc = bulkDecision === 'publish'
    ? `This sends the approved details for ${selectionCount} request${selectionCount > 1 ? 's' : ''} to the insurer. A note is saved to the audit trail.`
    : `Your reason is saved to the audit trail on all ${selectionCount} selected request${selectionCount > 1 ? 's' : ''}.`;

  return (
    <PageShell fullBleed>
      {/* Page header — calm, decision-grade */}
      <div className="border-b border-border bg-background px-4 md:px-6 lg:px-8 py-5">
        <PageHeader
          eyebrow="Operations · Inbox"
          title="Requests"
          description={
            loading && requests.length === 0
              ? 'Loading…'
              : loadError && requests.length === 0
                ? "We couldn't load your requests."
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
                <DialogTitle>Create new request</DialogTitle>
                <DialogDescription>Start a new underwriting request. You can add documents next.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="companyName" className="text-xs">Company name</Label>
                  <Input
                    id="companyName"
                    placeholder="e.g. Acme Corp"
                    value={newRequestData.companyName}
                    onChange={(e) => setNewRequestData({ ...newRequestData, companyName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="entityName" className="text-xs">Legal entity name (optional — used for the background check)</Label>
                  <Input
                    id="entityName"
                    placeholder="Defaults to the company name if left blank"
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
                    <SelectTrigger id="priority">
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
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Input
            ref={searchInputRef}
            placeholder="Search by company, ID, broker… (press /)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm pr-8"
            aria-label="Search requests"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-ring rounded"
              aria-label="Clear search"
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
            title="Triage view — grouped by time left"
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
            {STATUS_FILTER_OPTIONS.map((status) => (
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
            <DropdownMenuLabel className="text-xs">Time left</DropdownMenuLabel>
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
            {hasOwners && (
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
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-destructive focus-ring rounded"
                    aria-label={`Delete saved view ${v.name}`}
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

        {lastUpdated && !loadError && (
          <span className="hidden md:inline text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground"
          aria-label="Keyboard shortcuts: / search, j or k to move, Enter to open, Space to select, x to delete"
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
          aria-label="Refresh requests and check the mailbox"
          title="Refresh — also checks connected mailboxes"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Persistent outage banner — distinguishes "system down" from "no work" */}
      {loadError && (
        <div role="alert" className="border-b border-destructive/30 bg-destructive/10 px-4 md:px-6 lg:px-8 py-2.5 flex items-center gap-2 flex-wrap text-sm">
          <WifiOff className="h-4 w-4 text-destructive shrink-0" aria-hidden />
          <span className="text-foreground">
            We couldn't load your requests. Check your connection and try again — your work is safe.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 ml-auto"
            onClick={() => fetchRequests({ toastResult: true })}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Retry
          </Button>
        </div>
      )}

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
            <FilterChip key={`sla-${s}`} label={`Time left: ${s === 'red' ? 'Overdue' : s === 'amber' ? 'At risk' : 'On track'}`} onRemove={() => setFilters(f => ({ ...f, sla: f.sla.filter(x => x !== s) }))} />
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
            onClick={() => setBulkDecision('reject')}
            disabled={bulkActing}
          >
            <XIcon className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setBulkDecision('approve')}
            disabled={bulkActing}
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            size="sm" variant="outline" className="h-7 gap-1.5"
            onClick={() => setBulkDecision('publish')}
            disabled={bulkActing}
          >
            <Send className="h-3.5 w-3.5" /> Send to insurer
          </Button>
          <Button
            size="sm" variant="ghost" className="h-7 gap-1.5 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete({ ids: Array.from(selectedIds), label: `${selectionCount} request${selectionCount > 1 ? 's' : ''}` })}
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
                  aria-label={allVisibleSelected ? 'Deselect all visible requests' : 'Select all visible requests'}
                />
              </TableHead>
              <SortableHead label="Request" sortKey="smartId" activeKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-[140px]" />
              <SortableHead label="Company" sortKey="companyName" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
              {hasBrokers && <TableHead className="h-9 hidden lg:table-cell text-xs font-medium">Broker</TableHead>}
              <SortableHead label="Time left" sortKey="slaRemaining" activeKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-[130px]" />
              <TableHead className="h-9 hidden md:table-cell text-xs font-medium">Stage</TableHead>
              <SortableHead label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={toggleSort} className="w-[150px]" />
              {hasOwners && <SortableHead label="Owner" sortKey="owner" activeKey={sortKey} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />}
              <TableHead className="h-9 w-[120px] text-right text-xs font-medium pr-3">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && requests.length === 0 ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={`skel-${idx}`} className="hover:bg-transparent border-border">
                  <TableCell className="py-2.5 w-10"><Skeleton className="h-4 w-4 rounded-sm" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-3 w-24" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-3.5 w-44" /></TableCell>
                  {hasBrokers && <TableCell className="py-2.5 hidden lg:table-cell"><Skeleton className="h-3 w-32" /></TableCell>}
                  <TableCell className="py-2.5"><Skeleton className="h-3 w-16" /></TableCell>
                  <TableCell className="py-2.5 hidden md:table-cell"><Skeleton className="h-3 w-20" /></TableCell>
                  <TableCell className="py-2.5"><Skeleton className="h-5 w-20 rounded-md" /></TableCell>
                  {hasOwners && <TableCell className="py-2.5 hidden sm:table-cell"><Skeleton className="h-3 w-24" /></TableCell>}
                  <TableCell className="py-2.5"></TableCell>
                </TableRow>
              ))
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-48 text-center">
                  {loadError ? (
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-10 w-10 rounded-md border border-destructive/30 bg-destructive/10 flex items-center justify-center">
                        <WifiOff className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">We couldn't load your requests</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Check your connection and try again — your work is safe.</p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fetchRequests({ toastResult: true })}>
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
                      <div className="h-10 w-10 rounded-md border border-border bg-muted/40 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {searchQuery || activeFilterCount > 0 ? 'No matches' : 'Nothing in your inbox'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {searchQuery || activeFilterCount > 0
                            ? 'Try adjusting your filters or clearing the search.'
                            : "You're all caught up — new requests will appear here."}
                        </p>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : viewMode === 'triage' ? (
              <>
                <TriageGroup
                  bucket="red"
                  label="Overdue"
                  rows={groups.red}
                  startIdx={0}
                  colCount={colCount}
                  collapsed={collapsedRed}
                  onToggle={() => setCollapsedRed(v => !v)}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  {...rowCtx}
                />
                <TriageGroup
                  bucket="amber"
                  label="Due within 24h"
                  rows={groups.amber}
                  startIdx={collapsedRed ? 0 : groups.red.length}
                  colCount={colCount}
                  collapsed={collapsedAmber}
                  onToggle={() => setCollapsedAmber(v => !v)}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  {...rowCtx}
                />
                <TriageGroup
                  bucket="green"
                  label="On track"
                  rows={groups.green}
                  startIdx={(collapsedRed ? 0 : groups.red.length) + (collapsedAmber ? 0 : groups.amber.length)}
                  colCount={colCount}
                  collapsed={collapsedGreen}
                  onToggle={() => setCollapsedGreen(v => !v)}
                  selectedIds={selectedIds}
                  focusedIndex={focusedIndex}
                  {...rowCtx}
                />
              </>
            ) : (
              filteredRequests.map((request, idx) =>
                renderInboxRow({
                  request, idx,
                  isSelected: selectedIds.has(request.id),
                  isFocused: focusedIndex === idx,
                  ...rowCtx,
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
            aria-label="View name"
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
              Describe what you want to see in plain English. The AI turns it into inbox filters.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            rows={3}
            placeholder={`e.g. "urgent requests overdue" · "anything rejected this week" · "requests awaiting info owned by Sarah"`}
            className="text-sm resize-none"
            aria-label="Describe what you want to see"
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

      {/* Per-row decision (approve / reject) — shared DecisionModal */}
      <DecisionModal
        open={rowDecision !== null}
        action={rowDecision?.action ?? 'approve'}
        companyName={rowDecision?.companyName}
        onCancel={() => setRowDecision(null)}
        onConfirm={async (reason) => {
          const d = rowDecision!;
          setRowDecision(null);
          await runRowDecision(d.id, d.action, reason);
        }}
      />

      {/* Bulk decision (approve / reject / send to insurer) — shared DecisionModal */}
      <DecisionModal
        open={bulkDecision !== null}
        action={bulkDecision ?? 'approve'}
        title={bulkTitle}
        description={bulkDesc}
        onCancel={() => setBulkDecision(null)}
        onConfirm={async (reason) => {
          const a = bulkDecision!;
          setBulkDecision(null);
          await runBulk(a, reason);
        }}
      />

      {/* Styled delete confirm — soft delete + Undo after confirming */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(v) => { if (!v) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {confirmDelete?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the request from your inbox. You'll have a few seconds to undo before it's gone for good.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                const ids = confirmDelete?.ids ?? [];
                setConfirmDelete(null);
                softDelete(ids);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function SortableHead({ label, sortKey: key, activeKey, dir, onSort, className }: {
  label: string; sortKey: SortKey; activeKey: SortKey; dir: SortDir; onSort: (k: SortKey) => void; className?: string;
}) {
  const active = activeKey === key;
  const ariaSort: 'ascending' | 'descending' | 'none' = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <TableHead className={cn('h-9 p-0 text-xs font-medium', className)} aria-sort={ariaSort}>
      <button
        type="button"
        onClick={() => onSort(key)}
        className="flex items-center gap-1 w-full h-9 px-3 text-left select-none hover:bg-muted/40 focus-ring"
      >
        {label}
        {active
          ? (dir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />)
          : <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />}
        <span className="sr-only">
          {active ? `, sorted ${dir === 'asc' ? 'ascending' : 'descending'}` : ', not sorted, activate to sort'}
        </span>
      </button>
    </TableHead>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-background border border-border text-xs">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground focus-ring rounded-full" aria-label={`Remove filter ${label}`}>
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

// Only rendered when there's a real owner (column is hidden otherwise).
function OwnerChip({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const palette = AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <span className={cn('h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold', palette)} aria-hidden>
        {initials}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}

// ─── Triage rendering ──────────────────────────────────────────────

interface RowRender {
  rowRefs: React.MutableRefObject<Array<HTMLTableRowElement | null>>;
  hasBrokers: boolean;
  hasOwners: boolean;
  onRowClick: (id: string) => void;
  onRowSelect: (id: string) => void;
  onRowDelete: (e: React.MouseEvent, id: string) => void;
  onRowApprove: (r: RequestListItem) => void;
  onRowReject: (r: RequestListItem) => void;
  renderSlaCell: (r: RequestListItem) => React.ReactNode;
}

interface GroupCtx extends RowRender {
  selectedIds: Set<string>;
  focusedIndex: number | null;
}

function TriageGroup({
  bucket, label, rows, startIdx, colCount, collapsed, onToggle, selectedIds, focusedIndex, ...ctx
}: {
  bucket: 'red' | 'amber' | 'green';
  label: string;
  rows: RequestListItem[];
  startIdx: number;
  colCount: number;
  collapsed: boolean;
  onToggle: () => void;
} & GroupCtx) {
  if (rows.length === 0) return null;

  const tone = {
    red:   { icon: AlertTriangle, dot: 'bg-destructive', text: 'text-destructive', tint: 'bg-destructive/[0.04]' },
    amber: { icon: Clock3,        dot: 'bg-warning',     text: 'text-warning',     tint: 'bg-warning/[0.04]' },
    green: { icon: CheckCircle2,  dot: 'bg-success',     text: 'text-muted-foreground', tint: 'bg-muted/30' },
  }[bucket];
  const ToneIcon = tone.icon;

  return (
    <>
      <TableRow
        className={cn('hover:bg-transparent border-border cursor-pointer', tone.tint)}
        onClick={onToggle}
      >
        <TableCell colSpan={colCount} className="py-1.5">
          <div className="flex items-center gap-2 px-1">
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            )}
            <ToneIcon className={cn('h-3.5 w-3.5', tone.text)} aria-hidden />
            <span className={cn('text-[11px] font-semibold uppercase tracking-wider', tone.text)}>
              {label}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              · {rows.length}
            </span>
            <span className="sr-only">{collapsed ? 'collapsed, activate to expand' : 'expanded, activate to collapse'}</span>
          </div>
        </TableCell>
      </TableRow>

      {!collapsed && rows.map((request, i) => {
        const visibleIdx = startIdx + i;
        return renderInboxRow({
          request,
          idx: visibleIdx,
          isSelected: selectedIds.has(request.id),
          isFocused: focusedIndex === visibleIdx,
          ...ctx,
        });
      })}
    </>
  );
}

function RowAction({ icon: Icon, label, className, onClick, hideOnMobile }: {
  icon: typeof Check; label: string; className?: string; onClick: (e: React.MouseEvent) => void; hideOnMobile?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-7 w-7 p-0 text-muted-foreground', hideOnMobile && 'hidden md:inline-flex', className)}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}

function renderInboxRow({
  request, idx, isSelected, isFocused, rowRefs, hasBrokers, hasOwners,
  onRowClick, onRowSelect, onRowDelete, onRowApprove, onRowReject, renderSlaCell,
}: {
  request: RequestListItem;
  idx: number;
  isSelected: boolean;
  isFocused: boolean;
} & RowRender) {
  const sm = requestStatusMeta(request.status);
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
        <Checkbox checked={isSelected} aria-label={`Select ${request.companyName}`} />
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
        {request.smartId || request.id.slice(0, 8)}
      </TableCell>
      <TableCell className="py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{request.companyName}</span>
          {request.priority === 'Urgent' && (
            <Badge variant="critical" className="h-4 px-1 text-[10px]">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" aria-hidden />
              Urgent
            </Badge>
          )}
        </div>
        {hasBrokers && <span className="text-xs text-muted-foreground lg:hidden">{request.brokerName}</span>}
      </TableCell>
      {hasBrokers && (
        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground py-2.5">
          {request.brokerName}
        </TableCell>
      )}
      <TableCell className="py-2.5">
        {renderSlaCell(request)}
      </TableCell>
      <TableCell className="hidden md:table-cell text-sm text-muted-foreground py-2.5">
        {request.currentStage}
      </TableCell>
      <TableCell className="py-2.5">
        <Badge variant={sm.variant}>{sm.label}</Badge>
      </TableCell>
      {hasOwners && (
        <TableCell className="hidden sm:table-cell py-2.5">
          {request.owner
            ? <OwnerChip name={request.owner} />
            : <span className="text-sm text-muted-foreground">—</span>}
        </TableCell>
      )}
      <TableCell className="py-2.5 pr-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
          <RowAction icon={Check} label={`Approve ${request.companyName}`} className="hover:text-success" onClick={() => onRowApprove(request)} hideOnMobile />
          <RowAction icon={XIcon} label={`Reject ${request.companyName}`} className="hover:text-destructive" onClick={() => onRowReject(request)} hideOnMobile />
          <RowAction icon={Trash2} label={`Delete ${request.companyName}`} className="hover:text-destructive" onClick={(e) => onRowDelete(e, request.id)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
