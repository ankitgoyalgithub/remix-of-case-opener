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

export interface CrossValidationRule {
  target_document_type: string;
  source_field: string;
  target_field: string;
  comparison_type: string;
}

export interface DocDef {
  type: string;
  name: string;
  category: string;
  mandatory: boolean;
  applicableStages: number[];
  description?: string;
  validation_rules?: string;
  cross_validation_rules?: CrossValidationRule[];
}


export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: Date;
  status: 'uploaded' | 'processing' | 'extracted' | 'verified';
  highlights?: DocumentHighlight[];
  url?: string;
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
  status: 'complete' | 'active' | 'pending' | 'needs-review';
  description: string;
  nextStageId?: number;
  prevStageId?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  stageId: number;
  required: boolean;
  itemType: 'extraction' | 'verification' | 'cross-validation' | 'manual';
  documentType?: DocumentType; // Links checklist item to a document type
}

export interface StageRequirements {
  stageId: number;
  requiredDocuments: DocumentType[];
  optionalDocuments?: DocumentType[];
}

export interface CaseData {
  id: string;
  companyName: string;
  status: 'New' | 'In Review' | 'Missing Info' | 'Ready for Export' | 'Issued';
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

// Stage requirements configuration
export const STAGE_REQUIREMENTS: StageRequirements[] = [
  {
    stageId: 1, // Intelligent Intake & Digitization
    requiredDocuments: [
      'trade-license',
      'vat-certificate',
      'moa',
      'establishment-card',
      'customer-signed-quote',
      'finalized-census',
      'group-declaration',
      'medical-application-form',
      'mol-list',
      'initial-census'
    ],
    optionalDocuments: [
      'salary-declaration',
      'coc',
      'kyc-signatory'
    ]
  },
  {
    stageId: 2, // Source of Truth Verification
    requiredDocuments: [],
  },
  {
    stageId: 3, // Ownership & UBO Mapping
    requiredDocuments: [],
  },
  {
    stageId: 4, // Compliance & Screening
    requiredDocuments: [],
  },
  {
    stageId: 5, // Final Adjudication
    requiredDocuments: [],
  },
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'census': 'Census',
  'finalized-census': 'Final Census',
  'initial-census': 'Initial Census',
  'trade-license': 'Trade License',
  'customer-signed-quote': 'Customer Signed Quote',
  'medical-application-form': 'Medical Application Form',
  'establishment-card': 'Establishment Card',
  'vat-certificate': 'VAT Certificate',
  'moa': 'MOA (Memorandum of Association)',
  'mol-list': 'MOL List',
  'group-declaration': 'Group Declaration Form',
  'salary-declaration': 'Salary Declaration Form',
  'coc': 'Certificate of Continuation',
  'kyc-signatory': 'KYC of Authorised Signatory',
  'quote': 'Quote',
  'emirates-id': 'Emirates ID',
  'passport': 'Passport',
  'payment-receipt': 'Payment Receipt',
  'claims-history': 'Claims History',
  'quote-acceptance': 'Quote Acceptance',
  'other': 'Other Document',
};

export function getMissingDocumentsForStage(stageId: number, documents: Document[]): DocumentType[] {
  const requirements = STAGE_REQUIREMENTS.find(r => r.stageId === stageId);
  if (!requirements) return [];

  const uploadedTypes = new Set(documents.map(d => d.type));
  return requirements.requiredDocuments.filter(docType => !uploadedTypes.has(docType));
}

export function canCompleteStage(stageId: number, documents: Document[], stages: Stage[]): { canComplete: boolean; missingDocs: DocumentType[] } {
  // Stage 7 requires all previous stages to be complete
  if (stageId === 7) {
    const allPreviousComplete = stages
      .filter((s, index, arr) => index < arr.length - 1) // exclude last stage (usually Export/Issued)
      .every(s => s.status === 'complete');
    return { canComplete: allPreviousComplete, missingDocs: [] };
  }

  const missingDocs = getMissingDocumentsForStage(stageId, documents);
  return { canComplete: missingDocs.length === 0, missingDocs };
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
