import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import {
  FileStack, Plus, Save, Search, FileText, Users, Stethoscope,
  DollarSign, UserCheck, Loader2, X
} from 'lucide-react';
import { DocDef } from '@/types/case';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const categoryIcons = {
  Employer: FileText,
  Workforce: Users,
  Medical: Stethoscope,
  Commercial: DollarSign,
  Signatory: UserCheck,
};

const categoryColors: Record<string, string> = {
  Employer:   'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Workforce:  'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Medical:    'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Commercial: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Signatory:  'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

const categories = ['Employer', 'Workforce', 'Medical', 'Commercial', 'Signatory'] as const;

export default function DocumentCatalog() {
  const [documents, setDocuments] = useState<DocDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [modifiedIds, setModifiedIds] = useState<Set<string | number>>(new Set());

  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<string>('Employer');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [addingDoc, setAddingDoc] = useState(false);

  useEffect(() => { fetchDocuments(); }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.studio.documents.list();
      setDocuments(res);
    } catch {
      toast.error('Failed to load document definitions');
    } finally {
      setLoading(false);
    }
  };

  const markAsModified = (id: string | number) => {
    setModifiedIds(prev => new Set(prev).add(id));
    setHasChanges(true);
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleMandatory = (id: string | number) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, mandatory: !d.mandatory } : d));
    markAsModified(id);
  };

  const handleToggleRenewalOnly = (id: string | number) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, renewalOnly: !d.renewalOnly } : d));
    markAsModified(id);
  };

  const handleAddDocument = async () => {
    if (!newDocName.trim()) { toast.error('Document name is required'); return; }
    try {
      setAddingDoc(true);
      const newTypeSlug = newDocName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const res = await api.studio.documents.create({
        name: newDocName,
        type: newTypeSlug || 'custom-doc',
        category: newDocCategory,
        description: newDocDescription,
        mandatory: false,
        renewalOnly: false,
        extraction_keys: [],
      });
      setDocuments(prev => [...prev, res]);
      setIsAddDocModalOpen(false);
      setNewDocName(''); setNewDocDescription(''); setNewDocCategory('Employer');
      toast.success('Document type added');
    } catch {
      toast.error('Failed to add document type');
    } finally {
      setAddingDoc(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = documents.filter(d => modifiedIds.has(d.id));
      await Promise.all(updates.map(doc =>
        api.studio.documents.update(doc.id, {
          mandatory: doc.mandatory, renewalOnly: doc.renewalOnly,
          extraction_keys: doc.extraction_keys, category: doc.category,
          name: doc.name, description: doc.description,
        })
      ));
      toast.success('Document catalog saved', { description: `${updates.length} document types updated` });
      setHasChanges(false);
      setModifiedIds(new Set());
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
            <FileStack className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Document Catalog</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Define document types, categories, and their requirements</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm" className="gap-2 shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all whitespace-nowrap',
            categoryFilter === 'all'
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80'
          )}
        >
          All
          <span className={cn(
            'text-xs font-semibold px-1.5 py-0.5 rounded-md',
            categoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
          )}>
            {documents.length}
          </span>
        </button>
        {categories.map(cat => {
          const count = documents.filter(d => d.category === cat).length;
          const Icon = categoryIcons[cat as keyof typeof categoryIcons] || FileText;
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(isSelected ? 'all' : cat)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all whitespace-nowrap',
                isSelected
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat}
              <span className={cn(
                'text-xs font-semibold px-1.5 py-0.5 rounded-md',
                isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
        <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Plus className="h-3.5 w-3.5" />Add Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Document Type</DialogTitle>
              <DialogDescription>Create a new document type for the catalog.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Name</Label>
                <Input placeholder="e.g. Quarterly Tax Filing" value={newDocName} onChange={e => setNewDocName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={newDocCategory} onValueChange={setNewDocCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/50">(optional)</span></Label>
                <Textarea placeholder="Brief description of this document" value={newDocDescription} onChange={e => setNewDocDescription(e.target.value)} className="resize-none" rows={3} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsAddDocModalOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddDocument} disabled={addingDoc}>
                {addingDoc && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
                Add Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading document catalog…</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/20">
          <FileStack className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No documents match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filteredDocuments.map(doc => {
            const Icon = categoryIcons[doc.category as keyof typeof categoryIcons] || FileText;
            return (
              <div key={doc.id} className="rounded-xl border border-border bg-card hover:border-border/80 transition-colors">
                {/* Card header */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', categoryColors[doc.category] || 'bg-muted text-muted-foreground')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{doc.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('text-xs shrink-0 mt-0.5', categoryColors[doc.category])}>
                        {doc.category}
                      </Badge>
                    </div>
                    {/* Flags */}
                    <div className="flex items-center gap-2 mt-2">
                      {doc.mandatory && (
                        <Badge className="bg-destructive/10 text-destructive border-0 text-xs py-0">Required</Badge>
                      )}
                      {doc.renewalOnly && (
                        <Badge variant="secondary" className="text-xs py-0">Renewal Only</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toggles row */}
                <div className="flex items-center gap-6 px-4 py-2.5 border-t border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={doc.mandatory}
                      onCheckedChange={() => handleToggleMandatory(doc.id)}
                      className="scale-90"
                    />
                    <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => handleToggleMandatory(doc.id)}>
                      Required
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={doc.renewalOnly}
                      onCheckedChange={() => handleToggleRenewalOnly(doc.id)}
                      className="scale-90"
                    />
                    <Label className="text-xs text-muted-foreground cursor-pointer" onClick={() => handleToggleRenewalOnly(doc.id)}>
                      Renewal only
                    </Label>
                  </div>
                  <div className="ml-auto">
                    <Badge variant="secondary" className="text-xs">
                      {doc.extraction_keys?.length || 0} fields
                    </Badge>
                  </div>
                </div>

                {/* Extraction keys */}
                <div className="px-4 py-3 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Extraction Fields</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-primary hover:bg-primary/5 gap-1">
                          <Plus className="h-3 w-3" />Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Extraction Field</DialogTitle>
                          <DialogDescription>Enter a field name for the AI to extract from <strong>{doc.name}</strong>.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Input
                            placeholder="e.g. License Number"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value.trim();
                                if (val) {
                                  setDocuments(prev => prev.map(d => d.id === doc.id
                                    ? { ...d, extraction_keys: [...(d.extraction_keys || []), val] }
                                    : d));
                                  markAsModified(doc.id);
                                  (e.target as HTMLInputElement).value = '';
                                  toast.success('Field added — press Enter to add more');
                                }
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground mt-2">Press Enter to add. Close when done.</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {doc.extraction_keys?.length ? (
                      doc.extraction_keys.map((key, idx) => (
                        <span
                          key={idx}
                          className="group inline-flex items-center gap-1 text-xs bg-primary/5 text-primary border border-primary/15 rounded-md px-2 py-0.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 cursor-pointer transition-colors"
                          title="Click to remove"
                          onClick={() => {
                            setDocuments(prev => prev.map(d =>
                              d.id === doc.id ? { ...d, extraction_keys: d.extraction_keys?.filter((_, i) => i !== idx) } : d
                            ));
                            markAsModified(doc.id);
                          }}
                        >
                          {key}
                          <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No fields configured</p>
                    )}
                  </div>
                </div>

                {/* Cross-validation rules */}
                {doc.cross_validation_rules && doc.cross_validation_rules.length > 0 && (
                  <div className="px-4 py-3 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Cross-Validation</p>
                    <div className="space-y-1">
                      {doc.cross_validation_rules.map((rule: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-xs bg-muted/30 px-2 py-1.5 rounded-lg border border-border/40">
                          <span className="font-medium text-primary">{rule.source_field}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="font-medium">{rule.target_field}</span>
                          <span className="text-muted-foreground">({rule.target_document_type})</span>
                          <Badge variant="outline" className="ml-auto text-[10px] h-4 px-1.5 uppercase font-semibold">
                            {rule.comparison_type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
