import { VerificationPhase, Phase, VerificationStatus } from '@/types/verificationChecks';
import { CheckCircle2, AlertTriangle, XOctagon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PhaseRailProps {
  phases: Phase[];
  activePhase: VerificationPhase | null;
  phaseStatuses: Record<VerificationPhase, VerificationStatus>;
  onPhaseClick: (phase: VerificationPhase | null) => void;
}

const phaseHelperText: Record<VerificationPhase, string> = {
  intake: 'Document ingestion, OCR processing, and completeness checks',
  'source-of-truth': 'Entity license, TRN, and establishment card verification against government sources',
  ownership: 'Ultimate Beneficial Ownership (UBO) analysis and ownership structure review',
  compliance: 'Sanctions screening, PEP checks, and adverse media analysis',
  adjudication: 'Final ops review, workforce reconciliation, and approval decision',
};

const statusIcons: Record<VerificationStatus, typeof CheckCircle2> = {
  pass: CheckCircle2,
  review: AlertTriangle,
  fail: XOctagon,
};

export function PhaseRail({ phases, activePhase, phaseStatuses, onPhaseClick }: PhaseRailProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Verification Phases</h3>
        </div>

        {/* "All Checks" option */}
        <button
          onClick={() => onPhaseClick(null)}
          className={cn(
            'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-3',
            activePhase === null
              ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20'
              : 'bg-muted/50 border border-border hover:bg-muted hover:border-muted-foreground/30'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0',
            activePhase === null
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-muted-foreground/20 text-muted-foreground'
          )}>
            ∑
          </div>
          <span className={cn(
            'flex-1 font-medium truncate',
            activePhase === null && 'text-primary-foreground'
          )}>
            All Checks
          </span>
        </button>

        <div className="flex flex-col gap-1.5">
          {phases.map((phase, index) => {
            const isActive = activePhase === phase.id;
            const status = phaseStatuses[phase.id];
            const StatusIcon = statusIcons[status];

            return (
              <div key={phase.id} className="relative">
                {/* Connector line */}
                {index < phases.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-[0.9rem] top-[2.5rem] w-0.5 h-3 -translate-x-1/2 z-0',
                      status === 'pass' ? 'bg-success/50' : status === 'review' ? 'bg-warning/50' : 'bg-destructive/50'
                    )}
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group',
                        isActive && 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20',
                        !isActive && status === 'pass' && 'bg-success/10 border border-success/30 hover:bg-success/20',
                        !isActive && status === 'review' && 'bg-warning/10 border border-warning/30 hover:bg-warning/20',
                        !isActive && status === 'fail' && 'bg-destructive/10 border border-destructive/30 hover:bg-destructive/20',
                      )}
                      onClick={() => onPhaseClick(phase.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onPhaseClick(phase.id)}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0',
                        isActive && 'bg-primary-foreground/20 text-primary-foreground',
                        !isActive && status === 'pass' && 'bg-success text-success-foreground',
                        !isActive && status === 'review' && 'bg-warning text-warning-foreground',
                        !isActive && status === 'fail' && 'bg-destructive text-destructive-foreground',
                      )}>
                        <StatusIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          isActive && 'text-primary-foreground'
                        )}>
                          {phase.label}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 transition-transform shrink-0',
                        isActive ? 'text-primary-foreground rotate-90' : 'text-muted-foreground group-hover:translate-x-0.5'
                      )} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px]">
                    <p className="text-xs">{phaseHelperText[phase.id]}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
