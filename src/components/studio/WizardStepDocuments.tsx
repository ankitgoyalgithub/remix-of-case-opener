import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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

  const stageDocuments = documents;

  const filteredDocuments = stageDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const requiredDocs = filteredDocuments.filter(d => d.mandatory);
  const optionalDocs = filteredDocuments.filter(d => !d.mandatory);

  const handleAttachExisting = (doc: DocumentDefinition) => {
    // Documents are now case-level; just confirm to user
    toast.success(`${doc.name} is available across all stages`);
  };

  const handleCreateNew = (docData: Omit<DocumentDefinition, 'id'>) => {
    addDocument(docData);
    toast.success(`${docData.name} created and attached`);
  };

  const handleDetach = (docId: string) => {
    removeDocument(docId);
    setDetachConfirm(null);
    toast.success('Document definition removed');
  };

  const docToDetach = documents.find(d => d.id === detachConfirm);

  const renderDocCard = (doc: DocumentDefinition) => {
    const Icon = categoryIcons[doc.category] || FileText;
    return (
      <div key={doc.id} className="group relative">
        <div className={cn(
          "glass-card rounded-2xl border-border/40 p-4 transition-all duration-300",
          "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold tracking-tight text-foreground">{doc.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-black tracking-widest border-border/60 bg-muted/50 text-muted-foreground/80 px-1.5 py-0">{doc.category.toUpperCase()}</Badge>
                  {doc.mandatory && (
                    <Badge className="bg-destructive/10 text-destructive border-0 text-[9px] font-black tracking-widest px-1.5 py-0">REQUIRED</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 rounded-lg gap-2 text-[10px] font-bold tracking-wider hover:bg-primary/5 hover:text-primary transition-all"
                onClick={() => onConfigureDocument(doc)}
              >
                <Settings2 className="h-3.5 w-3.5" />
                CONFIG
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                onClick={() => setDetachConfirm(doc.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Evidence Library</h2>
        <p className="text-sm font-medium text-muted-foreground/70">
          Map required document types to specific operational stages.
        </p>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Left: Stage Navigation Rail */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <Label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Contextual Phases</Label>
          </div>
          <div className="flex-1 overflow-auto pr-2 space-y-1.5 custom-scrollbar">
            {stages.map(stage => {
              const count = documents.length;
              const isSelected = selectedStage === stage.order;
              return (
                <button
                  key={stage.id}
                  onClick={() => setSelectedStage(stage.order)}
                  className={cn(
                    "w-full group text-left px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden active:scale-95",
                    isSelected
                      ? "bg-primary text-white shadow-lg shadow-primary/20 border-t border-white/20"
                      : "hover:bg-primary/5 text-muted-foreground border border-transparent"
                  )}
                >
                  {/* Subtle BG Glow for selected */}
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                  )}

                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black transition-all",
                        isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                      )}>
                        {stage.order}
                      </div>
                      <span className="text-xs font-bold tracking-tight truncate">{stage.name}</span>
                    </div>
                    {count > 0 && (
                      <Badge variant="secondary" className={cn(
                        "text-[9px] font-black h-5 min-w-[20px] rounded-full flex items-center justify-center transition-colors",
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Bento Grid of Documents */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Command Bar */}
          <div className="flex items-center gap-4 glass p-2 rounded-2xl border-border/40">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                placeholder="Search archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 rounded-xl bg-transparent border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm font-medium"
              />
            </div>
            <Separator orientation="vertical" className="h-6" />
            <Button size="sm" className="gap-2 h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 font-bold text-[11px] tracking-wider shadow-lg shadow-primary/20" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              ADD DOCUMENT TYPE
            </Button>
          </div>

          <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
            <div className="space-y-8 pb-10">
              {/* Required Category */}
              {(requiredDocs.length > 0 || optionalDocs.length > 0) ? (
                <>
                  {requiredDocs.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <Label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Mandatory Requirements</Label>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {requiredDocs.map(renderDocCard)}
                      </div>
                    </div>
                  )}

                  {optionalDocs.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <Label className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Supporting Evidence</Label>
                      </div>
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {optionalDocs.map(doc => (
                          <div key={doc.id} className="opacity-80 grayscale-[0.3] hover:grayscale-0 transition-all">
                            {renderDocCard(doc)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-[400px] flex flex-col items-center justify-center glass-card rounded-[3rem] border-dashed border-border/40 gap-4">
                  <div className="w-16 h-16 rounded-[2rem] bg-muted/20 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-muted-foreground/80 tracking-tight">Stage Library Empty</p>
                    <p className="text-[11px] text-muted-foreground/50 mt-1 max-w-[200px]">Link documented evidence to this phase to continue.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)} className="mt-2 rounded-xl text-[10px] font-bold border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
                    PROTO-ADD DOCUMENT
                  </Button>
                </div>
              )}
            </div>
          </div>
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
        <AlertDialogContent className="rounded-3xl border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Detach Evidence Type</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
              Are you sure you want to remove <span className="text-foreground font-bold italic">"{docToDetach?.name}"</span> from the document catalog?
              <br />
              {' This definition will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs tracking-wider">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => detachConfirm && handleDetach(detachConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold text-xs tracking-wider shadow-lg shadow-destructive/20"
            >
              REMOVE DOCUMENT
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
