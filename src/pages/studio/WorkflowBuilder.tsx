import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Workflow, 
  GripVertical, 
  Plus, 
  Save, 
  Clock, 
  Edit2, 
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { mockWorkflowStages, WorkflowStage } from '@/data/mockStudioData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function WorkflowBuilder() {
  const [stages, setStages] = useState<WorkflowStage[]>(mockWorkflowStages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkflowStage>>({});
  const [hasChanges, setHasChanges] = useState(false);

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
    setHasChanges(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleToggleMandatory = (id: string) => {
    setStages(prev => prev.map(s => 
      s.id === id ? { ...s, mandatory: !s.mandatory } : s
    ));
    setHasChanges(true);
  };

  const handleSaveWorkflow = () => {
    toast.success('Workflow saved', {
      description: 'SME Health Policy Issuance workflow has been updated',
    });
    setHasChanges(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Workflow Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure request types and processing stages
          </p>
        </div>
        <Button onClick={handleSaveWorkflow} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Workflow
        </Button>
      </div>

      {/* Workflow Info */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">SME Health Policy Issuance</h3>
              <p className="text-sm text-muted-foreground">{stages.length} stages configured</p>
            </div>
            <Badge className="bg-success/20 text-success border-0">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stages List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Processing Stages</CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                  editingId === stage.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                )}
              >
                {/* Drag Handle */}
                <div className="cursor-move text-muted-foreground hover:text-foreground mt-1">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Stage Number */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {stage.order}
                </div>

                {/* Stage Content */}
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
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="mt-1 min-h-[60px]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">SLA (hours)</Label>
                        <Input
                          type="number"
                          value={editForm.slaHours || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, slaHours: parseInt(e.target.value) || undefined }))}
                          className="mt-1 w-32"
                          placeholder="Optional"
                        />
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
                            {stage.slaHours}h
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </>
                  )}
                </div>

                {/* Actions */}
                {editingId !== stage.id && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Mandatory</Label>
                      <Switch
                        checked={stage.mandatory}
                        onCheckedChange={() => handleToggleMandatory(stage.id)}
                      />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Drag hint */}
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <GripVertical className="h-3 w-3" />
            Drag stages to reorder (mock - reordering simulated)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
