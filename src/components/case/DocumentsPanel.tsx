import { Document, DocumentType } from '@/types/case';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, File, Check, Loader2, Eye, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { isDocumentRelevantToStage } from '@/lib/stageDocumentMapping';

interface DocumentsPanelProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelectDocument: (doc: Document) => void;
  activeStage?: number;
}

export function DocumentsPanel({ documents, selectedDocument, onSelectDocument, activeStage }: DocumentsPanelProps) {
  const getDocIcon = (type: string) => {
    if (type.includes('xlsx') || type === 'census') {
      return <FileSpreadsheet className="h-5 w-5 text-success" />;
    }
    if (type.includes('pdf') || type.includes('license') || type.includes('card') || type.includes('quote')) {
      return <FileText className="h-5 w-5 text-info" />;
    }
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'extracted':
        return (
          <Badge className="bg-success/20 text-success border-0 text-xs gap-1">
            <Check className="h-3 w-3" />
            Extracted
          </Badge>
        );
      case 'processing':
        return (
          <Badge className="bg-info/20 text-info border-0 text-xs gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'verified':
        return (
          <Badge className="bg-success/20 text-success border-0 text-xs gap-1">
            <Check className="h-3 w-3" />
            Verified
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Uploaded
          </Badge>
        );
    }
  };

  // Sort documents: relevant to active stage first
  const sortedDocuments = activeStage 
    ? [...documents].sort((a, b) => {
        const aRelevant = isDocumentRelevantToStage(a.type, activeStage);
        const bRelevant = isDocumentRelevantToStage(b.type, activeStage);
        if (aRelevant && !bRelevant) return -1;
        if (!aRelevant && bRelevant) return 1;
        return 0;
      })
    : documents;

  const relevantCount = activeStage 
    ? documents.filter(d => isDocumentRelevantToStage(d.type, activeStage)).length 
    : 0;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Stage context label */}
      {activeStage && activeStage !== 7 && (
        <div className="flex items-center gap-2 px-1 py-2 border-b border-border mb-2">
          <Star className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{relevantCount}</span> document(s) used in this stage
          </span>
        </div>
      )}

      {sortedDocuments.map((doc) => {
        const isRelevant = activeStage ? isDocumentRelevantToStage(doc.type, activeStage) : true;
        
        return (
          <Card 
            key={doc.id}
            className={cn(
              "cursor-pointer transition-all duration-200",
              selectedDocument?.id === doc.id 
                ? "ring-2 ring-primary border-primary" 
                : "hover:border-primary/50",
              !isRelevant && activeStage && "opacity-40 hover:opacity-60"
            )}
            onClick={() => onSelectDocument(doc)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 relative">
                    {getDocIcon(doc.type)}
                    {isRelevant && activeStage && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      {isRelevant && activeStage && (
                        <Badge variant="outline" className="text-xs shrink-0 border-primary/30 text-primary">
                          Stage {activeStage}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Uploaded {formatDistanceToNow(doc.uploadedAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(doc.status)}
                  {selectedDocument?.id === doc.id && (
                    <Eye className="h-4 w-4 text-primary" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
