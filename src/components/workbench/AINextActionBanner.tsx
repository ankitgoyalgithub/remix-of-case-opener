import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, Mail, ArrowRight, Send, Search } from 'lucide-react';
import type { NextAction } from '@/lib/nextAction';

interface AINextActionBannerProps {
  action: NextAction | null;
  /** Open the broker email composer (used for the "request-info" action). */
  onCompose?: () => void;
  /** Scroll to / browse the relevant stage (used for the "request-info" action). */
  onBrowse?: () => void;
  /** Primary CTA for adjudication / publish actions. */
  onPrimary?: () => void;
}

const TONE = {
  critical: { wrap: 'border-destructive/30 bg-destructive/5', accent: 'text-destructive', dot: 'bg-destructive' },
  warning: { wrap: 'border-warning/30 bg-warning/5', accent: 'text-warning', dot: 'bg-warning' },
  info: { wrap: 'border-info/30 bg-info/5', accent: 'text-info', dot: 'bg-info' },
  success: { wrap: 'border-success/30 bg-success/5', accent: 'text-success', dot: 'bg-success' },
} as const;

/**
 * Prominent "suggested next action" banner shown at the top of the workbench.
 * The action is derived once in `deriveNextAction` so it agrees with the header pill.
 */
export function AINextActionBanner({ action, onCompose, onBrowse, onPrimary }: AINextActionBannerProps) {
  if (!action) return null;
  const tone = TONE[action.tone];

  return (
    <div className={cn('rounded-lg border px-4 py-3 flex items-center gap-4', tone.wrap)}>
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border bg-background/60', tone.accent)}>
        <Sparkles className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', tone.dot)} />
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">
            Next action — suggested by AI
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{action.label}</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {action.kind === 'request-info' && (
          <>
            {onBrowse && (
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onBrowse}>
                <Search className="h-3.5 w-3.5" />
                Browse
              </Button>
            )}
            {onCompose && (
              <Button size="sm" className="h-8 gap-1.5" onClick={onCompose}>
                <Mail className="h-3.5 w-3.5" />
                Compose request
              </Button>
            )}
          </>
        )}
        {action.kind === 'publish' && onPrimary && (
          <Button size="sm" className="h-8 gap-1.5" onClick={onPrimary}>
            <Send className="h-3.5 w-3.5" />
            Publish to insurer
          </Button>
        )}
        {(action.kind === 'adjudicate' || action.kind === 'triage') && onPrimary && (
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onPrimary}>
            Review
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
