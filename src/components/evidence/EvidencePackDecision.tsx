import { Send, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { DecisionTrail, PublicationTrail } from '@/types/case';

interface EvidencePackDecisionProps {
  decision?: DecisionTrail;
  publication?: PublicationTrail;
}

export function EvidencePackDecision({ decision, publication }: EvidencePackDecisionProps) {
  if (!decision && !publication) {
    return (
      <p className="text-[13px] text-muted-foreground italic">
        No decision recorded yet. Approve or reject the request to record a decision here.
      </p>
    );
  }

  const approved = decision?.outcome === 'Approved';

  return (
    <div className="space-y-3">
      {decision && (
        <div className="border border-border rounded-md p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={approved ? 'success' : 'critical'} className="gap-1">
                {approved ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                ) : (
                  <XCircle className="h-3 w-3" aria-hidden />
                )}
                {decision.outcome}
              </Badge>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success" className="gap-1">
                <Send className="h-3 w-3" aria-hidden /> Sent to insurer
              </Badge>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                {format(publication.at, 'dd MMM yyyy HH:mm')}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              by <span className="font-medium text-foreground">{publication.by || 'System'}</span>
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            This request was sent to the insurer's system.
          </p>
        </div>
      )}
    </div>
  );
}
