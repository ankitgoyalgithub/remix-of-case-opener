import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlaRiskNotificationProps {
  amberCount: number;
  redCount: number;
  onClick?: () => void;
}

export function SlaRiskNotification({ amberCount, redCount, onClick }: SlaRiskNotificationProps) {
  const total = amberCount + redCount;
  
  if (total === 0) return null;
  
  const hasRed = redCount > 0;
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
        hasRed 
          ? "bg-destructive/10 text-destructive hover:bg-destructive/20" 
          : "bg-warning/10 text-warning hover:bg-warning/20"
      )}
    >
      {hasRed ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Clock className="h-4 w-4" />
      )}
      <span>
        {total} Request{total !== 1 ? 's' : ''} at SLA risk
      </span>
    </button>
  );
}
