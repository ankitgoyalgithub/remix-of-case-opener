import { useMemo, useState, useEffect } from 'react';
import { Stage, ChecklistItem, Document, DocDef, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Check, Lock, CheckCircle2, XCircle, AlertTriangle, Clock, Sparkles, ShieldCheck,
  ListTodo, Users, RefreshCw, Loader2, Play, ChevronDown, ChevronRight, FileText, Mail,
} from 'lucide-react';
import { ChecklistDetailPanel } from '@/components/case/ChecklistDetailPanel';
import { DocumentsInStage } from './DocumentsInStage';
import { StageFilterTabs, classifyChecklistItem, type StageFilter, type StageFilterCounts } from './StageFilterTabs';

interface WorkbenchStagePanelProps {
  stage: Stage;
  isFirstStage: boolean;
  checklist: ChecklistItem[];
  documents: Document[];
  docDefs: DocDef[];
  missingDocs: DocumentType[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
  onToggle: (itemId: string) => void;
  onRunValidation?: (itemId: string) => Promise<void>;
  onMarkStageComplete: (stageId: number) => void;
  onOpenDoc: (doc: Document) => void;
  onAskBroker: () => void;
}

// Automated check types share the brand accent; manual/other stay muted. No
// ad-hoc palette colours — colour is reserved for status meaning.
function itemTypeIcon(type: string) {
  switch (type) {
    case 'extraction': return <Sparkles className="h-3.5 w-3.5 text-primary" />;
    case 'verification': return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
    case 'cross-validation': return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    case 'mol-validation': return <Users className="h-3.5 w-3.5 text-primary" />;
    case 'entity-screening': return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
    default: return <ListTodo className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function isAutomated(item: ChecklistItem) {
  return (
    (item.handlerName && item.handlerName !== 'manual') ||
    item.itemType === 'cross-validation' ||
    item.verifications?.some(v => v.type !== 'manual')
  );
}

/** The prototype's stage panel: title + status chip + filter tabs, inline-expanding
 * checklist items, mark-complete, and the documents-in-stage chips. */
export function WorkbenchStagePanel({
  stage, isFirstStage, checklist, documents, docDefs, missingDocs,
  selectedItemId, onSelectItem, onToggle, onRunValidation, onMarkStageComplete,
  onOpenDoc, onAskBroker,
}: WorkbenchStagePanelProps) {
  const [filter, setFilter] = useState<StageFilter>('all');
  const [runningItems, setRunningItems] = useState<Record<string, boolean>>({});

  useEffect(() => { setFilter('all'); }, [stage.id]);

  const stageItems = useMemo(() => checklist.filter(i => i.stageId === stage.id), [checklist, stage.id]);

  const counts: StageFilterCounts = useMemo(() => {
    const c = { all: stageItems.length, failed: 0, passed: 0, pending: 0 };
    for (const i of stageItems) c[classifyChecklistItem(i)]++;
    return c;
  }, [stageItems]);

  const visibleItems = useMemo(
    () => (filter === 'all' ? stageItems : stageItems.filter(i => classifyChecklistItem(i) === filter)),
    [stageItems, filter],
  );

  const requiredIncomplete = stageItems.filter(i => i.required && !i.checked);
  const failedItems = stageItems.filter(i => ['fail', 'error'].includes((i.result as any)?.status));

  // Per-stage document types (union of items' linked docs).
  const stageDocTypes = useMemo(() => {
    const set = new Set<string>();
    stageItems.forEach(i => (i.documentType || []).forEach(d => set.add(d)));
    return Array.from(set);
  }, [stageItems]);

  // Compact status chip (matches prototype wording).
  const chip = (() => {
    if (stage.status === 'complete')
      return { text: 'Stage complete — all checks passed', cls: 'text-success border-success/30 bg-success/10' };
    if (failedItems.length > 0)
      return { text: failedItems.length === 1 ? failedItems[0].label : `${failedItems.length} checks failed`, cls: 'text-destructive border-destructive/30 bg-destructive/10' };
    if (missingDocs.length > 0)
      return { text: `${missingDocs.length} required document${missingDocs.length === 1 ? '' : 's'} missing`, cls: 'text-warning border-warning/30 bg-warning/10' };
    if (stage.status === 'needs-review')
      return { text: 'Stage in review', cls: 'text-warning border-warning/30 bg-warning/10' };
    if (requiredIncomplete.length > 0)
      return { text: 'Awaiting checks', cls: 'text-muted-foreground border-border bg-muted/40' };
    return { text: 'Ready to complete', cls: 'text-success border-success/30 bg-success/10' };
  })();

  const blocked = (isFirstStage ? missingDocs.length > 0 : false) || requiredIncomplete.length > 0 || failedItems.length > 0;
  const canComplete = !blocked && stage.status !== 'complete';

  const runItem = async (id: string) => {
    if (!onRunValidation) return;
    setRunningItems(p => ({ ...p, [id]: true }));
    try { await onRunValidation(id); } finally { setRunningItems(p => ({ ...p, [id]: false })); }
  };

  return (
    <div className="space-y-4">
      {/* Stage header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-semibold text-foreground">{stage.name}</h2>
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', chip.cls)}>{chip.text}</span>
          </div>
          {stage.description && <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>}
        </div>
        <StageFilterTabs value={filter} onChange={setFilter} counts={counts} />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {visibleItems.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">No {filter === 'all' ? '' : filter} items in this stage.</p>
        )}
        {visibleItems.map(item => {
          const expanded = selectedItemId === item.id;
          const status = (item.result as any)?.status as ('pass' | 'fail' | 'pending' | 'error' | undefined);
          const linkedDocs = (item.documentType || [])
            .map(t => documents.find(d => d.type === t))
            .filter(Boolean) as Document[];

          return (
            <div
              key={item.id}
              id={`checklist-item-${item.id}`}
              className={cn(
                'rounded-xl border transition-all',
                expanded ? 'border-primary/40 bg-primary/[0.03] ring-1 ring-primary/10'
                  : status === 'fail' || status === 'error' ? 'border-destructive/30 bg-destructive/[0.03]'
                  : 'border-border bg-card',
              )}
            >
              {/* Row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => onSelectItem(expanded ? '' : item.id)}
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => onToggle(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-success data-[state=checked]:border-success h-5 w-5 rounded-md shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-sm font-semibold truncate', item.checked ? 'text-muted-foreground' : 'text-foreground')}>
                      {item.label}
                    </span>
                    {item.required && (
                      <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 h-4 bg-destructive/5 text-destructive border-destructive/20 shrink-0">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {itemTypeIcon(item.itemType)}
                    {status === 'pass' && <StatusPill cls="bg-success/15 text-success" icon={<CheckCircle2 className="h-2.5 w-2.5" />} label="Passed" />}
                    {status === 'fail' && <StatusPill cls="bg-destructive/15 text-destructive" icon={<XCircle className="h-2.5 w-2.5" />} label="Failed" />}
                    {status === 'error' && <StatusPill cls="bg-warning/15 text-warning" icon={<AlertTriangle className="h-2.5 w-2.5" />} label="Error" />}
                    {(!status || status === 'pending') && <StatusPill cls="bg-muted text-muted-foreground" icon={<Clock className="h-2.5 w-2.5" />} label="Pending" />}
                    {item.result?.run_at && (
                      <span className="text-[10px] text-muted-foreground">{new Date(item.result.run_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAutomated(item) && onRunValidation && (
                    <Button
                      variant="ghost" size="icon"
                      className={cn('h-8 w-8', item.result ? 'text-muted-foreground hover:text-primary' : 'text-primary bg-primary/10 hover:bg-primary/20')}
                      onClick={(e) => { e.stopPropagation(); runItem(item.id); }}
                      disabled={runningItems[item.id]}
                      title={item.result ? 'Run this check again' : 'Run this check'}
                      aria-label={item.result ? `Run the check “${item.label}” again` : `Run the check “${item.label}”`}
                    >
                      {runningItems[item.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : item.result ? <RefreshCw className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                    </Button>
                  )}
                  {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-border/60 px-4 py-4">
                  <ChecklistDetailPanel item={item} onRunValidation={onRunValidation} />

                  {linkedDocs.length > 0 && (
                    <div className="mt-5 space-y-1.5">
                      {linkedDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-xs text-foreground truncate">
                              {docDefs.find(d => (d.type || d.doc_type) === doc.type)?.name
                                || DOCUMENT_TYPE_LABELS[doc.type] || doc.name}
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenDoc(doc)}>Open</Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onAskBroker}>
                      <Mail className="h-3.5 w-3.5" />
                      Ask broker
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mark complete */}
      {stage.status !== 'complete' && (
        <Button
          size="sm"
          variant={canComplete ? 'default' : 'outline'}
          className={cn('w-full gap-2', !canComplete && 'opacity-60')}
          onClick={() => canComplete && onMarkStageComplete(stage.id)}
          disabled={!canComplete}
        >
          {canComplete ? <><Check className="h-4 w-4" />Mark stage complete</> : <><Lock className="h-4 w-4" />Cannot complete stage</>}
        </Button>
      )}

      {/* Documents in this stage */}
      <div className="pt-2 border-t border-border/60">
        <DocumentsInStage docTypes={stageDocTypes} documents={documents} docDefs={docDefs} onOpenDoc={onOpenDoc} />
      </div>
    </div>
  );
}

function StatusPill({ cls, icon, label }: { cls: string; icon: React.ReactNode; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 h-4 rounded', cls)}>
      {icon}{label}
    </span>
  );
}
