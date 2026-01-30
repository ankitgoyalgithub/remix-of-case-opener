import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Document, DOCUMENT_TYPE_LABELS } from '@/types/case';

interface EvidencePackDocumentsProps {
  documents: Document[];
}

export function EvidencePackDocuments({ documents }: EvidencePackDocumentsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between py-3 px-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-info" />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</span>
                    <span>•</span>
                    <span>Uploaded {format(doc.uploadedAt, 'dd MMM yyyy HH:mm')}</span>
                  </div>
                </div>
              </div>
              <Badge className="bg-success/20 text-success border-0 text-xs gap-1">
                <Check className="h-3 w-3" />
                {doc.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
