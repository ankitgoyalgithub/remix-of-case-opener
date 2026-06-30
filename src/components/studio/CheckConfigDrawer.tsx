import { useEffect, useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Save, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CheckForm, CheckFormState } from './CheckForm';
import { detectTemplate, ExistingCheckShape } from './checkTemplates';
import { updateCheck } from './checkPersistence';

type AutoCheckRule = 'manual' | 'document-present' | 'field-extracted' | 'cross-validation';

interface CheckItem {
  id: number;
  stage: number;
  name: string;
  required: boolean;
  linked_documents: string[];
  item_type: string;
  auto_check_rule: AutoCheckRule;
  manual_override_allowed: boolean;
  handler_name?: string;
  config_payload?: Record<string, any>;
  task_description?: string;
  task_details?: string;
  api_config?: Record<string, any>;
  cross_validation_rules?: Array<{
    id: number; name: string; mode?: string; extracted_field?: string;
    participating_doc_types?: string[]; source_doc_type?: string; target_doc_type?: string;
  }>;
}

interface ApiStage {
  id: number;
  name: string;
  order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CheckItem | null;
  stages: ApiStage[];
  onSaved: () => void;
}

export function CheckConfigDrawer({ open, onOpenChange, item, stages, onSaved }: Props) {
  // Detect which template this check came from
  const detected = useMemo(() => {
    if (!item) return null;
    const shape: ExistingCheckShape = {
      handler_name: item.handler_name,
      auto_check_rule: item.auto_check_rule,
      config_payload: item.config_payload,
      linked_documents: item.linked_documents,
      cross_validation_rules: item.cross_validation_rules,
      required: item.required,
    };
    return detectTemplate(shape);
  }, [item]);

  // CheckForm initial state — derived from detected template + the item's name
  const initial: CheckFormState | null = useMemo(() => {
    if (!detected || !item) return null;
    return {
      template: detected.template,
      slots: detected.slots,
      severity: detected.severity,
      name: item.name,
    };
  }, [detected, item]);

  const [stageId, setStageId] = useState<number | null>(null);
  const [state, setState] = useState<CheckFormState | null>(null);
  const [valid, setValid] = useState(false);
  const [saving, setSaving] = useState(false);

  // Re-mount the form when the item changes so it picks up fresh `initial`
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (item) {
      setStageId(item.stage);
      setFormKey(k => k + 1);
    }
  }, [item?.id]);

  if (!item) return null;

  const handleSave = async () => {
    if (!state) return;
    if (!stageId) { toast.error('Stage is required'); return; }
    if (!valid) { toast.error('Please fill the required fields'); return; }

    const payload = state.template.toPayload(state.slots, state.severity);
    setSaving(true);
    try {
      await updateCheck({
        existingId: item.id,
        existingCvRuleIds: (item.cross_validation_rules || []).map(r => r.id),
        name: state.name,
        stageId,
        payload,
      });
      toast.success('Check saved');
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("We couldn't save that check. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:max-w-[520px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-left truncate text-base">{item.name}</SheetTitle>
          <SheetDescription className="text-left text-[11px]">
            {stages.find(s => s.id === stageId)?.name || 'No stage'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!detected && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 flex gap-2.5">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-medium text-foreground">Legacy configuration</p>
                <p className="text-muted-foreground mt-1">
                  This check uses a custom configuration that doesn't fit any of the
                  current check types. Stage and name are still editable; for everything
                  else, delete it and re-add as one of the standard check types.
                </p>
              </div>
            </div>
          )}

          {/* Stage picker (always editable, even for legacy checks) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Stage</Label>
            <Select value={stageId ? String(stageId) : ''} onValueChange={v => setStageId(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.order}. {s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {detected && initial && (
            <CheckForm
              key={formKey}
              fixedTemplateId={detected.template.id}
              initial={initial}
              onChange={setState}
              onValidityChange={setValid}
            />
          )}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-border bg-background flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !detected || !valid}
            className="gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
