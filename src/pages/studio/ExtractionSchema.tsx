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
  Database, 
  Plus, 
  Save, 
  Search,
  FileText,
  Hash,
  Calendar,
  Type,
  AlertCircle,
  Check,
  Sliders
} from 'lucide-react';
import { mockExtractionFields, mockDocumentDefinitions, ExtractionField } from '@/data/mockStudioData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';

const dataTypeIcons = {
  Text: Type,
  Number: Hash,
  Date: Calendar,
};

export default function ExtractionSchema() {
  const [fields, setFields] = useState<ExtractionField[]>(mockExtractionFields);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('trade-license');
  const [hasChanges, setHasChanges] = useState(false);

  const documentTypes = [...new Set(fields.map(f => f.documentType))];
  const filteredFields = fields.filter(f => f.documentType === selectedDocType);

  const handleToggleMandatory = (id: string) => {
    setFields(prev => prev.map(f => 
      f.id === id ? { ...f, mandatory: !f.mandatory } : f
    ));
    setHasChanges(true);
  };

  const handleThresholdChange = (id: string, value: number) => {
    setFields(prev => prev.map(f => 
      f.id === id ? { ...f, confidenceThreshold: value } : f
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success('Extraction schema saved', {
      description: `${fields.length} fields configured across ${documentTypes.length} document types`,
    });
    setHasChanges(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Extraction Schema Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure fields to extract from each document type
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Schema
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Document Types</p>
            <p className="text-2xl font-bold">{documentTypes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Fields</p>
            <p className="text-2xl font-bold">{fields.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Mandatory Fields</p>
            <p className="text-2xl font-bold">{fields.filter(f => f.mandatory).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg. Threshold</p>
            <p className="text-2xl font-bold">
              {Math.round(fields.reduce((acc, f) => acc + f.confidenceThreshold, 0) / fields.length)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document Type Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Fields by Document Type</CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDocType} onValueChange={(v) => setSelectedDocType(v as DocumentType)}>
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
              {documentTypes.map(docType => (
                <TabsTrigger 
                  key={docType} 
                  value={docType}
                  className="text-xs data-[state=active]:bg-background"
                >
                  {DOCUMENT_TYPE_LABELS[docType] || docType}
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {fields.filter(f => f.documentType === docType).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {documentTypes.map(docType => (
              <TabsContent key={docType} value={docType} className="mt-4">
                <div className="space-y-3">
                  {fields.filter(f => f.documentType === docType).map(field => {
                    const Icon = dataTypeIcons[field.dataType];
                    return (
                      <div
                        key={field.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/30 transition-colors"
                      >
                        {/* Data Type Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          field.dataType === 'Text' && "bg-blue-500/10 text-blue-600",
                          field.dataType === 'Number' && "bg-emerald-500/10 text-emerald-600",
                          field.dataType === 'Date' && "bg-purple-500/10 text-purple-600",
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Field Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{field.fieldName}</h4>
                            <Badge variant="outline" className="text-xs">{field.dataType}</Badge>
                            {field.mandatory && (
                              <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                            )}
                          </div>
                          {field.validationRule && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Validation: {field.validationRule}
                            </p>
                          )}
                        </div>

                        {/* Threshold Slider */}
                        <div className="flex items-center gap-3 w-48">
                          <Label className="text-xs text-muted-foreground whitespace-nowrap">Threshold</Label>
                          <Input
                            type="number"
                            min={50}
                            max={100}
                            value={field.confidenceThreshold}
                            onChange={(e) => handleThresholdChange(field.id, parseInt(e.target.value))}
                            className="w-20 h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>

                        {/* Mandatory Toggle */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Required</Label>
                          <Switch
                            checked={field.mandatory}
                            onCheckedChange={() => handleToggleMandatory(field.id)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredFields.length === 0 && (
                  <div className="text-center py-8">
                    <Database className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No extraction fields configured</p>
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add First Field
                    </Button>
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Fields configured here will appear in the Extracted Data tab and Export Payload. 
          Confidence thresholds determine when a value is auto-verified vs requires review.
        </p>
      </div>
    </div>
  );
}
