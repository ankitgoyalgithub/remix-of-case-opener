import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Save, 
  FileText,
  Sparkles,
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';
import { mockAIInstructions, AIInstruction, mockDocumentDefinitions } from '@/data/mockStudioData';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';

export default function AIInstructions() {
  const [instructions, setInstructions] = useState<AIInstruction[]>(mockAIInstructions);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('trade-license');
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const documentTypes = mockDocumentDefinitions.map(d => d.type);
  const currentInstruction = instructions.find(i => i.documentType === selectedDocType);

  const handleUpdateInstruction = (text: string) => {
    setInstructions(prev => {
      const existing = prev.find(i => i.documentType === selectedDocType);
      if (existing) {
        return prev.map(i => 
          i.documentType === selectedDocType ? { ...i, instructions: text } : i
        );
      }
      return [...prev, { documentType: selectedDocType, instructions: text }];
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success('AI Instructions saved', {
      description: `Instructions for ${instructions.length} document types updated`,
    });
    setHasChanges(false);
  };

  const handleCopy = () => {
    if (currentInstruction) {
      navigator.clipboard.writeText(currentInstruction.instructions);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Instructions
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure extraction instructions for AI agents (hidden from ops users)
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Instructions
        </Button>
      </div>

      {/* Warning */}
      <Alert className="mb-6 bg-primary/5 border-primary/20">
        <Sparkles className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          These instructions are passed to AI extraction agents. They are <strong>not visible to ops users</strong> and control how data is extracted from documents.
        </AlertDescription>
      </Alert>

      {/* Document Type Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Instructions by Document Type</CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1.5"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDocType} onValueChange={(v) => setSelectedDocType(v as DocumentType)}>
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-4">
              {documentTypes.slice(0, 8).map(docType => {
                const hasInstruction = instructions.some(i => i.documentType === docType);
                return (
                  <TabsTrigger 
                    key={docType} 
                    value={docType}
                    className="text-xs data-[state=active]:bg-background gap-1.5"
                  >
                    {DOCUMENT_TYPE_LABELS[docType] || docType}
                    {hasInstruction && <Check className="h-3 w-3 text-success" />}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {documentTypes.map(docType => (
              <TabsContent key={docType} value={docType} className="mt-0">
                <div className="space-y-4">
                  {/* Document Info */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm">{DOCUMENT_TYPE_LABELS[docType]}</p>
                      <p className="text-xs text-muted-foreground">
                        {mockDocumentDefinitions.find(d => d.type === docType)?.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  {/* Instructions Editor */}
                  {showPreview ? (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border min-h-[300px]">
                      <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/80">
                        {currentInstruction?.instructions || 'No instructions configured for this document type.'}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        value={currentInstruction?.instructions || ''}
                        onChange={(e) => handleUpdateInstruction(e.target.value)}
                        placeholder={`Enter extraction instructions for ${DOCUMENT_TYPE_LABELS[docType]}...

Example:
- Extract [field names] from this document
- Ignore [specific elements]
- Format [dates/numbers] as [format]
- If [condition], then [action]`}
                        className="min-h-[300px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use clear, structured instructions. Include extraction rules, validation logic, and edge cases.
                      </p>
                    </div>
                  )}

                  {/* Status */}
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
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5" />
              Be specific about field locations (e.g., "near the top", "in the header section")
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5" />
              Define expected formats explicitly (e.g., "DD/MM/YYYY", "alphanumeric")
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5" />
              Include rules for handling edge cases (e.g., "If multiple values, use the first")
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-success mt-0.5" />
              Specify what to ignore (e.g., "Ignore handwritten notes", "Skip watermarks")
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
