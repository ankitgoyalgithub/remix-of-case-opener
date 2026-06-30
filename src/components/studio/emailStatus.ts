/**
 * ONE place that decides how an incoming-email outcome or a mailbox-check result
 * is presented, for the "Incoming email" and "Email log" Configuration screens.
 *
 * Previously each screen kept its own `STATUS_TONE` colour map (with ad-hoc
 * `bg-success/10 text-success border-…` strings that drifted between files).
 * Both screens now import these helpers, so the same outcome reads and looks the
 * same everywhere — and the colour is expressed through the FIVE semantic Badge
 * variants (never an ad-hoc colour string), exactly like the app-wide status
 * helper in `@/lib/status`.
 *
 * The label is always plain language for a non-technical admin, and because the
 * Badge always shows that text, status is never conveyed by colour alone.
 */
import type { BadgeVariant } from '@/lib/status';

export interface EmailStatusMeta {
  /** Plain-language label shown inside the badge. */
  label: string;
  variant: BadgeVariant;
}

function key(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * What happened to a single received email.
 *   matched   → it became a request          (success)
 *   skipped   → no rule matched, left alone   (neutral)
 *   duplicate → already seen before           (neutral)
 *   pending   → waiting to be processed       (info)
 *   failed    → we couldn't process it        (critical)
 */
export function emailOutcomeMeta(status: string | null | undefined): EmailStatusMeta {
  const META: Record<string, EmailStatusMeta> = {
    matched: { label: 'Imported', variant: 'success' },
    skipped: { label: 'Skipped', variant: 'neutral' },
    duplicate: { label: 'Duplicate', variant: 'neutral' },
    pending: { label: 'Waiting', variant: 'info' },
    failed: { label: 'Failed', variant: 'critical' },
  };
  return META[key(status)] ?? { label: status || 'Unknown', variant: 'neutral' };
}

/**
 * The result of one mailbox check ("poll job").
 *   running → still in progress (info)
 *   success → finished cleanly  (success)
 *   failed  → it errored        (critical)
 */
export function mailboxCheckMeta(status: string | null | undefined): EmailStatusMeta {
  const META: Record<string, EmailStatusMeta> = {
    running: { label: 'In progress', variant: 'info' },
    success: { label: 'Done', variant: 'success' },
    failed: { label: 'Failed', variant: 'critical' },
  };
  return META[key(status)] ?? { label: status || 'Unknown', variant: 'neutral' };
}
