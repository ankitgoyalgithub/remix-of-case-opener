import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Database, Plus, Save, AlertCircle, Trash2, Loader2, Sparkles, Variable, Tags, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ExtractionSchema() {
  const [docDefs, setDocDefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchDocDefs(); }, []);

  const fetchDocDefs = async () => {
    try {
      setLoading(true);
      const res = await api.studio.documents.list();
      setDocDefs(res);
      if (res.length > 0) setSelectedDocId(res[0].id);
    } catch {
      toast.error('Failed to load document definitions');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateField = (docId: number, field: string, value: any) => {
    setDocDefs(prev => prev.map(d => d.id === docId ? { ...d, [field]: value } : d));
    setHasChanges(true);
  };

  const handleAddExtractionKey = (docId: number) => {
    setDocDefs(prev => prev.map(d => {
      if (d.id === docId) return { ...d, extraction_keys: [...d.extraction_keys, 'New Field'] };
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
    if (!currentDef) return;
    try {
      setSaving(true);
      let processedHints = currentDef.hints;
      if (typeof currentDef.hints === 'string') {
        processedHints = currentDef.hints.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }
      await api.studio.documents.update(currentDef.id, {
        extraction_keys: currentDef.extraction_keys,
        ai_instructions: currentDef.ai_instructions,
        hints: processedHints,
      });
      setDocDefs(prev => prev.map(d => d.id === currentDef.id ? { ...d, hints: processedHints } : d));
      toast.success('Configuration saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const filteredDefs = docDefs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.doc_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const currentDef = docDefs.find(d => d.id === selectedDocId);

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">AI Extraction Schema</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Configure fields and AI instructions per document type</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm" className="gap-2 shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? 'Saving…' : `Save${currentDef ? ` — ${currentDef.name}` : ''}`}
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 min-h-[600px] rounded-xl border border-border overflow-hidden bg-card">
        {/* Left: document list */}
        <div className="w-56 shrink-0 border-r border-border flex flex-col bg-muted/20">
          <div className="p-3 border-b border-border/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filter…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {filteredDefs.map(def => (
                <button
                  key={def.id}
                  onClick={() => setSelectedDocId(def.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                    selectedDocId === def.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <p className={cn('text-sm font-medium leading-tight truncate', selectedDocId === def.id ? 'text-white' : 'text-foreground')}>
                    {def.name}
                  </p>
                  <p className={cn('text-xs mt-0.5', selectedDocId === def.id ? 'text-white/70' : 'text-muted-foreground')}>
                    {def.extraction_keys?.length || 0} fields
                  </p>
                </button>
              ))}
              {filteredDefs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No results</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: config form */}
        {currentDef ? (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-7">
              {/* Doc header */}
              <div>
                <h2 className="text-base font-semibold text-foreground">{currentDef.name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{currentDef.doc_type}</p>
              </div>

              {/* AI Instructions */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  <h3 className="text-sm font-semibold text-foreground">AI Instructions</h3>
                </div>
                <Textarea
                  value={currentDef.ai_instructions || ''}
                  onChange={e => handleUpdateField(currentDef.id, 'ai_instructions', e.target.value)}
                  placeholder="e.g. Look closely at the bottom right for the expiry date. Ignore watermarks."
                  className="min-h-[100px] text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">Injected directly into the LLM prompt during extraction.</p>
              </section>

              {/* Extraction fields */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Variable className="h-3.5 w-3.5 text-blue-500" />
                    <h3 className="text-sm font-semibold text-foreground">Extraction Fields</h3>
                    <Badge variant="secondary" className="text-xs">
                      {currentDef.extraction_keys?.length || 0}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleAddExtractionKey(currentDef.id)} className="gap-1.5 h-7 text-xs">
                    <Plus className="h-3 w-3" /> Add Field
                  </Button>
                </div>
                <div className="space-y-2">
                  {currentDef.extraction_keys?.map((key: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={key}
                        onChange={e => handleUpdateExtractionKey(currentDef.id, idx, e.target.value)}
                        className="flex-1 font-mono text-sm h-9"
                        placeholder="e.g. Policy Number"
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRemoveExtractionKey(currentDef.id, idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(!currentDef.extraction_keys || currentDef.extraction_keys.length === 0) && (
                    <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
                      <p className="text-sm text-muted-foreground">No fields defined</p>
                      <Button variant="ghost" size="sm" onClick={() => handleAddExtractionKey(currentDef.id)} className="mt-2 gap-1.5 text-xs">
                        <Plus className="h-3 w-3" /> Add first field
                      </Button>
                    </div>
                  )}
                </div>
              </section>

              {/* UI Hints */}
              <section className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Tags className="h-3.5 w-3.5 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-foreground">UI Context Hints</h3>
                </div>
                <Input
                  value={Array.isArray(currentDef.hints) ? currentDef.hints.join(', ') : currentDef.hints || ''}
                  onChange={e => handleUpdateField(currentDef.id, 'hints', e.target.value)}
                  placeholder="Comma-separated hints (e.g. Check bottom right, Look for stamp)"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">Shown to ops users when reviewing this document in the workbench.</p>
              </section>

              {/* Info note */}
              <div className="flex items-start gap-2.5 p-3.5 bg-muted/40 rounded-lg border border-border/60">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Changes to extraction fields affect all new documents. Existing extracted data is not modified until a re-extraction is triggered.
                </p>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a document type to configure</p>
          </div>
        )}
      </div>
    </div>
  );
}
