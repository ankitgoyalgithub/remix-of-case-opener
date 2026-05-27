/**
 * Translates a CheckTemplate.toPayload() result into the actual API call
 * for /studio/checklists/. Encapsulates the set-equal CV rule provisioning so
 * the dialog + drawer don't each have to know about it.
 */
import { api } from '@/lib/api';
import { TemplatePayload } from './checkTemplates';

interface CvRule {
  id: number;
  name?: string;
  mode?: string;
  extracted_field?: string;
  participating_doc_types?: string[];
}

/**
 * Find or create a set-equal CrossValidationRule for the given field + docs.
 * Idempotent: looks for an existing rule with the same field + same doc set
 * (order-insensitive) before creating a new one.
 */
async function ensureSetEqualRule(field: string, docs: string[]): Promise<number> {
  const want = new Set(docs);
  const sameDocs = (a: string[] | undefined) => {
    const b = a || [];
    if (b.length !== want.size) return false;
    return b.every(d => want.has(d));
  };

  const existing = (await api.studio.cvRules.list().catch(() => [])) as CvRule[];
  // For the empty-docs case (all-docs mode), match any rule with the same
  // field name regardless of its stored participating_doc_types — we'll
  // clear that list on the matched rule so it switches to all-docs mode.
  const match = existing.find(r =>
    r.mode === 'set-equal'
    && (r.extracted_field || '').toLowerCase() === field.toLowerCase()
    && (docs.length === 0 || sameDocs(r.participating_doc_types)),
  );
  if (match) {
    // If we're enabling all-docs mode on a rule that has an old fixed list,
    // clear that list so the runner switches behavior.
    if (docs.length === 0 && (match.participating_doc_types || []).length > 0) {
      await api.studio.cvRules.update(match.id, {
        participating_doc_types: [],
      }).catch(() => null);
    }
    return match.id;
  }

  const created = (await api.studio.cvRules.create({
    name: docs.length === 0 ? `${field} across all documents` : `${field} across ${docs.length} docs`,
    mode: 'set-equal',
    extracted_field: field,
    participating_doc_types: docs,
    source_doc_type: '',
    target_doc_type: '',
  })) as CvRule;
  return created.id;
}

export interface PersistArgs {
  name: string;
  stageId: number;
  payload: TemplatePayload;
  /** When updating, the existing check id and existing rule ids. */
  existingId?: string | number;
  existingCvRuleIds?: number[];
}

/**
 * Translate a TemplatePayload into the body the checklists endpoint expects.
 * Provisions any set-equal CV rule first; caller still issues the POST/PATCH.
 */
async function buildBody(args: PersistArgs): Promise<Record<string, any>> {
  const { name, stageId, payload, existingCvRuleIds } = args;

  let cvRuleIds: number[] = existingCvRuleIds || [];
  if (payload.set_equal_rule) {
    const id = await ensureSetEqualRule(
      payload.set_equal_rule.field,
      payload.set_equal_rule.participating_doc_types,
    );
    cvRuleIds = [id];
  } else if (payload.handler_name !== 'cross_validation') {
    // For non-CV templates, clear stale rule attachments.
    cvRuleIds = [];
  }

  return {
    name: name.trim(),
    stage: stageId,
    item_type: payload.item_type || 'manual',
    auto_check_rule: payload.auto_check_rule || 'manual',
    required: payload.required ?? false,
    manual_override_allowed: payload.manual_override_allowed ?? true,
    handler_name: payload.handler_name || '',
    config_payload: payload.config_payload || {},
    linked_documents: payload.linked_documents || [],
    cross_validation_rule_ids: cvRuleIds,
  };
}

export async function createCheck(args: PersistArgs): Promise<void> {
  const body = await buildBody(args);
  await api.studio.checklists.create(body);
}

export async function updateCheck(args: PersistArgs & { existingId: string | number }): Promise<void> {
  const body = await buildBody(args);
  await api.studio.checklists.update(String(args.existingId), body);
}
