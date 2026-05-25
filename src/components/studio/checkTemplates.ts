/**
 * Check templates — operator-facing presets that hide handler/config jargon.
 *
 * Each template:
 *   - is a plain-English thing an ops user wants to verify
 *   - has 0–3 simple slots (document picker, field name, etc.)
 *   - knows how to translate filled slots into the backend payload
 *     (handler_name, config_payload, auto_check_rule, linked_documents)
 *
 * Adding a new template = appending an entry below. No new component code.
 */
import {
  FileCheck, CalendarClock, Link2, Layers, ShieldCheck, FileSearch,
  PenLine, Stamp, Mail, Search, Sparkles, Building2,
  type LucideIcon,
} from 'lucide-react';

export type Severity = 'block' | 'warn' | 'note';

export interface SlotDef {
  key: string;
  label: string;
  type: 'doc-type' | 'doc-types' | 'string' | 'multiline';
  placeholder?: string;
  required?: boolean;
}

export interface TemplatePayload {
  name?: string;
  item_type?: string;
  auto_check_rule?: string;
  handler_name?: string;
  config_payload?: Record<string, any>;
  linked_documents?: string[];
  required?: boolean;
  manual_override_allowed?: boolean;
}

export interface CheckTemplate {
  id: string;
  category: 'document' | 'consistency' | 'visual' | 'external' | 'compliance' | 'custom';
  icon: LucideIcon;
  title: string;
  description: string;
  slots: SlotDef[];
  /** Returns the full backend payload for given slot values + severity. */
  toPayload: (slots: Record<string, any>, severity: Severity) => TemplatePayload;
  /** Suggests a name based on the chosen slots. Operator can override. */
  suggestName?: (slots: Record<string, any>, docLabel: (slug: string) => string) => string;
}

export const CATEGORY_META: Record<CheckTemplate['category'], { label: string; description: string }> = {
  document:    { label: 'About a single document', description: 'Confirm something is true about one document.' },
  consistency: { label: 'Match across documents',  description: 'Confirm two or more documents agree.' },
  visual:      { label: 'Visual checks',           description: 'Look at the document — signatures, stamps, letterheads.' },
  external:    { label: 'External registry',       description: 'Confirm with a third-party authority.' },
  compliance:  { label: 'Compliance & screening',  description: 'AML, sanctions, PEP and entity screening.' },
  custom:      { label: 'Custom',                  description: 'Free-form AI check or expert mode.' },
};

// Helper — wrap a single handler invocation in the standard verifications shape
function wrapVerification(handler: string, config: Record<string, any>) {
  return {
    verifications: [
      { type: handler, handler, config },
    ],
  };
}

// Apply severity to required + override flags. "block" = required, no override
// would be too strict; we keep override for ops escape hatch.
function severityFlags(sev: Severity): { required: boolean; manual_override_allowed: boolean } {
  if (sev === 'block') return { required: true,  manual_override_allowed: true };
  if (sev === 'warn')  return { required: false, manual_override_allowed: true };
  return                       { required: false, manual_override_allowed: true }; // note
}


export const CHECK_TEMPLATES: CheckTemplate[] = [
  // ─── Documents ────────────────────────────────────────────────────
  {
    id: 'doc-present',
    category: 'document',
    icon: FileCheck,
    title: 'Document was uploaded',
    description: 'Passes when the document arrives and is extracted.',
    slots: [{ key: 'doc', label: 'Which document', type: 'doc-type', required: true }],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'document-present',
      handler_name: '',
      config_payload: {},
      linked_documents: s.doc ? [s.doc] : [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} uploaded` : '',
  },
  {
    id: 'doc-not-expired',
    category: 'document',
    icon: CalendarClock,
    title: 'Document is not expired',
    description: "Reads the document's expiry date and flags if it's past or near.",
    slots: [{ key: 'doc', label: 'Which document', type: 'doc-type', required: true }],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'field-extracted',
      handler_name: 'document_verification',
      ...wrapVerification('document_verification', {
        target_document: s.doc,
        prompt:
          `Confirm this document is currently valid. Flag if the expiry/validity ` +
          `date has passed or is within 30 days of expiring. Cite the date you found.`,
      }),
      linked_documents: s.doc ? [s.doc] : [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} is current` : '',
  },
  {
    id: 'doc-contains-fields',
    category: 'document',
    icon: FileSearch,
    title: "Document has the key information",
    description: 'AI verifies specific fields are present and look reasonable.',
    slots: [
      { key: 'doc', label: 'Which document', type: 'doc-type', required: true },
      { key: 'fields', label: 'Fields to check (comma-separated)', type: 'string',
        placeholder: 'e.g. TRN, Company Name, Effective Date', required: true },
    ],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'field-extracted',
      handler_name: 'document_verification',
      ...wrapVerification('document_verification', {
        target_document: s.doc,
        prompt: `Verify the document contains valid values for: ${s.fields}. Flag missing or implausible values and cite what you found.`,
      }),
      linked_documents: s.doc ? [s.doc] : [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} key fields present` : '',
  },

  // ─── Consistency ──────────────────────────────────────────────────
  {
    id: 'docs-agree',
    category: 'consistency',
    icon: Link2,
    title: 'Two or more documents agree on a field',
    description: 'Picks the field on each document and confirms the value matches.',
    slots: [
      { key: 'docs', label: 'Documents to compare', type: 'doc-types', required: true },
      { key: 'field', label: 'Which field', type: 'string',
        placeholder: 'e.g. Company Name', required: true },
    ],
    toPayload: (s, sev) => ({
      item_type: 'cross-validation',
      auto_check_rule: 'cross-validation',
      handler_name: 'cross_validation',
      ...wrapVerification('cross_validation', {
        target_documents: s.docs || [],
        fields: s.field ? [s.field] : [],
      }),
      linked_documents: s.docs || [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => {
      const docs = (s.docs || []).slice(0, 2).map(label).join(' ↔ ');
      const more = (s.docs || []).length > 2 ? ` (+${s.docs.length - 2})` : '';
      return docs ? `${docs}${more}: ${s.field || 'fields'} match` : '';
    },
  },
  {
    id: 'all-docs-same-company',
    category: 'consistency',
    icon: Layers,
    title: 'All documents share the same company name',
    description: 'Confirms every selected document reports the same Company Name.',
    slots: [
      { key: 'docs', label: 'Documents', type: 'doc-types', required: true },
    ],
    toPayload: (s, sev) => ({
      item_type: 'cross-validation',
      auto_check_rule: 'cross-validation',
      handler_name: 'cross_validation',
      ...wrapVerification('cross_validation', {
        target_documents: s.docs || [],
        fields: ['Company Name'],
      }),
      linked_documents: s.docs || [],
      ...severityFlags(sev),
    }),
    suggestName: (s) => (s.docs || []).length ? `All entity docs share Company Name` : '',
  },

  // ─── Visual ───────────────────────────────────────────────────────
  {
    id: 'has-signature',
    category: 'visual',
    icon: PenLine,
    title: 'Signatures match between two documents',
    description: 'AI compares the signature on document A with the signatory record on document B.',
    slots: [
      { key: 'left_doc', label: 'Document with the signature', type: 'doc-type', required: true },
      { key: 'right_doc', label: 'Reference document', type: 'doc-type', required: true },
    ],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'manual',
      handler_name: 'signature_match',
      ...wrapVerification('signature_match', {
        left_doc: s.left_doc,
        right_doc: s.right_doc,
      }),
      linked_documents: [s.left_doc, s.right_doc].filter(Boolean),
      ...severityFlags(sev),
    }),
    suggestName: (s, label) =>
      (s.left_doc && s.right_doc) ? `Signature match: ${label(s.left_doc)} ↔ ${label(s.right_doc)}` : '',
  },
  {
    id: 'has-stamp',
    category: 'visual',
    icon: Stamp,
    title: 'Document has a company stamp',
    description: 'AI checks the page for a clear company stamp / seal.',
    slots: [{ key: 'doc', label: 'Which document', type: 'doc-type', required: true }],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'manual',
      handler_name: 'stamp_present',
      ...wrapVerification('stamp_present', { target_document: s.doc }),
      linked_documents: s.doc ? [s.doc] : [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} stamp present` : '',
  },
  {
    id: 'on-letterhead',
    category: 'visual',
    icon: Building2,
    title: "Document is on the company's letterhead",
    description: 'AI verifies the document is on the expected official letterhead.',
    slots: [
      { key: 'doc', label: 'Which document', type: 'doc-type', required: true },
      { key: 'expected_company', label: 'Expected company name (optional)', type: 'string' },
    ],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'manual',
      handler_name: 'company_letterhead',
      ...wrapVerification('company_letterhead', {
        target_document: s.doc,
        expected_company: s.expected_company || '',
      }),
      linked_documents: s.doc ? [s.doc] : [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} on letterhead` : '',
  },
  {
    id: 'contains-wording',
    category: 'visual',
    icon: Mail,
    title: 'Document contains required wording',
    description: 'AI confirms the document expresses every required phrase (semantic match).',
    slots: [
      { key: 'doc', label: 'Which document', type: 'doc-type', required: true },
      { key: 'phrases', label: 'Required phrases (one per line)', type: 'multiline', required: true,
        placeholder: 'The employer agrees to…\nAll information provided is true…' },
    ],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'manual',
      handler_name: 'declaration_wordings',
      ...wrapVerification('declaration_wordings', {
        target_document: s.doc,
        required_phrases: s.phrases || '',
      }),
      linked_documents: s.doc ? [s.doc] : [],
      ...severityFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} required wording` : '',
  },

  // ─── External ─────────────────────────────────────────────────────
  {
    id: 'fta-vat',
    category: 'external',
    icon: ShieldCheck,
    title: 'Verify VAT TRN with FTA',
    description: 'Calls the UAE Federal Tax Authority to confirm the TRN matches the entity.',
    slots: [],
    toPayload: (_s, sev) => ({
      item_type: 'third-party-api',
      auto_check_rule: 'manual',
      handler_name: 'fta_vat_verify',
      ...wrapVerification('fta_vat_verify', { expected_entity_field: 'Company Name' }),
      linked_documents: ['vat-certificate'],
      ...severityFlags(sev),
    }),
    suggestName: () => 'VAT TRN verified with FTA',
  },
  {
    id: 'ner-trade-license',
    category: 'external',
    icon: ShieldCheck,
    title: 'Verify Trade Licence with NER / DED',
    description: 'Confirms the trade licence is active and lists the expected business activity.',
    slots: [
      { key: 'activities', label: 'Expected activity keywords (comma-separated)', type: 'string',
        placeholder: 'e.g. insurance, brokerage' },
    ],
    toPayload: (s, sev) => ({
      item_type: 'third-party-api',
      auto_check_rule: 'manual',
      handler_name: 'ner_trade_license',
      ...wrapVerification('ner_trade_license', {
        expected_activity_keywords: s.activities || '',
      }),
      linked_documents: ['trade-license'],
      ...severityFlags(sev),
    }),
    suggestName: () => 'Trade Licence verified with NER',
  },
  {
    id: 'establishment-card',
    category: 'external',
    icon: ShieldCheck,
    title: 'Verify Establishment Card with UAE Verify',
    description: 'Confirms the establishment card is registered for visas / labour.',
    slots: [],
    toPayload: (_s, sev) => ({
      item_type: 'third-party-api',
      auto_check_rule: 'manual',
      handler_name: 'uae_verify_establishment',
      ...wrapVerification('uae_verify_establishment', {}),
      linked_documents: ['establishment-card'],
      ...severityFlags(sev),
    }),
    suggestName: () => 'Establishment Card verified',
  },

  // ─── Compliance ───────────────────────────────────────────────────
  {
    id: 'aml-entity',
    category: 'compliance',
    icon: Search,
    title: 'AML / sanctions screening — request entity',
    description: 'Screens the company on this request for sanctions, PEP and adverse media.',
    slots: [],
    toPayload: (_s, sev) => ({
      item_type: 'entity-screening',
      auto_check_rule: 'manual',
      handler_name: 'entity_screening',
      ...wrapVerification('entity_screening', {}),
      linked_documents: [],
      ...severityFlags(sev),
    }),
    suggestName: () => 'AML screening — company',
  },
  {
    id: 'aml-ubo-cascade',
    category: 'compliance',
    icon: Search,
    title: 'AML / sanctions screening — every UBO and signatory',
    description: 'Pulls UBOs and authorised signatories from MoA / KYC / passports and screens each one.',
    slots: [],
    toPayload: (_s, sev) => ({
      item_type: 'orchestrator',
      auto_check_rule: 'manual',
      handler_name: 'ubo_aml_cascade',
      ...wrapVerification('ubo_aml_cascade', {
        sources: ['moa', 'kyc-signatory', 'emirates-id-passport', 'passport',
                  'shareholder-declaration', 'board-resolution'],
      }),
      linked_documents: ['moa', 'kyc-signatory'],
      ...severityFlags(sev),
    }),
    suggestName: () => 'AML cascade — UBOs + signatories',
  },

  // ─── Custom ───────────────────────────────────────────────────────
  {
    id: 'custom-ai',
    category: 'custom',
    icon: Sparkles,
    title: 'Custom AI check',
    description: "Describe what to verify in plain English. The AI plans how to check it.",
    slots: [
      { key: 'prompt', label: 'What should the AI verify?', type: 'multiline', required: true,
        placeholder:
          'e.g. Confirm the broker fee on the signed quote matches the rate on the trade licence and is below 5% of the premium.' },
    ],
    toPayload: (s, sev) => ({
      item_type: 'agent-orchestrator',
      auto_check_rule: 'manual',
      handler_name: 'agent_orchestrator',
      ...wrapVerification('agent_orchestrator', { prompt: s.prompt || '' }),
      linked_documents: [],
      ...severityFlags(sev),
    }),
    suggestName: () => 'Custom AI check',
  },
];
