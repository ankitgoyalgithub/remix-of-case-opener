import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelinePanel } from './TimelinePanel';
import { TimelineEvent } from '@/types/case';
import { History } from 'lucide-react';

interface TimelineDrawerProps {
  events: TimelineEvent[];
}

export function TimelineDrawer({ events }: TimelineDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          View Timeline
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 sm:w-96 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Timeline
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div className="p-4">
            <TimelinePanel events={events} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
