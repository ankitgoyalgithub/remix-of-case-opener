import { DocumentType } from '@/types/case';

// Maps each stage to its relevant document types
export const STAGE_DOCUMENT_MAPPING: Record<number, DocumentType[]> = {
  1: ['census', 'trade-license', 'customer-signed-quote', 'medical-application-form'],
  2: ['trade-license', 'establishment-card', 'vat-certificate', 'moa'],
  3: ['mol-list', 'census'],
  4: ['medical-application-form', 'group-declaration-form', 'salary-declaration-form', 'sub-group-declaration-form'],
  5: ['customer-signed-quote'],
  6: ['kyc-signatory', 'signatory-id'],
  7: [], // Export stage - no specific documents
};

export function getDocumentsForStage(stageId: number): DocumentType[] {
  return STAGE_DOCUMENT_MAPPING[stageId] || [];
}

export function isDocumentRelevantToStage(documentType: DocumentType, stageId: number): boolean {
  const relevantDocs = STAGE_DOCUMENT_MAPPING[stageId] || [];
  return relevantDocs.includes(documentType);
}

export function getStageLabel(stageId: number): string {
  const labels: Record<number, string> = {
    1: 'Intake & Completeness',
    2: 'Employer & Legal Validation',
    3: 'Workforce Validation',
    4: 'Declarations & Medical',
    5: 'Commercial Validation',
    6: 'Authorized Signatory',
    7: 'Export to Core System',
  };
  return labels[stageId] || 'Unknown Stage';
}
