/**
 * Check templates — the five things a check can do. One form per template.
 *
 * Adding a new check type = adding one entry below. No new component code,
 * no new tabs.
 */
import {
  FileCheck, Link2, Search, ShieldCheck, GitCompare, CheckSquare,
  type LucideIcon,
} from 'lucide-react';

export type Severity = 'block' | 'warn' | 'note';

export type SlotType =
  | 'string' | 'multiline' | 'number' | 'boolean'
  | 'doc-type' | 'doc-types' | 'select'
  | 'field-pairs';        // custom widget for the field-match template

export interface SlotDef {
  key: string;
  label: string;
  type: SlotType;
  required?: boolean;
  placeholder?: string;
  default?: any;
  options?: Array<{ value: string; label: string; hint?: string }>;
  /** Show this slot only when another slot has one of these values. */
  visibleWhen?: { key: string; in: string[] };
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
  /** When the template needs a set-equal CV rule (set-equal mode), the server
   *  ensures the rule exists and attaches it via cross_validation_rule_ids. */
  set_equal_rule?: { field: string; participating_doc_types: string[] };
}

export interface CheckTemplate {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  slots: SlotDef[];
  toPayload: (slots: Record<string, any>, severity: Severity) => TemplatePayload;
  suggestName?: (slots: Record<string, any>, docLabel: (slug: string) => string) => string;
}

function sevFlags(s: Severity) {
  return { required: s === 'block', manual_override_allowed: true };
}

const ENTITY_DOC_TYPES = [
  'trade-license', 'vat-certificate', 'establishment-card',
  'customer-signed-quote', 'moa', 'certificate-of-incorporation',
];

// ── Registry-check provider map ──────────────────────────────────────
// Each provider knows: which handler to invoke, which document feeds it,
// and the one extra slot that's relevant (everything else is sensible defaults).
export const REGISTRY_PROVIDERS = {
  ner: {
    label: 'NER / DED — Trade Licence',
    handler: 'ner_trade_license',
    document: 'trade-license',
    extraSlot: { key: 'activities', label: 'Expected activity keywords', type: 'string' as const,
                 placeholder: 'e.g. insurance, brokerage' },
    toConfig: (s: Record<string, any>) => ({ expected_activity_keywords: s.activities || '' }),
  },
  fta: {
    label: 'FTA — VAT Certificate',
    handler: 'fta_vat_verify',
    document: 'vat-certificate',
    extraSlot: { key: 'entity_field', label: 'Entity-name field', type: 'string' as const,
                 placeholder: 'Company Name', default: 'Company Name' },
    toConfig: (s: Record<string, any>) => ({ expected_entity_field: s.entity_field || 'Company Name' }),
  },
  dnb: {
    label: 'D&B UAE — MoA enrichment',
    handler: 'dnb_uae_moa_enrich',
    document: 'moa',
    extraSlot: null,
    toConfig: () => ({}),
  },
  uae_verify: {
    label: 'UAE Verify — Establishment Card',
    handler: 'uae_verify_establishment',
    document: 'establishment-card',
    extraSlot: null,
    toConfig: () => ({}),
  },
  uae_pass: {
    label: 'UAE PASS — Signatory ID',
    handler: 'uae_pass_signatory',
    document: 'kyc-signatory',
    extraSlot: null,
    toConfig: () => ({}),
  },
} as const;

export type RegistryProviderKey = keyof typeof REGISTRY_PROVIDERS;


export const CHECK_TEMPLATES: CheckTemplate[] = [
  // ── 0. Manual signoff ────────────────────────────────────────────
  {
    id: 'manual_signoff',
    icon: CheckSquare,
    title: 'Manual signoff',
    description: 'An operator ticks this off — no automation runs.',
    slots: [],
    toPayload: (_s, sev) => ({
      item_type: 'manual',
      auto_check_rule: 'manual',
      handler_name: '',
      config_payload: {},
      linked_documents: [],
      ...sevFlags(sev),
    }),
    suggestName: () => '',
  },

  // ── 1. Document received ─────────────────────────────────────────
  {
    id: 'document_received',
    icon: FileCheck,
    title: 'Document received',
    description: 'Pass when this document is uploaded for the request.',
    slots: [
      { key: 'doc', label: 'Which document', type: 'doc-type', required: true },
    ],
    toPayload: (s, sev) => ({
      item_type: 'verification',
      auto_check_rule: 'document-present',
      handler_name: 'document_present',
      config_payload: { doc_types: s.doc ? [s.doc] : [] },
      linked_documents: s.doc ? [s.doc] : [],
      ...sevFlags(sev),
    }),
    suggestName: (s, label) => s.doc ? `${label(s.doc)} received` : '',
  },

  // ── 2. Name match across documents ───────────────────────────────
  {
    id: 'name_match_across_docs',
    icon: Link2,
    title: 'Name match across documents',
    description: 'Every selected document must report the same value for the chosen field.',
    slots: [
      { key: 'field', label: 'Field name', type: 'string', required: true, default: 'Company Name',
        placeholder: 'Company Name' },
      { key: 'docs', label: 'Documents to compare', type: 'doc-types', required: true,
        default: ENTITY_DOC_TYPES },
    ],
    toPayload: (s, sev) => ({
      item_type: 'cross-validation',
      auto_check_rule: 'cross-validation',
      handler_name: 'cross_validation',
      config_payload: {},
      linked_documents: s.docs || [],
      set_equal_rule: {
        field: s.field || 'Company Name',
        participating_doc_types: s.docs || [],
      },
      ...sevFlags(sev),
    }),
    suggestName: (s) => `${s.field || 'Company Name'} matches across ${(s.docs || []).length} docs`,
  },

  // ── 3. Compare specific fields ───────────────────────────────────
  {
    id: 'compare_fields',
    icon: GitCompare,
    title: 'Compare specific fields between documents',
    description: 'Add one row per (source field ↔ target field) pair to compare.',
    slots: [
      { key: 'pairs', label: 'Field pairs', type: 'field-pairs', required: true },
      { key: 'fuzziness', label: 'Fuzziness (0 = exact, 100 = loose)', type: 'number', default: 10 },
    ],
    toPayload: (s, sev) => {
      const pairs = Array.isArray(s.pairs) ? s.pairs : [];
      const docs = Array.from(new Set(pairs.flatMap((p: any) => [p.source_doc, p.target_doc]).filter(Boolean)));
      return {
        item_type: 'cross-validation',
        auto_check_rule: 'cross-validation',
        handler_name: 'field_pair_match',
        config_payload: {
          pairs,
          fuzziness: typeof s.fuzziness === 'number' ? s.fuzziness : 10,
        },
        linked_documents: docs as string[],
        ...sevFlags(sev),
      };
    },
    suggestName: (s) => {
      const pairs = Array.isArray(s.pairs) ? s.pairs : [];
      if (!pairs.length) return 'Compare fields';
      const first = pairs[0];
      const extra = pairs.length > 1 ? ` (+${pairs.length - 1})` : '';
      return `${first.source_doc || '?'} ↔ ${first.target_doc || '?'}: ${first.source_field || '?'} match${extra}`;
    },
  },

  // ── 4. Web search / AML (Tavily) ─────────────────────────────────
  {
    id: 'tavily_screening',
    icon: Search,
    title: 'Search the web (Tavily)',
    description: 'AML / sanctions / PEP / adverse-media screening for the request entity.',
    slots: [
      { key: 'focus', label: 'Search focus (optional)', type: 'string',
        placeholder: 'e.g. sanctions, PEP, adverse media' },
    ],
    toPayload: (s, sev) => ({
      item_type: 'entity-screening',
      auto_check_rule: 'manual',
      handler_name: 'entity_screening',
      config_payload: { focus: s.focus || '' },
      linked_documents: [],
      ...sevFlags(sev),
    }),
    suggestName: () => 'AML / sanctions screening',
  },

  // ── 5. External API / registry ───────────────────────────────────
  {
    id: 'registry_check',
    icon: ShieldCheck,
    title: 'Check with external API (registry)',
    description: 'Calls the appropriate UAE registry / data provider for the chosen document.',
    slots: [
      { key: 'provider', label: 'Provider', type: 'select', required: true,
        options: (Object.entries(REGISTRY_PROVIDERS) as [RegistryProviderKey, typeof REGISTRY_PROVIDERS[RegistryProviderKey]][])
          .map(([value, p]) => ({ value, label: p.label })) },
      // Provider-specific extra slot — shown conditionally per provider
      { key: 'activities', label: 'Expected activity keywords', type: 'string',
        placeholder: 'e.g. insurance, brokerage',
        visibleWhen: { key: 'provider', in: ['ner'] } },
      { key: 'entity_field', label: 'Entity-name field on extraction', type: 'string',
        placeholder: 'Company Name', default: 'Company Name',
        visibleWhen: { key: 'provider', in: ['fta'] } },
    ],
    toPayload: (s, sev) => {
      const p = REGISTRY_PROVIDERS[s.provider as RegistryProviderKey];
      if (!p) {
        return { item_type: 'third-party-api', auto_check_rule: 'manual', ...sevFlags(sev) };
      }
      return {
        item_type: 'third-party-api',
        auto_check_rule: 'manual',
        handler_name: p.handler,
        config_payload: p.toConfig(s),
        linked_documents: [p.document],
        ...sevFlags(sev),
      };
    },
    suggestName: (s) => {
      const p = REGISTRY_PROVIDERS[s.provider as RegistryProviderKey];
      return p ? p.label : 'External registry check';
    },
  },
];


// ── Reverse mapping: detect which template fits an existing check ────

export interface DetectedTemplate {
  template: CheckTemplate;
  slots: Record<string, any>;
  severity: Severity;
}

export interface ExistingCheckShape {
  handler_name?: string;
  auto_check_rule?: string;
  config_payload?: any;
  linked_documents?: string[];
  cross_validation_rules?: Array<{
    id: number; mode?: string; extracted_field?: string;
    participating_doc_types?: string[]; source_doc_type?: string; target_doc_type?: string;
  }>;
  required?: boolean;
}

function getVerificationCfg(item: ExistingCheckShape): { handler: string; config: Record<string, any> } | null {
  const cfg = item.config_payload || {};
  if (Array.isArray(cfg.verifications) && cfg.verifications.length) {
    const v = cfg.verifications.find((x: any) => x?.handler && x.handler !== 'manual') || cfg.verifications[0];
    if (v) return { handler: v.handler || v.type || '', config: v.config || {} };
  }
  if (item.handler_name) return { handler: item.handler_name, config: cfg };
  return null;
}

export function detectTemplate(item: ExistingCheckShape): DetectedTemplate | null {
  const severity: Severity = item.required ? 'block' : 'warn';
  const T = (id: string) => CHECK_TEMPLATES.find(t => t.id === id);

  // 1. document_received
  if (item.handler_name === 'document_present' || item.auto_check_rule === 'document-present') {
    const slug = (item.linked_documents || [])[0] || '';
    const tpl = T('document_received');
    if (tpl) return { template: tpl, slots: { doc: slug }, severity };
  }

  // 2. name_match_across_docs — cross_validation with a set-equal CV rule
  const setEqual = (item.cross_validation_rules || []).find(r => r.mode === 'set-equal');
  if (setEqual) {
    const tpl = T('name_match_across_docs');
    if (tpl) return {
      template: tpl,
      slots: {
        field: setEqual.extracted_field || 'Company Name',
        docs: setEqual.participating_doc_types || item.linked_documents || [],
      },
      severity,
    };
  }

  const v = getVerificationCfg(item);

  // 3. compare_fields — field_pair_match handler OR cross_validation with pairs in config
  if (v && (v.handler === 'field_pair_match' || (v.config && Array.isArray(v.config.pairs)))) {
    const tpl = T('compare_fields');
    if (tpl) return {
      template: tpl,
      slots: { pairs: v.config.pairs || [], fuzziness: v.config.fuzziness ?? 10 },
      severity,
    };
  }

  // 4. tavily_screening
  if (v?.handler === 'entity_screening') {
    const tpl = T('tavily_screening');
    if (tpl) return { template: tpl, slots: { focus: v.config?.focus || '' }, severity };
  }

  // 5. registry_check
  if (v) {
    const providerEntry = (Object.entries(REGISTRY_PROVIDERS) as [RegistryProviderKey, any][])
      .find(([_, p]) => p.handler === v.handler);
    if (providerEntry) {
      const [provider, p] = providerEntry;
      const tpl = T('registry_check');
      if (tpl) {
        const slots: Record<string, any> = { provider };
        if (p.extraSlot) {
          const key = p.extraSlot.key as string;
          if (key === 'activities') slots.activities = v.config?.expected_activity_keywords || '';
          if (key === 'entity_field') slots.entity_field = v.config?.expected_entity_field || 'Company Name';
        }
        return { template: tpl, slots, severity };
      }
    }
  }

  // 6. manual_signoff — no handler + manual auto rule
  if (!v && (!item.auto_check_rule || item.auto_check_rule === 'manual')) {
    const tpl = T('manual_signoff');
    if (tpl) return { template: tpl, slots: {}, severity };
  }

  return null;
}
