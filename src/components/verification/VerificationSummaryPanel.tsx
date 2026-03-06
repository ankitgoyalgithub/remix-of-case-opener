import { useState } from 'react';
import { VerificationCheck, VerificationPhase, PHASES, getOverallDecision, getPhaseStatus } from '@/types/verificationChecks';
import { DecisionBanner } from './DecisionBanner';
import { VerificationCheckTile } from './VerificationCheckTile';
import { HumanActionPanel } from './HumanActionPanel';
import { EvidenceDrawer } from './EvidenceDrawer';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface VerificationSummaryPanelProps {
  checks: VerificationCheck[];
  activePhase: VerificationPhase | null;
  isCompact?: boolean;
}

export function VerificationSummaryPanel({ checks, activePhase, isCompact }: VerificationSummaryPanelProps) {
  const [evidenceCheck, setEvidenceCheck] = useState<VerificationCheck | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const decision = getOverallDecision(checks);

  const displayedChecks = activePhase
    ? checks.filter(c => c.phase === activePhase)
    : checks;

  const handleViewEvidence = (check: VerificationCheck) => {
    setEvidenceCheck(check);
    setEvidenceOpen(true);
  };

  const activePhaseLabel = activePhase
    ? PHASES.find(p => p.id === activePhase)?.label
    : null;

  return (
    <div className={cn("space-y-5", isCompact && "space-y-3")}>
      {/* Decision Banner - always visible */}
      {!isCompact && <DecisionBanner decision={decision} />}

      {/* Phase scope indicator */}
      {activePhaseLabel && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Scope:
          </Label>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{activePhaseLabel}</Badge>
        </div>
      )}

      {/* Check Tiles */}
      <div className={cn("space-y-3", isCompact && "space-y-2")}>
        {displayedChecks.map(check => (
          <VerificationCheckTile
            key={check.id}
            check={check}
            onViewEvidence={handleViewEvidence}
          />
        ))}

        {displayedChecks.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg">
            No verification checks for this phase
          </div>
        )}
      </div>

      {/* Human Action Panel */}
      {!isCompact && (
        <HumanActionPanel
          checks={displayedChecks}
          onViewEvidence={handleViewEvidence}
        />
      )}

      {/* Evidence Drawer */}
      <EvidenceDrawer
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        check={evidenceCheck}
      />
    </div>
  );
}
