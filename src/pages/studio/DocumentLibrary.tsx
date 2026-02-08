import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Search,
  FileText,
  Users,
  Stethoscope,
  DollarSign,
  UserCheck,
  Settings2,
  BookOpen,
} from 'lucide-react';
import { mockDocumentDefinitions, DocumentDefinition } from '@/data/mockStudioData';
import { DocumentConfigDrawer } from '@/components/studio/DocumentConfigDrawer';
import { cn } from '@/lib/utils';

const categoryIcons: Record<string, React.ElementType> = {
  Employer: FileText,
  Workforce: Users,
  Medical: Stethoscope,
  Commercial: DollarSign,
  Signatory: UserCheck,
};

const categories = ['Employer', 'Workforce', 'Medical', 'Commercial', 'Signatory'] as const;

export default function DocumentLibrary() {
  const [documents] = useState<DocumentDefinition[]>(mockDocumentDefinitions);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [drawerDoc, setDrawerDoc] = useState<DocumentDefinition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Document Library
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all document types outside of workflow context
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Document Type
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
          const Icon = categoryIcons[doc.category] || FileText;
          return (
            <Card key={doc.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{doc.description}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                        {doc.mandatory && (
                          <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                        )}
                        {doc.renewalOnly && (
                          <Badge variant="secondary" className="text-xs">Renewal Only</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs shrink-0"
                    onClick={() => {
                      setDrawerDoc(doc);
                      setDrawerOpen(true);
                    }}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDocuments.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No documents match your search</p>
        </div>
      )}

      <DocumentConfigDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        document={drawerDoc}
      />
    </div>
  );
}
