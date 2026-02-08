import { useState } from 'react';
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
} from 'lucide-react';
import { DocumentDefinition, ExtractionField, AIInstruction, mockExtractionFields, mockAIInstructions } from '@/data/mockStudioData';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DocumentConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: DocumentDefinition | null;
}

const dataTypeIcons = {
  Text: Type,
  Number: Hash,
  Date: Calendar,
};

export function DocumentConfigDrawer({ open, onOpenChange, document }: DocumentConfigDrawerProps) {
  const [fields, setFields] = useState<ExtractionField[]>(mockExtractionFields);
  const [instructions, setInstructions] = useState<AIInstruction[]>(mockAIInstructions);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  if (!document) return null;

  const docFields = fields.filter(f => f.documentType === document.type);
  const currentInstruction = instructions.find(i => i.documentType === document.type);

  const handleToggleFieldMandatory = (id: string) => {
    setFields(prev => prev.map(f =>
      f.id === id ? { ...f, mandatory: !f.mandatory } : f
    ));
  };

  const handleUpdateInstruction = (text: string) => {
    setInstructions(prev => {
      const existing = prev.find(i => i.documentType === document.type);
      if (existing) {
        return prev.map(i =>
          i.documentType === document.type ? { ...i, instructions: text } : i
        );
      }
      return [...prev, { documentType: document.type, instructions: text }];
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[540px] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left">{document.name}</SheetTitle>
              <SheetDescription className="text-left">
                {document.category} · {document.mandatory ? 'Required' : 'Optional'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="fields" className="mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="fields" className="text-xs gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Fields to Extract
            </TabsTrigger>
            <TabsTrigger value="ai-notes" className="text-xs gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              AI Notes
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1.5">
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
              {docFields.map(field => {
                const Icon = dataTypeIcons[field.dataType];
                return (
                  <div
                    key={field.id}
                    className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-7 h-7 rounded flex items-center justify-center",
                          field.dataType === 'Text' && "bg-blue-500/10 text-blue-600",
                          field.dataType === 'Number' && "bg-emerald-500/10 text-emerald-600",
                          field.dataType === 'Date' && "bg-purple-500/10 text-purple-600",
                        )}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-sm">{field.fieldName}</span>
                        <Badge variant="outline" className="text-xs">{field.dataType}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Required</Label>
                        <Switch
                          checked={field.mandatory}
                          onCheckedChange={() => handleToggleFieldMandatory(field.id)}
                        />
                      </div>
                    </div>

                    {field.validationRule && (
                      <p className="text-xs text-muted-foreground pl-9">
                        Validation: {field.validationRule}
                      </p>
                    )}

                    {/* Advanced: Confidence Threshold */}
                    {showAdvancedFields && (
                      <div className="flex items-center gap-2 pl-9">
                        <Label className="text-xs text-muted-foreground">Confidence Threshold</Label>
                        <Input
                          type="number"
                          min={50}
                          max={100}
                          value={field.confidenceThreshold}
                          onChange={(e) => {
                            setFields(prev => prev.map(f =>
                              f.id === field.id ? { ...f, confidenceThreshold: parseInt(e.target.value) } : f
                            ));
                          }}
                          className="w-20 h-7 text-xs"
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {docFields.length === 0 && (
              <div className="text-center py-8">
                <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No fields configured yet</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add Field
              </Button>
              <button
                onClick={() => setShowAdvancedFields(!showAdvancedFields)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {showAdvancedFields ? 'Hide' : 'Show'} Advanced Options
              </button>
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
              value={currentInstruction?.instructions || ''}
              onChange={(e) => handleUpdateInstruction(e.target.value)}
              placeholder={`Example guidance for ${document.name}:

- Extract [field names] from this document
- Look for values in [specific section]
- Date format is DD/MM/YYYY
- Ignore handwritten annotations
- If multiple values found, use the one in the header`}
              className="min-h-[240px] text-sm"
            />

            <div className="flex items-center gap-2">
              {currentInstruction?.instructions ? (
                <Badge className="bg-success/20 text-success border-0 gap-1">
                  <Check className="h-3 w-3" />
                  Configured
                </Badge>
              ) : (
                <Badge className="bg-warning/20 text-warning-foreground border-0 gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Configured
                </Badge>
              )}
              {currentInstruction?.instructions && (
                <span className="text-xs text-muted-foreground">
                  {currentInstruction.instructions.split('\n').length} lines
                </span>
              )}
            </div>
          </TabsContent>

          {/* Tab 3: Document Settings */}
          <TabsContent value="settings" className="mt-4 space-y-5">
            <div>
              <Label className="text-sm">Document Category</Label>
              <Select defaultValue={document.category}>
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
                <Label className="text-sm">Relevant for Renewals</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show this document type in renewal requests
                </p>
              </div>
              <Switch defaultChecked={document.renewalOnly} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Expiry Tracking</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track expiry dates for this document type
                </p>
              </div>
              <Switch defaultChecked={false} />
            </div>

            <Separator />

            <div>
              <Label className="text-sm">Accepted Formats</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['PDF', 'Image', 'Excel'].map(fmt => (
                  <Badge
                    key={fmt}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10"
                  >
                    {fmt}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm">Aliases / Alternate Names</Label>
              <Input
                placeholder="e.g., Business License, Commercial Permit"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated alternate names for document matching
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
