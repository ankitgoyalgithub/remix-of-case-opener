/**
 * Check templates — the five things a check can do. One form per template.
 *
 * Adding a new check type = adding one entry below. No new component code,
 * no new tabs.
 */
import {
  FileCheck, Link2, Search, ShieldCheck, GitCompare, CheckSquare, Users,
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

// Per-field match modes for the MOL workforce check. Mirrors the backend
// MolValidationHandler (`exact` / `exact_fuzzy` / `fuzzy`).
const MATCH_MODE_OPTIONS = [
  { value: 'exact',       label: 'Exact only',        hint: 'must match character-for-character' },
  { value: 'exact_fuzzy', label: 'Exact, then fuzzy', hint: 'exact first, fall back to similarity' },
  { value: 'fuzzy',       label: 'Fuzzy',             hint: 'similarity score only' },
];


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
    description: 'Compare this field across the documents you select below. Re-runs when any of them is uploaded.',
    slots: [
      { key: 'field', label: 'Field name', type: 'string', required: true, default: 'Company Name',
        placeholder: 'Company Name' },
      // Pick the docs that participate. Sensible default is the core
      // entity-bearing corporate documents; personal IDs / census files
      // are excluded so they don't fire false-positive mismatches.
      { key: 'docs', label: 'Documents to compare', type: 'doc-types', required: true,
        default: [
          'trade-license', 'vat-certificate', 'customer-signed-quote',
          'moa', 'establishment-card', 'certificate-of-incorporation',
        ] },
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
    suggestName: (s) =>
      `${s.field || 'Company Name'} matches across ${(s.docs || []).length} document${(s.docs || []).length === 1 ? '' : 's'}`,
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

  // ── 6. MOL workforce validation (census vs MOL list) ─────────────
  {
    id: 'mol_validation',
    icon: Users,
    title: 'MOL workforce validation',
    description: 'Match every census employee against the MOL employee list by passport, name, and nationality.',
    slots: [
      { key: 'passport_mode', label: 'Passport match', type: 'select', default: 'exact_fuzzy',
        options: MATCH_MODE_OPTIONS },
      { key: 'name_mode', label: 'Name match', type: 'select', default: 'fuzzy',
        options: MATCH_MODE_OPTIONS },
      { key: 'nationality_mode', label: 'Nationality match', type: 'select', default: 'exact',
        options: MATCH_MODE_OPTIONS },
      { key: 'passport_required', label: 'Passport is required', type: 'boolean', default: true,
        placeholder: 'Treat a row with no passport match as missing' },
      { key: 'auto_thresh', label: 'Auto-validate threshold (%)', type: 'number', default: 90,
        placeholder: 'Above this confidence → auto-validated' },
      { key: 'review_thresh', label: 'Review threshold (%)', type: 'number', default: 65,
        placeholder: 'Above this but below auto → needs review' },
      { key: 'block_on_missing', label: 'Block on missing employees', type: 'boolean', default: true,
        placeholder: 'Fail the check if any employee is not found in the MOL list' },
      { key: 'block_on_needs_review', label: 'Block on low-confidence matches', type: 'boolean', default: false,
        placeholder: 'Fail the check if any match needs manual review' },
    ],
    toPayload: (s, sev) => {
      const num = (v: any, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
      return {
        item_type: 'verification',
        auto_check_rule: 'manual',
        handler_name: 'mol_validation',
        config_payload: {
          verifications: [{
            type: 'mol_validation',
            handler: 'mol_validation',
            config: {
              auto_thresh: num(s.auto_thresh, 90),
              review_thresh: num(s.review_thresh, 65),
              block_on_missing: s.block_on_missing !== false,
              block_on_needs_review: s.block_on_needs_review === true,
              fields: {
                passport_number: { enabled: true, mode: s.passport_mode || 'exact_fuzzy', required: s.passport_required !== false, priority: 'high' },
                full_name:       { enabled: true, mode: s.name_mode || 'fuzzy', required: false, priority: 'high' },
                nationality:     { enabled: true, mode: s.nationality_mode || 'exact', required: false, priority: 'medium' },
              },
            },
          }],
        },
        linked_documents: ['census', 'mol-list'],
        ...sevFlags(sev),
      };
    },
    suggestName: () => 'MOL Validation (census vs MOL list)',
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

  // 2. name_match_across_docs — cross_validation with a set-equal CV rule.
  // Surface the rule's existing field + participating_doc_types so the edit
  // dialog opens prefilled with the right docs.
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

  // 4b. mol_validation — census vs MOL list workforce match
  if (v?.handler === 'mol_validation') {
    const tpl = T('mol_validation');
    if (tpl) {
      const c = v.config || {};
      const f = (c.fields && typeof c.fields === 'object') ? c.fields : {};
      const pass = f.passport_number || {};
      const nm = f.full_name || {};
      const nat = f.nationality || {};
      return {
        template: tpl,
        slots: {
          auto_thresh: c.auto_thresh ?? 90,
          review_thresh: c.review_thresh ?? 65,
          passport_mode: pass.mode || 'exact_fuzzy',
          name_mode: nm.mode || 'fuzzy',
          nationality_mode: nat.mode || 'exact',
          passport_required: pass.required ?? true,
          block_on_missing: c.block_on_missing ?? true,
          block_on_needs_review: c.block_on_needs_review ?? false,
        },
        severity,
      };
    }
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
