export interface ExtractedField {
  label: string;
  value: string | null;
  confidence: number;
  status: 'verified' | 'needs-review' | 'pending';
  source?: string;
}

export interface ExtractedDataSection {
  title: string;
  fields: ExtractedField[];
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  uploadedAt: Date;
  status: 'uploaded' | 'processing' | 'extracted' | 'verified';
  highlights?: DocumentHighlight[];
}

export type DocumentType = 
  | 'census'
  | 'trade-license'
  | 'customer-signed-quote'
  | 'medical-application-form'
  | 'establishment-card'
  | 'vat-certificate'
  | 'moa'
  | 'mol-list'
  | 'group-declaration-form'
  | 'salary-declaration-form'
  | 'sub-group-declaration-form'
  | 'kyc-signatory'
  | 'quote'
  | 'signatory-id'
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
  name: string;
  status: 'complete' | 'active' | 'pending' | 'needs-review';
  description: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
  stageId: number;
  required: boolean;
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
    stageId: 1,
    requiredDocuments: ['census', 'trade-license', 'customer-signed-quote', 'medical-application-form'],
  },
  {
    stageId: 2,
    requiredDocuments: ['trade-license', 'establishment-card'],
    optionalDocuments: ['vat-certificate', 'moa'],
  },
  {
    stageId: 3,
    requiredDocuments: ['mol-list', 'census'],
  },
  {
    stageId: 4,
    requiredDocuments: ['medical-application-form', 'group-declaration-form', 'salary-declaration-form'],
    optionalDocuments: ['sub-group-declaration-form'],
  },
  {
    stageId: 5,
    requiredDocuments: ['customer-signed-quote'],
  },
  {
    stageId: 6,
    requiredDocuments: ['kyc-signatory'],
  },
  {
    stageId: 7,
    requiredDocuments: [], // Enabled only when all previous stages complete
  },
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  'census': 'Census',
  'trade-license': 'Trade License',
  'customer-signed-quote': 'Customer Signed Quote',
  'medical-application-form': 'Medical Application Form',
  'establishment-card': 'Establishment Card',
  'vat-certificate': 'VAT Certificate',
  'moa': 'MOA (Memorandum of Association)',
  'mol-list': 'MOL List',
  'group-declaration-form': 'Group Declaration Form',
  'salary-declaration-form': 'Salary Declaration Form',
  'sub-group-declaration-form': 'Sub Group Declaration Form',
  'kyc-signatory': 'KYC of Authorised Signatory',
  'quote': 'Quote',
  'signatory-id': 'Signatory ID',
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
      .filter(s => s.id < 7)
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
