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
  const [selectedStage, setSelectedStage] = useState(stages[0]?.order ?? 1);
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
          {stages.map(stage => {
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
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && val !== item.name) {
                          updateItem(item.id, { name: val });
                        }
                      }}
                      className="border-0 p-0 h-auto text-sm font-medium focus-visible:ring-0 bg-transparent"
                      maxLength={200}
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
                        onCheckedChange={(checked) => updateItem(item.id, { required: checked })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredItems.length === 0 && !addingItem && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No checklist items for this stage
            </div>
          )}

          {/* Add item inline */}
          {addingItem && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter checklist item..."
                    className="flex-1 h-8 text-sm"
                    maxLength={200}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleAddItem} disabled={!newItemName.trim()} className="h-7 gap-1 text-xs">
                    <Check className="h-3 w-3" />
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAddingItem(false); setNewItemName(''); }} className="h-7 gap-1 text-xs">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddingItem(true)} disabled={addingItem}>
            <Plus className="h-4 w-4" />
            Add Manual Checklist Item
          </Button>
        </div>
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Checklist Item</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
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
