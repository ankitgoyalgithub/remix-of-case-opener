import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';
import { CaseData } from '@/types/case';

interface EvidencePackOverridesProps {
  workforceMismatch: CaseData['workforceMismatch'];
}

export function EvidencePackOverrides({ workforceMismatch }: EvidencePackOverridesProps) {
  const hasOverrides = workforceMismatch.detected && workforceMismatch.accepted;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          Override Reasons
          {hasOverrides && (
            <Badge className="ml-2 bg-warning/20 text-warning-foreground border-0 text-xs">
              1 Override Applied
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasOverrides ? (
          <div className="space-y-3">
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Workforce Mismatch Override</h4>
                    <Badge className="bg-success/20 text-success border-0 text-xs gap-1">
                      <Check className="h-3 w-3" />
                      Accepted
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    MOL shows {workforceMismatch.molCount} employees, Census has {workforceMismatch.censusCount} members.
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Overridden by:</span>
                      <span className="font-medium">Sarah Ahmed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Override time:</span>
                      <span className="font-medium">{format(new Date(), 'dd MMM yyyy HH:mm')}</span>
                    </div>
                  </div>
                  
                  {workforceMismatch.acceptReason && (
                    <div className="mt-3 p-3 bg-background rounded border border-border">
                      <p className="text-xs text-muted-foreground mb-1">Reason for acceptance:</p>
                      <p className="text-sm italic">"{workforceMismatch.acceptReason}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Check className="h-10 w-10 text-success/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No overrides were applied during this request.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              All validations passed without manual intervention.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
