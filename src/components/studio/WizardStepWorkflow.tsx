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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Workflow Stages</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Define the architectural backbone of your insurance processing pipeline.
          </p>
        </div>
        <Button size="sm" onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
      </div>

      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            draggable={editingId !== stage.id}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={cn(
              "group relative transition-all duration-300",
              dragOverIndex === index && "pt-12" // Spacer for drop target
            )}
          >
            {dragOverIndex === index && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-primary/40 rounded-full animate-pulse blur-sm" />
            )}

            <div className={cn(
              "bg-card rounded-lg border overflow-hidden transition-all duration-200",
              editingId === stage.id ? "ring-2 ring-primary/20 border-primary" : "hover:border-primary/40 shadow-sm",
              "p-4"
            )}>
              <div className="flex items-start gap-4">
                <div
                  className="cursor-move text-muted-foreground/40 hover:text-foreground transition-colors mt-1.5"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="w-8 h-8 rounded-md bg-muted border flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0 mt-0.5">
                  {stage.order}
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === stage.id ? (
                    <div className="space-y-5 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Stage Name</Label>
                          <Input
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="h-9"
                            maxLength={100}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">SLA (Hours)</Label>
                            <Input
                              type="number"
                              value={editForm.slaHours || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, slaHours: parseInt(e.target.value) || undefined }))}
                              className="h-9"
                              placeholder="Optional"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium">Assigned Queue</Label>
                            <Select defaultValue="standard">
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select queue" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard Ops</SelectItem>
                                <SelectItem value="senior">Senior Ops</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" onClick={handleSaveEdit} className="h-8">
                          Save Changes
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 text-muted-foreground">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{stage.name}</h4>
                        {stage.mandatory && (
                          <Badge variant="secondary" className="text-xs font-medium rounded-sm px-1.5 py-0 h-4">Required</Badge>
                        )}
                        {stage.slaHours && (
                          <Badge variant="outline" className="text-xs font-medium rounded-sm px-1.5 py-0 h-4 gap-1">
                            <Clock className="h-3 w-3" />
                            {stage.slaHours}h SLA
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{stage.description}</p>
                    </div>
                  )}
                </div>

                {editingId !== stage.id && (
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex flex-col items-center gap-1 px-3 border-x border-border/50">
                      <Label className="text-xs font-medium text-muted-foreground">Required</Label>
                      <Switch
                        checked={stage.mandatory}
                        onCheckedChange={(checked) => updateStage(stage.id, { mandatory: checked })}
                        className="scale-75"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteConfirm(stage.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center py-8 border-2 border-dashed border-border/60 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group" onClick={() => setAddDialogOpen(true)}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center shadow-sm group-hover:border-primary/50 transition-colors">
            <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-sm font-medium text-foreground">Add Stage</span>
            <span className="text-xs text-muted-foreground">Configure validation logic for a new process stage.</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pt-2 gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60">
          <GripVertical className="h-3 w-3" />
          Drag handle to reorder architecture
        </div>
      </div>

      <AddStageDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddStage}
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Decommission Stage</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80">
              Are you sure you want to remove <span className="text-foreground font-bold italic">"{stageToDelete?.name}"</span>?
              <br />This will permanently alter the workflow sequence.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs tracking-wider">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteStage(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold text-xs tracking-wider"
            >
              REMOVE PHASE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
