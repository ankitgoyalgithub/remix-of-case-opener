import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  GripVertical,
  Plus,
  Clock,
  Edit2,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { WorkflowStage } from '@/data/mockStudioData';
import { useStudioStages } from '@/hooks/useStudioStore';
import { AddStageDialog } from './AddStageDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function WizardStepWorkflow() {
  const { stages, addStage, removeStage, reorderStages, updateStage, setStages } = useStudioStages();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkflowStage>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Drag state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleEdit = (stage: WorkflowStage) => {
    setEditingId(stage.id);
    setEditForm({ ...stage });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    updateStage(editingId, editForm);
    setEditingId(null);
    setEditForm({});
    toast.success('Stage updated');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleAddStage = (name: string, description: string) => {
    addStage(name, description);
    toast.success('Stage added');
  };

  const handleDeleteStage = (id: string) => {
    removeStage(id);
    setDeleteConfirm(null);
    toast.success('Stage removed');
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      reorderStages(fromIndex, toIndex);
      toast.success('Stage order updated');
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const stageToDelete = stages.find(s => s.id === deleteConfirm);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Workflow Stages</h2>
        <p className="text-sm text-muted-foreground">
          Define the processing stages for SME Health Policy Issuance. Each stage represents a validation step.
        </p>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => (
          <Card
            key={stage.id}
            draggable={editingId !== stage.id}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "transition-colors",
              editingId === stage.id ? "border-primary bg-primary/5" : "hover:border-primary/30",
              dragOverIndex === index && "border-primary border-dashed bg-primary/5"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground mt-1"
                  onMouseDown={(e) => e.stopPropagation()}
                >
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
                          maxLength={100}
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
                    <Switch checked={stage.mandatory} onCheckedChange={(checked) => {
                      updateStage(stage.id, { mandatory: checked });
                    }} />
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(stage.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Stage
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <GripVertical className="h-3 w-3" />
          Drag stages to reorder
        </p>
      </div>

      <AddStageDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddStage}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{stageToDelete?.name}"? This action cannot be undone.
              Remaining stages will be renumbered automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteStage(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
