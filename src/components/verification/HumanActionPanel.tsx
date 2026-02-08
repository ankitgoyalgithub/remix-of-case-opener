import { VerificationCheck } from '@/types/verificationChecks';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HumanActionPanelProps {
  checks: VerificationCheck[];
  onViewEvidence: (check: VerificationCheck) => void;
}

export function HumanActionPanel({ checks, onViewEvidence }: HumanActionPanelProps) {
  const actionItems = checks.filter(c => c.actionRequired);

  if (actionItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <h4 className="font-semibold text-sm">What Needs Human Action</h4>
        <span className="text-xs text-muted-foreground ml-auto">
          {actionItems.length} item{actionItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ul className="space-y-2">
        {actionItems.map(check => (
          <li key={check.id} className="flex items-center gap-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
            <span className="text-sm flex-1">{check.actionRequired}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => onViewEvidence(check)}
            >
              View
              <ArrowRight className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
