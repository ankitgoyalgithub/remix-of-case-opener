import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import {
  FileStack,
  Plus,
  Save,
  Search,
  Edit2,
  Trash2,
  FileText,
  Users,
  Stethoscope,
  DollarSign,
  UserCheck,
  Check,
  Loader2
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

const categoryColors = {
  Employer: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Workforce: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  Medical: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Commercial: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Signatory: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

export default function DocumentCatalog() {
  const [documents, setDocuments] = useState<DocDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [modifiedIds, setModifiedIds] = useState<Set<string | number>>(new Set());

  // Add Document Modal State
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<string>('Employer');
  const [newDocDescription, setNewDocDescription] = useState('');
  const [addingDoc, setAddingDoc] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.studio.documents.list();
      setDocuments(res);
    } catch (error) {
      console.error('Failed to fetch documents', error);
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
    setDocuments(prev => prev.map(d =>
      d.id === id ? { ...d, mandatory: !d.mandatory } : d
    ));
    markAsModified(id);
  };

  const handleToggleRenewalOnly = (id: string | number) => {
    setDocuments(prev => prev.map(d =>
      d.id === id ? { ...d, renewalOnly: !d.renewalOnly } : d
    ));
    markAsModified(id);
  };

  const handleAddDocument = async () => {
    if (!newDocName.trim()) {
      toast.error('Document name is required');
      return;
    }
    
    try {
      setAddingDoc(true);
      const newTypeSlug = newDocName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const newDoc = {
        name: newDocName,
        type: newTypeSlug || 'custom-doc',
        category: newDocCategory,
        description: newDocDescription,
        mandatory: false,
        renewalOnly: false,
        extraction_keys: []
      };
      
      const res = await api.studio.documents.create(newDoc);
      setDocuments(prev => [...prev, res]);
      setIsAddDocModalOpen(false);
      setNewDocName('');
      setNewDocDescription('');
      setNewDocCategory('Employer');
      toast.success('Document type added');
    } catch (error) {
      console.error('Failed to add document type', error);
      toast.error('Failed to add document type');
    } finally {
      setAddingDoc(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Update only modified documents
      const updates = documents.filter(d => modifiedIds.has(d.id));
      
      await Promise.all(updates.map(doc => 
        api.studio.documents.update(doc.id, {
          mandatory: doc.mandatory,
          renewalOnly: doc.renewalOnly,
          extraction_keys: doc.extraction_keys,
          category: doc.category,
          name: doc.name,
          description: doc.description
        })
      ));

      toast.success('Document catalog saved', {
        description: `${updates.length} document types updated`,
      });
      setHasChanges(false);
      setModifiedIds(new Set());
    } catch (error) {
      console.error('Failed to save document catalog', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const categories = ['Employer', 'Workforce', 'Medical', 'Commercial', 'Signatory'] as const;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileStack className="h-6 w-6 text-primary" />
            Document Catalog
          </h1>
          <p className="text-muted-foreground mt-1">
            Define document types and their requirements
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Document Type
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Document Type</DialogTitle>
              <DialogDescription>
                Create a new document type for the catalog.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="doc-name">Name</Label>
                <Input
                  id="doc-name"
                  placeholder="e.g. Quarterly Tax Filing"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-category">Category</Label>
                <Select value={newDocCategory} onValueChange={setNewDocCategory}>
                  <SelectTrigger id="doc-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doc-desc">Description (Optional)</Label>
                <Textarea
                  id="doc-desc"
                  placeholder="Brief description of this document"
                  value={newDocDescription}
                  onChange={(e) => setNewDocDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDocModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddDocument} disabled={addingDoc}>
                {addingDoc ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {categories.map(cat => {
          const count = documents.filter(d => d.category === cat).length;
          const Icon = categoryIcons[cat as keyof typeof categoryIcons] || FileText;
          return (
            <Card
              key={cat}
              className={cn(
                "cursor-pointer transition-all",
                categoryFilter === cat ? "ring-2 ring-primary" : "hover:border-primary/30"
              )}
              onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{cat}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading document catalog...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileStack className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No documents match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocuments.map(doc => {
            const Icon = categoryIcons[doc.category as keyof typeof categoryIcons] || FileText;
            return (
              <Card key={doc.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", categoryColors[doc.category as keyof typeof categoryColors])}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{doc.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="outline" className={cn("text-xs", categoryColors[doc.category as keyof typeof categoryColors])}>
                            {doc.category}
                          </Badge>
                          {doc.mandatory && (
                            <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                          )}
                          {doc.renewalOnly && (
                            <Badge variant="secondary" className="text-xs">Renewal Only</Badge>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                              AI Extraction Fields
                            </Label>
                            <Badge variant="secondary" className="text-xs h-4">
                              {doc.extraction_keys?.length || 0} Fields
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                            {doc.extraction_keys?.map((key, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="bg-primary/5 text-primary border-primary/10 text-xs py-0 px-2 group flex items-center gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 cursor-pointer"
                                title="Click to remove"
                                onClick={() => {
                                  setDocuments(prev => prev.map(d =>
                                    d.id === doc.id ? { ...d, extraction_keys: d.extraction_keys?.filter((_, i) => i !== idx) } : d
                                  ));
                                  markAsModified(doc.id);
                                }}
                              >
                                {key}
                                <Plus className="h-2 w-2 rotate-45 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            ))}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-primary hover:text-primary hover:bg-primary/5 gap-1">
                                  <Plus className="h-3 w-3" />
                                  Add Field
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Add Extraction Field</DialogTitle>
                                  <DialogDescription className="text-xs text-muted-foreground">
                                    Enter the name of the field you want the AI to extract from this document type.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex items-center space-x-2 py-4">
                                  <div className="grid flex-1 gap-2">
                                    <Label htmlFor="new-key" className="sr-only">Field Name</Label>
                                    <Input
                                      id="new-key"
                                      placeholder="Enter field name (e.g. License Number)"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const val = (e.target as HTMLInputElement).value.trim();
                                          if (val) {
                                            setDocuments(prev => prev.map(d =>
                                              d.id === doc.id ? { ...d, extraction_keys: [...(d.extraction_keys || []), val] } : d
                                            ));
                                            markAsModified(doc.id);
                                            (e.target as HTMLInputElement).value = '';
                                            toast.success('Field added');
                                          }
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>

                        {/* Validation Rules Section */}
                        {doc.validation_rules && (
                          <div className="mt-4 pt-3 border-t border-border/50">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1 block">
                              Validation Rules
                            </Label>
                            <p className="text-sm text-muted-foreground italic">
                              {doc.validation_rules}
                            </p>
                          </div>
                        )}

                        {/* Cross-Validation Section */}
                        {doc.cross_validation_rules && doc.cross_validation_rules.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-border/50">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 block">
                              Cross-Validation Hooks
                            </Label>
                            <div className="space-y-1.5">
                              {doc.cross_validation_rules.map((rule: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs bg-muted/30 p-1.5 rounded border border-border/50">
                                  <div className="flex-1">
                                    <span className="font-semibold text-primary">{rule.source_field}</span>
                                    <span className="mx-1 text-muted-foreground">→</span>
                                    <span className="font-semibold">{rule.target_field}</span>
                                    <span className="ml-1 text-muted-foreground">({rule.target_document_type})</span>
                                  </div>
                                  <Badge variant="outline" className="text-[11px] h-3.5 px-1 uppercase font-bold bg-background">
                                    {rule.comparison_type}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Required</Label>
                        <Switch
                          checked={doc.mandatory}
                          onCheckedChange={() => handleToggleMandatory(doc.id)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Renewal</Label>
                        <Switch
                          checked={doc.renewalOnly}
                          onCheckedChange={() => handleToggleRenewalOnly(doc.id)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
