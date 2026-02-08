import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { VerificationCheck } from '@/types/verificationChecks';
import { CheckCircle2, AlertTriangle, XOctagon, Clock, FileText, Database, Server } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EvidenceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  check: VerificationCheck | null;
}

export function EvidenceDrawer({ open, onOpenChange, check }: EvidenceDrawerProps) {
  if (!check) return null;

  const evidence = check.evidence;
  const StatusIcon = check.status === 'pass' ? CheckCircle2 : check.status === 'review' ? AlertTriangle : XOctagon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              check.status === 'pass' && 'bg-success text-success-foreground',
              check.status === 'review' && 'bg-warning text-warning-foreground',
              check.status === 'fail' && 'bg-destructive text-destructive-foreground',
            )}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-left">{check.name}</SheetTitle>
              <SheetDescription className="text-left">
                {check.resultText}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-2">
          {/* Status & Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  check.status === 'pass' && 'border-success/40 text-success',
                  check.status === 'review' && 'border-warning/40 text-warning-foreground',
                  check.status === 'fail' && 'border-destructive/40 text-destructive',
                )}
              >
                {check.status === 'pass' ? 'Pass' : check.status === 'review' ? 'Needs Review' : 'Hard Stop'}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Source</p>
              <span className="text-sm font-medium">{check.source}</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Timestamp</p>
            <span className="text-sm flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {format(check.timestamp, 'dd MMM yyyy, HH:mm:ss')}
            </span>
          </div>

          <Separator />

          {evidence && (
            <>
              {/* Source System */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Server className="h-3 w-3" />
                  Source System
                </p>
                <span className="text-sm font-medium">{evidence.sourceSystem}</span>
              </div>

              {/* Reference ID */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Database className="h-3 w-3" />
                  Reference ID
                </p>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{evidence.referenceId}</code>
              </div>

              {/* Extracted Snippet */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Extracted Snippet</p>
                <div className="bg-muted/60 border border-border rounded-lg p-3">
                  <p className="text-sm leading-relaxed">{evidence.extractedSnippet}</p>
                </div>
              </div>

              <Separator />

              {/* Linked Document */}
              {evidence.linkedDocument && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Linked Document
                  </p>
                  <span className="text-sm font-medium">{evidence.linkedDocument}</span>
                </div>
              )}

              {/* Linked Field */}
              {evidence.linkedField && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Linked Data Field</p>
                  <Badge variant="outline" className="text-xs">{evidence.linkedField}</Badge>
                </div>
              )}
            </>
          )}

          {!evidence && (
            <div className="text-center py-8">
              <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No detailed evidence available for this check</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
