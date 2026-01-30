import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ClipboardCheck, 
  Plus, 
  Save, 
  FileText,
  Zap,
  Hand,
  Link2,
  AlertCircle,
  Check
} from 'lucide-react';
import { mockChecklistDefinitions, mockWorkflowStages, ChecklistDefinition } from '@/data/mockStudioData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/types/case';

const autoCheckRuleLabels = {
  'document-present': 'Document Present',
  'field-extracted': 'Field Extracted',
  'manual': 'Manual Only',
};

export default function ChecklistBuilder() {
  const [items, setItems] = useState<ChecklistDefinition[]>(mockChecklistDefinitions);
  const [selectedStage, setSelectedStage] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);

  const filteredItems = items.filter(item => item.stageId === selectedStage);
  const stageName = mockWorkflowStages.find(s => s.order === selectedStage)?.name || '';

  const handleToggleRequired = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, required: !item.required } : item
    ));
    setHasChanges(true);
  };

  const handleToggleOverride = (id: string) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, manualOverrideAllowed: !item.manualOverrideAllowed } : item
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success('Checklist configuration saved', {
      description: `${items.length} checklist items across ${mockWorkflowStages.length} stages`,
    });
    setHasChanges(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            Checklist Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure checklist items per stage with auto-check rules
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Checklists
        </Button>
      </div>

      {/* Stage Summary */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {mockWorkflowStages.map(stage => {
          const count = items.filter(i => i.stageId === stage.order).length;
          const isSelected = selectedStage === stage.order;
          return (
            <Card 
              key={stage.id}
              className={cn(
                "cursor-pointer transition-all",
                isSelected ? "ring-2 ring-primary" : "hover:border-primary/30"
              )}
              onClick={() => setSelectedStage(stage.order)}
            >
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Stage {stage.order}</p>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground truncate">{stage.name.split(' ')[0]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Checklist Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Stage {selectedStage}: {stageName}
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    {item.required && (
                      <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {/* Auto-check rule */}
                    <div className="flex items-center gap-1">
                      {item.autoCheckRule === 'manual' ? (
                        <Hand className="h-3 w-3" />
                      ) : (
                        <Zap className="h-3 w-3 text-warning" />
                      )}
                      {autoCheckRuleLabels[item.autoCheckRule]}
                    </div>
                    
                    {/* Linked documents */}
                    {item.linkedDocuments.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {item.linkedDocuments.map(d => DOCUMENT_TYPE_LABELS[d] || d).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Auto-check Rule Selector */}
                <Select 
                  value={item.autoCheckRule}
                  onValueChange={(value) => {
                    setItems(prev => prev.map(i => 
                      i.id === item.id ? { ...i, autoCheckRule: value as any } : i
                    ));
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document-present">Document Present</SelectItem>
                    <SelectItem value="field-extracted">Field Extracted</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>

                {/* Toggles */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Required</Label>
                    <Switch
                      checked={item.required}
                      onCheckedChange={() => handleToggleRequired(item.id)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Override</Label>
                    <Switch
                      checked={item.manualOverrideAllowed}
                      onCheckedChange={() => handleToggleOverride(item.id)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8">
                <ClipboardCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No checklist items for this stage</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add First Item
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Auto-Check Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Document Present</p>
                <p className="text-xs text-muted-foreground">Auto-checked when linked document is uploaded</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-warning mt-0.5" />
              <div>
                <p className="font-medium">Field Extracted</p>
                <p className="text-xs text-muted-foreground">Auto-checked when AI extracts required fields</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hand className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Manual Only</p>
                <p className="text-xs text-muted-foreground">Requires manual verification by ops user</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
