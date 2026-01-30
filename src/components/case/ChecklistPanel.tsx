import { ChecklistItem, Stage } from '@/types/case';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ClipboardCheck, Check } from 'lucide-react';

interface ChecklistPanelProps {
  checklist: ChecklistItem[];
  stages: Stage[];
  currentStage: number;
  onToggle: (itemId: string) => void;
}

export function ChecklistPanel({ checklist, stages, currentStage, onToggle }: ChecklistPanelProps) {
  const getStageChecklist = (stageId: number) => {
    return checklist.filter(item => item.stageId === stageId);
  };

  const getStageProgress = (stageId: number) => {
    const items = getStageChecklist(stageId);
    const completed = items.filter(i => i.checked).length;
    return { completed, total: items.length };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Checklist</h3>
      </div>

      {stages.map((stage) => {
        const items = getStageChecklist(stage.id);
        const { completed, total } = getStageProgress(stage.id);
        const isCurrentStage = stage.id === currentStage;

        if (items.length === 0) return null;

        return (
          <Card 
            key={stage.id} 
            className={cn(
              "transition-all duration-200",
              isCurrentStage && "ring-1 ring-primary/50",
              stage.status === 'complete' && "opacity-75"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {stage.status === 'complete' && (
                    <Check className="h-4 w-4 text-success" />
                  )}
                  {stage.name}
                </CardTitle>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  completed === total 
                    ? "bg-success/20 text-success" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {completed}/{total}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {items.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center gap-2 py-1"
                  >
                    <Checkbox 
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => onToggle(item.id)}
                      className="data-[state=checked]:bg-success data-[state=checked]:border-success"
                    />
                    <label 
                      htmlFor={item.id}
                      className={cn(
                        "text-sm cursor-pointer flex-1",
                        item.checked && "text-muted-foreground line-through"
                      )}
                    >
                      {item.label}
                      {item.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
