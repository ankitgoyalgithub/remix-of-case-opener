import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { CheckForm, CheckFormState } from './CheckForm';
import { createCheck } from './checkPersistence';

interface ApiStage { id: number; name: string; order: number }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: ApiStage | null;
  onCreated: () => void;
}

export function CheckLibraryDialog({ open, onOpenChange, stage, onCreated }: Props) {
  const [state, setState] = useState<CheckFormState | null>(null);
  const [valid, setValid] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset the form on each open by remounting (different key).
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (open) {
      setFormKey(k => k + 1);
      setState(null);
      setValid(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!stage || !state) return;
    if (!valid) { toast.error('Please fill the required fields'); return; }

    const payload = state.template.toPayload(state.slots, state.severity);
    setSaving(true);
    try {
      await createCheck({
        name: state.name,
        stageId: stage.id,
        payload,
      });
      toast.success('Check added');
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("We couldn't add that check. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="text-left text-base">
            Add a check {stage && <span className="text-muted-foreground font-normal">to {stage.name}</span>}
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground">Pick a check type, fill in the fields, save.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CheckForm
            key={formKey}
            onChange={setState}
            onValidityChange={setValid}
          />
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !valid}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Add check
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
