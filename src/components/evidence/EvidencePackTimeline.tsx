import { format } from 'date-fns';
import { TimelineEvent } from '@/types/case';

interface EvidencePackTimelineProps {
  timeline: TimelineEvent[];
}

export function EvidencePackTimeline({ timeline }: EvidencePackTimelineProps) {
  const sorted = [...timeline].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  if (sorted.length === 0) {
    return <p className="text-[13px] text-muted-foreground italic">No activity recorded.</p>;
  }

  return (
    <div className="border border-border rounded-md divide-y divide-border">
      {sorted.map(event => (
        <div key={event.id} className="grid grid-cols-[110px_minmax(0,1fr)_140px] gap-3 px-3 py-2 text-[13px] items-baseline">
          <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
            {format(event.timestamp, 'dd MMM HH:mm')}
          </span>
          <div className="min-w-0">
            <div className="font-medium text-foreground">{event.action}</div>
            {event.details && (
              <div className="text-[11px] text-muted-foreground truncate">{event.details}</div>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground truncate text-right">{event.user}</span>
        </div>
      ))}
    </div>
  );
}
