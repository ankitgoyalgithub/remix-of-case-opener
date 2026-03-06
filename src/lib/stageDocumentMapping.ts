import { DocumentType } from '@/types/case';

// Maps each stage to its relevant document types
export const STAGE_DOCUMENT_MAPPING: Record<number, DocumentType[]> = {
  17: ['census', 'trade-license', 'moa'],
  18: ['trade-license', 'emirates-id', 'passport'],
  19: ['census', 'vat-certificate', 'claims-history'],
  20: ['medical-application-form'],
  21: ['quote'],
  22: ['quote-acceptance'],
  23: [],
  24: ['payment-receipt'],
  25: [],
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
    17: 'Prospecting',
    18: 'KYC & AML',
    19: 'Data Collection',
    20: 'Risk Assessment',
    21: 'Quoting',
    22: 'Selection',
    23: 'Underwriting',
    24: 'Payment',
    25: 'Issuance',
  };
  return labels[stageId] || 'Unknown Stage';
}

// Helper text for each stage explaining its purpose
export const STAGE_HELPER_TEXT: Record<number, string> = {
  17: 'Verify basic company info and lead source',
  18: 'Complete identity verification and legal checks',
  19: 'Gather census data and legal documents',
  20: 'Perform medical and workforce risk analysis',
  21: 'Generate and review premium quotes',
  22: 'Receive plan selection and acceptance',
  23: 'Final underwriting approval and review',
  24: 'Verify premium payment and invoicing',
  25: 'Deliver final policy schedule and kits',
};
