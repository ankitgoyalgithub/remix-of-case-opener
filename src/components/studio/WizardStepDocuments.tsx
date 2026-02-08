import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  FileText,
  Users,
  Stethoscope,
  DollarSign,
  UserCheck,
  Settings2,
  Trash2,
} from 'lucide-react';
import { DocumentDefinition } from '@/data/mockStudioData';
import { useStudioDocuments, useStudioStages } from '@/hooks/useStudioStore';
import { AddDocumentDialog } from './AddDocumentDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const categoryIcons: Record<string, React.ElementType> = {
  Employer: FileText,
  Workforce: Users,
  Medical: Stethoscope,
  Commercial: DollarSign,
  Signatory: UserCheck,
};

interface WizardStepDocumentsProps {
  onConfigureDocument: (doc: DocumentDefinition) => void;
}

export function WizardStepDocuments({ onConfigureDocument }: WizardStepDocumentsProps) {
  const { documents, addDocument, updateDocument, removeDocument } = useStudioDocuments();
  const { stages } = useStudioStages();
  const [selectedStage, setSelectedStage] = useState(stages[0]?.order ?? 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detachConfirm, setDetachConfirm] = useState<string | null>(null);

  const stageDocuments = documents.filter(doc =>
    doc.applicableStages.includes(selectedStage)
  );

  const filteredDocuments = stageDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const requiredDocs = filteredDocuments.filter(d => d.mandatory);
  const optionalDocs = filteredDocuments.filter(d => !d.mandatory);

  const handleAttachExisting = (doc: DocumentDefinition) => {
    if (!doc.applicableStages.includes(selectedStage)) {
      updateDocument(doc.id, {
        applicableStages: [...doc.applicableStages, selectedStage],
      });
      toast.success(`${doc.name} attached to stage`);
    }
  };

  const handleCreateNew = (docData: Omit<DocumentDefinition, 'id'>) => {
    addDocument(docData);
    toast.success(`${docData.name} created and attached`);
  };

  const handleDetach = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;
    const newStages = doc.applicableStages.filter(s => s !== selectedStage);
    if (newStages.length === 0) {
      // If no stages left, remove entirely
      removeDocument(docId);
    } else {
      updateDocument(docId, { applicableStages: newStages });
    }
    setDetachConfirm(null);
    toast.success('Document removed from stage');
  };

  const docToDetach = documents.find(d => d.id === detachConfirm);

  const renderDocCard = (doc: DocumentDefinition) => {
    const Icon = categoryIcons[doc.category] || FileText;
    return (
      <Card key={doc.id} className="hover:border-primary/30 transition-colors">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">{doc.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                {doc.mandatory && (
                  <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => onConfigureDocument(doc)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configure
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDetachConfirm(doc.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Documents per Stage</h2>
        <p className="text-sm text-muted-foreground">
          Define what documents are required at each processing stage.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Left: Stage selector */}
        <div className="w-56 shrink-0 space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stages</Label>
          {stages.map(stage => {
            const count = documents.filter(d => d.applicableStages.includes(stage.order)).length;
            const isSelected = selectedStage === stage.order;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.order)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium border border-primary/20"
                    : "hover:bg-muted text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {stage.order}
                  </span>
                  <span className="truncate">{stage.name}</span>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">{count}</Badge>
              </button>
            );
          })}
        </div>

        {/* Right: Documents for stage */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Document
            </Button>
          </div>

          {/* Required Documents */}
          {requiredDocs.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Required Documents</Label>
              <div className="space-y-2 mt-2">
                {requiredDocs.map(renderDocCard)}
              </div>
            </div>
          )}

          {/* Optional Documents */}
          {optionalDocs.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Optional Documents</Label>
              <div className="space-y-2 mt-2">
                {optionalDocs.map(doc => (
                  <div key={doc.id} className="opacity-80">
                    {renderDocCard(doc)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents linked to this stage</p>
              <Button variant="link" size="sm" onClick={() => setAddDialogOpen(true)} className="mt-1">
                Add a document
              </Button>
            </div>
          )}
        </div>
      </div>

      <AddDocumentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        allDocuments={documents}
        stageDocuments={stageDocuments}
        selectedStage={selectedStage}
        onAttachExisting={handleAttachExisting}
        onCreateNew={handleCreateNew}
      />

      <AlertDialog open={!!detachConfirm} onOpenChange={(open) => !open && setDetachConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Document from Stage</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{docToDetach?.name}" from this stage? 
              {docToDetach && docToDetach.applicableStages.length <= 1
                ? ' This is the only stage — the document type will also be deleted.'
                : ' The document type will still be available in other stages.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => detachConfirm && handleDetach(detachConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
