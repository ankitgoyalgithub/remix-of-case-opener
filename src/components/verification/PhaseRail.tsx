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

const sequentialStages = [
  { id: 1, label: 'Prospecting', order: 1 },
  { id: 2, label: 'KYC & AML', order: 2 },
  { id: 3, label: 'Data Collection', order: 3 },
  { id: 4, label: 'Risk Assessment', order: 4 },
  { id: 5, label: 'Quoting', order: 5 },
  { id: 6, label: 'Selection', order: 6 },
  { id: 7, label: 'Underwriting', order: 7 },
  { id: 8, label: 'Payment', order: 8 },
  { id: 9, label: 'Issuance', order: 9 },
];

const stageHelperText: Record<number, string> = {
  1: 'Initial lead and basic company info',
  2: 'Identity and anti-money laundering checks',
  3: 'Gathering required legal and census documents',
  4: 'Deep analysis of medical and workforce data',
  5: 'Premium generation from insurers',
  6: 'Customer plan choice',
  7: 'Professional risk evaluation',
  8: 'Premium collection',
  9: 'Policy delivery',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  complete: CheckCircle2,
  active: AlertTriangle,
  pending: XOctagon,
};

export function PhaseRail({ activePhase: activeStageId, onPhaseClick: onStageClick, requestData }: { activePhase: number | null, onPhaseClick: (id: number | null) => void, requestData: any }) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase">Operational Sequence</h3>
        </div>

        {/* "Full Timeline" option */}
        <button
          onClick={() => onStageClick(null)}
          className={cn(
            'w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-300 flex items-center gap-3',
            activeStageId === null
              ? 'bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.05)] text-primary'
              : 'bg-muted/30 border border-transparent hover:bg-muted/50 text-muted-foreground'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black shrink-0',
            activeStageId === null ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
          )}>
            ALL
          </div>
          <span className="flex-1 font-bold uppercase tracking-wider">Complete View</span>
        </button>

        <div className="flex flex-col gap-1.5">
          {sequentialStages.map((stage, index) => {
            const isActive = activeStageId === stage.id;
            const stageInstance = requestData.stages.find((s: any) => (s.id === stage.id || s.instanceId === stage.id));
            const status = stageInstance?.status || 'pending';
            const StatusIcon = statusIcons[status] || XOctagon;

            return (
              <div key={stage.id} className="relative">
                {index < sequentialStages.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-[1.125rem] top-[2.5rem] w-[1px] h-3 -translate-x-1/2 z-0',
                      status === 'complete' ? 'bg-success/50' : 'bg-border/40'
                    )}
                  />
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 group',
                        isActive && 'bg-background border border-primary/40 shadow-xl ring-1 ring-primary/10 text-foreground',
                        !isActive && status === 'complete' && 'bg-success/5 border border-success/20 hover:bg-success/10 text-foreground/90',
                        !isActive && status === 'active' && 'bg-primary/5 border border-primary/20 hover:bg-primary/10 text-foreground/90',
                        !isActive && status === 'pending' && 'bg-muted/20 border border-transparent hover:bg-muted/40 text-muted-foreground/80',
                      )}
                      onClick={() => onStageClick(stage.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && onStageClick(stage.id)}
                    >
                      <div className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-lg text-xs font-semibold shrink-0 transition-colors',
                        isActive && 'bg-primary text-white shadow-lg shadow-primary/20',
                        !isActive && status === 'complete' && 'bg-success text-white',
                        !isActive && status === 'active' && 'bg-primary text-white',
                        !isActive && status === 'pending' && 'bg-muted text-muted-foreground',
                      )}>
                        {isActive ? <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> : <StatusIcon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-[10px] font-black uppercase tracking-widest truncate',
                          isActive ? 'text-primary' : (status === 'complete' ? 'text-success/80' : 'text-muted-foreground')
                        )}>
                          {stage.label}
                        </p>
                      </div>
                      <ChevronRight className={cn(
                        'h-3.5 w-3.5 transition-transform shrink-0',
                        isActive ? 'text-primary rotate-90' : 'text-muted-foreground/30 group-hover:translate-x-0.5'
                      )} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[220px] rounded-xl border-border/50 shadow-xl bg-card">
                    <p className="text-[10px] font-medium leading-relaxed">{stageHelperText[stage.id]}</p>
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
