// Verification check types for the Verification Summary panel

export type VerificationStatus = 'pass' | 'review' | 'fail';

export interface VerificationCheck {
  id: string;
  name: string;
  phase: VerificationPhase;
  status: VerificationStatus;
  source: string;
  resultText: string;
  timestamp: Date;
  evidence?: VerificationEvidence;
  actionRequired?: string;
}

export interface VerificationEvidence {
  sourceSystem: string;
  referenceId: string;
  extractedSnippet: string;
  linkedDocument?: string;
  linkedField?: string;
  timestamp: Date;
}

export type VerificationPhase =
  | 'intake'
  | 'source-of-truth'
  | 'ownership'
  | 'compliance'
  | 'adjudication';

export interface Phase {
  id: VerificationPhase;
  label: string;
  order: number;
}

export type OverallDecision = 'approvable' | 'requires-review' | 'blocked';

export const PHASES: Phase[] = [
  { id: 'intake', label: 'Intake & Digitization', order: 1 },
  { id: 'source-of-truth', label: 'Source-of-Truth Verification', order: 2 },
  { id: 'ownership', label: 'Ownership & UBO', order: 3 },
  { id: 'compliance', label: 'Compliance & Sanctions', order: 4 },
  { id: 'adjudication', label: 'Ops Adjudication', order: 5 },
];

export function getPhaseStatus(checks: VerificationCheck[], phase: VerificationPhase): VerificationStatus {
  const phaseChecks = checks.filter(c => c.phase === phase);
  if (phaseChecks.length === 0) return 'pass';
  if (phaseChecks.some(c => c.status === 'fail')) return 'fail';
  if (phaseChecks.some(c => c.status === 'review')) return 'review';
  return 'pass';
}

export function getOverallDecision(checks: VerificationCheck[]): OverallDecision {
  if (checks.some(c => c.status === 'fail')) return 'blocked';
  if (checks.some(c => c.status === 'review')) return 'requires-review';
  return 'approvable';
}
