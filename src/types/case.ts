export interface ExtractedField {
  label: string;
  value: string | null;
  confidence: number;
  status: 'verified' | 'needs-review' | 'pending';
  source?: string;
  documentId?: string;
}

export interface ExtractedDataSection {
  title: string;
  fields: ExtractedField[];
}

export interface FieldMatchRule {
  id?: number;
  source_field: string;
  target_field: string;
  comparison_type: 'exact' | 'fuzzy' | 'numeric' | 'contains';
  tolerance_percentage?: number;
}

export interface CrossValidationRule {
  id: number;
  name: string;
  mode?: 'field-match' | 'set-equal';
  source_doc_type: string;
  target_doc_type: string;
  participating_doc_types?: string[];
  extracted_field?: string;
  description?: string;
  field_rules: FieldMatchRule[];
}

export interface DocDef {
  id: number | string;
  type: string;
  doc_type?: string;
  name: string;
  category: string;
  mandatory: boolean;
  is_active?: boolean;
  renewalOnly?: boolean;
  description?: string;
  aiInstructions?: string;
  hints?: string[];
  validation_rules?: string;
  extraction_keys?: string[];
  cross_validation_rules?: CrossValidationRule[];
}


export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'failed' | 'extracted' | 'verified';
  highlights?: DocumentHighlight[];
  url?: string;
  /** Same-origin proxy URL for pdf.js / fetch-based readers that can't use the
   * signed S3 URL directly due to CORS. */
  proxyUrl?: string;
  extraction?: any;
  requestStageId?: string | number;
  checklistId?: string;
}

export type DocumentType =
  | 'census'
  | 'finalized-census'
  | 'initial-census'
  | 'trade-license'
  | 'customer-signed-quote'
  | 'medical-application-form'
  | 'establishment-card'
  | 'vat-certificate'
  | 'moa'
  | 'mol-list'
  | 'group-declaration'
  | 'salary-declaration'
  | 'coc'
  | 'kyc-signatory'
  | 'quote'
  | 'emirates-id'
  | 'passport'
  | 'payment-receipt'
  | 'claims-history'
  | 'quote-acceptance'
  | 'other';

export interface DocumentHighlight {
  label: string;
  value: string;
  page?: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  action: string;
  user: string;
  details?: string;
}

export interface Stage {
  id: number;
  instanceId?: number | string;
  name: string;
  order: number;
  status: 'complete' | 'active' | 'pending' | 'needs-review';
  description: string;
  nextStageId?: number;
  prevStageId?: number;
}

export interface ChecklistRuleResult {
  pair: string;
  rule: string;
  source_field?: string;
  target_field?: string;
  source_doc_type?: string;
  target_doc_type?: string;
  source_value: string | null;
  target_value: string | null;
  comparison_type?: string;
  passed: boolean;
  note?: string | null;
  /* Structured extras — currently emitted by the MOL validation handler so the
     side-by-side comparison can show Name · Passport · Nationality on each
     side without regex-parsing strings. Other handlers may or may not populate
     these; treat them all as optional. */
  source_passport?: string | null;
  source_nationality?: string | null;
  target_passport?: string | null;
  target_nationality?: string | null;
  confidence?: number | null;  // percentage int 0-100
  /* MOL per-employee rows — stable key for durable reviewer decisions, plus any
     persisted decision merged in by the backend (durable, audited). */
  employee_key?: string;
  reviewer_decision?: 'confirm' | 'override' | 'reject' | 'missing' | 'review';
  reviewer_decision_label?: string;
  reviewer_note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  /* MOL Summary row only — the matching rules actually applied to this run,
     so the report's "Match rules" chips reflect the real config. */
  rules?: {
    auto_thresh?: number;
    review_thresh?: number;
    fields?: Record<string, { enabled?: boolean; mode?: string; required?: boolean; priority?: string }>;
  };
}

export interface AgentTraceStep {
  handler?: string;
  status?: string;
  model?: string;
  provider?: string;
  duration_ms?: number;
  ran_at?: string;
  prompt?: string;
  plan?: any;
  action?: string;
  instruction?: string;
  entity_name?: string;
  entity_source?: string;
  focus?: string;
  summary?: string;
  tavily_answer?: string;
  sources?: Array<{ type: string; ref?: string; label?: string }>;
}

export interface AgentTrace {
  steps?: AgentTraceStep[];
  definition_prompt?: string;
  definition_plan?: any;
}

export interface ChecklistValidationResult {
  status: 'pass' | 'fail' | 'pending' | 'error';
  details: ChecklistRuleResult[];
  run_at?: string;
  trace?: AgentTrace;
}

export interface CrossValidationPair {
  source_doc_type: string;
  target_doc_type: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  stageId: number;
  required: boolean;
  itemType: 'extraction' | 'verification' | 'cross-validation' | 'third-party-api' | 'manual' | 'mol-validation';
  documentType?: DocumentType[];
  taskDescription?: string;
  taskDetails?: string;
  isThirdPartyApi?: boolean;
  expectedCrossValidationRules?: any[];
  verifications?: Array<{ id: string; type: string; handler?: string; config: any }>;
  cross_validation_rules?: CrossValidationRule[];
  cross_validation_rule_ids?: number[];
  crossValidationPairs?: CrossValidationPair[];
  apiConfig?: Record<string, any>;
  handlerName?: string;
  configPayload?: Record<string, any>;
  result?: ChecklistValidationResult | null;
  overrideReason?: string;
}

export interface StageRequirements {
  stageId: number;
  requiredDocuments: DocumentType[];
  optionalDocuments?: DocumentType[];
}


export interface DecisionTrail {
  outcome: 'Approved' | 'Rejected';
  at: Date;
  by: string;
  comment: string;
}

export interface PublicationTrail {
  at: Date;
  by: string;
}

export interface RiskFlagSummary {
  id: number;
  title: string;
  severity: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
  createdAt?: Date;
  description?: string;
  /** Linkage hints used by the workbench "Jump to flag" action to find the
   * related checklist item. Populated from the backend RiskFlag serializer. */
  documentType?: string;
  flagType?: string;
  fieldName?: string;
}

export interface CaseData {
  id: string;
  smartId?: string;
  companyName: string;
  status: 'New' | 'In Review' | 'Missing Info' | 'Ready for Export' | 'Issued' | 'Approved' | 'Rejected' | 'Published';
  decision?: DecisionTrail;
  publication?: PublicationTrail;
  riskFlags?: RiskFlagSummary[];
  currentStage: number;
  priority: 'Urgent' | 'Normal';
  slaTargetHours: number;
  createdAt: Date;
  stages: Stage[];
  documents: Document[];
  extractedData: ExtractedDataSection[];
  timeline: TimelineEvent[];
  checklist: ChecklistItem[];
  workforceMismatch: {
    detected: boolean;
    molCount: number;
    censusCount: number;
    accepted: boolean;
    acceptReason?: string;
  };
  exportPayload?: object;
  isExported: boolean;
  isIssued: boolean;
  queue: 'Senior Ops Queue' | 'Standard Ops Queue';
  owner: string;
  brokerEmail: string;
  missingInfoRequested?: {
    timestamp: Date;
    documents: string[];
  };
  docDefs?: DocDef[];
}

// SLA calculation utilities
export const SLA_TARGETS = {
  Urgent: 24,
  Normal: 48,
};

export function calculateSlaRemaining(createdAt: Date, priority: 'Urgent' | 'Normal'): number {
  const targetHours = SLA_TARGETS[priority];
  const now = new Date();
  const elapsedMs = now.getTime() - createdAt.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  return Math.round(targetHours - elapsedHours);
}

export function getSlaStatus(remaining: number, targetHours: number): 'green' | 'amber' | 'red' {
  const percentRemaining = (remaining / targetHours) * 100;
  if (remaining <= 0 || percentRemaining < 10) return 'red';
  if (percentRemaining <= 50) return 'amber';
  return 'green';
}


// Plain-language labels shown to users. Where a term is genuinely industry-standard
// (census, MOA, MOL, KYC) the original term is kept in parentheses so specialists still
// recognise it while new/non-technical staff get the plain meaning.
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'census': 'Employee list (census)',
  'finalized-census': 'Final employee list',
  'initial-census': 'Initial employee list',
  'trade-license': 'Trade licence',
  'customer-signed-quote': 'Signed quote',
  'medical-application-form': 'Medical application form',
  'establishment-card': 'Establishment card',
  'vat-certificate': 'VAT certificate',
  'moa': 'Ownership document (MOA)',
  'mol-list': 'Government labour records (MOL)',
  'group-declaration': 'Group declaration form',
  'salary-declaration': 'Salary declaration form',
  'coc': 'Certificate of continuation',
  'kyc-signatory': 'Signatory ID check (KYC)',
  'quote': 'Quote',
  'emirates-id': 'Emirates ID',
  'passport': 'Passport',
  'payment-receipt': 'Payment receipt',
  'claims-history': 'Claims history',
  'quote-acceptance': 'Quote acceptance',
  'other': 'Other document',
};

export function getMissingDocuments(documents: Document[], docDefs: DocDef[]): DocumentType[] {
  const requirements = docDefs.filter(d => d.mandatory);
  const uploadedTypes = new Set(documents.map(d => d.type));
  return requirements.map(r => r.type as DocumentType).filter(docType => !uploadedTypes.has(docType));
}

export function canCompleteStage(stageOrder: number, documents: Document[], stages: Stage[], docDefs: DocDef[]): { canComplete: boolean; missingDocs: DocumentType[] } {
  // Final stage (usually Export/Issued) requires all previous stages to be complete
  // Assuming the highest order stage is the final one
  const maxOrder = Math.max(...stages.map(s => s.order));
  if (stageOrder === maxOrder) {
    const allPreviousComplete = stages
      .filter(s => s.order < maxOrder)
      .every(s => s.status === 'complete');
      
    // Before completing the final stage, all mandatory docs for the case must be present.
    const missingDocs = getMissingDocuments(documents, docDefs);
    return { canComplete: allPreviousComplete && missingDocs.length === 0, missingDocs: allPreviousComplete ? missingDocs : [] };
  }

  // Intermediate stages no longer require specific documents to be uploaded
  return { canComplete: true, missingDocs: [] };
}

// Ops team members for assignment
export const OPS_TEAM_MEMBERS = [
  { id: 'sarah', name: 'Sarah Ahmed', queue: 'Senior Ops Queue' as const },
  { id: 'mohammed', name: 'Mohammed Khan', queue: 'Senior Ops Queue' as const },
  { id: 'fatima', name: 'Fatima Al Ali', queue: 'Standard Ops Queue' as const },
  { id: 'ahmad', name: 'Ahmad Hassan', queue: 'Standard Ops Queue' as const },
  { id: 'layla', name: 'Layla Ibrahim', queue: 'Standard Ops Queue' as const },
];

export function getAutoAssignedQueue(priority: 'Urgent' | 'Normal'): 'Senior Ops Queue' | 'Standard Ops Queue' {
  return priority === 'Urgent' ? 'Senior Ops Queue' : 'Standard Ops Queue';
}
