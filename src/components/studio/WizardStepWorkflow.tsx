import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GripVertical,
  Plus,
  Clock,
  Edit2,
  Check,
  X,
} from 'lucide-react';
import { mockWorkflowStages, WorkflowStage } from '@/data/mockStudioData';
import { cn } from '@/lib/utils';

export function WizardStepWorkflow() {
  const [stages, setStages] = useState<WorkflowStage[]>(mockWorkflowStages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkflowStage>>({});

  const handleEdit = (stage: WorkflowStage) => {
    setEditingId(stage.id);
    setEditForm({ ...stage });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setStages(prev => prev.map(s =>
      s.id === editingId ? { ...s, ...editForm } as WorkflowStage : s
    ));
    setEditingId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Workflow Stages</h2>
        <p className="text-sm text-muted-foreground">
          Define the processing stages for SME Health Policy Issuance. Each stage represents a validation step.
        </p>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => (
          <Card
            key={stage.id}
            className={cn(
              "transition-colors",
              editingId === stage.id ? "border-primary bg-primary/5" : "hover:border-primary/30"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="cursor-move text-muted-foreground hover:text-foreground mt-1">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {stage.order}
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === stage.id ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Stage Name</Label>
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          className="mt-1"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">SLA (hours)</Label>
                          <Input
                            type="number"
                            value={editForm.slaHours || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, slaHours: parseInt(e.target.value) || undefined }))}
                            className="mt-1"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Assigned Queue</Label>
                          <Select defaultValue="standard">
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select queue" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">Standard Ops Queue</SelectItem>
                              <SelectItem value="senior">Senior Ops Queue</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="gap-1.5">
                          <Check className="h-3 w-3" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1.5">
                          <X className="h-3 w-3" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{stage.name}</h4>
                        {stage.mandatory && (
                          <Badge variant="outline" className="text-xs">Required</Badge>
                        )}
                        {stage.slaHours && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="h-3 w-3" />
                            {stage.slaHours}h SLA
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </>
                  )}
                </div>

                {editingId !== stage.id && (
                  <div className="flex items-center gap-2">
                    <Switch checked={stage.mandatory} onCheckedChange={() => {
                      setStages(prev => prev.map(s =>
                        s.id === stage.id ? { ...s, mandatory: !s.mandatory } : s
                      ));
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add Stage
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <GripVertical className="h-3 w-3" />
          Drag stages to reorder
        </p>
      </div>
    </div>
  );
}
