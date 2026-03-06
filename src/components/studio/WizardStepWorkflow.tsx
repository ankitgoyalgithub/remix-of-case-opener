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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-foreground">Workflow Stages</h2>
          <p className="text-sm font-medium text-muted-foreground/70">
            Define the architectural backbone of your insurance processing pipeline.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[11px] tracking-wider" onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          ADD STAGE
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
              "glass-card rounded-3xl border-border/40 overflow-hidden transition-all duration-300",
              editingId === stage.id ? "bg-primary/5 ring-1 ring-primary/20 shadow-2xl shadow-primary/5" : "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5",
              "p-5"
            )}>
              <div className="flex items-start gap-4">
                <div
                  className="cursor-move text-muted-foreground/30 hover:text-primary transition-colors mt-2"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0 shadow-sm">
                  {stage.order}
                </div>

                <div className="flex-1 min-w-0">
                  {editingId === stage.id ? (
                    <div className="space-y-5 py-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 px-1">Stage Name</Label>
                          <Input
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            className="h-11 rounded-xl bg-background/50 border-border/50 focus:ring-primary/20"
                            maxLength={100}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 px-1">SLA (HOURS)</Label>
                            <Input
                              type="number"
                              value={editForm.slaHours || ''}
                              onChange={(e) => setEditForm(prev => ({ ...prev, slaHours: parseInt(e.target.value) || undefined }))}
                              className="h-11 rounded-xl bg-background/50 border-border/50"
                              placeholder="Optional"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/60 px-1">ASSIGNED QUEUE</Label>
                            <Select defaultValue="standard">
                              <SelectTrigger className="h-11 rounded-xl bg-background/50 border-border/50">
                                <SelectValue placeholder="Select queue" />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-border/50 shadow-2xl">
                                <SelectItem value="standard" className="rounded-lg">Standard Ops</SelectItem>
                                <SelectItem value="senior" className="rounded-lg">Senior Ops</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Button size="sm" onClick={handleSaveEdit} className="gap-2 h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 font-bold text-[11px] tracking-wider">
                          <Check className="h-4 w-4" />
                          SAVE CHANGES
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="gap-2 h-10 px-6 rounded-xl text-muted-foreground hover:bg-muted/50 font-bold text-[11px] tracking-wider">
                          <X className="h-4 w-4" />
                          CANCEL
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 py-1">
                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-bold tracking-tight text-foreground">{stage.name}</h4>
                        <div className="flex items-center gap-2">
                          {stage.mandatory && (
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary rounded-md px-1.5 py-0">MANDATORY</Badge>
                          )}
                          {stage.slaHours && (
                            <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest bg-muted border-border/50 text-muted-foreground rounded-md px-1.5 py-0 gap-1">
                              <Clock className="h-3 w-3" />
                              {stage.slaHours}H SLA
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground/80 leading-relaxed max-w-2xl">{stage.description}</p>
                    </div>
                  )}
                </div>

                {editingId !== stage.id && (
                  <div className="flex items-center gap-3 ml-4">
                    <div className="flex flex-col items-center gap-1.5 px-3 border-x border-border/30">
                      <Label className="text-[9px] font-black tracking-tighter text-muted-foreground/40 uppercase">Lock</Label>
                      <Switch
                        checked={stage.mandatory}
                        onCheckedChange={(checked) => updateStage(stage.id, { mandatory: checked })}
                        className="scale-90 data-[state=checked]:bg-primary"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)} className="h-9 w-9 rounded-lg hover:bg-primary/5 hover:text-primary transition-all">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/5 hover:text-destructive transition-all"
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

      <div className="flex items-center justify-center py-6 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5 transition-colors hover:bg-muted/10 group cursor-pointer" onClick={() => setAddDialogOpen(true)}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-widest">Add Operations Phase</span>
            <span className="text-[10px] text-muted-foreground/60">Configure validation logic for a new process stage.</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center pt-2 gap-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest">
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
