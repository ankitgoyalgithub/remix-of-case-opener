// Mock data for AI Ops Studio configuration

import { DocumentType } from '@/types/case';

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  mandatory: boolean;
  slaHours?: number;
}

export interface DocumentDefinition {
  id: string;
  name: string;
  type: DocumentType;
  category: 'Employer' | 'Workforce' | 'Medical' | 'Commercial' | 'Signatory';
  mandatory: boolean;
  applicableStages: number[];
  renewalOnly: boolean;
  description: string;
  cross_validation_rules?: Array<{
    target_document_type: string;
    source_field: string;
    target_field: string;
    comparison_type: string;
  }>;
}

export interface ExtractionField {
  id: string;
  documentType: DocumentType;
  fieldName: string;
  dataType: 'Text' | 'Number' | 'Date';
  mandatory: boolean;
  confidenceThreshold: number;
  validationRule?: string;
}

export interface AIInstruction {
  documentType: DocumentType;
  instructions: string;
}

export interface ChecklistDefinition {
  id: string;
  stageId: number;
  name: string;
  required: boolean;
  linkedDocuments: DocumentType[];
  autoCheckRule: 'document-present' | 'field-extracted' | 'manual';
  manualOverrideAllowed: boolean;
}

export interface EmailTemplate {
  id: string;
  type: 'missing-info' | 'sla-reminder' | 'escalation';
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface GlobalSettings {
  defaultSlaNormal: number;
  defaultSlaUrgent: number;
  defaultQueues: string[];
  overrideRoles: string[];
  overrideReasonMandatory: boolean;
}

// Mock workflow stages
export const mockWorkflowStages: WorkflowStage[] = [
  { id: 'ws-1', name: 'Intake & Completeness', description: 'Verify all required documents are present', order: 1, mandatory: true, slaHours: 4 },
  { id: 'ws-2', name: 'Employer & Legal Validation', description: 'Validate employer and legal documents', order: 2, mandatory: true, slaHours: 8 },
  { id: 'ws-3', name: 'Workforce Validation', description: 'Validate employee counts and workforce data', order: 3, mandatory: true, slaHours: 8 },
  { id: 'ws-4', name: 'Declarations & Medical', description: 'Review medical and declaration forms', order: 4, mandatory: true, slaHours: 12 },
  { id: 'ws-5', name: 'Commercial Validation', description: 'Validate commercial terms and pricing', order: 5, mandatory: true, slaHours: 4 },
  { id: 'ws-6', name: 'Authorized Signatory', description: 'Verify authorized signatory details', order: 6, mandatory: true, slaHours: 4 },
  { id: 'ws-7', name: 'Export to Core System', description: 'Export to core system and issue policy', order: 7, mandatory: true },
];

// Mock document definitions
export const mockDocumentDefinitions: DocumentDefinition[] = [
  { id: 'dd-1', name: 'Trade License', type: 'trade-license', category: 'Employer', mandatory: true, applicableStages: [1, 2], renewalOnly: false, description: 'Valid trade license issued by DED or relevant authority' },
  { id: 'dd-2', name: 'Establishment Card', type: 'establishment-card', category: 'Employer', mandatory: true, applicableStages: [2], renewalOnly: false, description: 'MOL establishment card showing company details' },
  { id: 'dd-3', name: 'VAT Certificate', type: 'vat-certificate', category: 'Employer', mandatory: false, applicableStages: [2], renewalOnly: false, description: 'VAT registration certificate from FTA' },
  { id: 'dd-4', name: 'MOA', type: 'moa', category: 'Employer', mandatory: false, applicableStages: [2], renewalOnly: false, description: 'Memorandum of Association' },
  { id: 'dd-5', name: 'MOL Employee List', type: 'mol-list', category: 'Workforce', mandatory: true, applicableStages: [3], renewalOnly: false, description: 'Official employee list from Ministry of Labour' },
  { id: 'dd-6', name: 'Employee Census', type: 'census', category: 'Workforce', mandatory: true, applicableStages: [1, 3], renewalOnly: false, description: 'List of employees to be covered under the policy' },
  { id: 'dd-7', name: 'Medical Application Form', type: 'medical-application-form', category: 'Medical', mandatory: true, applicableStages: [1, 4], renewalOnly: false, description: 'Completed medical application form' },
  { id: 'dd-8', name: 'Group Declaration Form', type: 'group-declaration-form', category: 'Medical', mandatory: true, applicableStages: [4], renewalOnly: false, description: 'Group health declaration form' },
  { id: 'dd-9', name: 'Salary Declaration Form', type: 'salary-declaration-form', category: 'Medical', mandatory: true, applicableStages: [4], renewalOnly: false, description: 'Salary details for sum insured calculation' },
  { id: 'dd-10', name: 'Customer Signed Quote', type: 'customer-signed-quote', category: 'Commercial', mandatory: true, applicableStages: [1, 5], renewalOnly: false, description: 'Quote proposal signed by customer' },
  { id: 'dd-11', name: 'KYC Signatory', type: 'kyc-signatory', category: 'Signatory', mandatory: true, applicableStages: [6], renewalOnly: false, description: 'KYC documents for authorized signatory' },
];

// Mock extraction fields
export const mockExtractionFields: ExtractionField[] = [
  { id: 'ef-1', documentType: 'trade-license', fieldName: 'Company Name', dataType: 'Text', mandatory: true, confidenceThreshold: 90 },
  { id: 'ef-2', documentType: 'trade-license', fieldName: 'Trade License Number', dataType: 'Text', mandatory: true, confidenceThreshold: 95, validationRule: 'Alphanumeric, starts with TL-' },
  { id: 'ef-3', documentType: 'trade-license', fieldName: 'Trade License Expiry Date', dataType: 'Date', mandatory: true, confidenceThreshold: 90, validationRule: 'Must be future date' },
  { id: 'ef-4', documentType: 'establishment-card', fieldName: 'Establishment Card Number', dataType: 'Text', mandatory: true, confidenceThreshold: 95 },
  { id: 'ef-5', documentType: 'establishment-card', fieldName: 'MOL Employee Count', dataType: 'Number', mandatory: true, confidenceThreshold: 90 },
  { id: 'ef-6', documentType: 'census', fieldName: 'Census Member Count', dataType: 'Number', mandatory: true, confidenceThreshold: 95 },
  { id: 'ef-7', documentType: 'customer-signed-quote', fieldName: 'Quote Reference', dataType: 'Text', mandatory: true, confidenceThreshold: 95 },
  { id: 'ef-8', documentType: 'customer-signed-quote', fieldName: 'Final Premium', dataType: 'Number', mandatory: true, confidenceThreshold: 90, validationRule: 'Positive number in AED' },
  { id: 'ef-9', documentType: 'customer-signed-quote', fieldName: 'Plan Code', dataType: 'Text', mandatory: true, confidenceThreshold: 90 },
  { id: 'ef-10', documentType: 'kyc-signatory', fieldName: 'Signatory Name', dataType: 'Text', mandatory: true, confidenceThreshold: 90 },
  { id: 'ef-11', documentType: 'kyc-signatory', fieldName: 'Emirates ID / Passport No', dataType: 'Text', mandatory: true, confidenceThreshold: 95, validationRule: 'Valid Emirates ID or Passport format' },
];

// Mock AI instructions
export const mockAIInstructions: AIInstruction[] = [
  {
    documentType: 'trade-license', instructions: `Extract company name, license number, and expiry date from the trade license document.
  
RULES:
- License number typically appears near the top, prefixed with "TL-"
- Expiry date format: DD/MM/YYYY
- Ignore handwritten annotations
- If multiple company names appear, use the one in the header section
- Arabic text should be transliterated to English` },
  {
    documentType: 'establishment-card', instructions: `Extract establishment number and employee count from MOL establishment card.

RULES:
- Employee count is labeled as "عدد العمال" or "Number of Workers"
- Ignore inactive or terminated employees
- Establishment number format: EST-XXXXXXX` },
  {
    documentType: 'census', instructions: `Extract total member count from the census spreadsheet.

RULES:
- Count unique entries by Emirates ID
- Include principal lives and dependents separately
- Exclude rows with "Cancelled" or "Terminated" status` },
  {
    documentType: 'customer-signed-quote', instructions: `Extract quote reference, final premium amount, and plan code.

RULES:
- Quote reference format: QT-YYYY-XXXXX
- Premium should be the final amount in AED after discounts
- Plan code is typically alphanumeric (e.g., SME-GOLD-500)
- Verify signature is present before marking as valid` },
  {
    documentType: 'kyc-signatory', instructions: `Extract signatory name and ID number from KYC documents.

RULES:
- Emirates ID format: XXX-XXXX-XXXXXXX-X
- For passport, extract passport number and nationality
- Name should match the authorized signatory list` },
];

// Mock checklist definitions
export const mockChecklistDefinitions: ChecklistDefinition[] = [
  { id: 'cd-1', stageId: 1, name: 'Census uploaded', required: true, linkedDocuments: ['census'], autoCheckRule: 'document-present', manualOverrideAllowed: false },
  { id: 'cd-2', stageId: 1, name: 'Trade License uploaded', required: true, linkedDocuments: ['trade-license'], autoCheckRule: 'document-present', manualOverrideAllowed: false },
  { id: 'cd-3', stageId: 1, name: 'Customer Signed Quote uploaded', required: true, linkedDocuments: ['customer-signed-quote'], autoCheckRule: 'document-present', manualOverrideAllowed: false },
  { id: 'cd-4', stageId: 2, name: 'Trade License validated', required: true, linkedDocuments: ['trade-license'], autoCheckRule: 'field-extracted', manualOverrideAllowed: true },
  { id: 'cd-5', stageId: 2, name: 'Establishment Card validated', required: true, linkedDocuments: ['establishment-card'], autoCheckRule: 'field-extracted', manualOverrideAllowed: true },
  { id: 'cd-6', stageId: 3, name: 'MOL List verified', required: true, linkedDocuments: ['mol-list'], autoCheckRule: 'field-extracted', manualOverrideAllowed: true },
  { id: 'cd-7', stageId: 3, name: 'Mismatch resolved or accepted', required: true, linkedDocuments: [], autoCheckRule: 'manual', manualOverrideAllowed: true },
];

// Mock email templates
export const mockEmailTemplates: EmailTemplate[] = [
  {
    id: 'et-1',
    type: 'missing-info',
    name: 'Missing Documents Request',
    subject: 'Action Required: Missing Documents for {{RequestID}}',
    body: `Dear Broker,

We are processing the SME Health Policy request for {{CompanyName}} (Request ID: {{RequestID}}).

The following documents are required to proceed:
{{MissingDocuments}}

Please upload these documents at your earliest convenience to avoid delays.

Best regards,
Operations Team`,
    variables: ['RequestID', 'CompanyName', 'MissingDocuments', 'BrokerName'],
  },
  {
    id: 'et-2',
    type: 'sla-reminder',
    name: 'SLA Warning',
    subject: 'SLA Alert: {{RequestID}} - {{RemainingHours}} hours remaining',
    body: `Dear Team,

Request {{RequestID}} for {{CompanyName}} is approaching its SLA deadline.

Time Remaining: {{RemainingHours}} hours
Current Stage: {{CurrentStage}}
Assigned To: {{Owner}}

Please prioritize this request.

Best regards,
System`,
    variables: ['RequestID', 'CompanyName', 'RemainingHours', 'CurrentStage', 'Owner'],
  },
  {
    id: 'et-3',
    type: 'escalation',
    name: 'Escalation Notice',
    subject: 'ESCALATED: {{RequestID}} requires immediate attention',
    body: `Dear Manager,

Request {{RequestID}} has been escalated and requires immediate attention.

Company: {{CompanyName}}
Reason: {{EscalationReason}}
Escalated By: {{EscalatedBy}}

Please review and take appropriate action.

Best regards,
Operations Team`,
    variables: ['RequestID', 'CompanyName', 'EscalationReason', 'EscalatedBy'],
  },
];

// Mock global settings
export const mockGlobalSettings: GlobalSettings = {
  defaultSlaNormal: 48,
  defaultSlaUrgent: 24,
  defaultQueues: ['Standard Ops Queue', 'Senior Ops Queue'],
  overrideRoles: ['Ops Manager', 'Senior Ops'],
  overrideReasonMandatory: true,
};
