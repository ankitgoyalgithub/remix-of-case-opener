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
}

export function VerificationSummaryPanel({ checks, activePhase }: VerificationSummaryPanelProps) {
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
    <div className="space-y-5">
      {/* Decision Banner - always visible */}
      <DecisionBanner decision={decision} />

      {/* Phase scope indicator */}
      {activePhaseLabel && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Showing checks for:
          </Label>
          <Badge variant="secondary" className="text-xs">{activePhaseLabel}</Badge>
        </div>
      )}

      {/* Check Tiles */}
      <div className="space-y-3">
        {displayedChecks.map(check => (
          <VerificationCheckTile
            key={check.id}
            check={check}
            onViewEvidence={handleViewEvidence}
          />
        ))}

        {displayedChecks.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No verification checks for this phase
          </div>
        )}
      </div>

      {/* Human Action Panel */}
      <HumanActionPanel
        checks={displayedChecks}
        onViewEvidence={handleViewEvidence}
      />

      {/* Evidence Drawer */}
      <EvidenceDrawer
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        check={evidenceCheck}
      />
    </div>
  );
}
