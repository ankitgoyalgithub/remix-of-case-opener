import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AlertTriangle, ChevronDown, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';
import type { RiskFlagSummary } from '@/types/case';

interface RiskFlagsStripProps {
  riskFlags: RiskFlagSummary[];
  onJumpToFlag: (flag: RiskFlagSummary) => void;
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function severityClasses(severity: string) {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'high') return 'text-destructive border-destructive/30 bg-destructive/10';
  if (s === 'medium') return 'text-warning border-warning/30 bg-warning/10';
  return 'text-muted-foreground border-border bg-muted/40';
}

/**
 * Expandable strip summarising open risk flags. Collapsed it shows a count and
 * whether any are blocking; expanded it lists each flag with a "Jump to flag"
 * action that scrolls the workbench to the related checklist item.
 */
export function RiskFlagsStrip({ riskFlags, onJumpToFlag }: RiskFlagsStripProps) {
  const [open, setOpen] = useState(false);
  const flags = (riskFlags || []).filter(f => !f.resolved);
  const criticalCount = flags.filter(f => ['critical', 'high'].includes((f.severity || '').toLowerCase())).length;

  if (flags.length === 0) {
    return (
      <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-2.5 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-success" />
        <span className="text-sm font-medium text-success">No open risk flags</span>
      </div>
    );
  }

  const sorted = [...flags].sort(
    (a, b) => (SEVERITY_RANK[(a.severity || '').toLowerCase()] ?? 9) - (SEVERITY_RANK[(b.severity || '').toLowerCase()] ?? 9),
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}
      className="rounded-lg border border-destructive/30 bg-destructive/5 overflow-hidden">
      <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center gap-2.5 text-left hover:bg-destructive/5 transition-colors">
        {open ? <ChevronDown className="h-4 w-4 text-destructive shrink-0" />
              : <ChevronRight className="h-4 w-4 text-destructive shrink-0" />}
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm font-semibold text-destructive">
          {flags.length} open risk flag{flags.length === 1 ? '' : 's'}
        </span>
        {criticalCount > 0 && (
          <span className="text-xs text-destructive/80">
            · {criticalCount} critical, blocking approval
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y divide-destructive/10 border-t border-destructive/15 max-h-[40vh] overflow-y-auto">
          {sorted.map(flag => (
            <div key={flag.id} className="px-4 py-2.5 flex items-start gap-3">
              <Badge variant="outline" className={cn('text-[10px] uppercase font-bold shrink-0 mt-0.5', severityClasses(flag.severity))}>
                {flag.severity}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{flag.title}</p>
                {flag.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{flag.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onJumpToFlag(flag)}
                className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline mt-0.5"
              >
                Jump to flag
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
