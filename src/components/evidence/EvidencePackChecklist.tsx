import { Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
                  <Badge variant="critical" className="h-4 text-[10px] font-semibold">
                    {requiredPending} required, still to do
                  </Badge>
                )}
              </div>
            </div>
            <div className="border border-border rounded-md divide-y divide-border">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 text-[13px]">
                  {item.checked ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-success shrink-0" aria-hidden />
                      <span className="sr-only">Done:</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
                      <span className="sr-only">Still to do:</span>
                    </>
                  )}
                  <span className={cn('flex-1', item.checked && 'text-muted-foreground')}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-[10px] font-mono font-semibold text-destructive" title="Required item">
                      REQ
                    </span>
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
