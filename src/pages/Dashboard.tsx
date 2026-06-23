import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
    Plus, SlidersHorizontal, ArrowRight, X,
    Layers, AlertTriangle, Clock3, CheckCircle2, Gauge, Timer,
    ShieldAlert, Send, Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { PageShell } from '@/components/layout/PageShell';
import { format } from 'date-fns';

// ── theme chart colors (driven from CSS tokens so they follow the theme) ─────
const C = {
    in: 'hsl(var(--info))', out: 'hsl(var(--success))', stuck: 'hsl(var(--destructive))',
    primary: 'hsl(var(--primary))', success: 'hsl(var(--success))', info: 'hsl(var(--info))',
    warning: 'hsl(var(--warning))', destructive: 'hsl(var(--destructive))',
    muted: 'hsl(var(--muted-foreground))', grid: 'hsl(var(--border))',
};

const FLAG_LABEL: Record<string, string> = {
    sanctions_risk: 'Sanctions match', expired_document: 'Document expired', name_mismatch: "Name doesn't match",
    missing_document: 'Document missing', employee_count_mismatch: 'MOL roster mismatch', incomplete_extraction: 'Incomplete extraction',
    pep_risk: 'PEP match', offshore_entity: 'Offshore entity', high_risk_activity: 'High-risk activity',
    data_inconsistency: 'Data inconsistency', low_confidence: 'Low-confidence extraction', manual_review_required: 'Manual review needed',
};
const FLAG_TIER: Record<string, 'URGENT' | 'IMPORTANT' | 'WATCH'> = {
    sanctions_risk: 'URGENT', expired_document: 'URGENT', pep_risk: 'URGENT', offshore_entity: 'URGENT',
    name_mismatch: 'IMPORTANT', missing_document: 'IMPORTANT', employee_count_mismatch: 'IMPORTANT', high_risk_activity: 'IMPORTANT',
};
const TIER_STYLE: Record<string, string> = {
    URGENT: 'text-destructive border-destructive/30 bg-destructive/10',
    IMPORTANT: 'text-warning border-warning/30 bg-warning/10',
    WATCH: 'text-muted-foreground border-border bg-muted/40',
};
const TIER_BAR: Record<string, string> = { URGENT: 'bg-destructive', IMPORTANT: 'bg-warning', WATCH: 'bg-muted-foreground/50' };

const STAGE_ORDER = ['Documents Availability', 'Name matching', 'Individual Document Validation', 'Census Validation', 'MOL Validation', 'MOL Verification', 'AML', 'Compliance', 'Final Review', 'Book'];
const STAGE_SHORT: Record<string, string> = {
    'Documents Availability': 'Documents', 'Name matching': 'Name match', 'Individual Document Validation': 'Doc review',
    'Census Validation': 'Census', 'MOL Validation': 'Census', 'MOL Verification': 'Census',
    'AML': 'AML', 'Compliance': 'Compliance', 'Final Review': 'Final review', 'Book': 'Book',
};

const STATUS_META: Record<string, { label: string; tone: 'success' | 'info' | 'warning' | 'destructive' | 'muted' }> = {
    submitted: { label: 'Just arrived', tone: 'info' },
    in_review: { label: 'Under review', tone: 'info' },
    missing_info: { label: 'Awaiting info', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
    ready_for_export: { label: 'Approved', tone: 'success' },
    issued: { label: 'Published', tone: 'success' },
    exported: { label: 'Published', tone: 'success' },
    rejected: { label: 'Declined', tone: 'destructive' },
};
const TONE_BADGE: Record<string, string> = {
    success: 'text-success border-success/30 bg-success/10',
    info: 'text-info border-info/30 bg-info/10',
    warning: 'text-warning border-warning/30 bg-warning/10',
    destructive: 'text-destructive border-destructive/30 bg-destructive/10',
    muted: 'text-muted-foreground border-border bg-muted/40',
};
const OPEN_STATUSES = ['submitted', 'in_review', 'missing_info', 'approved'];
const STATUS_FILTERS = [
    { value: 'submitted', label: 'Just arrived' }, { value: 'in_review', label: 'Under review' },
    { value: 'missing_info', label: 'Awaiting info' }, { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Declined' },
];

type Range = 'today' | 'week' | 'month';
const RANGE_LABEL: Record<Range, string> = { today: 'today', week: 'this week', month: 'this month' };

interface Bucket { start: number; end: number; label: string }
function buildBuckets(range: Range): Bucket[] {
    const now = new Date();
    const out: Bucket[] = [];
    if (range === 'today') {
        const base = new Date(now); base.setHours(0, 0, 0, 0);
        for (let h = 0; h < 24; h++) {
            const s = new Date(base); s.setHours(h);
            const e = new Date(base); e.setHours(h + 1);
            out.push({ start: s.getTime(), end: e.getTime(), label: format(s, 'ha') });
        }
    } else {
        const days = range === 'week' ? 7 : 30;
        const base = new Date(now); base.setHours(0, 0, 0, 0); base.setDate(now.getDate() - (days - 1));
        for (let i = 0; i < days; i++) {
            const s = new Date(base); s.setDate(base.getDate() + i);
            const e = new Date(s); e.setDate(s.getDate() + 1);
            out.push({ start: s.getTime(), end: e.getTime(), label: format(s, days === 7 ? 'EEE' : 'd MMM') });
        }
    }
    return out;
}

function humaniseDuration(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '—';
    const h = seconds / 3600;
    if (h < 1) return `${Math.round(seconds / 60)}m`;
    if (h < 48) return `${Math.round(h)}h`;
    return `${Math.round(h / 24)}d`;
}

const TAB_DEFS = [
    { id: 'all', label: 'All' }, { id: 'arrived', label: 'Just arrived' }, { id: 'review', label: 'Under review' },
    { id: 'attention', label: 'Needs attention' }, { id: 'approved', label: 'Approved' },
] as const;
type TabId = typeof TAB_DEFS[number]['id'];

interface Filters { statuses: Set<string>; stages: Set<string>; priorities: Set<string>; overdueOnly: boolean; risksOnly: boolean }
const EMPTY_FILTERS: Filters = { statuses: new Set(), stages: new Set(), priorities: new Set(), overdueOnly: false, risksOnly: false };

export default function Dashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [firstName, setFirstName] = useState('');
    const [tab, setTab] = useState<TabId>('all');
    const [range, setRange] = useState<Range>('week');
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [filterOpen, setFilterOpen] = useState(false);

    useEffect(() => {
        (async () => {
            const [r, u] = await Promise.allSettled([api.requests.list(), api.user.me()]);
            if (r.status === 'fulfilled') setRequests((r.value as any[]) || []);
            if (u.status === 'fulfilled') setFirstName((u.value as any)?.first_name || (u.value as any)?.username || '');
            setLoading(false);
        })();
    }, []);

    const now = Date.now();
    const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
    const isOverdue = (r: any) => r.sla_deadline && new Date(r.sla_deadline).getTime() < now && !['approved', 'rejected', 'issued', 'exported'].includes(r.status);

    const activeFilterCount = filters.statuses.size + filters.stages.size + filters.priorities.size + (filters.overdueOnly ? 1 : 0) + (filters.risksOnly ? 1 : 0);

    // ── Filters drive the entire request universe ────────────────────────────
    const filtered = useMemo(() => requests.filter(r => {
        if (filters.statuses.size && !filters.statuses.has(r.status)) return false;
        if (filters.stages.size && !filters.stages.has(r.current_stage_name)) return false;
        if (filters.priorities.size && !filters.priorities.has(r.priority)) return false;
        if (filters.overdueOnly && !isOverdue(r)) return false;
        if (filters.risksOnly && !((r.open_risk_count || 0) > 0)) return false;
        return true;
    }), [requests, filters, now]);

    // ── Range drives the time-series window ──────────────────────────────────
    const buckets = useMemo(() => buildBuckets(range), [range]);
    const flow = useMemo(() => {
        const ts = (v: any) => (v ? Date.parse(v) : null);
        return buckets.map(b => {
            let comingIn = 0, goingOut = 0; const stuck = new Set<string>();
            for (const r of filtered) {
                const c = ts(r.created_at); if (c != null && c >= b.start && c < b.end) comingIn++;
                const d = ts(r.decision_at), p = ts(r.published_at);
                if ((d != null && d >= b.start && d < b.end) || (p != null && p >= b.start && p < b.end)) goingOut++;
                for (const f of (r.risk_flags || [])) { const ft = ts(f.created_at); if (ft != null && ft >= b.start && ft < b.end) { stuck.add(r.id); break; } }
            }
            return { label: b.label, comingIn, goingOut, gotStuck: stuck.size };
        });
    }, [buckets, filtered]);
    const flowTotals = useMemo(() => flow.reduce((a, d) => ({ in: a.in + d.comingIn, out: a.out + d.goingOut, stuck: a.stuck + d.gotStuck }), { in: 0, out: 0, stuck: 0 }), [flow]);
    const rangeWindow: [number, number] = buckets.length ? [buckets[0].start, buckets[buckets.length - 1].end] : [0, now];

    // ── Snapshot metrics from the filtered set ───────────────────────────────
    const openSet = filtered.filter(r => OPEN_STATUSES.includes(r.status));
    const inFlight = openSet.length;
    const needAttention = filtered.filter(r => r.status === 'missing_info' || isOverdue(r)).length;
    const underReview = filtered.filter(r => r.status === 'in_review').length;
    const pastDeadline = filtered.filter(isOverdue).length;
    const approvedInRange = filtered.filter(r => r.status === 'approved' && r.decision_at && Date.parse(r.decision_at) >= rangeWindow[0] && Date.parse(r.decision_at) < rangeWindow[1]).length;
    const avgTurnaround = useMemo(() => {
        const dec = filtered.filter(r => r.decision_at && r.created_at);
        if (!dec.length) return null;
        return dec.reduce((a, r) => a + (Date.parse(r.decision_at) - Date.parse(r.created_at)) / 1000, 0) / dec.length;
    }, [filtered]);

    const donut = useMemo(() => {
        const sc = (preds: string[]) => filtered.filter(r => preds.includes(r.status)).length;
        const data = [
            { name: 'Approved', value: sc(['approved', 'ready_for_export', 'issued', 'exported']), color: C.success },
            { name: 'Under review', value: sc(['in_review']), color: C.info },
            { name: 'Needs attention', value: sc(['missing_info', 'rejected']), color: C.destructive },
            { name: 'Just arrived', value: sc(['submitted']), color: C.muted },
        ].filter(d => d.value > 0);
        return { data, total: filtered.length };
    }, [filtered]);

    const stageBars = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of openSet) { const n = r.current_stage_name; if (n) m.set(n, (m.get(n) || 0) + 1); }
        return STAGE_ORDER.map(name => ({ stage: STAGE_SHORT[name] || name, count: m.get(name) || 0 }));
    }, [openSet]);

    const allOpenFlags = useMemo(() => filtered.flatMap(r => (r.risk_flags || []).filter((f: any) => !f.resolved)), [filtered]);
    const topIssues = useMemo(() => {
        const m = new Map<string, number>();
        for (const f of allOpenFlags) m.set(f.flag_type, (m.get(f.flag_type) || 0) + 1);
        const rows = Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const max = Math.max(1, ...rows.map(r => r[1]));
        return rows.map(([ft, count]) => ({ label: FLAG_LABEL[ft] || ft.replace(/_/g, ' '), count, tier: FLAG_TIER[ft] || 'WATCH', pct: Math.round((count / max) * 100) }));
    }, [allOpenFlags]);

    const activity = useMemo(() => {
        const ev: { id: string; icon: any; tone: string; title: string; actor: string; at: Date }[] = [];
        for (const r of filtered) {
            if (r.created_at) ev.push({ id: `c-${r.id}`, icon: Sparkles, tone: 'muted', title: `Request created · ${r.company_name}`, actor: 'Intake', at: new Date(r.created_at) });
            if (r.decision_at) ev.push({ id: `d-${r.id}`, icon: r.status === 'approved' ? CheckCircle2 : AlertTriangle, tone: r.status === 'approved' ? 'success' : 'destructive', title: `${r.status === 'approved' ? 'Approved' : 'Decided'} · ${r.company_name}`, actor: r.decision_by || 'Ops', at: new Date(r.decision_at) });
            if (r.published_at) ev.push({ id: `p-${r.id}`, icon: Send, tone: 'info', title: `Published · ${r.company_name}`, actor: r.published_by || 'System', at: new Date(r.published_at) });
        }
        return ev.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6);
    }, [filtered]);

    const workload = useMemo(() => {
        const m = new Map<string, number>();
        for (const r of filtered) { const o = r.owner || 'Unassigned'; m.set(o, (m.get(o) || 0) + 1); }
        const max = Math.max(1, ...Array.from(m.values()));
        return Array.from(m.entries()).map(([name, n]) => ({ name, n, pct: Math.round((n / max) * 100) }));
    }, [filtered]);

    const tableRows = useMemo(() => {
        const rows = filtered.map(r => {
            const stages = r.request_stages || [];
            const done = stages.filter((s: any) => s.status === 'completed').length;
            const progress = stages.length ? Math.round((done / stages.length) * 100) : 0;
            const docStage = stages.find((s: any) => s.stage_name === 'Documents Availability');
            const docTotal = docStage?.checklists?.length || 0;
            const docDone = docStage?.checklists?.filter((c: any) => c.checked).length || 0;
            const overdue = isOverdue(r);
            const meta = overdue ? { label: 'Needs attention', tone: 'destructive' as const } : (STATUS_META[r.status] || { label: r.status, tone: 'muted' as const });
            return { r, progress, issues: r.open_risk_count || 0, docDone, docTotal, overdue, meta };
        });
        const f = (id: TabId) => {
            if (id === 'arrived') return rows.filter(x => x.r.status === 'submitted');
            if (id === 'review') return rows.filter(x => x.r.status === 'in_review');
            if (id === 'attention') return rows.filter(x => x.overdue || x.r.status === 'missing_info' || x.issues > 0);
            if (id === 'approved') return rows.filter(x => ['approved', 'issued', 'exported', 'ready_for_export'].includes(x.r.status));
            return rows;
        };
        return { current: f(tab), count: (id: TabId) => f(id).length };
    }, [filtered, tab, now]);

    const toggle = (set: Set<string>, v: string) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n; };

    if (loading) {
        return (
            <PageShell>
                <Skeleton className="h-10 w-96" />
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
                <div className="grid lg:grid-cols-3 gap-4"><Skeleton className="h-72 lg:col-span-2 rounded-lg" /><Skeleton className="h-72 rounded-lg" /></div>
            </PageShell>
        );
    }

    const sparkIn = flow.map(f => f.comingIn);
    const sparkOut = flow.map(f => f.goingOut);
    const sparkStuck = flow.map(f => f.gotStuck);

    return (
        <PageShell>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap refined-in">
                <div>
                    <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">Operations dashboard</p>
                    <h1 className="text-[28px] font-semibold tracking-tight text-foreground font-display leading-tight mt-1">{greeting}{firstName ? `, ${firstName}` : ''}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {inFlight} requests in flight · <span className={pastDeadline ? 'text-destructive font-medium' : ''}>{pastDeadline} past deadline</span> · {needAttention} waiting on you
                        {activeFilterCount > 0 && <span className="text-primary"> · filtered</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60">
                        {(['today', 'week', 'month'] as Range[]).map(rg => (
                            <button key={rg} onClick={() => setRange(rg)} className={cn('focus-ring h-7 px-2.5 rounded-md text-xs font-medium transition-colors', range === rg ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>{rg === 'today' ? 'Today' : rg === 'week' ? 'This week' : 'This month'}</button>
                        ))}
                    </div>
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                                {activeFilterCount > 0 && <span className="ml-0.5 text-[10px] tabular-nums px-1 rounded bg-primary/15 text-primary">{activeFilterCount}</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-72 p-0">
                            <div className="flex items-center justify-between px-3 h-10 border-b border-border">
                                <span className="text-[13px] font-semibold">Filters</span>
                                {activeFilterCount > 0 && <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-primary hover:underline">Clear all</button>}
                            </div>
                            <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto">
                                <FilterGroup label="Status">
                                    {STATUS_FILTERS.map(s => (
                                        <CheckRow key={s.value} checked={filters.statuses.has(s.value)} onChange={() => setFilters(f => ({ ...f, statuses: toggle(f.statuses, s.value) }))}>{s.label}</CheckRow>
                                    ))}
                                </FilterGroup>
                                <FilterGroup label="Stage">
                                    {STAGE_ORDER.map(s => (
                                        <CheckRow key={s} checked={filters.stages.has(s)} onChange={() => setFilters(f => ({ ...f, stages: toggle(f.stages, s) }))}>{STAGE_SHORT[s] || s}</CheckRow>
                                    ))}
                                </FilterGroup>
                                <FilterGroup label="Priority">
                                    {['urgent', 'normal'].map(p => (
                                        <CheckRow key={p} checked={filters.priorities.has(p)} onChange={() => setFilters(f => ({ ...f, priorities: toggle(f.priorities, p) }))}>{p === 'urgent' ? 'Urgent' : 'Normal'}</CheckRow>
                                    ))}
                                </FilterGroup>
                                <div className="space-y-2.5 pt-1 border-t border-border">
                                    <SwitchRow checked={filters.overdueOnly} onChange={(v) => setFilters(f => ({ ...f, overdueOnly: v }))}>Overdue only</SwitchRow>
                                    <SwitchRow checked={filters.risksOnly} onChange={(v) => setFilters(f => ({ ...f, risksOnly: v }))}>Has open risks</SwitchRow>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button size="sm" className="gap-1.5" onClick={() => navigate('/requests')}><Plus className="h-3.5 w-3.5" /> New request</Button>
                </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap -mt-2">
                    {[...filters.statuses].map(v => <FilterChip key={`s${v}`} onRemove={() => setFilters(f => ({ ...f, statuses: toggle(f.statuses, v) }))}>{STATUS_FILTERS.find(s => s.value === v)?.label || v}</FilterChip>)}
                    {[...filters.stages].map(v => <FilterChip key={`g${v}`} onRemove={() => setFilters(f => ({ ...f, stages: toggle(f.stages, v) }))}>{STAGE_SHORT[v] || v}</FilterChip>)}
                    {[...filters.priorities].map(v => <FilterChip key={`p${v}`} onRemove={() => setFilters(f => ({ ...f, priorities: toggle(f.priorities, v) }))}>{v === 'urgent' ? 'Urgent' : 'Normal'}</FilterChip>)}
                    {filters.overdueOnly && <FilterChip onRemove={() => setFilters(f => ({ ...f, overdueOnly: false }))}>Overdue only</FilterChip>}
                    {filters.risksOnly && <FilterChip onRemove={() => setFilters(f => ({ ...f, risksOnly: false }))}>Has open risks</FilterChip>}
                    <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">Clear</button>
                </div>
            )}

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
                <Kpi icon={Layers} label="Requests in flight" value={inFlight} sub={`${filtered.length} total`} series={sparkIn} seriesColor={C.info} onClick={() => navigate('/requests')} />
                <Kpi icon={AlertTriangle} label="Need attention" value={needAttention} sub="stalled or missing info" tone={needAttention ? 'warning' : 'muted'} series={sparkStuck} seriesColor={C.warning} onClick={() => navigate('/requests')} />
                <Kpi icon={Clock3} label="Waiting on us" value={underReview} sub="under review" tone="info" onClick={() => navigate('/requests')} />
                <Kpi icon={CheckCircle2} label={`Approved ${RANGE_LABEL[range]}`} value={approvedInRange} sub={`decided ${RANGE_LABEL[range]}`} tone={approvedInRange ? 'success' : 'muted'} series={sparkOut} seriesColor={C.success} onClick={() => navigate('/requests')} />
                <Kpi icon={Timer} label="Avg turnaround" value={humaniseDuration(avgTurnaround)} sub="intake → decision" onClick={() => navigate('/requests')} />
                <Kpi icon={Gauge} label="Past deadline" value={pastDeadline} sub="open & overdue" tone={pastDeadline ? 'destructive' : 'muted'} series={sparkStuck} seriesColor={C.destructive} onClick={() => navigate('/requests')} />
            </div>

            {/* Flow + status */}
            <div className="grid lg:grid-cols-3 gap-4">
                <Panel title={`Request flow · ${RANGE_LABEL[range]}`} sub="Volume by day" className="lg:col-span-2 refined-in">
                    <div className="h-[260px] -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={flow} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.in} stopOpacity={0.18} /><stop offset="100%" stopColor={C.in} stopOpacity={0} /></linearGradient>
                                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.out} stopOpacity={0.16} /><stop offset="100%" stopColor={C.out} stopOpacity={0} /></linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 3" opacity={0.5} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: C.muted }} interval="preserveStartEnd" minTickGap={24} />
                                <YAxis tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11, fill: C.muted }} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 12 }} />
                                <Area type="monotone" dataKey="comingIn" name="Coming in" stroke={C.in} strokeWidth={2} fill="url(#gIn)" dot={false} />
                                <Area type="monotone" dataKey="goingOut" name="Going out" stroke={C.out} strokeWidth={2} fill="url(#gOut)" dot={false} />
                                <Area type="monotone" dataKey="gotStuck" name="Got stuck" stroke={C.stuck} strokeWidth={2} fill="transparent" strokeDasharray="4 3" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border">
                        <FlowStat dot={C.in} label="Coming in" value={flowTotals.in} />
                        <FlowStat dot={C.out} label="Going out" value={flowTotals.out} />
                        <FlowStat dot={C.stuck} label="Got stuck" value={flowTotals.stuck} />
                    </div>
                </Panel>

                <Panel title="Where things stand" sub="Status mix across matching requests" className="refined-in">
                    <div className="flex items-center gap-4">
                        <div className="relative w-[150px] h-[150px] shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={donut.data} dataKey="value" innerRadius={52} outerRadius={70} paddingAngle={2} stroke="none">
                                        {donut.data.map((d, i) => <Cell key={i} fill={d.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 12 }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-2xl font-semibold tabular-nums font-display leading-none">{donut.total}</span>
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">Total</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                            {donut.data.map(d => (
                                <div key={d.name} className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                                    <span className="text-xs text-muted-foreground flex-1 truncate">{d.name}</span>
                                    <span className="text-sm font-semibold tabular-nums">{d.value}</span>
                                </div>
                            ))}
                            {donut.data.length === 0 && <p className="text-xs text-muted-foreground">No matching requests.</p>}
                        </div>
                    </div>
                </Panel>
            </div>

            {/* Table + right rail */}
            <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <Panel title="All requests" headerRight={<Link to="/requests" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">Open inbox <ArrowRight className="h-3 w-3" /></Link>} refined>
                        <div className="flex items-center gap-1 mb-3 flex-wrap">
                            {TAB_DEFS.map(td => (
                                <button key={td.id} onClick={() => setTab(td.id)} className={cn('focus-ring inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border transition-colors', tab === td.id ? 'border-primary/40 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground hover:bg-muted')}>
                                    {td.label}<span className="text-[10px] tabular-nums opacity-70">{tableRows.count(td.id)}</span>
                                </button>
                            ))}
                        </div>
                        <div className="overflow-x-auto -mx-1">
                            <table className="w-full text-sm min-w-[640px]">
                                <thead>
                                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                                        <th className="text-left font-semibold px-2 py-2">Company</th>
                                        <th className="text-left font-semibold px-2 py-2">Where it is</th>
                                        <th className="text-left font-semibold px-2 py-2 w-28">Progress</th>
                                        <th className="text-center font-semibold px-2 py-2">Issues</th>
                                        <th className="text-center font-semibold px-2 py-2">Docs</th>
                                        <th className="text-left font-semibold px-2 py-2">Deadline</th>
                                        <th className="text-right font-semibold px-2 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableRows.current.map(({ r, progress, issues, docDone, docTotal, meta }) => {
                                        const hrs = r.sla_deadline ? Math.round((new Date(r.sla_deadline).getTime() - now) / 3600000) : null;
                                        return (
                                            <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/request/${r.id}`)}>
                                                <td className="px-2 py-2.5"><p className="font-medium text-foreground truncate max-w-[200px]">{r.company_name}</p><p className="text-[10px] font-mono text-muted-foreground">{r.smart_id}</p></td>
                                                <td className="px-2 py-2.5 text-muted-foreground text-xs">{r.current_stage_name || '—'}</td>
                                                <td className="px-2 py-2.5"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div><span className="text-[10px] tabular-nums text-muted-foreground w-7">{progress}%</span></div></td>
                                                <td className="px-2 py-2.5 text-center">{issues > 0 ? <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium"><ShieldAlert className="h-3 w-3" />{issues}</span> : <span className="text-muted-foreground/50">—</span>}</td>
                                                <td className="px-2 py-2.5 text-center text-xs tabular-nums text-muted-foreground">{docTotal ? `${docDone}/${docTotal}` : '—'}</td>
                                                <td className="px-2 py-2.5 text-xs"><span className={cn('inline-flex items-center gap-1', hrs !== null && hrs < 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}><Clock3 className="h-3 w-3" />{hrs === null ? '—' : hrs >= 0 ? `${hrs}h left` : `${Math.abs(hrs)}h late`}</span></td>
                                                <td className="px-2 py-2.5 text-right"><Badge variant="outline" className={cn('text-[10px] uppercase font-semibold', TONE_BADGE[meta.tone])}>{meta.label}</Badge></td>
                                            </tr>
                                        );
                                    })}
                                    {tableRows.current.length === 0 && <tr><td colSpan={7} className="text-center text-sm text-muted-foreground py-8">No requests match these filters.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <Panel title="Where requests are stuck" sub="Open requests, by step in the process" refined>
                        <div className="h-[220px] -ml-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stageBars} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke={C.grid} strokeDasharray="3 3" opacity={0.5} />
                                    <XAxis dataKey="stage" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: C.muted }} interval={0} />
                                    <YAxis tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11, fill: C.muted }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted) / 0.4)' }} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--popover))', fontSize: 12 }} />
                                    <Bar dataKey="count" fill={C.primary} radius={[4, 4, 0, 0]} maxBarSize={44} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>
                </div>

                <div className="space-y-4">
                    <Panel title="Top issues" headerRight={<span className="text-[11px] text-muted-foreground">{allOpenFlags.length} open</span>} refined>
                        <div className="space-y-2.5">
                            {topIssues.map((i: any) => (
                                <div key={i.label}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[13px] text-foreground truncate">{i.label}</span>
                                        <div className="flex items-center gap-2 shrink-0"><Badge variant="outline" className={cn('text-[9px] uppercase font-bold py-0 h-4', TIER_STYLE[i.tier])}>{i.tier}</Badge><span className="text-sm font-semibold tabular-nums w-6 text-right">{i.count}</span></div>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={cn('h-full', TIER_BAR[i.tier])} style={{ width: `${i.pct}%` }} /></div>
                                </div>
                            ))}
                            {topIssues.length === 0 && <p className="text-xs text-success">No open issues.</p>}
                        </div>
                    </Panel>

                    <Panel title="Who's handling what" headerRight={<span className="text-[11px] text-muted-foreground">{filtered.length} open</span>} refined>
                        <div className="space-y-3">
                            {workload.map(w => (
                                <div key={w.name}>
                                    <div className="flex items-center justify-between gap-2 mb-1"><span className="text-[13px] text-foreground truncate">{w.name}</span><span className="text-[11px] text-muted-foreground tabular-nums">{w.n} open</span></div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary/70" style={{ width: `${w.pct}%` }} /></div>
                                </div>
                            ))}
                            {workload.length === 0 && <p className="text-xs text-muted-foreground">No matching requests.</p>}
                        </div>
                        {workload.length === 1 && workload[0].name === 'Unassigned' && <p className="text-[10px] text-muted-foreground/70 mt-3 italic">Assignee tracking isn't enabled yet — open work shows as unassigned.</p>}
                    </Panel>

                    <Panel title="What just happened" headerRight={<Link to="/requests" className="text-xs font-medium text-primary hover:underline">See all</Link>} refined>
                        {activity.length === 0 ? <p className="text-xs text-muted-foreground">No recent activity.</p> : (
                            <div className="space-y-0">
                                {activity.map((e, i) => {
                                    const Icon = e.icon;
                                    return (
                                        <div key={e.id} className="flex gap-3">
                                            <div className="flex flex-col items-center"><span className={cn('flex items-center justify-center w-6 h-6 rounded-full border shrink-0 bg-card', TONE_BADGE[e.tone])}><Icon className="h-3 w-3" /></span>{i < activity.length - 1 && <span className="w-px flex-1 bg-border my-1" />}</div>
                                            <div className="pb-3 min-w-0"><p className="text-[13px] text-foreground truncate">{e.title}</p><p className="text-[11px] text-muted-foreground">{e.actor} · {format(e.at, 'dd MMM · HH:mm')}</p></div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Panel>
                </div>
            </div>
        </PageShell>
    );
}

// ── small components ─────────────────────────────────────────────────────────
function Kpi({ icon: Icon, label, value, sub, tone = 'muted', series, seriesColor, onClick }: { icon: any; label: string; value: number | string; sub?: string; tone?: 'success' | 'warning' | 'destructive' | 'info' | 'muted'; series?: number[]; seriesColor?: string; onClick?: () => void }) {
    const subCls = tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : tone === 'info' ? 'text-info' : 'text-muted-foreground';
    return (
        <div
            className={cn('rounded-lg border border-border bg-card p-3.5 flex flex-col refined-in card-interactive', onClick && 'cursor-pointer focus-ring')}
            {...(onClick ? { role: 'button' as const, tabIndex: 0, onClick, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } } : {})}
        >
            <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" /><span className="text-[10px] font-semibold uppercase tracking-widest truncate">{label}</span></div>
            <div className="flex items-end justify-between gap-2 mt-1.5">
                <span className="text-[24px] font-semibold tracking-tight text-foreground tabular-nums font-display leading-none">{value}</span>
                {series && series.some(v => v > 0) && <Sparkline data={series} color={seriesColor || C.primary} />}
            </div>
            {sub && <p className={cn('text-[10.5px] mt-2 truncate', subCls)}>{sub}</p>}
        </div>
    );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
    const w = 56, h = 22, max = Math.max(1, ...data), min = Math.min(...data), span = max - min || 1;
    const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - ((v - min) / span) * (h - 3) - 1.5}`).join(' ');
    return <svg width={w} height={h} className="shrink-0 overflow-visible" aria-hidden><polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Panel({ title, sub, headerRight, className, refined, children }: { title: string; sub?: string; headerRight?: React.ReactNode; className?: string; refined?: boolean; children: React.ReactNode }) {
    return (
        <div className={cn('rounded-lg border border-border bg-card', refined && 'refined-in', className)}>
            <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-3 border-b border-border">
                <div className="min-w-0"><h3 className="text-[13px] font-semibold text-foreground">{title}</h3>{sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}</div>
                {headerRight}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function FlowStat({ dot, label, value }: { dot: string; label: string; value: number }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />
            <div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums font-display leading-none">{value}</p></div>
        </div>
    );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p><div className="space-y-1.5">{children}</div></div>;
}
function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
    return (
        <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer select-none">
            <Checkbox checked={checked} onCheckedChange={onChange} className="h-4 w-4" /> {children}
        </label>
    );
}
function SwitchRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
    return <label className="flex items-center justify-between gap-2 text-[13px] text-foreground cursor-pointer select-none"><span>{children}</span><Switch checked={checked} onCheckedChange={onChange} /></label>;
}
function FilterChip({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-medium">
            {children}<button onClick={onRemove} className="hover:bg-primary/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
        </span>
    );
}
