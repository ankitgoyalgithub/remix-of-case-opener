import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Database,
  Brain,
  Settings,
  Plus,
  Type,
  Hash,
  Calendar,
  Check,
  AlertCircle,
  FileText,
  Trash2,
  X,
  Network,
  Save,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Plain-language labels for the "how to compare" options, so the saved value
// (e.g. `tolerance_10_percent`) never shows up raw in the UI.
const COMPARISON_LABELS: Record<string, string> = {
  exact_match: 'Must match exactly',
  tolerance_10_percent: 'Within 10%',
  contains: 'One contains the other',
  fuzzy_match: 'Approximate match',
};

interface DocumentConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any | null;
  onSave?: () => void;
}

export function DocumentConfigDrawer({ open, onOpenChange, document: initialDocument, onSave }: DocumentConfigDrawerProps) {
  const [docDef, setDocDef] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Local states for complex fields
  const [fields, setFields] = useState<string[]>([]);
  const [aiInstructions, setAiInstructions] = useState('');
  const [crossValRules, setCrossValRules] = useState<any[]>([]);

  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  const [addingRule, setAddingRule] = useState(false);
  const [newRuleSourceField, setNewRuleSourceField] = useState('');
  const [newRuleTargetDoc, setNewRuleTargetDoc] = useState('');
  const [newRuleTargetField, setNewRuleTargetField] = useState('');
  const [newRuleComparisonType, setNewRuleComparisonType] = useState('exact_match');

  useEffect(() => {
    if (initialDocument) {
      setDocDef({ ...initialDocument });
      setFields([...(initialDocument.extraction_keys || [])]);
      setAiInstructions(initialDocument.ai_instructions || '');
      setCrossValRules([...(initialDocument.cross_validation_rules || [])]);
    }
  }, [initialDocument, open]);

  if (!docDef) return null;

  const handleAddField = () => {
    const trimmedName = newFieldName.trim();
    if (!trimmedName || fields.includes(trimmedName)) return;
    setFields([...fields, trimmedName]);
    setNewFieldName('');
    setAddingField(false);
    toast.success('Field added');
  };

  const handleRemoveField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
    toast.success('Field removed');
  };

  const handleUpdateField = (index: number, newName: string) => {
    const newFields = [...fields];
    newFields[index] = newName;
    setFields(newFields);
  }

  const handleAddRule = () => {
    const newRules = [...crossValRules];
    newRules.push({
      target_document_type: newRuleTargetDoc,
      source_field: newRuleSourceField,
      target_field: newRuleTargetField,
      comparison_type: newRuleComparisonType
    });

    setCrossValRules(newRules);
    setAddingRule(false);
    setNewRuleSourceField('');
    setNewRuleTargetDoc('');
    setNewRuleTargetField('');
    setNewRuleComparisonType('exact_match');
    toast.success('Comparison rule added');
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...crossValRules];
    newRules.splice(index, 1);
    setCrossValRules(newRules);
    toast.success('Comparison rule removed');
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.studio.documents.delete(docDef.id);
      toast.success(`"${docDef.name}" deleted`);
      if (onSave) onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to delete document type', error);
      toast.error("We couldn't delete this document type. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        category: docDef.category,
        mandatory: docDef.mandatory,
        is_active: docDef.is_active ?? true,
        renewal_only: docDef.renewal_only, // Ensure this matches backend field name
        extraction_keys: fields,
        ai_instructions: aiInstructions,
        cross_validation_rules: crossValRules,
        hints: docDef.hints // Preserve hints
      };

      await api.studio.documents.update(docDef.id, payload);
      toast.success('Saved.');

      if (onSave) {
        onSave();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save document config', error);
      toast.error("We couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[540px] sm:max-w-[540px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col items-start gap-1 min-w-0">
              <SheetTitle className="text-left truncate">{docDef.name}</SheetTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{docDef.category}</Badge>
                {docDef.mandatory && <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        <Tabs defaultValue="fields" className="mt-0">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="fields" className="text-sm gap-1.5 px-1 focus:outline-none">
              <Database className="h-3.5 w-3.5" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="cross-val" className="text-sm gap-1.5 px-1 focus:outline-none">
              <Network className="h-3 w-3" aria-hidden />
              Compare
            </TabsTrigger>
            <TabsTrigger value="ai-notes" className="text-sm gap-1.5 px-1 focus:outline-none">
              <Brain className="h-3.5 w-3.5" aria-hidden />
              AI notes
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm gap-1.5 px-1 focus:outline-none">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Fields the system reads */}
          <TabsContent value="fields" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              These are the values the system reads from this document. They show up on the request and are included when it's sent to the insurer.
            </p>

            <div className="space-y-3">
              {fields.map((field, index) => {
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-7 h-7 rounded flex items-center justify-center bg-primary/10 text-primary shrink-0">
                          <Type className="h-3.5 w-3.5" aria-hidden />
                        </div>
                        <Input
                            value={field}
                            onChange={(e) => handleUpdateField(index, e.target.value)}
                            className="h-8 text-sm font-medium"
                            aria-label={`Field ${index + 1} name`}
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveField(index)}
                          aria-label={`Remove field ${field || index + 1}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {fields.length === 0 && !addingField && (
              <div className="text-center py-8 border rounded-lg border-dashed">
                <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No fields configured yet</p>
              </div>
            )}

            {/* Add field inline form */}
            {addingField && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div>
                  <Label className="text-xs">Field Name</Label>
                  <Input
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g., Policy Start Date"
                    className="mt-1 h-8 text-sm"
                    maxLength={100}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddField} disabled={!newFieldName.trim()} className="gap-1.5 h-7 text-xs">
                    <Check className="h-3 w-3" />
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAddingField(false); setNewFieldName(''); }} className="gap-1.5 h-7 text-xs">
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => setAddingField(true)} disabled={addingField}>
                <Plus className="h-4 w-4" />
                Add Field
              </Button>
            </div>
          </TabsContent>

          {/* Tab: Compare across documents */}
          <TabsContent value="cross-val" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Compare across documents</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically check that a value read here matches the same value in another document.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {crossValRules.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-border bg-background space-y-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="info" className="text-xs">{COMPARISON_LABELS[rule.comparison_type] || rule.comparison_type.replace(/_/g, ' ')}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveRule(idx)}
                      aria-label={`Remove comparison rule for ${rule.source_field}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded border border-border/50">
                    <div className="flex-1 min-w-0">
                      <Label className="text-[11px] uppercase text-muted-foreground font-bold tracking-wider">Field in this document</Label>
                      <p className="text-xs font-semibold mt-0.5 truncate">{rule.source_field}</p>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Network className="h-2.5 w-2.5 text-primary" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-[11px] uppercase text-primary/70 font-bold tracking-wider">{rule.target_document_type}</Label>
                      <p className="text-xs font-semibold mt-0.5 truncate text-primary">{rule.target_field}</p>
                    </div>
                  </div>
                </div>
              ))}

              {crossValRules.length === 0 && !addingRule && (
                <div className="text-center py-8 opacity-70 border rounded-lg border-dashed">
                  <Network className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden />
                  <p className="text-sm text-foreground font-medium">No comparison rules yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto">Use "Add rule" below to compare a value here with a value in another document.</p>
                </div>
              )}
            </div>

            {addingRule && (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
                <div>
                  <Label className="text-xs">Field in this document</Label>
                  <Select value={newRuleSourceField} onValueChange={setNewRuleSourceField}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Choose a field…" />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((f, idx) => <SelectItem key={idx} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Other document type</Label>
                    <Input
                      value={newRuleTargetDoc}
                      onChange={(e) => setNewRuleTargetDoc(e.target.value)}
                      placeholder="e.g. quote"
                      className="mt-1 h-8 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Field in the other document</Label>
                    <Input
                      value={newRuleTargetField}
                      onChange={(e) => setNewRuleTargetField(e.target.value)}
                      placeholder="e.g. Total Salary"
                      className="mt-1 h-8 text-xs bg-background"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">How to compare</Label>
                  <Select value={newRuleComparisonType} onValueChange={setNewRuleComparisonType}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact_match">Must match exactly</SelectItem>
                      <SelectItem value="tolerance_10_percent">Within 10%</SelectItem>
                      <SelectItem value="contains">One contains the other</SelectItem>
                      <SelectItem value="fuzzy_match">Approximate match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleAddRule} disabled={!newRuleSourceField || !newRuleTargetDoc || !newRuleTargetField} className="gap-1.5 h-7 text-xs">
                    <Check className="h-3 w-3" aria-hidden />
                    Add rule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingRule(false); }} className="gap-1.5 h-7 text-xs">
                    <X className="h-3 w-3" aria-hidden />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddingRule(true)} disabled={addingRule}>
                <Plus className="h-4 w-4" aria-hidden />
                Add rule
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: AI notes */}
          <TabsContent value="ai-notes" className="mt-4 space-y-4">
            <div>
              <Label className="text-sm" htmlFor="ai-reading-notes">Reading guidance</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Only used behind the scenes — ops users never see this. It guides the system when it reads this document type.
              </p>
            </div>

            <Textarea
              id="ai-reading-notes"
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder={`Example guidance for ${docDef.name}:

- Read [field names] from this document
- Look for values in [specific section]
- Date format is DD/MM/YYYY
- Ignore handwritten notes
- If a value appears more than once, use the one in the header`}
              className="min-h-[240px] text-sm"
            />
            
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-0 gap-1 rounded-sm text-xs py-0.5">
                  <AlertCircle className="h-3 w-3" /> Remember to click Save
              </Badge>
            </div>
          </TabsContent>

          {/* Tab 3: Document Settings */}
          <TabsContent value="settings" className="mt-4 space-y-5">
            <div>
              <Label className="text-sm">Document Category</Label>
              <Select value={docDef.category} onValueChange={(val) => setDocDef({...docDef, category: val})}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employer">Employer</SelectItem>
                  <SelectItem value="Workforce">Workforce</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Signatory">Signatory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Active</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When off, requests stop expecting this document and any check that depends on it is hidden.
                </p>
              </div>
              <Switch
                checked={docDef.is_active ?? true}
                onCheckedChange={(val) => setDocDef({ ...docDef, is_active: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Mandatory</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Make this document generally required
                </p>
              </div>
              <Switch checked={docDef.mandatory} onCheckedChange={(val) => setDocDef({...docDef, mandatory: val})} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Relevant for Renewals Only</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show this document type only in renewal requests
                </p>
              </div>
              <Switch checked={docDef.renewal_only} onCheckedChange={(val) => setDocDef({...docDef, renewal_only: val})} />
            </div>

          </TabsContent>
        </Tabs>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-background flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={saving || deleting}
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this document type?</AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{docDef.name}</strong> will be removed from the catalog. Existing requests that reference it
                  will keep their attachments, but operators won't be able to upload new files of this type.
                  This action can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete document type
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleSave} disabled={saving || deleting} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Configuration
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
