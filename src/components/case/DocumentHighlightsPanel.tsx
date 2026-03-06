import { Document, DocumentHighlight, DocDef, CrossValidationRule } from '@/types/case';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X,
  FileText,
  Sparkles,
  ArrowRight,
  FileSearch,
  Database,
  Eye,
  LayoutList,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

interface DocumentHighlightsPanelProps {
  document: Document;
  docDef?: DocDef;
  onClose: () => void;
}

export function DocumentHighlightsPanel({ document, docDef, onClose }: DocumentHighlightsPanelProps) {
  const [view, setView] = useState<'highlights' | 'preview' | 'rules'>('preview'); // Default to preview
  const hasHighlights = document.highlights && document.highlights.length > 0;
  const hasRules = !!docDef?.cross_validation_rules?.length;

  const isImage = document.url?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/i);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0 bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate max-w-[200px]">{document.name}</h3>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {document.type.replace(/-/g, ' ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex bg-muted rounded-md p-0.5 mr-2">
            <Button
              variant={view === 'preview' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-[10px] gap-1.5"
              onClick={() => setView('preview')}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button
              variant={view === 'highlights' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-[10px] gap-1.5"
              onClick={() => setView('highlights')}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Extraction
            </Button>
            {hasRules && (
              <Button
                variant={view === 'rules' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-[10px] gap-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                onClick={() => setView('rules')}
              >
                <Database className="h-3.5 w-3.5" />
                Rules config
              </Button>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'preview' ? (
          <div className="flex-1 bg-muted/30 relative overflow-hidden flex flex-col h-full">
            {document.url ? (
              <>
                {isImage ? (
                  <div className="w-full h-full flex items-center justify-center p-4">
                    <img
                      src={document.url}
                      alt={document.name}
                      className="max-w-full max-h-full object-contain shadow-lg rounded-sm bg-white"
                    />
                  </div>
                ) : (
                  <iframe
                    src={`${document.url}#toolbar=0&view=FitH`}
                    className="w-full h-full border-0 bg-white"
                    title="Document Preview"
                  />
                )}

                {/* Float overlay for actual open */}
                <div className="absolute bottom-4 right-4">
                  <Button size="sm" variant="secondary" className="shadow-lg h-8 gap-1.5" asChild>
                    <a href={document.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Full View
                    </a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                <FileSearch className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <p className="text-sm font-medium">Link not found</p>
              </div>
            )}
          </div>
        ) : view === 'highlights' ? (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* Highlights List */}
            {hasHighlights ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Database className="h-3 w-3 text-primary" />
                    AI Extraction Audit
                  </p>
                  <Badge className="bg-success/15 text-success border-0 text-[10px] font-bold">
                    {document.highlights?.length} FIELDS
                  </Badge>
                </div>
                {document.highlights!.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-background border border-border/40 rounded-xl hover:shadow-md hover:border-primary/20 transition-all group"
                  >
                    <div className="w-1 h-8 rounded-full bg-primary/20 group-hover:bg-primary transition-colors mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{highlight.label}</span>
                        {highlight.page && (
                          <span className="text-[10px] text-muted-foreground/60 p-0.5 px-1.5 bg-muted rounded leading-none italic font-medium">Page {highlight.page}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {highlight.value || <span className="italic opacity-50 font-normal text-xs">No value detected</span>}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/20 mt-1.5 group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center opacity-70">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground/30 font-thin" />
                </div>
                <p className="text-sm font-medium text-foreground">Awaiting AI Audit</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px] mx-auto">
                  Highlights will appear here once the intelligence engine finishes processing this document.
                </p>
              </div>
            )}
          </div>
        ) : view === 'rules' && docDef?.cross_validation_rules ? (
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-orange-500/5">
            <div className="space-y-4">
              <div className="flex flex-col mb-4">
                <p className="text-[11px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-2">
                  <Database className="h-3 w-3 text-orange-500" />
                  Cross Validation Configuration
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This document is configured with automatic relational validation checks against other documents in the workflow.
                </p>
              </div>

              {docDef.cross_validation_rules.map((rule, index) => (
                <div key={index} className="flex flex-col gap-2 p-4 bg-background border border-orange-500/20 rounded-xl hover:border-orange-500/40 transition-all shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-none text-[10px] uppercase font-black tracking-wider px-2 py-0">
                      {rule.comparison_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Source Field</p>
                      <p className="text-sm font-semibold truncate text-primary">{rule.source_field.replace(/_/g, ' ')}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-0.5">Target Field ({rule.target_document_type})</p>
                      <p className="text-sm font-semibold truncate text-orange-600 group-hover:text-orange-500">{rule.target_field.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
