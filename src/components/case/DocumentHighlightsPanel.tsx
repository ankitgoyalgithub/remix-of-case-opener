import { Document, DocumentHighlight } from '@/types/case';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, FileText, Sparkles, ArrowRight, FileSearch, Database } from 'lucide-react';

interface DocumentHighlightsPanelProps {
  document: Document;
  onClose: () => void;
}

export function DocumentHighlightsPanel({ document, onClose }: DocumentHighlightsPanelProps) {
  const hasHighlights = document.highlights && document.highlights.length > 0;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Extraction Highlights</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Document Info */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <FileText className="h-5 w-5 text-info" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{document.name}</p>
          <p className="text-xs text-muted-foreground">
            {document.status === 'extracted' ? 'AI extracted' : document.status}
          </p>
        </div>
        <Badge className="bg-success/20 text-success border-0 text-xs">
          {document.highlights?.length || 0} fields
        </Badge>
      </div>

      {/* Highlights List */}
      {hasHighlights ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            Key data extracted from this document:
          </p>
          {document.highlights!.map((highlight, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="w-1 h-full min-h-[40px] rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{highlight.label}</span>
                  {highlight.page && (
                    <span className="text-xs text-muted-foreground/60">• Page {highlight.page}</span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground">
                  {highlight.value}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 mt-2 group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileSearch className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No extraction highlights available
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            This document may still be processing
          </p>
        </div>
      )}

      {/* Traceability Note */}
      {hasHighlights && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            These values are extracted by AI and populate the corresponding fields in the Extracted Data tab.
          </p>
        </div>
      )}
    </div>
  );
}
