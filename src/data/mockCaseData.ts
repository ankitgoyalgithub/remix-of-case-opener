import { CaseData, Stage, Document, ExtractedDataSection, TimelineEvent, ChecklistItem } from '@/types/case';

export const mockStages: Stage[] = [
  { id: 1, name: 'Document Upload', status: 'complete', description: 'Upload required documents' },
  { id: 2, name: 'Data Extraction', status: 'complete', description: 'AI extracts data from documents' },
  { id: 3, name: 'Workforce Validation', status: 'needs-review', description: 'Validate employee counts' },
  { id: 4, name: 'Underwriting Review', status: 'active', description: 'Review and approve terms' },
  { id: 5, name: 'Premium Calculation', status: 'pending', description: 'Calculate final premium' },
  { id: 6, name: 'Policy Generation', status: 'pending', description: 'Generate policy documents' },
  { id: 7, name: 'Export & Issue', status: 'pending', description: 'Export to core system' },
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Trade_License_2024.pdf',
    type: 'trade-license',
    uploadedAt: new Date('2024-01-15T10:30:00'),
    status: 'extracted',
    highlights: [
      { label: 'Trade License No', value: 'TL-2024-889721', page: 1 },
      { label: 'Company Name', value: 'Al Noor Trading LLC', page: 1 },
      { label: 'Expiry Date', value: '31/12/2025', page: 1 },
      { label: 'Activity', value: 'General Trading', page: 2 },
    ],
  },
  {
    id: 'doc-2',
    name: 'Establishment_Card.pdf',
    type: 'establishment-card',
    uploadedAt: new Date('2024-01-15T10:32:00'),
    status: 'extracted',
    highlights: [
      { label: 'Establishment No', value: 'EST-7823491', page: 1 },
      { label: 'MOL Employee Count', value: '52', page: 1 },
      { label: 'Sponsor Name', value: 'Ahmed Al Mansouri', page: 1 },
    ],
  },
  {
    id: 'doc-3',
    name: 'Employee_Census.xlsx',
    type: 'census',
    uploadedAt: new Date('2024-01-15T10:35:00'),
    status: 'extracted',
    highlights: [
      { label: 'Total Members', value: '43', page: 1 },
      { label: 'Principal Lives', value: '38', page: 1 },
      { label: 'Dependents', value: '5', page: 1 },
    ],
  },
  {
    id: 'doc-4',
    name: 'Quote_Proposal.pdf',
    type: 'quote',
    uploadedAt: new Date('2024-01-15T10:40:00'),
    status: 'extracted',
    highlights: [
      { label: 'Quote Ref', value: 'QT-2024-00142', page: 1 },
      { label: 'Final Premium', value: 'AED 245,000', page: 3 },
      { label: 'Plan Code', value: 'SME-GOLD-500', page: 2 },
      { label: 'Valid Until', value: '15/02/2024', page: 1 },
    ],
  },
  {
    id: 'doc-5',
    name: 'Signatory_Emirates_ID.pdf',
    type: 'signatory-id',
    uploadedAt: new Date('2024-01-15T10:42:00'),
    status: 'extracted',
    highlights: [
      { label: 'Name', value: 'Ahmed Al Mansouri', page: 1 },
      { label: 'Emirates ID', value: '784-1985-1234567-1', page: 1 },
    ],
  },
];

export const mockExtractedData: ExtractedDataSection[] = [
  {
    title: 'Employer & Legal',
    fields: [
      { label: 'Company Name', value: 'Al Noor Trading LLC', confidence: 98, status: 'verified', source: 'Trade_License_2024.pdf' },
      { label: 'Trade License Number', value: 'TL-2024-889721', confidence: 97, status: 'verified', source: 'Trade_License_2024.pdf' },
      { label: 'Trade License Expiry Date', value: '31/12/2025', confidence: 95, status: 'verified', source: 'Trade_License_2024.pdf' },
      { label: 'Establishment Card Number', value: 'EST-7823491', confidence: 94, status: 'needs-review', source: 'Establishment_Card.pdf' },
      { label: 'VAT TRN', value: '100234567890003', confidence: 88, status: 'needs-review', source: 'Trade_License_2024.pdf' },
    ],
  },
  {
    title: 'Workforce',
    fields: [
      { label: 'MOL Employee Count', value: '52', confidence: 96, status: 'verified', source: 'Establishment_Card.pdf' },
      { label: 'Census Member Count', value: '43', confidence: 99, status: 'verified', source: 'Employee_Census.xlsx' },
      { label: 'Mismatch Flag', value: 'Yes', confidence: 100, status: 'needs-review', source: 'System' },
    ],
  },
  {
    title: 'Commercial',
    fields: [
      { label: 'Quote Reference', value: 'QT-2024-00142', confidence: 99, status: 'verified', source: 'Quote_Proposal.pdf' },
      { label: 'Final Premium (AED)', value: '245,000', confidence: 97, status: 'verified', source: 'Quote_Proposal.pdf' },
      { label: 'Plan Code', value: 'SME-GOLD-500', confidence: 96, status: 'verified', source: 'Quote_Proposal.pdf' },
    ],
  },
  {
    title: 'Signatory',
    fields: [
      { label: 'Signatory Name', value: 'Ahmed Al Mansouri', confidence: 95, status: 'verified', source: 'Signatory_Emirates_ID.pdf' },
      { label: 'Emirates ID / Passport No', value: '784-1985-1234567-1', confidence: 93, status: 'needs-review', source: 'Signatory_Emirates_ID.pdf' },
    ],
  },
];

export const mockTimeline: TimelineEvent[] = [
  { id: 't1', timestamp: new Date('2024-01-15T10:30:00'), action: 'Case created', user: 'Sarah Ahmed', details: 'New SME Health case initiated' },
  { id: 't2', timestamp: new Date('2024-01-15T10:32:00'), action: 'Documents uploaded', user: 'Sarah Ahmed', details: '5 documents uploaded' },
  { id: 't3', timestamp: new Date('2024-01-15T10:35:00'), action: 'AI extraction started', user: 'System', details: 'Processing documents...' },
  { id: 't4', timestamp: new Date('2024-01-15T10:38:00'), action: 'AI extraction complete', user: 'System', details: '14 fields extracted' },
  { id: 't5', timestamp: new Date('2024-01-15T11:00:00'), action: 'Workforce mismatch detected', user: 'System', details: 'MOL: 52, Census: 43' },
  { id: 't6', timestamp: new Date('2024-01-15T14:20:00'), action: 'Review started', user: 'Mohammed Khan', details: 'Underwriting review initiated' },
];

export const mockChecklist: ChecklistItem[] = [
  // Stage 1: Document Upload
  { id: 'c1', label: 'Trade License uploaded', checked: true, stageId: 1, required: true },
  { id: 'c2', label: 'Establishment Card uploaded', checked: true, stageId: 1, required: true },
  { id: 'c3', label: 'Employee Census uploaded', checked: true, stageId: 1, required: true },
  { id: 'c4', label: 'Quote Proposal uploaded', checked: true, stageId: 1, required: true },
  { id: 'c5', label: 'Signatory ID uploaded', checked: true, stageId: 1, required: true },
  // Stage 2: Data Extraction
  { id: 'c6', label: 'All documents processed', checked: true, stageId: 2, required: true },
  { id: 'c7', label: 'Employer data extracted', checked: true, stageId: 2, required: true },
  { id: 'c8', label: 'Workforce data extracted', checked: true, stageId: 2, required: true },
  // Stage 3: Workforce Validation
  { id: 'c9', label: 'MOL count verified', checked: true, stageId: 3, required: true },
  { id: 'c10', label: 'Census count verified', checked: true, stageId: 3, required: true },
  { id: 'c11', label: 'Mismatch resolved or accepted', checked: false, stageId: 3, required: true },
  // Stage 4: Underwriting Review
  { id: 'c12', label: 'Terms reviewed', checked: false, stageId: 4, required: true },
  { id: 'c13', label: 'Risk assessment complete', checked: false, stageId: 4, required: true },
  { id: 'c14', label: 'Approval obtained', checked: false, stageId: 4, required: true },
  // Stage 5: Premium Calculation
  { id: 'c15', label: 'Premium calculated', checked: false, stageId: 5, required: true },
  { id: 'c16', label: 'Premium approved', checked: false, stageId: 5, required: false },
  // Stage 6: Policy Generation
  { id: 'c17', label: 'Policy document generated', checked: false, stageId: 6, required: true },
  { id: 'c18', label: 'Schedule of benefits attached', checked: false, stageId: 6, required: true },
  // Stage 7: Export & Issue
  { id: 'c19', label: 'Exported to core system', checked: false, stageId: 7, required: true },
  { id: 'c20', label: 'Policy issued', checked: false, stageId: 7, required: false },
];

export const mockCaseData: CaseData = {
  id: 'CASE-2024-00142',
  companyName: 'Al Noor Trading LLC',
  status: 'In Progress',
  currentStage: 4,
  stages: mockStages,
  documents: mockDocuments,
  extractedData: mockExtractedData,
  timeline: mockTimeline,
  checklist: mockChecklist,
  workforceMismatch: {
    detected: true,
    molCount: 52,
    censusCount: 43,
    accepted: false,
  },
  isExported: false,
  isIssued: false,
};

export const mockExportPayload = {
  caseId: 'CASE-2024-00142',
  timestamp: new Date().toISOString(),
  employer: {
    companyName: 'Al Noor Trading LLC',
    tradeLicenseNumber: 'TL-2024-889721',
    tradeLicenseExpiry: '2025-12-31',
    establishmentCardNumber: 'EST-7823491',
    vatTrn: '100234567890003',
  },
  workforce: {
    molEmployeeCount: 52,
    censusMemberCount: 43,
    mismatchAccepted: false,
  },
  commercial: {
    quoteReference: 'QT-2024-00142',
    finalPremium: 245000,
    currency: 'AED',
    planCode: 'SME-GOLD-500',
  },
  signatory: {
    name: 'Ahmed Al Mansouri',
    emiratesId: '784-1985-1234567-1',
  },
  documents: [
    { id: 'doc-1', name: 'Trade_License_2024.pdf', type: 'trade-license' },
    { id: 'doc-2', name: 'Establishment_Card.pdf', type: 'establishment-card' },
    { id: 'doc-3', name: 'Employee_Census.xlsx', type: 'census' },
    { id: 'doc-4', name: 'Quote_Proposal.pdf', type: 'quote' },
    { id: 'doc-5', name: 'Signatory_Emirates_ID.pdf', type: 'signatory-id' },
  ],
};
