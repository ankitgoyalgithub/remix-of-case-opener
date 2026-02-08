import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  GripVertical,
  Zap,
  Hand,
  Link2,
} from 'lucide-react';
import { mockChecklistDefinitions, mockWorkflowStages, ChecklistDefinition } from '@/data/mockStudioData';
import { DOCUMENT_TYPE_LABELS } from '@/types/case';
import { cn } from '@/lib/utils';

export function WizardStepChecklist() {
  const [items, setItems] = useState<ChecklistDefinition[]>(mockChecklistDefinitions);
  const [selectedStage, setSelectedStage] = useState(1);

  const filteredItems = items.filter(item => item.stageId === selectedStage);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Stage Checklist</h2>
        <p className="text-sm text-muted-foreground">
          Define what ops must verify at each stage. Items are auto-generated from required documents and fields.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left: Stage selector */}
        <div className="w-56 shrink-0 space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stages</Label>
          {mockWorkflowStages.map(stage => {
            const count = items.filter(i => i.stageId === stage.order).length;
            const isSelected = selectedStage === stage.order;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.order)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {stage.order}
                  </span>
                  <span className="truncate">{stage.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
              </button>
            );
          })}
        </div>

        {/* Right: Checklist items */}
        <div className="flex-1 space-y-3">
          {filteredItems.map(item => (
            <Card key={item.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <Checkbox checked={false} disabled />
                  <div className="flex-1 min-w-0">
                    <Input
                      defaultValue={item.name}
                      className="border-0 p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent"
                    />
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {item.autoCheckRule !== 'manual' ? (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-warning" />
                          Auto: {item.autoCheckRule === 'document-present' ? 'Document present' : 'Field extracted'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Hand className="h-3 w-3" />
                          Manual verification
                        </span>
                      )}
                      {item.linkedDocuments.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Link2 className="h-3 w-3" />
                          {item.linkedDocuments.map(d => DOCUMENT_TYPE_LABELS[d] || d).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-xs text-muted-foreground">Required</Label>
                      <Switch
                        checked={item.required}
                        onCheckedChange={() => {
                          setItems(prev => prev.map(i =>
                            i.id === item.id ? { ...i, required: !i.required } : i
                          ));
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No checklist items for this stage
            </div>
          )}

          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Manual Checklist Item
          </Button>
        </div>
      </div>
    </div>
  );
}
