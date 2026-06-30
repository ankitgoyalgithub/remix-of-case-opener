import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Loader2, RefreshCw, ChevronDown, ChevronRight, ListChecks, Clock,
    CheckCircle2, AlertTriangle, ExternalLink, Inbox,
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageShell';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { INBOUND_POLL_EVENT } from '@/components/layout/AppLayout';
import { emailOutcomeMeta, mailboxCheckMeta } from '@/components/studio/emailStatus';

interface PollJobSummary {
    id: string;
    account: string;
    account_email: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    status: 'running' | 'success' | 'failed';
    fetched: number;
    matched: number;
    skipped: number;
    duplicate: number;
    failed: number;
    triggered_by: string;
    error: string;
}

interface PollJobDetail extends PollJobSummary {
    emails: Array<{
        id: string;
        subject: string;
        from_address: string;
        from_name: string;
        attachment_count: number;
        status: string;
        matched_rule_name: string | null;
        request_smart_id: string | null;
        created_request: string | null;
        error: string;
        received_at: string | null;
    }>;
}

export default function StudioInboundJobs() {
    const [jobs, setJobs] = useState<PollJobSummary[]>([]);
    const [details, setDetails] = useState<Record<string, PollJobDetail>>({});
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchJobs = async () => {
        try {
            const data: PollJobSummary[] = await api.inboundEmail.jobs.list();
            setJobs(data);
            // Auto-expand any job that fetched something so the email list is
            // visible without an extra click. Pre-load detail for those rows.
            const toExpand = data.filter(j => j.fetched > 0).slice(0, 10);
            if (toExpand.length) {
                setExpanded(prev => {
                    const next = { ...prev };
                    toExpand.forEach(j => { next[j.id] = true; });
                    return next;
                });
                // Pre-fetch details in parallel; ignore failures, individual
                // rows will fall back to "Loading…" until they resolve.
                Promise.all(
                    toExpand.map(async (j) => {
                        try {
                            const d = await api.inboundEmail.jobs.get(j.id);
                            return [j.id, d] as const;
                        } catch { return null; }
                    }),
                ).then(results => {
                    setDetails(d => {
                        const merged = { ...d };
                        for (const r of results) {
                            if (r) merged[r[0]] = r[1] as PollJobDetail;
                        }
                        return merged;
                    });
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    // Refresh when the global auto-poll completes
    useEffect(() => {
        if (!autoRefresh) return;
        const onPolled = () => fetchJobs();
        window.addEventListener(INBOUND_POLL_EVENT, onPolled);
        return () => window.removeEventListener(INBOUND_POLL_EVENT, onPolled);
    }, [autoRefresh]);

    const toggleExpand = async (job: PollJobSummary) => {
        const next = !expanded[job.id];
        setExpanded(s => ({ ...s, [job.id]: next }));
        if (next && !details[job.id]) {
            try {
                const data = await api.inboundEmail.jobs.get(job.id);
                setDetails(d => ({ ...d, [job.id]: data }));
            } catch {
                toast.error('Failed to load job detail');
            }
        }
    };

    // Aggregate stats across jobs
    const totals = jobs.reduce((acc, j) => {
        acc.fetched += j.fetched;
        acc.matched += j.matched;
        acc.skipped += j.skipped;
        acc.failed += j.failed;
        return acc;
    }, { fetched: 0, matched: 0, skipped: 0, failed: 0 });

    return (
        <>
            <PageHeader
                eyebrow="Configuration · Email log"
                title="Email log"
                description="A record of every mailbox check — which emails came in, which became requests, and why any were skipped."
                actions={
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={fetchJobs}>
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                        Refresh
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard label="Checks" value={jobs.length} />
                <StatCard label="Received" value={totals.fetched} />
                <StatCard label="Imported" value={totals.matched} tone="success" />
                <StatCard label="Skipped" value={totals.skipped} />
                <StatCard label="Failed" value={totals.failed} tone="danger" />
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
                        Recent checks
                        <Badge variant="outline" className="text-[10px]">{jobs.length}</Badge>
                        <span className="text-[11px] text-muted-foreground font-normal ml-1">
                            select any row to see the emails it received
                        </span>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={async () => {
                                const allExpanded = jobs.every(j => expanded[j.id]);
                                if (allExpanded) {
                                    setExpanded({});
                                } else {
                                    // Expand everything + pre-fetch any missing details.
                                    setExpanded(Object.fromEntries(jobs.map(j => [j.id, true])));
                                    const missing = jobs.filter(j => !details[j.id]);
                                    const fetched = await Promise.all(
                                        missing.map(async (j) => {
                                            try {
                                                const d = await api.inboundEmail.jobs.get(j.id);
                                                return [j.id, d] as const;
                                            } catch { return null; }
                                        }),
                                    );
                                    setDetails(d => {
                                        const merged = { ...d };
                                        for (const r of fetched) if (r) merged[r[0]] = r[1] as PollJobDetail;
                                        return merged;
                                    });
                                }
                            }}
                        >
                            {jobs.every(j => expanded[j.id]) && jobs.length > 0 ? 'Collapse all' : 'Expand all'}
                        </Button>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="accent-primary"
                            />
                            Auto-refresh after each check
                        </label>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                            No mailbox checks yet. Once a connected mailbox is checked, every check will be listed here.
                        </div>
                    ) : (
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead className="w-8"></TableHead>
                                        <TableHead className="text-xs">Started</TableHead>
                                        <TableHead className="text-xs">Mailbox</TableHead>
                                        <TableHead className="text-xs">Started by</TableHead>
                                        <TableHead className="text-xs">Status</TableHead>
                                        <TableHead className="text-xs text-right">Received</TableHead>
                                        <TableHead className="text-xs text-right">Imported</TableHead>
                                        <TableHead className="text-xs text-right">Skipped</TableHead>
                                        <TableHead className="text-xs text-right">Failed</TableHead>
                                        <TableHead className="text-xs text-right">Duration</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jobs.map(job => {
                                        const isOpen = !!expanded[job.id];
                                        const detail = details[job.id];
                                        return (
                                            <Fragment key={job.id}>
                                                <TableRow
                                                    onClick={() => toggleExpand(job)}
                                                    className="cursor-pointer hover:bg-muted/30"
                                                >
                                                    <TableCell className="py-2">
                                                        {isOpen
                                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-label="Collapse" />
                                                            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-label="Expand" />}
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <div className="text-xs font-medium tabular-nums">
                                                            {format(new Date(job.started_at), 'HH:mm:ss')}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground tabular-nums">
                                                            {formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs truncate max-w-[200px]">{job.account_email}</TableCell>
                                                    <TableCell className="py-2">
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase">{job.triggered_by || 'manual'}</Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2">
                                                        <Badge variant={mailboxCheckMeta(job.status).variant} className="text-[10px] h-4 px-1.5 gap-1">
                                                            {job.status === 'success' && <CheckCircle2 className="h-2.5 w-2.5" aria-hidden />}
                                                            {job.status === 'failed' && <AlertTriangle className="h-2.5 w-2.5" aria-hidden />}
                                                            {job.status === 'running' && <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />}
                                                            {mailboxCheckMeta(job.status).label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right tabular-nums">{job.fetched}</TableCell>
                                                    <TableCell className={cn('py-2 text-xs text-right tabular-nums', job.matched > 0 && 'text-success font-semibold')}>
                                                        {job.matched}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right tabular-nums text-muted-foreground">{job.skipped}</TableCell>
                                                    <TableCell className={cn('py-2 text-xs text-right tabular-nums', job.failed > 0 && 'text-destructive font-semibold')}>
                                                        {job.failed}
                                                    </TableCell>
                                                    <TableCell className="py-2 text-xs text-right text-muted-foreground tabular-nums">
                                                        {job.duration_ms != null ? `${job.duration_ms}ms` : '—'}
                                                    </TableCell>
                                                </TableRow>
                                                {isOpen && (
                                                    <TableRow>
                                                        <TableCell colSpan={10} className="p-0 border-0">
                                                            <div className="bg-muted/10 border-t border-border px-5 py-4">
                                                                {job.error && (
                                                                    <div className="mb-3 px-3 py-2 rounded-md border border-destructive/30 bg-destructive/5 text-xs text-destructive flex items-start gap-2">
                                                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                                                        <span>{job.error}</span>
                                                                    </div>
                                                                )}
                                                                {!detail ? (
                                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                                        Loading emails…
                                                                    </div>
                                                                ) : detail.emails.length === 0 ? (
                                                                    <div className="text-xs text-muted-foreground italic py-2">
                                                                        No emails received in this check.
                                                                    </div>
                                                                ) : (
                                                                    <JobEmailsTable emails={detail.emails} />
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'danger' }) {
    const valueClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-destructive' : 'text-foreground';
    return (
        <Card>
            <CardContent className="pt-4 pb-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                <p className={cn('text-2xl font-semibold mt-1 tabular-nums', valueClass)}>{value}</p>
            </CardContent>
        </Card>
    );
}

function JobEmailsTable({ emails }: { emails: PollJobDetail['emails'] }) {
    return (
        <div className="rounded-md border border-border overflow-hidden bg-background">
            <Table>
                <TableHeader className="bg-muted/30">
                    <TableRow>
                        <TableHead className="text-[10px] uppercase tracking-wider">Status</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider">Subject</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider">From</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider text-right">Files</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider">Outcome</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {emails.map(em => {
                        const reasons = (em.error || '').split(' | ').filter(Boolean);
                        return (
                            <TableRow key={em.id}>
                                <TableCell className="py-2">
                                    <Badge variant={emailOutcomeMeta(em.status).variant} className="text-[10px] h-4 px-1.5">
                                        {emailOutcomeMeta(em.status).label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="py-2 text-xs max-w-[280px]">
                                    <p className="truncate">{em.subject || '(no subject)'}</p>
                                </TableCell>
                                <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px]">
                                    <p className="truncate">{em.from_address}</p>
                                </TableCell>
                                <TableCell className="py-2 text-xs text-right tabular-nums">
                                    {em.attachment_count > 0 ? em.attachment_count : <Inbox className="h-3 w-3 text-muted-foreground/40 inline" />}
                                </TableCell>
                                <TableCell className="py-2 text-xs">
                                    {em.status === 'matched' && em.created_request ? (
                                        <Link to={`/request/${em.created_request}`}>
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1 text-success">
                                                {em.request_smart_id || 'request'}
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    ) : reasons.length > 0 ? (
                                        <ul className="space-y-0.5">
                                            {reasons.map((r, i) => (
                                                <li key={i} className="text-muted-foreground">
                                                    <span className="text-destructive mr-1">•</span>
                                                    {r}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
