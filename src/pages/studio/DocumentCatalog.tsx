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
  FileStack, Plus, Search, FileText, Users, Stethoscope,
  DollarSign, UserCheck, Loader2, Settings, Brain, Database, Network,
} from 'lucide-react';
import { DocDef } from '@/types/case';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DocumentConfigDrawer } from '@/components/studio/DocumentConfigDrawer';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<string>('Employer');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [addingDoc, setAddingDoc] = useState(false);

  const [drawerDoc, setDrawerDoc] = useState<DocDef | null>(null);

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

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleMandatory = async (doc: DocDef) => {
    const next = !doc.mandatory;
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, mandatory: next } : d));
    try {
      await api.studio.documents.update(doc.id, { mandatory: next });
    } catch {
      // Revert on failure
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, mandatory: !next } : d));
      toast.error('Failed to update required flag');
    }
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
      // Open the drawer immediately so the operator can keep configuring.
      setDrawerDoc(res);
    } catch {
      toast.error('Failed to add document type');
    } finally {
      setAddingDoc(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-info/10 via-background to-primary/5 p-6">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-info/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-info/80">
              <FileStack className="h-3 w-3" />
              Documents
            </div>
            <h1 className="text-3xl font-semibold text-foreground mt-2 tracking-tight">Document types</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
              Define what operators can upload, what the AI should extract, the hints that guide it, and how fields cross-validate. One card per type — click <strong>Configure</strong> to edit everything in one place.
            </p>
          </div>
          <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20 shrink-0">
                <Plus className="h-3.5 w-3.5" />
                Add type
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add document type</DialogTitle>
                <DialogDescription>Create a new document type for operators to upload.</DialogDescription>
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
                  Add & configure
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Category chips + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all whitespace-nowrap',
              categoryFilter === 'all'
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80',
            )}
          >
            All
            <span className={cn(
              'text-[10px] font-semibold px-1.5 rounded-md',
              categoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
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
                  'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all whitespace-nowrap',
                  isSelected
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat}
                <span className={cn(
                  'text-[10px] font-semibold px-1.5 rounded-md',
                  isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading documents…</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/10 border-border/50">
          <FileStack className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {searchQuery || categoryFilter !== 'all' ? 'No documents match your filters' : 'No documents yet'}
          </p>
          {!searchQuery && categoryFilter === 'all' && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 gap-1.5"
              onClick={() => setIsAddDocModalOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add your first document type
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredDocuments.map(doc => {
            const Icon = categoryIcons[doc.category as keyof typeof categoryIcons] || FileText;
            const hasExtraction = (doc.extraction_keys?.length || 0) > 0;
            const hasAiNotes = !!doc.aiInstructions;
            const hasCvRules = (doc.cross_validation_rules?.length || 0) > 0;
            return (
              <div
                key={doc.id}
                className="group rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
                onClick={() => setDrawerDoc(doc)}
              >
                {/* Top row */}
                <div className="flex items-start gap-3 p-4">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border', categoryColors[doc.category] || 'bg-muted text-muted-foreground border-border')}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{doc.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] shrink-0 mt-0.5', categoryColors[doc.category])}>
                        {doc.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {doc.mandatory && (
                        <Badge className="bg-destructive/10 text-destructive border-0 text-[10px] h-4 px-1.5">Required</Badge>
                      )}
                      {doc.renewalOnly && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Renewal only</Badge>
                      )}
                      {(doc as any).per_shareholder && (
                        <Badge className="bg-info/10 text-info border-0 text-[10px] h-4 px-1.5">Per shareholder</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facet summary */}
                <div className="grid grid-cols-3 border-t border-border/60 divide-x divide-border/60 bg-muted/15">
                  <FacetCell
                    icon={Database}
                    label="Extract"
                    value={doc.extraction_keys?.length || 0}
                    active={hasExtraction}
                  />
                  <FacetCell
                    icon={Brain}
                    label="AI notes"
                    value={hasAiNotes ? 'Set' : '—'}
                    active={hasAiNotes}
                  />
                  <FacetCell
                    icon={Network}
                    label="CV rules"
                    value={doc.cross_validation_rules?.length || 0}
                    active={hasCvRules}
                  />
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-background">
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={!!doc.mandatory}
                        onCheckedChange={() => handleToggleMandatory(doc)}
                        className="scale-75"
                      />
                      <span>Required</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-primary hover:bg-primary/5 group-hover:bg-primary/10"
                  >
                    <Settings className="h-3 w-3" />
                    Configure
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full config drawer — Basics, Extraction, AI notes, CV rules */}
      <DocumentConfigDrawer
        open={drawerDoc !== null}
        onOpenChange={(v) => { if (!v) setDrawerDoc(null); }}
        document={drawerDoc}
        onSave={() => {
          fetchDocuments();
          setDrawerDoc(null);
        }}
      />
    </div>
  );
}

function FacetCell({ icon: Icon, label, value, active }: { icon: any; label: string; value: number | string; active: boolean }) {
  return (
    <div className={cn('px-3 py-2 flex flex-col items-center justify-center gap-0.5', !active && 'opacity-60')}>
      <Icon className={cn('h-3 w-3', active ? 'text-primary' : 'text-muted-foreground')} />
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-xs font-semibold', active ? 'text-foreground' : 'text-muted-foreground')}>
        {value}
      </p>
    </div>
  );
}
