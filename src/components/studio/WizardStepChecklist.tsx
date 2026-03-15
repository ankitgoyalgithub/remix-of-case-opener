import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  Plus,
  GripVertical,
  Zap,
  Hand,
  Link2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { ChecklistDefinition } from '@/data/mockStudioData';
import { DOCUMENT_TYPE_LABELS } from '@/types/case';
import { useStudioChecklist, useStudioStages } from '@/hooks/useStudioStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function WizardStepChecklist() {
  const { items, addItem, removeItem, updateItem } = useStudioChecklist();
  const { stages } = useStudioStages();
  const [selectedStage, setSelectedStage] = useState<string | number>(stages[0]?.id ?? 1);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredItems = items.filter(item => item.stageId === selectedStage);
  const itemToDelete = items.find(i => i.id === deleteConfirm);

  const handleAddItem = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;
    addItem({
      stageId: selectedStage,
      name: trimmedName,
      required: false,
      linkedDocuments: [],
      autoCheckRule: 'manual',
      manualOverrideAllowed: true,
    });
    setNewItemName('');
    setAddingItem(false);
    toast.success('Checklist item added');
  };

  const handleDeleteItem = (id: string) => {
    removeItem(id);
    setDeleteConfirm(null);
    toast.success('Checklist item removed');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Validation Guardrails</h2>
        <p className="text-sm font-medium text-muted-foreground/70">
          Define precise verification checkpoints for each operational phase.
        </p>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Left: Stage Navigation Rail */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <Label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Operational Phases</Label>
          </div>
          <div className="flex-1 overflow-auto pr-2 space-y-1.5 custom-scrollbar">
            {stages.map(stage => {
              const count = items.filter(i => i.stageId === stage.id).length;
              const isSelected = selectedStage === stage.id;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.id)}
                  className={cn(
                    "w-full group text-left px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden active:scale-95",
                    isSelected
                      ? "bg-primary text-white shadow-lg shadow-primary/20 border-t border-white/20"
                      : "hover:bg-primary/5 text-muted-foreground border border-transparent"
                  )}
                >
                  {/* Subtle BG Glow for selected */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                  )}

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black transition-all",
                        isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        {stage.order}
                      </div>
                      <span className="text-xs font-bold tracking-tight truncate">{stage.name}</span>
                    </div>
                    {count > 0 && (
                      <Badge variant="secondary" className={cn(
                        "text-[9px] font-black h-5 min-w-[20px] rounded-full flex items-center justify-center transition-colors",
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Checklist Items */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
            <div className="space-y-4 pb-10">
              {filteredItems.map(item => (
                <div key={item.id} className="group relative">
                  <div className={cn(
                    "glass-card rounded-2xl border-border/40 p-4 transition-all duration-300",
                    "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                  )}>
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 hover:text-primary transition-colors cursor-move shrink-0" />

                      <div className="flex-1 min-w-0">
                        <Input
                          defaultValue={item.name}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== item.name) {
                              updateItem(item.id, { name: val });
                            }
                          }}
                          className="border-0 p-0 h-auto text-sm font-bold tracking-tight focus-visible:ring-0 bg-transparent text-foreground"
                          maxLength={200}
                        />
                        <div className="flex items-center gap-4 mt-2">
                          {item.autoCheckRule !== 'manual' ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20">
                              <Zap className="h-3 w-3 text-warning" />
                              <span className="text-[9px] font-black text-warning uppercase tracking-widest">AUTO: {item.autoCheckRule === 'document-present' ? 'ENVELOPE DETECTED' : 'FIELD VALIDATED'}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border/50">
                              <Hand className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MANUAL ATTESTATION</span>
                            </div>
                          )}

                          {item.linkedDocuments.length > 0 && (
                            <div className="flex items-center gap-1.5 text-muted-foreground/60">
                              <Link2 className="h-3 w-3" />
                              <span className="text-[10px] font-medium truncate max-w-[200px]">
                                {item.linkedDocuments.map(d => DOCUMENT_TYPE_LABELS[d] || d).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-6 ml-4">
                        <div className="flex flex-col items-center gap-1.5 px-3 border-x border-border/30">
                          <Label className="text-[9px] font-black tracking-tighter text-muted-foreground/40 uppercase">Mandatory</Label>
                          <Switch
                            checked={item.required}
                            onCheckedChange={(checked) => updateItem(item.id, { required: checked })}
                            className="scale-90 data-[state=checked]:bg-primary"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => setDeleteConfirm(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && !addingItem && (
                <div className="h-[200px] flex flex-col items-center justify-center glass-card rounded-[2rem] border-dashed border-border/40 gap-3">
                  <div className="text-center">
                    <p className="text-xs font-bold text-muted-foreground/60 tracking-widest uppercase">No Guardrails Defined</p>
                  </div>
                </div>
              )}

              {/* Inline Add Interaction */}
              <div className="pt-2">
                {addingItem ? (
                  <div className="glass-card rounded-2xl border-primary/30 bg-primary/5 p-4 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-4">
                      <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Specify checking requirement..."
                        className="flex-1 h-10 rounded-xl bg-background border-border/50 text-sm font-medium"
                        maxLength={200}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleAddItem} disabled={!newItemName.trim()} className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 font-bold text-[10px] tracking-widest">
                          <Check className="h-4 w-4 mr-2" />
                          ADD TASK
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setAddingItem(false); setNewItemName(''); }} className="h-10 w-10 rounded-xl text-muted-foreground">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-dashed border-border hover:border-primary/50 hover:bg-primary/5 group transition-all" onClick={() => setAddingItem(true)}>
                    <div className="flex items-center gap-3">
                      <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-[11px] font-black text-muted-foreground group-hover:text-primary tracking-widest uppercase transition-colors">Add Manual Attestation Task</span>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Purge Checkpoint</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
              Are you sure you want to remove <span className="text-foreground font-bold italic">"{itemToDelete?.name}"</span>?
              <br />This validation rule will be permanently deleted from the engine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs tracking-wider">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold text-xs tracking-wider shadow-lg shadow-destructive/20"
            >
              DELETE TASK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
