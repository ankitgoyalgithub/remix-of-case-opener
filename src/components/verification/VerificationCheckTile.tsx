import { VerificationCheck, VerificationStatus } from '@/types/verificationChecks';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XOctagon, Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VerificationCheckTileProps {
  check: VerificationCheck;
  onViewEvidence: (check: VerificationCheck) => void;
}

const statusConfig: Record<VerificationStatus, {
  icon: typeof CheckCircle2;
  label: string;
  dotClass: string;
  borderClass: string;
  bgClass: string;
}> = {
  pass: {
    icon: CheckCircle2,
    label: 'Pass',
    dotClass: 'bg-success text-success-foreground',
    borderClass: 'border-success/30',
    bgClass: 'bg-success/5',
  },
  review: {
    icon: AlertTriangle,
    label: 'Review',
    dotClass: 'bg-warning text-warning-foreground',
    borderClass: 'border-warning/30',
    bgClass: 'bg-warning/5',
  },
  fail: {
    icon: XOctagon,
    label: 'Hard Stop',
    dotClass: 'bg-destructive text-destructive-foreground',
    borderClass: 'border-destructive/30',
    bgClass: 'bg-destructive/5',
  },
};

export function VerificationCheckTile({ check, onViewEvidence }: VerificationCheckTileProps) {
  const config = statusConfig[check.status];
  const Icon = config.icon;

  return (
    <Card className={cn('transition-colors', config.borderClass, config.bgClass)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
            config.dotClass
          )}>
            <Icon className="h-4.5 w-4.5" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{check.name}</h4>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  check.status === 'pass' && 'border-success/40 text-success',
                  check.status === 'review' && 'border-warning/40 text-warning-foreground',
                  check.status === 'fail' && 'border-destructive/40 text-destructive',
                )}
              >
                {config.label}
              </Badge>
            </div>

            <p className="text-sm text-foreground">{check.resultText}</p>

            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                Source: <span className="font-medium">{check.source}</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(check.timestamp, 'dd MMM yyyy, HH:mm')}
              </span>
            </div>
          </div>

          {/* Action */}
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onViewEvidence(check)}
          >
            <Eye className="h-3.5 w-3.5" />
            View Evidence
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
