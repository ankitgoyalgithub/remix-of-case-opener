import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Check
} from 'lucide-react';
import { mockDocumentDefinitions, DocumentDefinition, mockWorkflowStages } from '@/data/mockStudioData';
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
  const [documents, setDocuments] = useState<DocumentDefinition[]>(mockDocumentDefinitions);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [hasChanges, setHasChanges] = useState(false);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggleMandatory = (id: string) => {
    setDocuments(prev => prev.map(d => 
      d.id === id ? { ...d, mandatory: !d.mandatory } : d
    ));
    setHasChanges(true);
  };

  const handleToggleRenewalOnly = (id: string) => {
    setDocuments(prev => prev.map(d => 
      d.id === id ? { ...d, renewalOnly: !d.renewalOnly } : d
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success('Document catalog saved', {
      description: `${documents.length} document types configured`,
    });
    setHasChanges(false);
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
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
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
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Document Type
        </Button>
      </div>

      {/* Category Summary */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {categories.map(cat => {
          const count = documents.filter(d => d.category === cat).length;
          const Icon = categoryIcons[cat];
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

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocuments.map(doc => {
          const Icon = categoryIcons[doc.category];
          return (
            <Card key={doc.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", categoryColors[doc.category])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", categoryColors[doc.category])}>
                          {doc.category}
                        </Badge>
                        {doc.mandatory && (
                          <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                        )}
                        {doc.renewalOnly && (
                          <Badge variant="secondary" className="text-xs">Renewal Only</Badge>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Stages: {doc.applicableStages.map(s => `S${s}`).join(', ')}
                      </div>
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

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <FileStack className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No documents match your search</p>
        </div>
      )}
    </div>
  );
}
