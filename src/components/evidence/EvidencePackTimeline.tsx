import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { TimelineEvent } from '@/types/case';

interface EvidencePackTimelineProps {
  timeline: TimelineEvent[];
}

export function EvidencePackTimeline({ timeline }: EvidencePackTimelineProps) {
  // Sort timeline in chronological order
  const sortedTimeline = [...timeline].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Full Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
          
          <div className="space-y-4">
            {sortedTimeline.map((event, index) => (
              <div key={event.id} className="flex items-start gap-4 relative">
                {/* Timeline dot */}
                <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex-shrink-0 z-10 mt-0.5" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(event.timestamp, 'dd MMM HH:mm')}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-sm font-medium">{event.action}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{event.user}</span>
                    {event.details && (
                      <>
                        <span>•</span>
                        <span className="truncate">{event.details}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
