/**
 * Best-effort resolver linking a RiskFlag to the checklist item the workbench
 * should scroll to when the user clicks "Jump to flag →".
 *
 * Risk flags do not carry a checklist FK, so we match on the strongest signal
 * available, falling back progressively to the aggregate Final-Review item.
 */
import type { ChecklistItem, RiskFlagSummary } from '@/types/case';

// flag_type → the handler_name of the checklist item that owns that risk.
const FLAG_TYPE_TO_HANDLER: Record<string, string> = {
  sanctions_risk: 'entity_screening',
  pep_risk: 'entity_screening',
  offshore_entity: 'entity_screening',
  high_risk_activity: 'entity_screening',
  employee_count_mismatch: 'mol_validation',
  name_mismatch: 'cross_validation',
};

const AGGREGATE_HANDLERS = ['overall_health_score', 'risk_review'];

export function findChecklistItemForFlag(
  flag: RiskFlagSummary,
  checklist: ChecklistItem[],
): ChecklistItem | undefined {
  // 1. Direct document match (e.g. expired_document on a specific doc type).
  if (flag.documentType) {
    const byDoc = checklist.find(i => i.documentType?.includes(flag.documentType as any));
    if (byDoc) return byDoc;
  }

  // 2. field_name namespace, e.g. "entity-screening:<entity>".
  if (flag.fieldName) {
    const ns = flag.fieldName.split(':')[0];
    if (ns === 'entity-screening') {
      const byNs = checklist.find(i => i.handlerName === 'entity_screening');
      if (byNs) return byNs;
    }
  }

  // 3. flag_type → handler.
  const handler = flag.flagType ? FLAG_TYPE_TO_HANDLER[flag.flagType] : undefined;
  if (handler) {
    const byHandler = checklist.find(i => i.handlerName === handler);
    if (byHandler) return byHandler;
  }

  // 4. Fallback: the aggregate Final-Review item, where the flag appears as a
  //    resolvable row.
  return checklist.find(
    i => (i.handlerName && AGGREGATE_HANDLERS.includes(i.handlerName)) || (i.itemType as string) === 'risk-review',
  );
}
