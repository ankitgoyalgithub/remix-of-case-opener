import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Check, AlertCircle } from 'lucide-react';
import { Stage, ChecklistItem } from '@/types/case';

interface EvidencePackChecklistProps {
  stages: Stage[];
  checklist: ChecklistItem[];
}

export function EvidencePackChecklist({ stages, checklist }: EvidencePackChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Checklist Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map(stage => {
            const items = checklist.filter(c => c.stageId === stage.id);
            if (items.length === 0) return null;
            
            const completed = items.filter(i => i.checked).length;
            const requiredItems = items.filter(i => i.required);
            const requiredCompleted = requiredItems.filter(i => i.checked).length;
            
            return (
              <div key={stage.id} className="border-b border-border pb-3 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{stage.name}</h4>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={completed === items.length ? 'bg-success/10 text-success border-success/30' : ''}
                    >
                      {completed}/{items.length}
                    </Badge>
                    {requiredItems.length > 0 && requiredCompleted < requiredItems.length && (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                        {requiredItems.length - requiredCompleted} required pending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.checked ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={item.checked ? 'text-muted-foreground' : ''}>
                        {item.label}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
