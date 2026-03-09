import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Plus, Save, AlertCircle, Trash2, Loader2, Sparkles, Variable, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';

export default function ExtractionSchema() {
  const [docDefs, setDocDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchDocDefs();
  }, []);

  const fetchDocDefs = async () => {
    try {
      setLoading(true);
      const res = await api.studio.documents.list();
      setDocDefs(res);
      if (res.length > 0 && !selectedDocType) {
        setSelectedDocType(res[0].doc_type);
      }
    } catch (error) {
      console.error('Failed to fetch doc defs', error);
      toast.error('Failed to load document definitions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (docId: number, field: string, value: any) => {
    setDocDefs(prev => prev.map(d => 
      d.id === docId ? { ...d, [field]: value } : d
    ));
    setHasChanges(true);
  };

  const handleAddExtractionKey = (docId: number) => {
    setDocDefs(prev => prev.map(d => {
      if (d.id === docId) {
        return { ...d, extraction_keys: [...d.extraction_keys, 'New Field'] };
      }
      return d;
    }));
    setHasChanges(true);
  };

  const handleUpdateExtractionKey = (docId: number, index: number, value: string) => {
    setDocDefs(prev => prev.map(d => {
      if (d.id === docId) {
        const newKeys = [...d.extraction_keys];
        newKeys[index] = value;
        return { ...d, extraction_keys: newKeys };
      }
      return d;
    }));
    setHasChanges(true);
  };

  const handleRemoveExtractionKey = (docId: number, index: number) => {
    setDocDefs(prev => prev.map(d => {
      if (d.id === docId) {
        const newKeys = [...d.extraction_keys];
        newKeys.splice(index, 1);
        return { ...d, extraction_keys: newKeys };
      }
      return d;
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentDef = docDefs.find(d => d.doc_type === selectedDocType);
      if (!currentDef) return;

      // Ensure hints are saved as an array even if the user typed a comma-separated string
      let processedHints = currentDef.hints;
      if (typeof currentDef.hints === 'string') {
          processedHints = currentDef.hints.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }

      await api.studio.documents.update(currentDef.id, {
        extraction_keys: currentDef.extraction_keys,
        ai_instructions: currentDef.ai_instructions,
        hints: processedHints
      });

      // Update state to match processed hints
      setDocDefs(prev => prev.map(d => 
        d.id === currentDef.id ? { ...d, hints: processedHints } : d
      ));

      toast.success('Configuration saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save config', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
      return (
          <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      );
  }

  const currentDef = docDefs.find(d => d.doc_type === selectedDocType);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            AI Extraction Schema
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure dynamic fields and AI instructions for document data extraction.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save {currentDef?.name} Schema
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Document Definitions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDocType} onValueChange={setSelectedDocType}>
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1 mb-4">
              {docDefs.map(docDef => (
                <TabsTrigger 
                  key={docDef.doc_type} 
                  value={docDef.doc_type}
                  className="text-xs data-[state=active]:bg-background"
                >
                  {docDef.name}
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {docDef.extraction_keys?.length || 0} fields
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {docDefs.map(docDef => (
              <TabsContent key={docDef.id} value={docDef.doc_type} className="mt-0 space-y-6">
                
                {/* AI Instructions Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-semibold">AI Instructions</h3>
                  </div>
                  <Textarea 
                    value={docDef.ai_instructions || ''}
                    onChange={(e) => handleUpdateField(docDef.id, 'ai_instructions', e.target.value)}
                    placeholder="Enter specific instructions for the AI vision agent (e.g. 'Look closely at the bottom right corner for the expiry date')"
                    className="min-h-[100px] text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">These instructions are injected directly into the LLM prompt during extraction.</p>
                </div>

                {/* Extraction Keys Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Variable className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-semibold">Data Extraction Framework</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleAddExtractionKey(docDef.id)} className="gap-1.5 h-8">
                      <Plus className="h-3 w-3" /> Add Key
                    </Button>
                  </div>
                  
                  <div className="grid gap-2">
                    {docDef.extraction_keys?.map((key: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input 
                           value={key}
                           onChange={(e) => handleUpdateExtractionKey(docDef.id, idx, e.target.value)}
                           className="flex-1 font-mono text-sm"
                           placeholder="E.g. Policy Number"
                        />
                        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => handleRemoveExtractionKey(docDef.id, idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {(!docDef.extraction_keys || docDef.extraction_keys.length === 0) && (
                        <div className="text-center p-4 border rounded-lg border-dashed bg-muted/20">
                            <p className="text-sm text-muted-foreground">No extraction keys defined for this document type.</p>
                        </div>
                    )}
                  </div>
                </div>

                {/* UI Hints Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tags className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold">UI Context Hints</h3>
                  </div>
                  <Input 
                    value={Array.isArray(docDef.hints) ? docDef.hints.join(', ') : docDef.hints || ''}
                    onChange={(e) => handleUpdateField(docDef.id, 'hints', e.target.value)}
                    placeholder="Comma separated hints (e.g. Registration No, Expiry Date)"
                    className="text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">These hints are displayed to the ops user when reviewing the document in the workbench.</p>
                </div>

              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      
      <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          Changes to extraction keys affect all new documents uploaded. Existing extracted data is not modified until a re-extraction is triggered.
          The AI agent strictly attempts to return JSON matching the defined keys.
        </p>
      </div>
    </div>
  );
}
