import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Plus } from 'lucide-react';
import { DocumentDefinition } from '@/data/mockStudioData';
import { DocumentType } from '@/types/case';

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allDocuments: DocumentDefinition[];
  stageDocuments: DocumentDefinition[];
  selectedStage: number;
  onAttachExisting: (doc: DocumentDefinition) => void;
  onCreateNew: (doc: Omit<DocumentDefinition, 'id'>) => void;
}

const CATEGORIES = ['Employer', 'Workforce', 'Medical', 'Commercial', 'Signatory'] as const;

export function AddDocumentDialog({
  open,
  onOpenChange,
  allDocuments,
  stageDocuments,
  selectedStage,
  onAttachExisting,
  onCreateNew,
}: AddDocumentDialogProps) {
  const [tab, setTab] = useState<string>('existing');
  const [searchQuery, setSearchQuery] = useState('');

  // New doc form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<typeof CATEGORIES[number]>('Employer');
  const [newMandatory, setNewMandatory] = useState(false);

  const attachedIds = new Set(stageDocuments.map(d => d.id));
  const availableDocs = allDocuments.filter(
    d => !attachedIds.has(d.id) && d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAttach = (doc: DocumentDefinition) => {
    onAttachExisting(doc);
    onOpenChange(false);
  };

  const handleCreateNew = () => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Generate a type slug from the name
    const typeSlug = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') as DocumentType;

    onCreateNew({
      name: trimmedName,
      type: typeSlug,
      category: newCategory,
      mandatory: newMandatory,
      renewalOnly: false,
      description: '',
    });

    setNewName('');
    setNewCategory('Employer');
    setNewMandatory(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
          <DialogDescription>
            Select an existing document type or create a new one for this stage.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="existing" className="text-xs gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Select Existing
            </TabsTrigger>
            <TabsTrigger value="new" className="text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Create New
            </TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="mt-3 space-y-3">
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
            <div className="max-h-[280px] overflow-y-auto space-y-1.5">
              {availableDocs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => handleAttach(doc)}
                  className="w-full text-left p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{doc.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      {doc.mandatory && (
                        <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {availableDocs.length === 0 && (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {searchQuery ? 'No matching documents found' : 'All documents already attached to this stage'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="mt-3 space-y-4">
            <div>
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Power of Attorney"
                className="mt-1.5"
                maxLength={100}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as typeof CATEGORIES[number])}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Required Document</Label>
              <Switch checked={newMandatory} onCheckedChange={setNewMandatory} />
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleCreateNew} disabled={!newName.trim()}>
                Create & Attach
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
