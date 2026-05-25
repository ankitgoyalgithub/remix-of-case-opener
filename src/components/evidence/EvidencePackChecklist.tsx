import { Check, AlertCircle } from 'lucide-react';
import { Stage, ChecklistItem } from '@/types/case';
import { cn } from '@/lib/utils';

interface EvidencePackChecklistProps {
  stages: Stage[];
  checklist: ChecklistItem[];
}

export function EvidencePackChecklist({ stages, checklist }: EvidencePackChecklistProps) {
  const stagesWithItems = stages
    .map(stage => ({ stage, items: checklist.filter(c => c.stageId === stage.id) }))
    .filter(s => s.items.length > 0);

  if (stagesWithItems.length === 0) {
    return <p className="text-[13px] text-muted-foreground italic">No checklist items recorded.</p>;
  }

  return (
    <div className="space-y-5">
      {stagesWithItems.map(({ stage, items }) => {
        const completed = items.filter(i => i.checked).length;
        const requiredItems = items.filter(i => i.required);
        const requiredPending = requiredItems.length - requiredItems.filter(i => i.checked).length;
        const allDone = completed === items.length;

        return (
          <div key={stage.id} className="break-inside-avoid">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-semibold text-foreground">{stage.name}</h4>
              <div className="flex items-center gap-2 text-[11px]">
                <span className={cn(
                  'font-mono font-semibold',
                  allDone ? 'text-success' : 'text-muted-foreground'
                )}>
                  {completed}/{items.length}
                </span>
                {requiredPending > 0 && (
                  <span className="inline-flex items-center px-1.5 h-4 rounded bg-destructive/12 text-destructive text-[10px] font-semibold">
                    {requiredPending} required pending
                  </span>
                )}
              </div>
            </div>
            <div className="border border-border rounded-md divide-y divide-border">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
                  {item.checked ? (
                    <Check className="h-3.5 w-3.5 text-success shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className={cn('flex-1', item.checked && 'text-muted-foreground')}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-[10px] font-mono font-semibold text-destructive">REQ</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
