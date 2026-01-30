import { TimelineEvent } from '@/types/case';
import { Clock, User, Cpu, FileOutput, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TimelinePanelProps {
  events: TimelineEvent[];
}

export function TimelinePanel({ events }: TimelinePanelProps) {
  const getEventIcon = (action: string, user: string) => {
    if (user === 'System') {
      if (action.toLowerCase().includes('mismatch')) {
        return <AlertCircle className="h-4 w-4 text-warning" />;
      }
      if (action.toLowerCase().includes('export')) {
        return <FileOutput className="h-4 w-4 text-info" />;
      }
      return <Cpu className="h-4 w-4 text-primary" />;
    }
    if (action.toLowerCase().includes('complete') || action.toLowerCase().includes('verified')) {
      return <Check className="h-4 w-4 text-success" />;
    }
    return <User className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Timeline</h3>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {events.slice().reverse().map((event) => (
            <div key={event.id} className="relative pl-8 animate-fade-in">
              <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center">
                {getEventIcon(event.action, event.user)}
              </div>
              
              <div className="bg-card rounded-lg p-3 border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{event.action}</p>
                  <span className="text-xs text-muted-foreground">
                    {format(event.timestamp, 'HH:mm')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={cn(
                    event.user === 'System' ? 'text-primary' : ''
                  )}>
                    {event.user}
                  </span>
                  <span>•</span>
                  <span>{format(event.timestamp, 'dd MMM yyyy')}</span>
                </div>
                {event.details && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {event.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
