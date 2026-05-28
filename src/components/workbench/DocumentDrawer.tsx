import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { HighlightedPdfViewer } from '@/components/case/HighlightedPdfViewer';
import { ExtractedDataPanel } from '@/components/case/ExtractedDataPanel';
import { ExtractionDiffDialog } from '@/components/case/ExtractionDiffDialog';
import { Document, DocDef, ExtractedDataSection } from '@/types/case';
import { BrainCircuit, Sparkles, GitCompare, AlertCircle, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  docDef?: DocDef;
  priorVersion?: Document | null;
  onReextract?: (docId: string, additionalPrompt?: string) => Promise<void>;
}

const DEFAULT_HINTS = [
  'Check for stamps/signatures',
  'Find specific dates',
  'Look on last page',
  'Verify numeric values',
];

/** Build the extracted-field sections for one document (schema keys if configured, else all). */
function buildSections(document: Document | null, docDef?: DocDef): ExtractedDataSection[] {
  if (!document) return [];
  if (document.status === 'failed') {
    return [{
      title: `Extraction Failed: ${document.name}`,
      fields: [{
        label: 'Error',
        value: 'The AI agent could not process this document. Check your S3 credentials and bucket configuration.',
        confidence: 0, status: 'pending', documentId: document.id,
      }],
    }];
  }
  const standardKeys = docDef?.extraction_keys || [];
  const extraction = document.extraction?.data || {};
  const keys: string[] = standardKeys.length > 0 ? standardKeys : Object.keys(extraction);
  return [{
    title: docDef?.name || document.type.replace(/-/g, ' '),
    fields: keys.map(key => {
      const entry = extraction[key];
      const isWrapped = entry && typeof entry === 'object' && !Array.isArray(entry) && 'value' in (entry as any);
      const rawValue = isWrapped ? (entry as any).value : entry;
      const confidence = isWrapped ? ((entry as any).confidence || 0) : (rawValue ? 90 : 0);
      const hasValue = rawValue !== null && rawValue !== undefined && !(typeof rawValue === 'string' && rawValue.trim() === '');
      return {
        label: key,
        value: rawValue ?? null,
        confidence: confidence > 1 ? confidence : confidence * 100,
        status: (hasValue ? 'needs-review' : 'pending') as 'verified' | 'pending' | 'needs-review',
        documentId: document.id,
      };
    }),
  }];
}

/**
 * On-demand document viewer drawer: PDF + extracted-data split with click-to-locate
 * highlighting, plus Re-extract and Compare-versions. Relocated out of the always-on
 * right pane so the workbench can be a single vertical flow.
 */
export function DocumentDrawer({ open, onOpenChange, document, docDef, priorVersion, onReextract }: DocumentDrawerProps) {
  const [reextractPrompt, setReextractPrompt] = React.useState('');
  const [isReextractDialogOpen, setIsReextractDialogOpen] = React.useState(false);
  const [highlightText, setHighlightText] = React.useState<string | null>(null);
  const [activeFieldKey, setActiveFieldKey] = React.useState<string | null>(null);
  const [showDiffDialog, setShowDiffDialog] = React.useState(false);

  React.useEffect(() => {
    setHighlightText(null);
    setActiveFieldKey(null);
  }, [document?.id]);

  const sections = React.useMemo(() => buildSections(document, docDef), [document, docDef]);
  const hints = (docDef?.hints?.length ? docDef.hints : null) || DEFAULT_HINTS;
  const isPdf = !!document && /\.pdf($|\?)/i.test(document.name || document.url || '');
  const showSplit = isPdf && document?.status !== 'failed' && sections.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[70vw] p-0 flex flex-col gap-0">
        <div className="h-12 px-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-foreground truncate">{document?.name || 'Document'}</h3>
          <div className="flex items-center gap-1.5">
            {document && priorVersion && (
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setShowDiffDialog(true)}>
                <GitCompare className="h-3 w-3" />
                Compare versions
              </Button>
            )}
            {document && onReextract && (
              <Dialog open={isReextractDialogOpen} onOpenChange={setIsReextractDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <BrainCircuit className="h-3 w-3" />
                    Re-extract
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[460px]">
                  <DialogHeader>
                    <DialogTitle>Refine AI extraction</DialogTitle>
                    <DialogDescription>Give the AI specific pointers to help it locate missing values.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="prompt" className="text-xs">Additional instruction</Label>
                      <Textarea
                        id="prompt" rows={4}
                        placeholder="e.g. Look for the Registration No on page 2, bottom left corner…"
                        value={reextractPrompt}
                        onChange={(e) => setReextractPrompt(e.target.value)}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Quick hints</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {hints.map(hint => (
                          <button key={hint}
                            onClick={() => setReextractPrompt(prev => (prev ? `${prev}, ${hint}` : hint))}
                            className="text-xs bg-muted hover:bg-primary/10 hover:text-primary border border-border rounded-md px-2 py-1 transition-colors">
                            + {hint}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsReextractDialogOpen(false)}>Cancel</Button>
                    <Button
                      disabled={!document}
                      onClick={async () => {
                        if (document && onReextract) {
                          await onReextract(document.id, reextractPrompt);
                          setIsReextractDialogOpen(false);
                          setReextractPrompt('');
                        }
                      }}
                      className="gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Run extraction
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {document?.url && (
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" asChild>
                <a href={document.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  Open in new tab
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {!document ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No document selected</div>
          ) : document.status === 'failed' ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Extraction failed</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                The AI could not confidently extract data from this document. Try Re-extract with specific pointers.
              </p>
            </div>
          ) : showSplit ? (
            <div className="h-full flex overflow-hidden">
              <div className="flex-1 min-w-0 border-r border-border">
                <HighlightedPdfViewer
                  url={document.proxyUrl || document.url!}
                  externalUrl={document.url}
                  fileName={document.name}
                  highlightText={highlightText}
                />
              </div>
              <div className="w-[340px] xl:w-[400px] shrink-0 overflow-y-auto">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Click a field to locate it on the page
                  </p>
                  <ExtractedDataPanel
                    sections={sections}
                    isCompact
                    activeFieldKey={activeFieldKey}
                    onFieldClick={(field) => {
                      const value = field.value == null ? '' : String(field.value);
                      if (!value) return;
                      setHighlightText(value);
                      setActiveFieldKey(`${field.documentId}-${field.label}`);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-5 py-4">
              <ExtractedDataPanel sections={sections} isCompact />
            </div>
          )}
        </div>

        <ExtractionDiffDialog
          open={showDiffDialog}
          onOpenChange={setShowDiffDialog}
          previous={priorVersion || undefined}
          current={document || undefined}
        />
      </SheetContent>
    </Sheet>
  );
}
