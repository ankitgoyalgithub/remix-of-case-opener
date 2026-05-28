import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { FileText, Check, Upload } from 'lucide-react';
import { Document, DocDef, DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';

interface DocumentsInStageProps {
  /** doc_type slugs relevant to this stage (union of the stage items' linked docs). */
  docTypes: string[];
  documents: Document[];
  docDefs: DocDef[];
  onOpenDoc: (doc: Document) => void;
}

/**
 * "DOCUMENTS IN THIS STAGE" — one chip per relevant doc type. Uploaded docs are
 * clickable (open the document drawer); missing ones render muted with a REQ
 * badge when mandatory.
 */
export function DocumentsInStage({ docTypes, documents, docDefs, onOpenDoc }: DocumentsInStageProps) {
  const types = Array.from(new Set(docTypes)).filter(Boolean);
  if (types.length === 0) return null;

  return (
    <div>
      <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
        Documents in this stage
      </p>
      <div className="flex flex-wrap gap-2">
        {types.map(type => {
          const def = docDefs.find(d => (d.type || d.doc_type) === type);
          const uploaded = documents.find(d => d.type === (type as DocumentType));
          const label = def?.name || DOCUMENT_TYPE_LABELS[type as DocumentType] || type;
          const mandatory = def?.mandatory;

          return (
            <button
              key={type}
              type="button"
              disabled={!uploaded}
              onClick={() => uploaded && onOpenDoc(uploaded)}
              className={cn(
                'inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg border text-xs transition-colors',
                uploaded
                  ? 'border-border bg-card hover:bg-muted/60 text-foreground cursor-pointer'
                  : 'border-dashed border-border/70 bg-muted/20 text-muted-foreground cursor-default',
              )}
            >
              <FileText className={cn('h-3.5 w-3.5 shrink-0', uploaded ? 'text-primary' : 'text-muted-foreground/60')} />
              <span className="truncate max-w-[160px]">{label}</span>
              {mandatory && !uploaded && (
                <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 h-4 bg-destructive/5 text-destructive border-destructive/20">
                  Req
                </Badge>
              )}
              {uploaded ? (
                <Check className="h-3 w-3 text-success shrink-0" />
              ) : (
                <Upload className="h-3 w-3 text-muted-foreground/50 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
