// Verification and audit types for Phase 3

export interface VerificationAction {
  fieldLabel: string;
  sectionTitle: string;
  verifiedBy: string;
  verifiedAt: Date;
  previousStatus: 'needs-review' | 'pending';
}

export interface OverrideAction {
  type: 'workforce-mismatch';
  overriddenBy: string;
  overriddenAt: Date;
  reason: string;
  molCount?: number;
  censusCount?: number;
}

export interface AuditTrail {
  verifications: VerificationAction[];
  overrides: OverrideAction[];
}

export interface ExtractedDataWithVerification {
  sectionTitle: string;
  sectionStatus: 'verified' | 'partial' | 'needs-review';
  fields: {
    label: string;
    value: string | null;
    confidence: number;
    status: 'verified' | 'needs-review' | 'pending';
    source?: string;
    verifiedBy?: string;
    verifiedAt?: Date;
  }[];
}

export interface ExportPayloadWithAudit {
  requestId: string;
  exportedAt: string;
  exportedBy: string;
  employer: {
    companyName: string;
    tradeLicenseNumber: string;
    tradeLicenseExpiry: string;
    establishmentCardNumber: string;
    vatTrn: string;
    verificationStatus: 'verified' | 'partial' | 'needs-review';
  };
  workforce: {
    molEmployeeCount: number;
    censusMemberCount: number;
    mismatchDetected: boolean;
    mismatchAccepted: boolean;
    mismatchAcceptReason?: string;
    mismatchAcceptedBy?: string;
    mismatchAcceptedAt?: string;
    verificationStatus: 'verified' | 'partial' | 'needs-review';
  };
  commercial: {
    quoteReference: string;
    finalPremium: number;
    currency: string;
    planCode: string;
    verificationStatus: 'verified' | 'partial' | 'needs-review';
  };
  signatory: {
    name: string;
    idType: 'Emirates ID' | 'Passport';
    idNumber: string;
    verificationStatus: 'verified' | 'partial' | 'needs-review';
  };
  documents: {
    id: string;
    name: string;
    type: string;
    status: string;
  }[];
  auditSummary: {
    totalFieldsVerified: number;
    totalFieldsNeedingReview: number;
    overridesApplied: number;
    lastVerificationAt?: string;
  };
}

export interface EvidencePackData {
  requestSummary: {
    requestId: string;
    companyName: string;
    status: string;
    createdAt: Date;
    completedAt?: Date;
    owner: string;
    queue: string;
  };
  stageCompletion: {
    stageId: number;
    stageName: string;
    status: string;
    completedAt?: Date;
    completedBy?: string;
  }[];
  checklistSnapshot: {
    stageId: number;
    stageName: string;
    items: {
      label: string;
      checked: boolean;
      required: boolean;
    }[];
  }[];
  extractedDataSnapshot: ExtractedDataWithVerification[];
  overrideReasons: OverrideAction[];
  timeline: {
    timestamp: Date;
    action: string;
    user: string;
    details?: string;
  }[];
  documents: {
    id: string;
    name: string;
    type: string;
    status: string;
    uploadedAt: Date;
  }[];
}
