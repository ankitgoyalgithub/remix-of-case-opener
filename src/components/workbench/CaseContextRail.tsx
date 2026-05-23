import { ReactNode } from 'react';
import { useUiPref } from '@/hooks/useUiPref';
import { cn } from '@/lib/utils';
import {
    ChevronDown, ChevronRight, ShieldAlert, MessageSquare, Clock,
    PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import type { RiskFlagSummary, TimelineEvent } from '@/types/case';

interface InboundEmail {
    id: string | number;
    from?: string;
    subject?: string;
    received_at?: string;
    snippet?: string;
}

/**
 * CaseContextRail — right rail of the workbench. Always-visible context:
 * risks summary, broker conversation, recent activity. Collapsible to a
 * 48px icon rail. Replaces the old "right pane silently swaps layout"
 * problem with a stable, predictable sidebar.
 */
export function CaseContextRail({
    riskFlags = [],
    inboundEmails = [],
    timeline = [],
    onOpenTimeline,
    collapsed,
    onToggleCollapsed,
}: {
    riskFlags?: RiskFlagSummary[];
    inboundEmails?: InboundEmail[];
    timeline?: TimelineEvent[];
    onOpenTimeline?: () => void;
    collapsed: boolean;
    onToggleCollapsed: () => void;
}) {
    const unresolvedRisks = riskFlags.filter(r => !r.resolved);
    const criticalRisks = unresolvedRisks.filter(r => r.severity === 'critical' || r.severity === 'high').length;

    // Collapsed icon rail.
    if (collapsed) {
        return (
            <aside className="w-12 shrink-0 border-l border-border bg-background flex flex-col items-center py-2 gap-1">
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    title="Expand context rail"
                    className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <PanelRightOpen className="h-4 w-4" />
                </button>
                <div className="w-6 border-t border-border my-1" />

                <RailCounter
                    icon={ShieldAlert}
                    count={unresolvedRisks.length}
                    title={`${unresolvedRisks.length} open risk${unresolvedRisks.length === 1 ? '' : 's'}`}
                    tone={criticalRisks > 0 ? 'danger' : unresolvedRisks.length > 0 ? 'warn' : 'default'}
                    onClick={onToggleCollapsed}
                />
                <RailCounter
                    icon={MessageSquare}
                    count={inboundEmails.length}
                    title={`${inboundEmails.length} broker message${inboundEmails.length === 1 ? '' : 's'}`}
                    onClick={onToggleCollapsed}
                />
                <RailCounter
                    icon={Clock}
                    count={timeline.length}
                    title={`${timeline.length} timeline event${timeline.length === 1 ? '' : 's'}`}
                    onClick={onToggleCollapsed}
                />
            </aside>
        );
    }

    return (
        <aside className="w-[320px] shrink-0 border-l border-border bg-background flex flex-col overflow-hidden">
            {/* Rail header */}
            <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0">
                <span className="page-eyebrow">Context</span>
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    title="Collapse rail"
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <PanelRightClose className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
                <Section
                    id="risks"
                    icon={ShieldAlert}
                    title="Open risks"
                    count={unresolvedRisks.length}
                    countTone={criticalRisks > 0 ? 'danger' : unresolvedRisks.length > 0 ? 'warn' : 'default'}
                    defaultExpanded={unresolvedRisks.length > 0}
                >
                    {unresolvedRisks.length === 0 ? (
                        <Empty>No open risks. Cleared for adjudication.</Empty>
                    ) : (
                        <ul className="space-y-2">
                            {unresolvedRisks.slice(0, 10).map((risk) => (
                                <RiskRow key={risk.id} risk={risk} />
                            ))}
                            {unresolvedRisks.length > 10 && (
                                <p className="text-[11px] text-muted-foreground italic pt-1">
                                    +{unresolvedRisks.length - 10} more in workbench
                                </p>
                            )}
                        </ul>
                    )}
                </Section>

                <Section
                    id="conversation"
                    icon={MessageSquare}
                    title="Broker conversation"
                    count={inboundEmails.length}
                    defaultExpanded={inboundEmails.length > 0}
                >
                    {inboundEmails.length === 0 ? (
                        <Empty>No broker emails yet.</Empty>
                    ) : (
                        <ul className="space-y-2">
                            {inboundEmails.slice(0, 5).map((email) => (
                                <EmailRow key={email.id} email={email} />
                            ))}
                            {inboundEmails.length > 5 && (
                                <p className="text-[11px] text-muted-foreground italic pt-1">
                                    +{inboundEmails.length - 5} more
                                </p>
                            )}
                        </ul>
                    )}
                </Section>

                <Section
                    id="activity"
                    icon={Clock}
                    title="Activity"
                    count={timeline.length}
                    defaultExpanded={false}
                    headerAction={onOpenTimeline ? (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onOpenTimeline(); }}
                            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            View all
                        </button>
                    ) : null}
                >
                    {timeline.length === 0 ? (
                        <Empty>No activity yet.</Empty>
                    ) : (
                        <ul className="space-y-1.5">
                            {[...timeline].reverse().slice(0, 6).map((ev) => (
                                <TimelineRow key={ev.id} event={ev} />
                            ))}
                        </ul>
                    )}
                </Section>
            </div>
        </aside>
    );
}

// ─── Section primitive ────────────────────────────────────────────────

function Section({
    id, icon: Icon, title, count, countTone = 'default', defaultExpanded,
    headerAction, children,
}: {
    id: string;
    icon: any;
    title: string;
    count: number;
    countTone?: 'default' | 'warn' | 'danger';
    defaultExpanded: boolean;
    headerAction?: ReactNode;
    children: ReactNode;
}) {
    const [expanded, setExpanded] = useUiPref<boolean>(`workbench.context.${id}.expanded`, defaultExpanded);

    const countCls = {
        default: 'text-muted-foreground',
        warn:    'text-warning',
        danger:  'text-destructive',
    }[countTone];

    return (
        <div>
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
            >
                {expanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="section-title flex-1 truncate">{title}</span>
                <span className={cn('text-[11px] font-mono tabular-nums', countCls)}>{count}</span>
                {headerAction}
            </button>
            {expanded && (
                <div className="px-3 pb-3 pt-0">
                    {children}
                </div>
            )}
        </div>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="text-[12px] text-muted-foreground italic">{children}</p>;
}

// ─── Risk row ────────────────────────────────────────────────────────

function RiskRow({ risk }: { risk: RiskFlagSummary }) {
    const sev = risk.severity?.toLowerCase();
    const dotCls = sev === 'critical' ? 'bg-destructive'
        : sev === 'high' ? 'bg-warning'
        : sev === 'medium' ? 'bg-warning/70'
        : 'bg-muted-foreground/50';

    return (
        <li className="flex items-start gap-2">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0 mt-1.5', dotCls)} />
            <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-foreground leading-tight truncate">{risk.title}</p>
                {risk.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{risk.description}</p>
                )}
            </div>
        </li>
    );
}

// ─── Email row ───────────────────────────────────────────────────────

function EmailRow({ email }: { email: InboundEmail }) {
    let when: string | null = null;
    if (email.received_at) {
        try { when = format(new Date(email.received_at), 'dd MMM, HH:mm'); } catch { /* ignore */ }
    }
    return (
        <li className="rounded border border-border p-2 bg-card">
            <div className="flex items-baseline gap-2">
                <p className="text-[12px] font-medium text-foreground truncate flex-1">
                    {email.subject || '(no subject)'}
                </p>
                {when && <span className="text-[10px] font-mono text-muted-foreground shrink-0">{when}</span>}
            </div>
            {email.from && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email.from}</p>
            )}
            {email.snippet && (
                <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{email.snippet}</p>
            )}
        </li>
    );
}

// ─── Timeline row ────────────────────────────────────────────────────

function TimelineRow({ event }: { event: TimelineEvent }) {
    let when: string | null = null;
    try { when = format(new Date(event.timestamp), 'dd MMM, HH:mm'); } catch { /* ignore */ }
    return (
        <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
            <div className="min-w-0 flex-1">
                <p className="text-[12.5px] text-foreground leading-tight">
                    <span className="font-medium">{event.user}</span>{' '}
                    <span className="text-muted-foreground">{event.action}</span>
                </p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{when}</p>
            </div>
        </li>
    );
}

function RailCounter({
    icon: Icon, count, title, tone = 'default', onClick,
}: {
    icon: any;
    count: number;
    title: string;
    tone?: 'default' | 'warn' | 'danger';
    onClick: () => void;
}) {
    const toneCls = {
        default: 'text-muted-foreground hover:text-foreground',
        warn:    'text-warning hover:text-warning',
        danger:  'text-destructive hover:text-destructive',
    }[tone];
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                'h-9 w-9 inline-flex flex-col items-center justify-center rounded hover:bg-muted transition-colors',
                toneCls,
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[9px] font-mono tabular-nums mt-0.5">{count}</span>
        </button>
    );
}
