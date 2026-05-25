import { Send, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DecisionTrail, PublicationTrail } from '@/types/case';

interface EvidencePackDecisionProps {
  decision?: DecisionTrail;
  publication?: PublicationTrail;
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: 'success' | 'danger' | 'primary' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 h-5 rounded text-[11px] font-semibold',
      tone === 'success' && 'bg-success/12 text-success',
      tone === 'danger' && 'bg-destructive/12 text-destructive',
      tone === 'primary' && 'bg-primary/12 text-primary',
    )}>
      {children}
    </span>
  );
}

export function EvidencePackDecision({ decision, publication }: EvidencePackDecisionProps) {
  if (!decision && !publication) {
    return (
      <p className="text-[13px] text-muted-foreground italic">
        No decision recorded yet. Approve or reject the request from the header to log a decision.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {decision && (
        <div className="border border-border rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <StatusPill tone={decision.outcome === 'Approved' ? 'success' : 'danger'}>
                {decision.outcome}
              </StatusPill>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(decision.at, 'dd MMM yyyy HH:mm')}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              by <span className="font-medium text-foreground">{decision.by || 'System'}</span>
            </span>
          </div>
          {decision.comment && (
            <p className="text-[13px] text-foreground whitespace-pre-line">{decision.comment}</p>
          )}
        </div>
      )}

      {publication && (
        <div className="border border-border rounded-md p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusPill tone="primary"><Send className="h-3 w-3" /> Published</StatusPill>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(publication.at, 'dd MMM yyyy HH:mm')}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              by <span className="font-medium text-foreground">{publication.by || 'System'}</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Data pushed to the core policy system.
          </p>
        </div>
      )}
    </div>
  );
}
