import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ClipboardCheck, Plus, Loader2, Zap, Hand, Link2, ShieldCheck, Trash2, Settings, Sparkles, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/types/case';
import { api } from '@/lib/api';
import { CheckConfigDrawer } from '@/components/studio/CheckConfigDrawer';

type AutoCheckRule = 'manual' | 'document-present' | 'field-extracted' | 'cross-validation';

const AUTO_CHECK_LABELS: Record<AutoCheckRule, string> = {
  'manual': 'Manual Only',
  'document-present': 'Document Present',
  'field-extracted': 'Field Extracted',
  'cross-validation': 'Cross-validation Auto',
};

const ITEM_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'verification', label: 'Verification' },
  { value: 'extraction', label: 'Extraction' },
  { value: 'cross-validation', label: 'Cross-validation' },
  { value: 'third-party-api', label: 'Third-party API' },
  { value: 'agent-orchestrator', label: 'Agent (prompt-driven)' },
  { value: 'entity-screening', label: 'Entity screening' },
  { value: 'risk-review', label: 'Risk review' },
] as const;

interface ApiStage {
  id: number;
  name: string;
  order: number;
}

interface ApiChecklistItem {
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
  cross_validation_rules?: Array<{ id: number; name: string }>;
}

export default function ChecklistBuilder() {
  const [stages, setStages] = useState<ApiStage[]>([]);
  const [items, setItems] = useState<ApiChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newItemType, setNewItemType] = useState<string>('manual');
  const [newAutoCheck, setNewAutoCheck] = useState<AutoCheckRule>('manual');
  const [newRequired, setNewRequired] = useState(false);

  const [busyId, setBusyId] = useState<number | null>(null);
  const [drawerItem, setDrawerItem] = useState<ApiChecklistItem | null>(null);

  useEffect(() => { fetchAll(); }, []);

  const [docActiveSet, setDocActiveSet] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [stagesRes, itemsRes, docsRes] = await Promise.all([
        api.studio.stages.list(),
        api.studio.checklists.list(),
        api.studio.documents.list(),
      ]);
      const sortedStages = (stagesRes as ApiStage[]).slice().sort((a, b) => a.order - b.order);
      setStages(sortedStages);
      setItems(itemsRes as ApiChecklistItem[]);
      setDocActiveSet(new Set(
        (docsRes as any[]).filter(d => d.is_active !== false).map(d => d.doc_type)
      ));
      if (sortedStages.length > 0 && selectedStageId === null) {
        setSelectedStageId(sortedStages[0].id);
      }
    } catch {
      toast.error('Failed to load checklist configuration');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(
    () => items.filter(i => i.stage === selectedStageId),
    [items, selectedStageId],
  );

  const selectedStage = stages.find(s => s.id === selectedStageId);

  const patchItem = async (id: number, patch: Partial<ApiChecklistItem>) => {
    const previous = items;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    setBusyId(id);
    try {
      await api.studio.checklists.update(String(id), patch);
    } catch {
      setItems(previous);
      toast.error('Failed to update check');
    } finally {
      setBusyId(null);
    }
  };

  const handleAddItem = async () => {
    const name = newName.trim();
    if (!name) { toast.error('Name is required'); return; }
    if (!selectedStageId) { toast.error('Pick a stage first'); return; }
    setAdding(true);
    try {
      const created = await api.studio.checklists.create({
        stage: selectedStageId,
        name,
        item_type: newItemType,
        auto_check_rule: newAutoCheck,
        required: newRequired,
        manual_override_allowed: true,
        linked_documents: [],
      });
      setItems(prev => [...prev, created as ApiChecklistItem]);
      setAddOpen(false);
      setNewName(''); setNewItemType('manual'); setNewAutoCheck('manual'); setNewRequired(false);
      toast.success('Check added');
    } catch {
      toast.error('Failed to add check');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (item: ApiChecklistItem) => {
    setBusyId(item.id);
    try {
      await api.studio.checklists.delete(String(item.id));
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success(`"${item.name}" deleted`);
    } catch {
      toast.error('Failed to delete check');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading checks…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary/8 via-background to-info/5 p-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              <ClipboardCheck className="h-3 w-3" />
              Checks
            </div>
            <h1 className="text-3xl font-semibold text-foreground mt-2 tracking-tight">Checklist items</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              Reusable checks the workflow runs on every request. Pick a stage, then add, configure, or remove checks.
              Edits land on every <strong>open</strong> request automatically — closed requests (approved / rejected / published) are left untouched.
            </p>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20 shrink-0" disabled={!selectedStage}>
                <Plus className="h-3.5 w-3.5" />
                Add check
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add check to {selectedStage?.name}</DialogTitle>
                <DialogDescription>The check will be evaluated on every request that reaches this stage.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                  <Input placeholder="e.g. Trade licence is current" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                  <Select value={newItemType} onValueChange={setNewItemType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Auto-check rule</Label>
                  <Select value={newAutoCheck} onValueChange={(v) => setNewAutoCheck(v as AutoCheckRule)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual only</SelectItem>
                      <SelectItem value="document-present">Document present</SelectItem>
                      <SelectItem value="field-extracted">Field extracted</SelectItem>
                      <SelectItem value="cross-validation">Cross-validation auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <Label className="text-sm">Required</Label>
                    <p className="text-[11px] text-muted-foreground">Block release until this passes</p>
                  </div>
                  <Switch checked={newRequired} onCheckedChange={setNewRequired} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddItem} disabled={adding}>
                  {adding && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  Add check
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stage selector */}
      {stages.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/10 border-border/50">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No workflow stages defined yet.</p>
          <p className="text-[11px] text-muted-foreground mt-1">Create stages in <strong>Workflows</strong> first — checks live inside stages.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
            {stages.map(stage => {
              const count = items.filter(i => i.stage === stage.id).length;
              const isSelected = selectedStageId === stage.id;
              return (
                <Card
                  key={stage.id}
                  className={cn(
                    'cursor-pointer transition-all',
                    isSelected ? 'ring-2 ring-primary border-primary/40' : 'hover:border-primary/30',
                  )}
                  onClick={() => setSelectedStageId(stage.id)}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage {stage.order}</p>
                    <p className="text-2xl font-semibold mt-0.5">{count}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{stage.name}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Item list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {selectedStage ? `${selectedStage.name} — ${filteredItems.length} ${filteredItems.length === 1 ? 'check' : 'checks'}` : 'Pick a stage'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="text-center py-10">
                  <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No checks defined for this stage yet.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Add first check
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map(item => {
                    const inactiveLinked = (item.linked_documents || []).filter(dt => !docActiveSet.has(dt));
                    const isInapplicable = inactiveLinked.length > 0;
                    return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                        isInapplicable
                          ? 'border-dashed border-muted-foreground/30 bg-muted/15 opacity-70 hover:opacity-90'
                          : 'border-border hover:border-primary/30',
                        busyId === item.id && 'opacity-60 pointer-events-none',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          {item.required && (
                            <Badge className="bg-destructive/10 text-destructive border-0 text-[10px] h-4 px-1.5">Required</Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">{item.item_type}</Badge>
                          {isInapplicable && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-warning/40 text-warning bg-warning/5">
                              Hidden — {inactiveLinked.join(', ')} disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            {item.auto_check_rule === 'manual' ? (
                              <Hand className="h-3 w-3" />
                            ) : (
                              <Zap className="h-3 w-3 text-warning" />
                            )}
                            {AUTO_CHECK_LABELS[item.auto_check_rule]}
                          </div>
                          {item.linked_documents?.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              {item.linked_documents.map(d => DOCUMENT_TYPE_LABELS[d as keyof typeof DOCUMENT_TYPE_LABELS] || d).join(', ')}
                            </div>
                          )}
                          {item.auto_check_rule === 'cross-validation' && (
                            <div className="flex items-center gap-1 text-primary">
                              <ShieldCheck className="h-3 w-3" />
                              {item.cross_validation_rules?.length
                                ? `${item.cross_validation_rules.length} rules linked`
                                : 'No rules linked'}
                            </div>
                          )}
                          {item.task_details && (
                            <div className="flex items-center gap-1 text-primary">
                              <Wand2 className="h-3 w-3" />
                              Prompt set
                            </div>
                          )}
                          {item.handler_name && (
                            <div className="flex items-center gap-1 text-info">
                              <Sparkles className="h-3 w-3" />
                              <span className="font-mono text-[10px]">{item.handler_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[11px]">Required</Label>
                          <Switch
                            checked={item.required}
                            onCheckedChange={(v) => patchItem(item.id, { required: v })}
                            className="scale-90"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs"
                          onClick={() => setDrawerItem(item)}
                        >
                          <Settings className="h-3 w-3" />
                          Configure
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete check?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <strong>{item.name}</strong> will be removed from <strong>{selectedStage?.name}</strong>. Existing requests stop running this check immediately. This can't be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Configure drawer */}
      <CheckConfigDrawer
        open={drawerItem !== null}
        onOpenChange={(v) => { if (!v) setDrawerItem(null); }}
        item={drawerItem}
        stages={stages}
        onSaved={() => { setDrawerItem(null); fetchAll(); }}
      />

      {/* Legend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Auto-check rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <LegendRow icon={Hand} title="Manual Only" body="Requires manual verification by ops user." />
            <LegendRow icon={Zap} title="Document Present" body="Auto-checked when the linked document is uploaded." iconClass="text-warning" />
            <LegendRow icon={Zap} title="Field Extracted" body="Auto-checked when AI extracts the required fields." iconClass="text-warning" />
            <LegendRow icon={Zap} title="Cross-validation Auto" body="Auto-checked when fields match across linked documents." iconClass="text-warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LegendRow({ icon: Icon, title, body, iconClass }: { icon: any; title: string; body: string; iconClass?: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className={cn('h-4 w-4 mt-0.5', iconClass || 'text-muted-foreground')} />
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-[11px] text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
