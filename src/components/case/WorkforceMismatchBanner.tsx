import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface WorkforceMismatchBannerProps {
  molCount: number;
  censusCount: number;
  accepted: boolean;
  acceptReason?: string;
  onAccept: (reason: string) => void;
}

export function WorkforceMismatchBanner({ 
  molCount, 
  censusCount, 
  accepted,
  acceptReason,
  onAccept 
}: WorkforceMismatchBannerProps) {
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [reason, setReason] = useState(acceptReason || '');
  const [checkboxChecked, setCheckboxChecked] = useState(accepted);

  const handleAccept = () => {
    if (checkboxChecked && reason.trim()) {
      onAccept(reason);
    }
  };

  if (accepted) {
    return (
      <div className="bg-success/10 border border-success/30 rounded-lg p-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <Check className="h-5 w-5 text-success mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success">Discrepancy Accepted</p>
            <p className="text-sm text-muted-foreground mt-1">
              MOL shows {molCount} employees, Census has {censusCount} members.
            </p>
            {acceptReason && (
              <p className="text-sm mt-2 text-foreground/80 italic">
                Reason: "{acceptReason}"
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-warning/10 border border-warning/40 rounded-lg p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning-foreground">
            Workforce Mismatch Detected
          </p>
          <p className="text-sm text-foreground mt-1">
            MOL shows <span className="font-semibold">{molCount}</span> employees, but Census has only <span className="font-semibold">{censusCount}</span> members.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This discrepancy must be resolved or accepted before proceeding.
          </p>

          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="accept-discrepancy"
                checked={checkboxChecked}
                onCheckedChange={(checked) => {
                  setCheckboxChecked(checked === true);
                  if (checked) {
                    setShowReasonInput(true);
                  }
                }}
              />
              <label 
                htmlFor="accept-discrepancy" 
                className="text-sm font-medium cursor-pointer"
              >
                Accept discrepancy and proceed
              </label>
            </div>

            {showReasonInput && (
              <div className="space-y-2 animate-fade-in">
                <Textarea 
                  placeholder="Please provide a reason for accepting this discrepancy..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="text-sm min-h-[80px] bg-background"
                />
                <Button 
                  size="sm"
                  onClick={handleAccept}
                  disabled={!checkboxChecked || !reason.trim()}
                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                >
                  Confirm & Accept
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
