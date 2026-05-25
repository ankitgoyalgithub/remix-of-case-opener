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
import { PageHeader } from '@/components/layout/PageShell';
import { CheckLibraryDialog } from '@/components/studio/CheckLibraryDialog';

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
    <>
      <PageHeader
        eyebrow="Studio · Checks"
        title="Checklist items"
        description="Reusable checks the workflow runs on every request. Pick a stage, then add, configure, or remove checks. Edits land on every open request automatically; closed requests are left untouched."
        actions={
          <Button size="sm" className="gap-1.5 shrink-0" disabled={!selectedStage} onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add check
          </Button>
        }
      />

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

      {/* Add-check dialog (template-driven) */}
      <CheckLibraryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        stage={selectedStage || null}
        onCreated={fetchAll}
      />

      {/* Configure drawer (expert mode for editing existing checks) */}
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
    </>
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
