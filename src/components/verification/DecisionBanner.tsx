import { OverallDecision } from '@/types/verificationChecks';
import { ShieldCheck, AlertTriangle, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DecisionBannerProps {
  decision: OverallDecision;
}

const decisionConfig: Record<OverallDecision, {
  icon: typeof ShieldCheck;
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  iconBgClass: string;
}> = {
  approvable: {
    icon: ShieldCheck,
    label: 'APPROVABLE',
    description: 'All verification checks passed. This request can proceed to approval.',
    bgClass: 'bg-success/10',
    textClass: 'text-success',
    borderClass: 'border-success/40',
    iconBgClass: 'bg-success text-success-foreground',
  },
  'requires-review': {
    icon: AlertTriangle,
    label: 'REQUIRES REVIEW',
    description: 'One or more checks require human review before this request can be approved.',
    bgClass: 'bg-warning/10',
    textClass: 'text-warning-foreground',
    borderClass: 'border-warning/40',
    iconBgClass: 'bg-warning text-warning-foreground',
  },
  blocked: {
    icon: ShieldX,
    label: 'BLOCKED — HARD STOP',
    description: 'Critical verification failure detected. This request cannot proceed without resolution.',
    bgClass: 'bg-destructive/10',
    textClass: 'text-destructive',
    borderClass: 'border-destructive/40',
    iconBgClass: 'bg-destructive text-destructive-foreground',
  },
};

export function DecisionBanner({ decision }: DecisionBannerProps) {
  const config = decisionConfig[decision];
  const Icon = config.icon;

  return (
    <div className={cn(
      'rounded-xl border-2 p-4 flex items-center gap-4',
      config.bgClass,
      config.borderClass,
    )}>
      <div className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center shrink-0',
        config.iconBgClass,
      )}>
        <Icon className="h-5.5 w-5.5" />
      </div>
      <div>
        <h3 className={cn('font-bold text-base tracking-wide', config.textClass)}>
          {config.label}
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
      </div>
    </div>
  );
}
