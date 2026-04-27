import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Loader2, AlertTriangle, ShieldAlert, Clock, FileText, TrendingUp,
    ArrowRight, CheckCircle2, XCircle, Send, Layers, FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
    BarChart, Bar, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Skeleton } from '@/components/ui/skeleton';
import { ParallaxHero } from '@/components/ui/parallax-hero';

interface DashboardMetrics {
    totals: {
        requests: number;
        open: number;
        documents: number;
        docs_last_7d: number;
        failed_docs: number;
        open_risk_flags: number;
        critical_risks: number;
    };
    status_breakdown: { status: string; count: number }[];
    sla_buckets: { overdue: number; due_24h: number; due_later: number };
    priority_breakdown: { priority: string; count: number }[];
    stage_distribution: { current_stage__name: string; count: number }[];
    risk_by_severity: { severity: string; count: number }[];
    risk_by_type: { flag_type: string; count: number }[];
    throughput: {
        created: { day: string; count: number }[];
        decided: { day: string; count: number }[];
        published: { day: string; count: number }[];
    };
    avg_decision_seconds: number | null;
    confidence_trend: { day: string; avg_confidence: number }[];
}

const STATUS_LABEL: Record<string, string> = {
    submitted: 'New',
    in_review: 'In Review',
    missing_info: 'Missing Info',
    approved: 'Approved',
    rejected: 'Rejected',
    exported: 'Published',
};

const STATUS_COLOR: Record<string, string> = {
    submitted: 'hsl(var(--muted-foreground))',
    in_review: 'hsl(var(--info, 220 80% 60%))',
    missing_info: 'hsl(var(--warning, 38 92% 50%))',
    approved: 'hsl(var(--success, 142 70% 45%))',
    rejected: 'hsl(var(--destructive))',
    exported: 'hsl(var(--primary))',
};

const SEVERITY_COLOR: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#eab308',
    low: '#9ca3af',
    info: '#94a3b8',
};

function humaniseDuration(seconds: number | null | undefined): string {
    if (seconds == null) return '—';
    const hours = seconds / 3600;
    if (hours < 1) return `${Math.round(seconds / 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
}

function mergeTimeseries(
    created: { day: string; count: number }[],
    decided: { day: string; count: number }[],
    published: { day: string; count: number }[],
): { day: string; created: number; decided: number; published: number; label: string }[] {
    const days = new Set<string>([
        ...created.map(r => r.day),
        ...decided.map(r => r.day),
        ...published.map(r => r.day),
    ]);
    const c = new Map(created.map(r => [r.day, r.count]));
    const d = new Map(decided.map(r => [r.day, r.count]));
    const p = new Map(published.map(r => [r.day, r.count]));
    return Array.from(days)
        .sort()
        .map(day => ({
            day,
            created: c.get(day) || 0,
            decided: d.get(day) || 0,
            published: p.get(day) || 0,
            label: (() => {
                try {
                    return format(parseISO(day), 'dd MMM');
                } catch {
                    return day;
                }
            })(),
        }));
}

function KpiCard({
    icon: Icon, label, value, hint, tone = 'default', to,
}: {
    icon: any; label: string; value: string | number; hint?: string;
    tone?: 'default' | 'warning' | 'danger' | 'success';
    to?: string;
}) {
    const toneChip = {
        default: 'bg-gradient-to-br from-muted to-muted/60 text-muted-foreground ring-1 ring-inset ring-border',
        warning: 'bg-gradient-to-br from-warning/20 to-warning/5 text-warning ring-1 ring-inset ring-warning/30',
        danger: 'bg-gradient-to-br from-destructive/20 to-destructive/5 text-destructive ring-1 ring-inset ring-destructive/30',
        success: 'bg-gradient-to-br from-success/20 to-success/5 text-success ring-1 ring-inset ring-success/30',
    }[tone];

    const cardAccent = {
        default: '',
        warning: 'hover:border-warning/40',
        danger: 'hover:border-destructive/40',
        success: 'hover:border-success/40',
    }[tone];

    const content = (
        <CardContent className="pt-4 pb-5 relative overflow-hidden">
            {/* soft corner glow */}
            {tone !== 'default' && (
                <div className={cn(
                    'absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-30 pointer-events-none',
                    tone === 'warning' && 'bg-warning',
                    tone === 'danger' && 'bg-destructive',
                    tone === 'success' && 'bg-success',
                )} />
            )}
            <div className="flex items-start justify-between relative">
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                    <p className="text-3xl font-semibold text-foreground mt-1.5 tabular-nums">
                        {typeof value === 'number'
                            ? <AnimatedNumber value={value} />
                            : value}
                    </p>
                    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
                </div>
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm', toneChip)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </CardContent>
    );

    return to ? (
        <Link to={to} className="block group">
            <Card className={cn(
                'transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md cursor-pointer',
                cardAccent || 'hover:border-primary/40',
            )}>{content}</Card>
        </Link>
    ) : (
        <Card className={cn('transition-all', cardAccent)}>{content}</Card>
    );
}

export default function Dashboard() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await api.dashboard.metrics();
                setMetrics(data);
            } catch (err: any) {
                console.error('Failed to load dashboard metrics', err);
                setError(err?.message || 'Failed to load metrics');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="h-full overflow-auto bg-gradient-to-b from-muted/20 to-background">
                <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
                    {/* Hero skeleton */}
                    <div className="rounded-xl border border-border bg-muted/10 p-5">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-8 w-72 mt-3" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                    {/* KPI strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="rounded-lg border border-border bg-card p-4">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-7 w-14 mt-2" />
                                <Skeleton className="h-3 w-20 mt-2" />
                            </div>
                        ))}
                    </div>
                    {/* Two charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="rounded-lg border border-border bg-card p-4">
                            <Skeleton className="h-4 w-28 mb-3" />
                            <Skeleton className="h-44 w-full" />
                        </div>
                        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
                            <Skeleton className="h-4 w-28 mb-3" />
                            <Skeleton className="h-44 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="h-full flex items-center justify-center p-6">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-3 text-warning" />
                        <p className="text-sm text-foreground">Could not load dashboard.</p>
                        <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const timeseries = mergeTimeseries(
        metrics.throughput.created,
        metrics.throughput.decided,
        metrics.throughput.published,
    );
    const statusBars = metrics.status_breakdown.map(s => ({
        ...s,
        label: STATUS_LABEL[s.status] || s.status,
        color: STATUS_COLOR[s.status] || 'hsl(var(--muted-foreground))',
    }));
    const riskBars = metrics.risk_by_severity.map(r => ({
        ...r,
        color: SEVERITY_COLOR[r.severity] || '#94a3b8',
        label: r.severity.charAt(0).toUpperCase() + r.severity.slice(1),
    }));

    const totalSlaOpen = metrics.sla_buckets.overdue + metrics.sla_buckets.due_24h + metrics.sla_buckets.due_later;

    return (
        <div className="h-full overflow-auto bg-gradient-to-b from-muted/20 to-background">
            <div className="max-w-7xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
                {/* Hero header — gradient + mouse-tracking glow */}
                <ParallaxHero
                    gradientClass="from-primary/10 via-background to-info/5"
                    orbClass="bg-primary/15"
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                                {format(new Date(), 'EEEE · dd MMM yyyy')}
                            </p>
                            <h1 className="text-3xl font-semibold text-foreground mt-1 tracking-tight">Operations Dashboard</h1>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                                Live view of submissions, SLA health, risk exposure and agent performance.
                            </p>
                        </div>
                        <Link to="/requests">
                            <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
                                Open inbox
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                        </Link>
                    </div>
                </ParallaxHero>

                {/* KPI strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <KpiCard
                        icon={Layers}
                        label="Open requests"
                        value={metrics.totals.open}
                        hint={`${metrics.totals.requests} total`}
                        to="/requests"
                    />
                    <KpiCard
                        icon={Clock}
                        label="Overdue SLA"
                        value={metrics.sla_buckets.overdue}
                        tone={metrics.sla_buckets.overdue > 0 ? 'danger' : 'default'}
                        hint={`${metrics.sla_buckets.due_24h} due in 24h`}
                    />
                    <KpiCard
                        icon={ShieldAlert}
                        label="Critical risks"
                        value={metrics.totals.critical_risks}
                        tone={metrics.totals.critical_risks > 0 ? 'danger' : 'default'}
                        hint={`${metrics.totals.open_risk_flags} open total`}
                    />
                    <KpiCard
                        icon={FileText}
                        label="Docs uploaded (7d)"
                        value={metrics.totals.docs_last_7d}
                        hint={`${metrics.totals.documents} total`}
                    />
                    <KpiCard
                        icon={FileWarning}
                        label="Failed extractions"
                        value={metrics.totals.failed_docs}
                        tone={metrics.totals.failed_docs > 0 ? 'warning' : 'default'}
                    />
                    <KpiCard
                        icon={TrendingUp}
                        label="Avg decision time"
                        value={humaniseDuration(metrics.avg_decision_seconds)}
                        hint="from intake to approve/reject"
                    />
                </div>

                {/* SLA + Status row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* SLA health */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">SLA health</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {totalSlaOpen === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No open requests.</p>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
                                        <div
                                            className="bg-destructive"
                                            style={{ width: `${(metrics.sla_buckets.overdue / totalSlaOpen) * 100}%` }}
                                            title={`Overdue: ${metrics.sla_buckets.overdue}`}
                                        />
                                        <div
                                            className="bg-warning"
                                            style={{ width: `${(metrics.sla_buckets.due_24h / totalSlaOpen) * 100}%` }}
                                            title={`Due 24h: ${metrics.sla_buckets.due_24h}`}
                                        />
                                        <div
                                            className="bg-success"
                                            style={{ width: `${(metrics.sla_buckets.due_later / totalSlaOpen) * 100}%` }}
                                            title={`On track: ${metrics.sla_buckets.due_later}`}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-destructive" />
                                                <span className="text-xs text-muted-foreground">Overdue</span>
                                            </div>
                                            <p className="text-xl font-semibold mt-1 tabular-nums">
                                                <AnimatedNumber value={metrics.sla_buckets.overdue} />
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-warning" />
                                                <span className="text-xs text-muted-foreground">Due 24h</span>
                                            </div>
                                            <p className="text-xl font-semibold mt-1 tabular-nums">
                                                <AnimatedNumber value={metrics.sla_buckets.due_24h} />
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-success" />
                                                <span className="text-xs text-muted-foreground">On track</span>
                                            </div>
                                            <p className="text-xl font-semibold mt-1 tabular-nums">
                                                <AnimatedNumber value={metrics.sla_buckets.due_later} />
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Status breakdown */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Status breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {statusBars.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No requests yet.</p>
                            ) : (
                                <div style={{ width: '100%', height: 200 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={statusBars} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                {statusBars.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Throughput + Confidence row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card className="lg:col-span-2">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Activity — last 7 days</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {timeseries.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No recent activity.</p>
                            ) : (
                                <div style={{ width: '100%', height: 240 }}>
                                    <ResponsiveContainer>
                                        <LineChart data={timeseries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                                            <Line type="monotone" dataKey="created" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Created" />
                                            <Line type="monotone" dataKey="decided" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} name="Decided" />
                                            <Line type="monotone" dataKey="published" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="Published" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Extraction confidence</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {metrics.confidence_trend.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No extractions yet.</p>
                            ) : (
                                <div style={{ width: '100%', height: 240 }}>
                                    <ResponsiveContainer>
                                        <LineChart data={metrics.confidence_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="day"
                                                tickFormatter={(d) => {
                                                    try { return format(parseISO(d), 'dd MMM'); } catch { return d; }
                                                }}
                                                tick={{ fontSize: 11 }}
                                                stroke="hsl(var(--muted-foreground))"
                                            />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                }}
                                                formatter={(v: any) => [`${v}%`, 'Avg confidence']}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="avg_confidence"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                name="Avg confidence"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Risk + Stage distribution row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Risk flags by severity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {riskBars.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No open risks.</p>
                            ) : (
                                <div style={{ width: '100%', height: 200 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={riskBars} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                                            <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={70} stroke="hsl(var(--muted-foreground))" />
                                            <Tooltip
                                                contentStyle={{
                                                    background: 'hsl(var(--background))',
                                                    border: '1px solid hsl(var(--border))',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                }}
                                            />
                                            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                {riskBars.map((entry, idx) => (
                                                    <Cell key={idx} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Top flag types</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {metrics.risk_by_type.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No flags.</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {metrics.risk_by_type.map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 text-sm">
                                            <span className="text-foreground">
                                                {row.flag_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                            <Badge variant="outline">{row.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold">Open by stage</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {metrics.stage_distribution.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-8 text-center">No open requests.</p>
                            ) : (
                                <div className="divide-y divide-border">
                                    {metrics.stage_distribution.map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 text-sm">
                                            <span className="text-foreground">{row.current_stage__name || 'Unassigned'}</span>
                                            <Badge variant="outline">{row.count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Decision legend footer */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center pt-2">
                    <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Approved
                    </span>
                    <span className="flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5 text-destructive" /> Rejected
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-primary" /> Published
                    </span>
                </div>
            </div>
        </div>
    );
}
