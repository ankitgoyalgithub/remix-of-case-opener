/**
 * Single source of truth for the request's "suggested next action".
 *
 * Shared by the header pill (`RequestDetailHeader`) and the prominent
 * `AINextActionBanner` so they never disagree. Pure function of the request's
 * status, missing-docs state and SLA status.
 */
export type NextActionTone = 'critical' | 'warning' | 'info' | 'success';

export type NextActionKind = 'publish' | 'request-info' | 'triage' | 'adjudicate';

export interface NextAction {
  label: string;
  tone: NextActionTone;
  kind: NextActionKind;
}

export function deriveNextAction(opts: {
  status: string;
  hasMissingDocuments: boolean;
  slaStatus: 'green' | 'amber' | 'red';
}): NextAction | null {
  const s = (opts.status || '').toLowerCase();
  const isTerminal = ['rejected', 'published', 'issued'].includes(s);
  const canPublish = s === 'approved';
  const canAdjudicate = !['approved', ...['rejected', 'published', 'issued']].includes(s);

  if (canPublish) return { label: 'Publish to insurer', tone: 'info', kind: 'publish' };
  if (isTerminal) return null;
  if (opts.hasMissingDocuments)
    return { label: 'Request missing info from broker', tone: 'warning', kind: 'request-info' };
  if (opts.slaStatus === 'red')
    return { label: 'Triage — case overdue', tone: 'critical', kind: 'triage' };
  if (canAdjudicate) return { label: 'Ready to adjudicate', tone: 'success', kind: 'adjudicate' };
  return null;
}
