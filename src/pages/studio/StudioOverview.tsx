import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Workflow, FileStack, ClipboardCheck, Plug, Mail, Sparkles,
    ArrowRight, AlertTriangle, CheckCircle2, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface StudioState {
    stages: any[];
    documents: any[];
    checklists: any[];
    cvRules: any[];
}

interface Gap {
    severity: 'warning' | 'info';
    message: string;
    action?: { label: string; to: string };
}

// Tolerate paginated DRF responses (`{count, next, results}`) and flat arrays
// alike — different endpoints have different default pagination configs and
// we'd rather show 12 stages than report "0 stages, run the setup wizard"
// because of a wrapper.
function asArray(v: any): any[] {
    if (Array.isArray(v)) return v;
    if (v && Array.isArray(v.results)) return v.results;
    return [];
}

export default function StudioOverview() {
    const [loading, setLoading] = useState(true);
    const [state, setState] = useState<StudioState>({
        stages: [], documents: [], checklists: [], cvRules: [],
    });
    // Track which lists succeeded so we can distinguish "genuinely empty" from
    // "API call failed / unauthenticated / timed out". Showing "No stages
    // configured. Run setup." when the fetch silently 401'd is misleading.
    const [loadErrors, setLoadErrors] = useState<{ [k in keyof StudioState]?: string }>({});

    useEffect(() => {
        (async () => {
            const errs: typeof loadErrors = {};
            const tryLoad = async <K extends keyof StudioState>(key: K, fn: () => Promise<any>) => {
                try {
                    return asArray(await fn());
                } catch (err: any) {
                    errs[key] = err?.message || 'failed to load';
                    console.error(`StudioOverview: ${key} load failed`, err);
                    return [];
                }
            };
            const [stages, documents, checklists, cvRules] = await Promise.all([
                tryLoad('stages', () => api.studio.stages.list()),
                tryLoad('documents', () => api.studio.documents.list()),
                tryLoad('checklists', () => api.studio.checklists.list()),
                tryLoad('cvRules', () => api.studio.cvRules.list()),
            ]);
            setState({ stages, documents, checklists, cvRules });
            setLoadErrors(errs);
            if (Object.keys(errs).length > 0) {
                toast.error('Some configuration could not be loaded — gaps below may be inaccurate.');
            }
            setLoading(false);
        })();
    }, []);

    const docsWithoutExtraction = state.documents.filter(
        (d: any) => !(d.extraction_keys || []).length,
    );
    const checklistsWithoutHandler = state.checklists.filter(
        (c: any) => c.item_type !== 'manual' && !c.handler_name,
    );

    // Gap detection: only fire "no X" gaps when the fetch SUCCEEDED and the
    // result is genuinely empty. Otherwise surface a single "couldn't load"
    // warning so we don't shame the user for a wrapper / auth / network
    // problem on our end.
    const gaps: Gap[] = [];

    if (Object.keys(loadErrors).length > 0) {
        gaps.push({
            severity: 'warning',
            message: `Couldn't load: ${Object.keys(loadErrors).join(', ')}. The summary below may be incomplete — refresh once the issue clears.`,
        });
    } else {
        if (state.stages.length === 0) {
            gaps.push({
                severity: 'warning',
                message: 'No workflow stages configured. Requests won\'t have a pipeline.',
                action: { label: 'Run setup wizard', to: '/studio/setup' },
            });
        }
        if (state.documents.length === 0) {
            gaps.push({
                severity: 'warning',
                message: 'No document types defined. Operators can\'t upload anything meaningful.',
                action: { label: 'Add documents', to: '/studio/documents' },
            });
        }
        if (state.documents.length > 0 && docsWithoutExtraction.length > 0) {
            gaps.push({
                severity: 'info',
                message: `${docsWithoutExtraction.length} document type${docsWithoutExtraction.length > 1 ? 's' : ''} have no extraction schema — they'll be extracted free-form.`,
                action: { label: 'Configure extraction', to: '/studio/documents' },
            });
        }
        if (checklistsWithoutHandler.length > 0) {
            gaps.push({
                severity: 'warning',
                message: `${checklistsWithoutHandler.length} automated check${checklistsWithoutHandler.length > 1 ? 's' : ''} have no handler wired — they'll never run.`,
                action: { label: 'Review checks', to: '/studio/checks' },
            });
        }
        if (state.cvRules.length === 0 && state.documents.length > 1) {
            gaps.push({
                severity: 'info',
                message: 'No cross-validation rules configured — document-to-document field matching is off.',
                action: { label: 'Add rules', to: '/studio/documents' },
            });
        }
    }

    const hasAnyConfig =
        state.stages.length > 0
        || state.documents.length > 0
        || state.checklists.length > 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-info/5 p-6">
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
                <div className="relative">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                        <Sparkles className="h-3 w-3" />
                        AI Studio
                    </div>
                    <h1 className="text-3xl font-semibold text-foreground mt-2 tracking-tight">
                        Configuration overview
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                        One place to shape how the platform ingests submissions, verifies documents, runs checks, and talks to your team.
                    </p>
                    {!hasAnyConfig && !loading && (
                        <div className="mt-4 flex items-center gap-2">
                            <Link to="/studio/setup">
                                <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
                                    <Wand2 className="h-3.5 w-3.5" />
                                    Run setup wizard
                                </Button>
                            </Link>
                            <span className="text-xs text-muted-foreground">First time here? Let the wizard walk you through it.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatCard
                    icon={Workflow}
                    tone="primary"
                    label="Stages"
                    value={state.stages.length}
                    to="/studio/workflows"
                />
                <StatCard
                    icon={FileStack}
                    tone="info"
                    label="Document types"
                    value={state.documents.length}
                    hint={docsWithoutExtraction.length > 0 ? `${docsWithoutExtraction.length} free-form` : undefined}
                    to="/studio/documents"
                />
                <StatCard
                    icon={ClipboardCheck}
                    tone="success"
                    label="Checks"
                    value={state.checklists.length}
                    hint={checklistsWithoutHandler.length > 0 ? `${checklistsWithoutHandler.length} unwired` : undefined}
                    to="/studio/checks"
                />
                <StatCard
                    icon={Plug}
                    tone="warning"
                    label="Integrations"
                    value="—"
                    hint="Coming soon"
                    to="/studio/integrations"
                />
                <StatCard
                    icon={Mail}
                    tone="neutral"
                    label="Messages"
                    value="—"
                    to="/studio/messages"
                />
            </div>

            {/* Gaps */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                        Configuration health
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-xs text-muted-foreground py-4">Loading…</p>
                    ) : gaps.length === 0 ? (
                        <div className="flex items-center gap-3 py-3 px-3 rounded-lg bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
                            <div className="h-9 w-9 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">No configuration gaps detected.</p>
                                <p className="text-xs text-muted-foreground">Your Studio setup looks complete.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {gaps.map((gap, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'flex items-start gap-3 px-3 py-2.5 rounded-lg border',
                                        gap.severity === 'warning'
                                            ? 'border-warning/30 bg-warning/5'
                                            : 'border-border bg-muted/20',
                                    )}
                                >
                                    <div className={cn(
                                        'h-7 w-7 rounded-md flex items-center justify-center shrink-0 mt-0.5',
                                        gap.severity === 'warning' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground',
                                    )}>
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">{gap.message}</p>
                                    </div>
                                    {gap.action && (
                                        <Link to={gap.action.to}>
                                            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0">
                                                {gap.action.label}
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick links */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Get started</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <QuickLink
                            to="/studio/setup"
                            icon={Wand2}
                            title="Setup wizard"
                            description="Step-by-step initial configuration"
                        />
                        <QuickLink
                            to="/studio/documents"
                            icon={FileStack}
                            title="Add a document"
                            description="Define a new document type + AI config"
                        />
                        <QuickLink
                            to="/studio/workflows"
                            icon={Workflow}
                            title="Edit workflow"
                            description="Rearrange stages, change gates"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatCard({
    icon: Icon, tone, label, value, hint, to,
}: {
    icon: any; tone: 'primary' | 'info' | 'success' | 'warning' | 'neutral';
    label: string; value: number | string; hint?: string; to?: string;
}) {
    const toneMap = {
        primary: 'from-primary/20 to-primary/5 text-primary ring-primary/30',
        info: 'from-info/20 to-info/5 text-info ring-info/30',
        success: 'from-success/20 to-success/5 text-success ring-success/30',
        warning: 'from-warning/20 to-warning/5 text-warning ring-warning/30',
        neutral: 'from-muted to-muted/30 text-muted-foreground ring-border',
    }[tone];

    const body = (
        <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
                    <p className="text-2xl font-semibold text-foreground mt-1 tabular-nums">{value}</p>
                    {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
                </div>
                <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ring-1 ring-inset shadow-sm', toneMap)}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
        </CardContent>
    );

    return to ? (
        <Link to={to} className="block group">
            <Card className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:border-primary/30 cursor-pointer">
                {body}
            </Card>
        </Link>
    ) : (
        <Card>{body}</Card>
    );
}

function QuickLink({
    to, icon: Icon, title, description,
}: {
    to: string; icon: any; title: string; description: string;
}) {
    return (
        <Link to={to} className="block group">
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors">
                <div className="h-9 w-9 rounded-md bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
        </Link>
    );
}
