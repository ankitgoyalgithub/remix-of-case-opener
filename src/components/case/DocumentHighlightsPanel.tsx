import { Document, DocumentHighlight } from '@/types/case';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocumentHighlightsPanelProps {
  document: Document;
  onClose: () => void;
}

export function DocumentHighlightsPanel({ document, onClose }: DocumentHighlightsPanelProps) {
  return (
    <div className="h-full flex flex-col animate-slide-in">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Highlights</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          <FileText className="h-4 w-4 text-info" />
          <span className="text-sm font-medium truncate">{document.name}</span>
        </div>

        {document.highlights && document.highlights.length > 0 ? (
          <div className="space-y-3">
            {document.highlights.map((highlight, index) => (
              <HighlightCard key={index} highlight={highlight} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No highlights extracted</p>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightCard({ highlight }: { highlight: DocumentHighlight }) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{highlight.label}</p>
            <p className="text-sm font-medium">{highlight.value}</p>
          </div>
          {highlight.page && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              p.{highlight.page}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
