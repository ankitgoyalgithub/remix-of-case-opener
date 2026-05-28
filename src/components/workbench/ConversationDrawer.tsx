import { useEffect, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { ConversationPanel, type InboundEmail } from '@/components/request/ConversationPanel';
import { api } from '@/lib/api';

interface ConversationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  /** Opens the existing "request missing info" email composer. */
  onCompose: () => void;
}

/**
 * Right-side "Conversation with broker" drawer. Read-only inbound thread for this
 * request; outbound is handled by the existing MissingInfoEmailModal via onCompose
 * (the backend has no free-text send endpoint yet).
 */
export function ConversationDrawer({ open, onOpenChange, requestId, onCompose }: ConversationDrawerProps) {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api.inboundEmail.emails.list()
      .then((all: any[]) => {
        if (cancelled) return;
        const mine = (all || []).filter(
          (e) => String(e.created_request ?? '').toLowerCase() === String(requestId).toLowerCase(),
        );
        setEmails(mine);
      })
      .catch(() => { if (!cancelled) setEmails([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, requestId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Conversation with broker
          </SheetTitle>
          <SheetDescription className="text-xs">
            Inbound emails linked to this request.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
          ) : emails.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No broker emails linked to this request yet.
            </p>
          ) : (
            <ConversationPanel emails={emails} />
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t border-border">
          <Button className="w-full gap-1.5" onClick={onCompose}>
            <Mail className="h-3.5 w-3.5" />
            Compose request
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
