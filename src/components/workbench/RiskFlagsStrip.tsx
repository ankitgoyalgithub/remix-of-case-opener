import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AlertTriangle, AlertCircle, ChevronDown, ChevronRight, ArrowRight, ShieldCheck } from 'lucide-react';
import type { RiskFlagSummary } from '@/types/case';
import { severityMeta, bySeverity, type StatusIconName } from '@/lib/status';

interface RiskFlagsStripProps {
  riskFlags: RiskFlagSummary[];
  onJumpToFlag: (flag: RiskFlagSummary) => void;
}

// Non-colour cue icons, looked up by the name `severityMeta` returns.
const SEVERITY_ICONS: Partial<Record<StatusIconName, typeof AlertTriangle>> = {
  AlertTriangle, AlertCircle,
};

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

  const sorted = [...flags].sort(bySeverity(f => f.severity));

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
          {sorted.map(flag => {
            const sev = severityMeta(flag.severity);
            const SevIcon = sev.icon ? SEVERITY_ICONS[sev.icon] : undefined;
            return (
            <div key={flag.id} className="px-4 py-2.5 flex items-start gap-3">
              <Badge variant={sev.variant} className="gap-1 shrink-0 mt-0.5">
                {SevIcon && <SevIcon className="h-2.5 w-2.5" aria-hidden="true" />}
                {sev.label}
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
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
