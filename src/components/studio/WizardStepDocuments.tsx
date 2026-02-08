import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  FileText,
  Users,
  Stethoscope,
  DollarSign,
  UserCheck,
  Settings2,
} from 'lucide-react';
import { mockDocumentDefinitions, mockWorkflowStages, DocumentDefinition } from '@/data/mockStudioData';
import { cn } from '@/lib/utils';

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
  const [documents] = useState<DocumentDefinition[]>(mockDocumentDefinitions);
  const [selectedStage, setSelectedStage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const stageDocuments = documents.filter(doc =>
    doc.applicableStages.includes(selectedStage)
  );

  const filteredDocuments = stageDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const requiredDocs = filteredDocuments.filter(d => d.mandatory);
  const optionalDocs = filteredDocuments.filter(d => !d.mandatory);

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
          {mockWorkflowStages.map(stage => {
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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Document
            </Button>
          </div>

          {/* Required Documents */}
          {requiredDocs.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Required Documents</Label>
              <div className="space-y-2 mt-2">
                {requiredDocs.map(doc => {
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
                              <Badge className="bg-destructive/10 text-destructive border-0 text-xs">Required</Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => onConfigureDocument(doc)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Configure
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Documents */}
          {optionalDocs.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Optional Documents</Label>
              <div className="space-y-2 mt-2">
                {optionalDocs.map(doc => {
                  const Icon = categoryIcons[doc.category] || FileText;
                  return (
                    <Card key={doc.id} className="hover:border-primary/30 transition-colors opacity-80">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm font-medium">{doc.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => onConfigureDocument(doc)}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                          Configure
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {filteredDocuments.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No documents linked to this stage</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
