import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileSpreadsheet, Plus, Loader2, Trash2, Save, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OutputTemplate {
  id: number;
  name: string;
  description: string;
  template_file_url?: string | null;
  field_mappings: any[];
  output_filename_template: string;
  created_at: string;
  updated_at: string;
}

export default function OutputTemplates() {
  const [templates, setTemplates] = useState<OutputTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<OutputTemplate | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filenameTpl, setFilenameTpl] = useState('UW_{request_id}.xlsx');
  const [mappingsText, setMappingsText] = useState('[]');
  const [mappingsError, setMappingsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await api.studio.outputTemplates.list();
      setTemplates(data as OutputTemplate[]);
    } catch {
      toast.error('Failed to load templates');
    } finally { setLoading(false); }
  };

  const resetForm = () => {
    setName(''); setDescription(''); setFilenameTpl('UW_{request_id}.xlsx');
    setMappingsText('[]'); setMappingsError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) { toast.error('Pick an XLSX template'); return; }
    if (!name.trim()) { toast.error('Name is required'); return; }
    let mappings: any[] = [];
    try { mappings = JSON.parse(mappingsText || '[]'); } catch (e: any) {
      setMappingsError(`Invalid JSON: ${e.message}`); return;
    }
    if (!Array.isArray(mappings)) { setMappingsError('Mappings must be a JSON array'); return; }
    setMappingsError(null);
    setCreating(true);
    const fd = new FormData();
    fd.append('name', name);
    fd.append('description', description);
    fd.append('output_filename_template', filenameTpl);
    fd.append('field_mappings', JSON.stringify(mappings));
    fd.append('template_file', file);
    try {
      const created = await api.studio.outputTemplates.create(fd);
      setTemplates(t => [created as OutputTemplate, ...t]);
      setCreateOpen(false);
      resetForm();
      toast.success('Template created');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create template');
    } finally { setCreating(false); }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    let mappings: any[] = [];
    try { mappings = JSON.parse(mappingsText || '[]'); } catch (e: any) {
      setMappingsError(`Invalid JSON: ${e.message}`); return;
    }
    if (!Array.isArray(mappings)) { setMappingsError('Mappings must be a JSON array'); return; }
    try {
      const updated = await api.studio.outputTemplates.update(editing.id, {
        name, description, output_filename_template: filenameTpl,
        field_mappings: mappings,
      });
      setTemplates(t => t.map(x => x.id === editing.id ? (updated as OutputTemplate) : x));
      setEditing(null);
      toast.success('Template saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save template');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.studio.outputTemplates.delete(id);
      setTemplates(t => t.filter(x => x.id !== id));
      toast.success('Template deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const beginEdit = (tpl: OutputTemplate) => {
    setEditing(tpl);
    setName(tpl.name);
    setDescription(tpl.description || '');
    setFilenameTpl(tpl.output_filename_template || 'UW_{request_id}.xlsx');
    setMappingsText(JSON.stringify(tpl.field_mappings || [], null, 2));
    setMappingsError(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-info/8 via-background to-primary/5 p-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-info/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-info/80">
              <FileSpreadsheet className="h-3 w-3" />
              Outputs
            </div>
            <h1 className="text-3xl font-semibold mt-2 tracking-tight">UW & output templates</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              Upload an XLSX template (e.g. underwriting sheet); map cells to extracted fields; render per-request from the workbench.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20 shrink-0">
                <Plus className="h-3.5 w-3.5" />
                New template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>New output template</DialogTitle>
                <DialogDescription>Upload the insurer's XLSX, name it, and define cell mappings.</DialogDescription>
              </DialogHeader>
              <CreateOrEditBody
                name={name} setName={setName}
                description={description} setDescription={setDescription}
                filenameTpl={filenameTpl} setFilenameTpl={setFilenameTpl}
                mappingsText={mappingsText} setMappingsText={setMappingsText}
                mappingsError={mappingsError} setMappingsError={setMappingsError}
                fileInputRef={fileInputRef}
                showFile
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/10 border-border/50">
          <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No templates yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map(tpl => (
            <Card key={tpl.id} className="group hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2 pt-4 px-4 flex-row items-start justify-between space-y-0">
                <div className="min-w-0">
                  <CardTitle className="text-sm font-semibold truncate">{tpl.name}</CardTitle>
                  {tpl.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{tpl.description}</p>}
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {(tpl.field_mappings || []).length} mappings
                </Badge>
              </CardHeader>
              <CardContent className="px-4 pb-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground font-mono truncate">
                  {tpl.output_filename_template}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => beginEdit(tpl)}>Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{tpl.name}</strong> will no longer be available for rendering. This can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(tpl.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(v) => { if (!v) { setEditing(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          <CreateOrEditBody
            name={name} setName={setName}
            description={description} setDescription={setDescription}
            filenameTpl={filenameTpl} setFilenameTpl={setFilenameTpl}
            mappingsText={mappingsText} setMappingsText={setMappingsText}
            mappingsError={mappingsError} setMappingsError={setMappingsError}
            fileInputRef={fileInputRef}
            showFile={false}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateOrEditBody({
  name, setName,
  description, setDescription,
  filenameTpl, setFilenameTpl,
  mappingsText, setMappingsText,
  mappingsError, setMappingsError,
  fileInputRef, showFile,
}: any) {
  return (
    <div className="space-y-3 py-2">
      {showFile && (
        <div className="space-y-1.5">
          <Label className="text-xs">XLSX template</Label>
          <Input ref={fileInputRef} type="file" accept=".xlsx" />
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input placeholder="Underwriting sheet — Insurer A" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Input value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Output filename template</Label>
        <Input value={filenameTpl} onChange={e => setFilenameTpl(e.target.value)} className="font-mono text-xs" />
        <p className="text-[10px] text-muted-foreground">
          Supports <code>{'{request_id}'}</code> and <code>{'{company_name}'}</code>.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Field mappings (JSON array)</Label>
        <Textarea
          rows={10}
          value={mappingsText}
          onChange={e => { setMappingsText(e.target.value); setMappingsError(null); }}
          className={cn('font-mono text-xs', mappingsError && 'border-destructive')}
          spellCheck={false}
          placeholder='[\n  {"cell": "A4", "doc_type": "trade-license", "field": "Company Name"},\n  {"cell": "B7", "doc_type": "vat-certificate", "field": "TRN"}\n]'
        />
        {mappingsError ? (
          <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{mappingsError}</p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Each entry: <code>{'{cell, doc_type, field}'}</code> or <code>{'{cell, literal}'}</code>. Optional <code>sheet</code> key targets a specific worksheet.
          </p>
        )}
      </div>
    </div>
  );
}
