import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertTriangle, ShieldAlert, Clock, FileText, TrendingUp,
    ArrowRight, Layers, FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip,
    BarChart, Bar, Cell, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Skeleton } from '@/components/ui/skeleton';
import { PageShell, PageHeader } from '@/components/layout/PageShell';

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
    in_review: 'hsl(var(--info))',
    missing_info: 'hsl(var(--warning))',
    approved: 'hsl(var(--success))',
    rejected: 'hsl(var(--destructive))',
    exported: 'hsl(var(--foreground))',
};

const SEVERITY_COLOR: Record<string, string> = {
    critical: 'hsl(var(--destructive))',
    high: 'hsl(38 92% 48%)',
    medium: 'hsl(var(--warning))',
    low: 'hsl(var(--muted-foreground))',
    info: 'hsl(var(--muted-foreground))',
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

function KpiTile({
    icon: Icon, label, value, hint, tone = 'default', to,
}: {
    icon: any; label: string; value: string | number; hint?: string;
    tone?: 'default' | 'warning' | 'danger' | 'success';
    to?: string;
}) {
    const valueTone = {
        default: 'text-foreground',
        warning: 'text-warning',
        danger: 'text-destructive',
        success: 'text-success',
    }[tone];

    const inner = (
        <div className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
                <Icon className="h-3.5 w-3.5" />
            </div>
            <p className={cn('mt-2.5 kpi-value', valueTone)}>
                {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
            </p>
            {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
        </div>
    );

    const cls = cn(
        'rounded-md border border-border bg-card transition-colors duration-150 ease-refined',
        to && 'cursor-pointer hover:border-foreground/25',
    );

    return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
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
            <PageShell>
                <PageHeader eyebrow="Operations" title="Dashboard" description="Loading…" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-md border border-border bg-card p-4">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-7 w-14 mt-3" />
                            <Skeleton className="h-3 w-20 mt-2" />
                        </div>
                    ))}
                </div>
            </PageShell>
        );
    }

    if (error || !metrics) {
        return (
            <PageShell>
                <Card className="max-w-md mx-auto mt-12">
                    <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-3 text-warning" />
                        <p className="text-sm font-medium text-foreground">Could not load dashboard.</p>
                        <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    </CardContent>
                </Card>
            </PageShell>
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
        color: SEVERITY_COLOR[r.severity] || 'hsl(var(--muted-foreground))',
        label: r.severity.charAt(0).toUpperCase() + r.severity.slice(1),
    }));

    const totalSlaOpen = metrics.sla_buckets.overdue + metrics.sla_buckets.due_24h + metrics.sla_buckets.due_later;

    const tooltipStyle = {
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 6,
        fontSize: 12,
        padding: '6px 8px',
        boxShadow: '0 8px 24px -8px hsl(0 0% 0% / 0.12)',
    };

    // Decision-grade headline: tell the user what to look at first.
    const headline = (() => {
        if (metrics.sla_buckets.overdue > 0) return `${metrics.sla_buckets.overdue} overdue · triage first`;
        if (metrics.totals.critical_risks > 0) return `${metrics.totals.critical_risks} critical risks open`;
        if (metrics.sla_buckets.due_24h > 0) return `${metrics.sla_buckets.due_24h} due in 24h`;
        return 'All cases on track';
    })();

    return (
        <PageShell>
            <PageHeader
                eyebrow={`Operations · ${format(new Date(), 'EEE, d MMM yyyy')}`}
                title="Dashboard"
                description={headline}
                actions={
                    <Link to="/requests">
                        <Button size="sm" className="gap-1.5">
                            Open inbox
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                }
            />

            {/* Decision-grade status row — scannable in one second. Links jump
                straight into the Inbox triage view filtered to that bucket. */}
            <div className="flex items-center gap-2 flex-wrap -mt-2">
                {metrics.sla_buckets.overdue > 0 && (
                    <StatusPill tone="critical" label={`${metrics.sla_buckets.overdue} overdue`} to="/requests" />
                )}
                {metrics.sla_buckets.due_24h > 0 && (
                    <StatusPill tone="warning" label={`${metrics.sla_buckets.due_24h} due 24h`} to="/requests" />
                )}
                {metrics.totals.critical_risks > 0 && (
                    <StatusPill tone="critical" label={`${metrics.totals.critical_risks} critical risks`} />
                )}
                <StatusPill tone="neutral" label={`${metrics.sla_buckets.due_later} on track`} to="/requests" />
            </div>

            {/* KPI strip */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <KpiTile icon={Layers} label="Open" value={metrics.totals.open} hint={`${metrics.totals.requests} total`} to="/requests" />
                <KpiTile icon={Clock} label="Overdue" value={metrics.sla_buckets.overdue} tone={metrics.sla_buckets.overdue > 0 ? 'danger' : 'default'} hint={`${metrics.sla_buckets.due_24h} due 24h`} />
                <KpiTile icon={ShieldAlert} label="Critical risks" value={metrics.totals.critical_risks} tone={metrics.totals.critical_risks > 0 ? 'danger' : 'default'} hint={`${metrics.totals.open_risk_flags} open total`} />
                <KpiTile icon={FileText} label="Docs · 7d" value={metrics.totals.docs_last_7d} hint={`${metrics.totals.documents} total`} />
                <KpiTile icon={FileWarning} label="Failed extracts" value={metrics.totals.failed_docs} tone={metrics.totals.failed_docs > 0 ? 'warning' : 'default'} />
                <KpiTile icon={TrendingUp} label="Avg decision" value={humaniseDuration(metrics.avg_decision_seconds)} hint="intake → decide" />
            </section>

            {/* SLA + Status */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>SLA health</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {totalSlaOpen === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No open requests.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                                    <div className="bg-destructive" style={{ width: `${(metrics.sla_buckets.overdue / totalSlaOpen) * 100}%` }} title={`Overdue: ${metrics.sla_buckets.overdue}`} />
                                    <div className="bg-warning" style={{ width: `${(metrics.sla_buckets.due_24h / totalSlaOpen) * 100}%` }} title={`Due 24h: ${metrics.sla_buckets.due_24h}`} />
                                    <div className="bg-success" style={{ width: `${(metrics.sla_buckets.due_later / totalSlaOpen) * 100}%` }} title={`On track: ${metrics.sla_buckets.due_later}`} />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <SlaTile dotClass="bg-destructive" label="Overdue" value={metrics.sla_buckets.overdue} valueClass="text-destructive" />
                                    <SlaTile dotClass="bg-warning" label="Due 24h" value={metrics.sla_buckets.due_24h} valueClass="text-warning" />
                                    <SlaTile dotClass="bg-success" label="On track" value={metrics.sla_buckets.due_later} valueClass="text-foreground" />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Status breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {statusBars.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No requests yet.</p>
                        ) : (
                            <div style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer>
                                    <BarChart data={statusBars} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                                        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
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
            </section>

            {/* Flow */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Activity · last 7 days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {timeseries.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No recent activity.</p>
                        ) : (
                            <div style={{ width: '100%', height: 240 }}>
                                <ResponsiveContainer>
                                    <LineChart data={timeseries} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} />
                                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="circle" />
                                        <Line type="monotone" dataKey="created" stroke="hsl(var(--foreground))" strokeWidth={1.75} dot={false} activeDot={{ r: 4 }} name="Created" />
                                        <Line type="monotone" dataKey="decided" stroke="hsl(var(--warning))" strokeWidth={1.75} dot={false} activeDot={{ r: 4 }} name="Decided" />
                                        <Line type="monotone" dataKey="published" stroke="hsl(var(--success))" strokeWidth={1.75} dot={false} activeDot={{ r: 4 }} name="Published" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Extraction confidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.confidence_trend.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No extractions yet.</p>
                        ) : (
                            <div style={{ width: '100%', height: 240 }}>
                                <ResponsiveContainer>
                                    <LineChart data={metrics.confidence_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            tickFormatter={(d) => {
                                                try { return format(parseISO(d), 'dd MMM'); } catch { return d; }
                                            }}
                                            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} unit="%" />
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                                            formatter={(v: any) => [`${v}%`, 'Avg']}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="avg_confidence"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={1.75}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                            name="Avg confidence"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Risk + Stage */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Risk by severity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {riskBars.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No open risks.</p>
                        ) : (
                            <div style={{ width: '100%', height: 200 }}>
                                <ResponsiveContainer>
                                    <BarChart data={riskBars} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" horizontal={false} />
                                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={70} />
                                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
                                        <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={18}>
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
                    <CardHeader>
                        <CardTitle>Top flag types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.risk_by_type.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No flags.</p>
                        ) : (
                            <ul className="divide-y divide-border -mx-1">
                                {metrics.risk_by_type.map((row, i) => (
                                    <li key={i} className="flex items-center justify-between py-2 px-1 text-sm">
                                        <span className="text-foreground truncate">
                                            {row.flag_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                        <span className="text-xs font-mono tabular-nums text-muted-foreground">{row.count}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Open by stage</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics.stage_distribution.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-8 text-center">No open requests.</p>
                        ) : (
                            <ul className="divide-y divide-border -mx-1">
                                {metrics.stage_distribution.map((row, i) => (
                                    <li key={i} className="flex items-center justify-between py-2 px-1 text-sm">
                                        <span className="text-foreground truncate">{row.current_stage__name || 'Unassigned'}</span>
                                        <span className="text-xs font-mono tabular-nums text-muted-foreground">{row.count}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </section>
        </PageShell>
    );
}

function StatusPill({
    tone, label, to,
}: {
    tone: 'critical' | 'warning' | 'success' | 'neutral';
    label: string;
    to?: string;
}) {
    const map = {
        critical: { dot: 'bg-destructive', text: 'text-destructive', ring: 'border-destructive/25 bg-destructive/5 hover:border-destructive/40' },
        warning:  { dot: 'bg-warning',     text: 'text-warning',     ring: 'border-warning/25 bg-warning/5 hover:border-warning/40' },
        success:  { dot: 'bg-success',     text: 'text-success',     ring: 'border-success/25 bg-success/5 hover:border-success/40' },
        neutral:  { dot: 'bg-muted-foreground/50', text: 'text-foreground', ring: 'border-border bg-card hover:bg-muted/50' },
    }[tone];

    const inner = (
        <span className={cn('inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] font-medium transition-colors', map.ring, map.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', map.dot)} />
            {label}
        </span>
    );

    return to ? <Link to={to}>{inner}</Link> : inner;
}

function SlaTile({ dotClass, label, value, valueClass }: { dotClass: string; label: string; value: number; valueClass: string }) {
    return (
        <div>
            <div className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
            <p className={cn('mt-1 text-xl font-semibold tabular-nums tracking-tight', valueClass)}>
                <AnimatedNumber value={value} />
            </p>
        </div>
    );
}
