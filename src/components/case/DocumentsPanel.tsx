import { Document } from '@/types/case';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, FileSpreadsheet, File, Check, Loader2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DocumentsPanelProps {
  documents: Document[];
  selectedDocument: Document | null;
  onSelectDocument: (doc: Document) => void;
}

export function DocumentsPanel({ documents, selectedDocument, onSelectDocument }: DocumentsPanelProps) {
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

  return (
    <div className="space-y-3 animate-fade-in">
      {documents.map((doc) => (
        <Card 
          key={doc.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md",
            selectedDocument?.id === doc.id 
              ? "ring-2 ring-primary border-primary" 
              : "hover:border-primary/50"
          )}
          onClick={() => onSelectDocument(doc)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="mt-0.5">
                  {getDocIcon(doc.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
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
      ))}
    </div>
  );
}
