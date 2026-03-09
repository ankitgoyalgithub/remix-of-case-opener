import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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

interface DocumentConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: any | null;
  onSave?: () => void;
}

export function DocumentConfigDrawer({ open, onOpenChange, document: initialDocument, onSave }: DocumentConfigDrawerProps) {
  const [docDef, setDocDef] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  
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
    toast.success('Cross-validation rule added');
  };

  const handleRemoveRule = (index: number) => {
    const newRules = [...crossValRules];
    newRules.splice(index, 1);
    setCrossValRules(newRules);
    toast.success('Cross-validation rule removed');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        category: docDef.category,
        mandatory: docDef.mandatory,
        renewal_only: docDef.renewal_only, // Ensure this matches backend field name
        extraction_keys: fields,
        ai_instructions: aiInstructions,
        cross_validation_rules: crossValRules,
        hints: docDef.hints // Preserve hints
      };

      await api.studio.documents.update(docDef.id, payload);
      toast.success('Document configuration saved successfully.');
      
      if (onSave) {
        onSave();
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save document config', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[540px] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <SheetTitle className="text-left">{docDef.name}</SheetTitle>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{docDef.category}</Badge>
                    {docDef.mandatory && <Badge className="bg-destructive/10 text-destructive border-0 text-[10px]">Required</Badge>}
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0 h-9">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </div>
        </SheetHeader>

        <Tabs defaultValue="fields" className="mt-2">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="fields" className="text-[11px] gap-1.5 px-1 focus:outline-none">
              <Database className="h-3.5 w-3.5" />
              Fields
            </TabsTrigger>
            <TabsTrigger value="cross-val" className="text-[11px] gap-1.5 px-1 focus:outline-none text-orange-600 data-[state=active]:text-orange-600">
              <Network className="h-3 w-3" />
              Cross Val
            </TabsTrigger>
            <TabsTrigger value="ai-notes" className="text-[11px] gap-1.5 px-1 focus:outline-none">
              <Brain className="h-3.5 w-3.5" />
              AI Notes
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-[11px] gap-1.5 px-1 focus:outline-none">
              <Settings className="h-3.5 w-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Fields to Extract */}
          <TabsContent value="fields" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Fields configured here appear in the Extracted Data tab and Export payload.
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
                        <div className="w-7 h-7 rounded flex items-center justify-center bg-blue-500/10 text-blue-600 shrink-0">
                          <Type className="h-3.5 w-3.5" />
                        </div>
                        <Input 
                            value={field}
                            onChange={(e) => handleUpdateField(index, e.target.value)}
                            className="h-8 text-sm font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveField(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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

          {/* Tab: Cross Validation */}
          <TabsContent value="cross-val" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Cross-Document Validation</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Automatically validate extracted data against fields in other documents.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {crossValRules.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-orange-500/20 bg-background space-y-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] uppercase border-orange-500/20 text-orange-600">{rule.comparison_type.replace(/_/g, ' ')}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveRule(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 bg-muted/30 p-2.5 rounded border border-border/50">
                    <div className="flex-1 min-w-0">
                      <Label className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Source Field</Label>
                      <p className="text-xs font-semibold mt-0.5 truncate">{rule.source_field}</p>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Network className="h-2.5 w-2.5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Label className="text-[9px] uppercase text-orange-600/70 font-bold tracking-wider">{rule.target_document_type}</Label>
                      <p className="text-xs font-semibold mt-0.5 truncate text-orange-600">{rule.target_field}</p>
                    </div>
                  </div>
                </div>
              ))}

              {crossValRules.length === 0 && !addingRule && (
                <div className="text-center py-8 opacity-70 border rounded-lg border-dashed">
                  <Network className="h-8 w-8 text-orange-500/30 mx-auto mb-2" />
                  <p className="text-sm text-foreground font-medium">No rules configured</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Click "Add Rule" below to set up a relational check.</p>
                </div>
              )}
            </div>

            {addingRule && (
              <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5 space-y-3">
                <div>
                  <Label className="text-xs">Source Field (This Document)</Label>
                  <Select value={newRuleSourceField} onValueChange={setNewRuleSourceField}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Select field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fields.map((f, idx) => <SelectItem key={idx} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Target Document Type</Label>
                    <Input
                      value={newRuleTargetDoc}
                      onChange={(e) => setNewRuleTargetDoc(e.target.value)}
                      placeholder="e.g. quote"
                      className="mt-1 h-8 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Target Field Name</Label>
                    <Input
                      value={newRuleTargetField}
                      onChange={(e) => setNewRuleTargetField(e.target.value)}
                      placeholder="e.g. Total Salary"
                      className="mt-1 h-8 text-xs bg-background"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Comparison Rule</Label>
                  <Select value={newRuleComparisonType} onValueChange={setNewRuleComparisonType}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exact_match">Exact Match</SelectItem>
                      <SelectItem value="tolerance_10_percent">10% Tolerance</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="fuzzy_match">Fuzzy Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleAddRule} disabled={!newRuleSourceField || !newRuleTargetDoc || !newRuleTargetField} className="gap-1.5 h-7 text-[10px] bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
                    <Check className="h-3 w-3" />
                    Add Rule
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAddingRule(false); }} className="gap-1.5 h-7 text-[10px] hover:bg-orange-500/10 hover:text-orange-600">
                    <X className="h-3 w-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" className="gap-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700" onClick={() => setAddingRule(true)} disabled={addingRule}>
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: AI Notes */}
          <TabsContent value="ai-notes" className="mt-4 space-y-4">
            <div>
              <Label className="text-sm">Extraction Guidance</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Not visible to ops users. Guides AI when extracting data from this document type.
              </p>
            </div>

            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder={`Example guidance for ${docDef.name}:

- Extract [field names] from this document
- Look for values in [specific section]
- Date format is DD/MM/YYYY
- Ignore handwritten annotations
- If multiple values found, use the one in the header`}
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
      </SheetContent>
    </Sheet>
  );
}
