/**
 * Single source of truth for how statuses, severities, confidence and SLA/deadline
 * are *presented* across the app. Every screen (Dashboard, Inbox, Summary,
 * Workbench, Evidence pack, Header) must route its status/severity/confidence/SLA
 * styling through these helpers so the same value looks and reads identically
 * everywhere.
 *
 * Design rules baked in here (from the UI/UX revamp plan):
 *  - ONE canonical, plain-language label per status. We collapse the redundant
 *    end-states (Issued / Published / Exported) into a single "Sent to insurer",
 *    and "Ready for export" reads simply as "Approved".
 *  - Status colour is reserved for risk/compliance meaning and is expressed only
 *    through the FIVE semantic Badge variants — never an ad-hoc colour string.
 *  - Status is never conveyed by colour alone: every helper returns a text label,
 *    and the SLA/severity helpers also return an icon NAME so callers can add a
 *    non-colour cue.
 *  - ONE confidence threshold set, used everywhere.
 *
 * This module is framework-agnostic: it returns Badge variant names, plain
 * strings, Tailwind class strings, and lucide icon *names* (strings). It renders
 * no JSX, so it can be imported anywhere (including non-React code).
 */

/** The only five semantic Badge variants. Maps 1:1 to `Badge`'s variants. */
export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'critical';

/**
 * Names of lucide-react icons returned by the helpers below. Callers import the
 * matching component and look it up, e.g.
 *   `const Icon = { AlertTriangle, Clock3, CheckCircle2 }[meta.icon];`
 */
export type StatusIconName =
  | 'AlertTriangle'
  | 'AlertCircle'
  | 'Clock3'
  | 'CheckCircle2'
  | 'CircleDot'
  | 'ShieldAlert';

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Title-case a raw token as a safe fallback label (e.g. `foo_bar` -> "Foo bar"). */
function humanizeFallback(value: string): string {
  const cleaned = value.trim().replace(/[_-]+/g, ' ');
  if (!cleaned) return 'Unknown';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Request status
// ─────────────────────────────────────────────────────────────────────────────

export interface RequestStatusMeta {
  /** ONE canonical, plain-language label. */
  label: string;
  variant: BadgeVariant;
}

/**
 * Maps every known request status — whether the raw backend value
 * (`submitted`, `in_review`, `ready_for_export`, `issued`, `exported`, …) or the
 * frontend display value (`New`, `In Review`, `Ready for Export`, `Published`, …)
 * — to a single canonical label + semantic variant.
 *
 * Canonical labels:
 *  - New                → just arrived, no action taken yet (neutral)
 *  - In review          → actively being worked (info)
 *  - Awaiting info      → waiting on the broker for documents/info (warning)
 *  - Approved           → decision made; also covers "ready for export" (success)
 *  - Sent to insurer    → terminal positive state; collapses issued/exported/published (success)
 *  - Rejected           → decision made: declined (critical)
 *
 * Unknown values fall back to a humanized label with a calm neutral variant so a
 * new backend status never crashes or shows a raw token in alarming colour.
 */
export function requestStatusMeta(status: string | null | undefined): RequestStatusMeta {
  if (!status) return { label: 'Unknown', variant: 'neutral' };

  const META: Record<string, RequestStatusMeta> = {
    // brand new / intake
    new: { label: 'New', variant: 'neutral' },
    submitted: { label: 'New', variant: 'neutral' },
    // in progress
    in_review: { label: 'In review', variant: 'info' },
    // waiting on the broker
    missing_info: { label: 'Awaiting info', variant: 'warning' },
    // decided: approved (and the "ready to send" sub-state collapses to Approved)
    approved: { label: 'Approved', variant: 'success' },
    ready_for_export: { label: 'Approved', variant: 'success' },
    // terminal positive state — every "it's gone to the insurer" value reads the same
    issued: { label: 'Sent to insurer', variant: 'success' },
    exported: { label: 'Sent to insurer', variant: 'success' },
    published: { label: 'Sent to insurer', variant: 'success' },
    // decided: rejected
    rejected: { label: 'Rejected', variant: 'critical' },
  };

  return META[normalizeKey(status)] ?? { label: humanizeFallback(status), variant: 'neutral' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity (risk flags)
// ─────────────────────────────────────────────────────────────────────────────

export interface SeverityMeta {
  label: string;
  variant: BadgeVariant;
  /** Sort rank — lower is more severe (critical = 0). */
  rank: number;
  /** Optional non-colour cue for the most severe levels. */
  icon?: StatusIconName;
}

/**
 * Maps a risk-flag severity to a label + variant + sort rank. `high` shares the
 * critical (destructive) variant — both are blocking-grade — but keeps a distinct
 * rank so ordering stays stable. Unknown severities sort last, neutral.
 */
export function severityMeta(sev: string | null | undefined): SeverityMeta {
  if (!sev) return { label: 'Unknown', variant: 'neutral', rank: 99 };

  const META: Record<string, SeverityMeta> = {
    critical: { label: 'Critical', variant: 'critical', rank: 0, icon: 'AlertTriangle' },
    high: { label: 'High', variant: 'critical', rank: 1, icon: 'AlertTriangle' },
    medium: { label: 'Medium', variant: 'warning', rank: 2, icon: 'AlertCircle' },
    low: { label: 'Low', variant: 'neutral', rank: 3 },
    info: { label: 'Info', variant: 'neutral', rank: 4 },
  };

  return META[normalizeKey(sev)] ?? { label: humanizeFallback(sev), variant: 'neutral', rank: 98 };
}

/** Convenience comparator: sort an array of objects by their severity, most severe first. */
export function bySeverity<T>(getSeverity: (item: T) => string | null | undefined) {
  return (a: T, b: T) => severityMeta(getSeverity(a)).rank - severityMeta(getSeverity(b)).rank;
}

// ─────────────────────────────────────────────────────────────────────────────
// Confidence (AI extraction / matching)
// ─────────────────────────────────────────────────────────────────────────────

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ConfidenceMeta {
  tier: ConfidenceTier;
  variant: BadgeVariant;
  label: string;
  /**
   * Tailwind text-colour class wired to the dedicated `--confidence-*` tokens.
   * Use this for the bare numeric "92%" / "92% AI" readouts that aren't Badges,
   * so confidence colouring is consistent and not ad-hoc.
   */
  textClass: string;
}

/**
 * THE single confidence threshold set. Accepts a percentage 0–100; values <= 1
 * are treated as a 0–1 fraction and scaled, so both conventions are safe.
 *
 *   high   >= 90   (success)
 *   medium >= 70   (warning)
 *   low    <  70   (critical — needs a human to check)
 */
export function confidenceTier(score: number | null | undefined): ConfidenceMeta {
  const raw = typeof score === 'number' && !Number.isNaN(score) ? score : 0;
  const pct = raw > 0 && raw <= 1 ? raw * 100 : raw;

  if (pct >= 90) {
    return { tier: 'high', variant: 'success', label: 'High', textClass: 'text-confidence-high' };
  }
  if (pct >= 70) {
    return { tier: 'medium', variant: 'warning', label: 'Medium', textClass: 'text-confidence-medium' };
  }
  return { tier: 'low', variant: 'critical', label: 'Low', textClass: 'text-confidence-low' };
}

// ─────────────────────────────────────────────────────────────────────────────
// SLA / deadline ("time left")
// ─────────────────────────────────────────────────────────────────────────────

export interface SlaMeta {
  label: string;
  variant: BadgeVariant;
  icon: StatusIconName;
}

/**
 * Maps an SLA bucket (`red` | `amber` | `green` from `getSlaStatus`) — or a
 * status synonym (`overdue` | `at_risk` | `on_track`) — to plain "time left"
 * wording with a non-colour icon cue.
 *
 *   red / overdue   → Overdue   (critical, AlertTriangle)
 *   amber / at risk → At risk   (warning, Clock3)
 *   green / on track→ On track  (success, CheckCircle2)
 *
 * Note: `getSlaStatus` returns `red` both when past due and when < 10% time
 * remains. The badge signals urgency; callers that need to distinguish
 * "Overdue" from "Due soon" should pass their own computed "time left" text
 * alongside this badge.
 */
export function slaMeta(bucketOrStatus: string | null | undefined): SlaMeta {
  if (!bucketOrStatus) return { label: 'No deadline', variant: 'neutral', icon: 'CircleDot' };

  const key = normalizeKey(bucketOrStatus);
  const META: Record<string, SlaMeta> = {
    red: { label: 'Overdue', variant: 'critical', icon: 'AlertTriangle' },
    overdue: { label: 'Overdue', variant: 'critical', icon: 'AlertTriangle' },
    amber: { label: 'At risk', variant: 'warning', icon: 'Clock3' },
    at_risk: { label: 'At risk', variant: 'warning', icon: 'Clock3' },
    green: { label: 'On track', variant: 'success', icon: 'CheckCircle2' },
    on_track: { label: 'On track', variant: 'success', icon: 'CheckCircle2' },
  };

  return META[key] ?? { label: 'No deadline', variant: 'neutral', icon: 'CircleDot' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage (pipeline step) — wires the dead `--stage-*` tokens
// ─────────────────────────────────────────────────────────────────────────────

export type StageStatus = 'complete' | 'active' | 'pending' | 'needs-review';

export interface StageMeta {
  label: string;
  variant: BadgeVariant;
  /** Background class for a step dot/marker, wired to the `--stage-*` tokens. */
  dotClass: string;
  /** Text-colour class wired to the `--stage-*` tokens. */
  textClass: string;
}

/**
 * Maps a pipeline stage status to plain wording + variant + the dedicated
 * `--stage-*` token classes, so stage markers stop being styled ad-hoc.
 */
export function stageMeta(status: StageStatus | string | null | undefined): StageMeta {
  const META: Record<string, StageMeta> = {
    complete: {
      label: 'Done',
      variant: 'success',
      dotClass: 'bg-stage-complete',
      textClass: 'text-stage-complete',
    },
    active: {
      label: 'In progress',
      variant: 'info',
      dotClass: 'bg-stage-active',
      textClass: 'text-stage-active',
    },
    pending: {
      label: 'Not started',
      variant: 'neutral',
      dotClass: 'bg-stage-pending',
      textClass: 'text-stage-pending',
    },
    'needs-review': {
      label: 'Needs review',
      variant: 'warning',
      dotClass: 'bg-warning',
      textClass: 'text-warning',
    },
  };

  return (
    META[normalizeKey(status ?? '')] ?? {
      label: humanizeFallback(status ?? ''),
      variant: 'neutral',
      dotClass: 'bg-stage-pending',
      textClass: 'text-stage-pending',
    }
  );
}
