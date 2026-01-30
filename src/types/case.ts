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
  type: string;
  uploadedAt: Date;
  status: 'uploaded' | 'processing' | 'extracted' | 'verified';
  highlights?: DocumentHighlight[];
}

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
}

export interface CaseData {
  id: string;
  companyName: string;
  status: string;
  currentStage: number;
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
}
