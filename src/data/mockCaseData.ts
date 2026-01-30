import { CaseData, Stage, Document, ExtractedDataSection, TimelineEvent, ChecklistItem, DocumentType } from '@/types/case';

export const mockStages: Stage[] = [
  { id: 1, name: 'Intake & Completeness', status: 'complete', description: 'Verify all required documents are present' },
  { id: 2, name: 'Employer & Legal Validation', status: 'complete', description: 'Validate employer and legal documents' },
  { id: 3, name: 'Workforce Validation', status: 'needs-review', description: 'Validate employee counts and workforce data' },
  { id: 4, name: 'Declarations & Medical', status: 'active', description: 'Review medical and declaration forms' },
  { id: 5, name: 'Commercial Validation', status: 'pending', description: 'Validate commercial terms and pricing' },
  { id: 6, name: 'Authorized Signatory', status: 'pending', description: 'Verify authorized signatory details' },
  { id: 7, name: 'Export to Core System', status: 'pending', description: 'Export to core system and issue policy' },
];

export const mockDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Trade_License_2024.pdf',
    type: 'trade-license' as DocumentType,
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
    type: 'establishment-card' as DocumentType,
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
    type: 'census' as DocumentType,
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
    name: 'Quote_Proposal_Signed.pdf',
    type: 'customer-signed-quote' as DocumentType,
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
    name: 'Medical_Application_Form.pdf',
    type: 'medical-application-form' as DocumentType,
    uploadedAt: new Date('2024-01-15T10:42:00'),
    status: 'extracted',
    highlights: [
      { label: 'Applicant', value: 'Al Noor Trading LLC', page: 1 },
      { label: 'Coverage Type', value: 'Group Health', page: 1 },
    ],
  },
  {
    id: 'doc-6',
    name: 'MOL_Employee_List.pdf',
    type: 'mol-list' as DocumentType,
    uploadedAt: new Date('2024-01-15T10:45:00'),
    status: 'extracted',
    highlights: [
      { label: 'Total Employees', value: '52', page: 1 },
      { label: 'Active', value: '50', page: 1 },
      { label: 'On Leave', value: '2', page: 1 },
    ],
  },
  {
    id: 'doc-7',
    name: 'Group_Declaration.pdf',
    type: 'group-declaration-form' as DocumentType,
    uploadedAt: new Date('2024-01-15T10:48:00'),
    status: 'extracted',
    highlights: [
      { label: 'Declaration Date', value: '15/01/2024', page: 1 },
      { label: 'Authorized By', value: 'Ahmed Al Mansouri', page: 2 },
    ],
  },
  {
    id: 'doc-8',
    name: 'Salary_Declaration.pdf',
    type: 'salary-declaration-form' as DocumentType,
    uploadedAt: new Date('2024-01-15T10:50:00'),
    status: 'extracted',
    highlights: [
      { label: 'Total Annual Salary', value: 'AED 3,840,000', page: 1 },
      { label: 'Average Salary', value: 'AED 73,846', page: 1 },
    ],
  },
  {
    id: 'doc-9',
    name: 'KYC_Signatory.pdf',
    type: 'kyc-signatory' as DocumentType,
    uploadedAt: new Date('2024-01-15T10:52:00'),
    status: 'extracted',
    highlights: [
      { label: 'Name', value: 'Ahmed Al Mansouri', page: 1 },
      { label: 'Emirates ID', value: '784-1985-1234567-1', page: 1 },
      { label: 'Position', value: 'Managing Director', page: 1 },
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
  { id: 't1', timestamp: new Date('2024-01-15T10:30:00'), action: 'Request created', user: 'Sarah Ahmed', details: 'New SME Health request initiated' },
  { id: 't2', timestamp: new Date('2024-01-15T10:32:00'), action: 'Documents uploaded', user: 'Sarah Ahmed', details: '9 documents uploaded' },
  { id: 't3', timestamp: new Date('2024-01-15T10:35:00'), action: 'AI extraction started', user: 'System', details: 'Processing documents...' },
  { id: 't4', timestamp: new Date('2024-01-15T10:38:00'), action: 'AI extraction complete', user: 'System', details: '14 fields extracted' },
  { id: 't5', timestamp: new Date('2024-01-15T11:00:00'), action: 'Workforce mismatch detected', user: 'System', details: 'MOL: 52, Census: 43' },
  { id: 't6', timestamp: new Date('2024-01-15T14:20:00'), action: 'Review started', user: 'Mohammed Khan', details: 'Underwriting review initiated' },
];

export const mockChecklist: ChecklistItem[] = [
  // Stage 1: Intake & Completeness
  { id: 'c1', label: 'Census uploaded', checked: true, stageId: 1, required: true, documentType: 'census' },
  { id: 'c2', label: 'Trade License uploaded', checked: true, stageId: 1, required: true, documentType: 'trade-license' },
  { id: 'c3', label: 'Customer Signed Quote uploaded', checked: true, stageId: 1, required: true, documentType: 'customer-signed-quote' },
  { id: 'c4', label: 'Medical Application Form uploaded', checked: true, stageId: 1, required: true, documentType: 'medical-application-form' },
  
  // Stage 2: Employer & Legal Validation
  { id: 'c5', label: 'Trade License validated', checked: true, stageId: 2, required: true, documentType: 'trade-license' },
  { id: 'c6', label: 'Establishment Card validated', checked: true, stageId: 2, required: true, documentType: 'establishment-card' },
  { id: 'c7', label: 'VAT Certificate verified', checked: false, stageId: 2, required: false, documentType: 'vat-certificate' },
  { id: 'c8', label: 'MOA reviewed (if applicable)', checked: false, stageId: 2, required: false, documentType: 'moa' },
  
  // Stage 3: Workforce Validation
  { id: 'c9', label: 'MOL List verified', checked: true, stageId: 3, required: true, documentType: 'mol-list' },
  { id: 'c10', label: 'Census verified', checked: true, stageId: 3, required: true, documentType: 'census' },
  { id: 'c11', label: 'Mismatch resolved or accepted', checked: false, stageId: 3, required: true },
  
  // Stage 4: Declarations & Medical
  { id: 'c12', label: 'Medical Application Form reviewed', checked: false, stageId: 4, required: true, documentType: 'medical-application-form' },
  { id: 'c13', label: 'Group Declaration Form verified', checked: false, stageId: 4, required: true, documentType: 'group-declaration-form' },
  { id: 'c14', label: 'Salary Declaration Form verified', checked: false, stageId: 4, required: true, documentType: 'salary-declaration-form' },
  { id: 'c15', label: 'Sub Group Declaration reviewed (if applicable)', checked: false, stageId: 4, required: false, documentType: 'sub-group-declaration-form' },
  
  // Stage 5: Commercial Validation
  { id: 'c16', label: 'Customer Signed Quote validated', checked: false, stageId: 5, required: true, documentType: 'customer-signed-quote' },
  { id: 'c17', label: 'Premium confirmed', checked: false, stageId: 5, required: true },
  
  // Stage 6: Authorized Signatory
  { id: 'c18', label: 'KYC of Authorised Signatory verified', checked: false, stageId: 6, required: true, documentType: 'kyc-signatory' },
  { id: 'c19', label: 'Signatory authority confirmed', checked: false, stageId: 6, required: true },
  
  // Stage 7: Export & Issue
  { id: 'c20', label: 'All stages complete', checked: false, stageId: 7, required: true },
  { id: 'c21', label: 'Exported to core system', checked: false, stageId: 7, required: true },
  { id: 'c22', label: 'Policy issued', checked: false, stageId: 7, required: false },
];

// Create a date that's about 30 hours ago for realistic SLA simulation
const requestCreatedAt = new Date();
requestCreatedAt.setHours(requestCreatedAt.getHours() - 30);

export const mockCaseData: CaseData = {
  id: 'REQ-2024-00142',
  companyName: 'Al Noor Trading LLC',
  status: 'In Review',
  currentStage: 4,
  priority: 'Normal',
  slaTargetHours: 48,
  createdAt: requestCreatedAt,
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
  queue: 'Standard Ops Queue',
  owner: 'Sarah Ahmed',
  brokerEmail: 'ops@gulfinsurancebrokers.ae',
};

export const mockExportPayload = {
  requestId: 'REQ-2024-00142',
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
    { id: 'doc-4', name: 'Quote_Proposal_Signed.pdf', type: 'customer-signed-quote' },
    { id: 'doc-5', name: 'Medical_Application_Form.pdf', type: 'medical-application-form' },
    { id: 'doc-6', name: 'MOL_Employee_List.pdf', type: 'mol-list' },
    { id: 'doc-7', name: 'Group_Declaration.pdf', type: 'group-declaration-form' },
    { id: 'doc-8', name: 'Salary_Declaration.pdf', type: 'salary-declaration-form' },
    { id: 'doc-9', name: 'KYC_Signatory.pdf', type: 'kyc-signatory' },
  ],
};
