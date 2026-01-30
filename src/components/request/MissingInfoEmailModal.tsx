import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Send, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/case';

interface MissingInfoEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  companyName: string;
  brokerEmail: string;
  missingDocuments: DocumentType[];
  onMarkAsSent: () => void;
}

export function MissingInfoEmailModal({
  open,
  onOpenChange,
  requestId,
  companyName,
  brokerEmail,
  missingDocuments,
  onMarkAsSent,
}: MissingInfoEmailModalProps) {
  const defaultSubject = `Missing Documents for Request ${requestId} – ${companyName}`;
  
  const generateEmailBody = () => {
    const missingList = missingDocuments
      .map(doc => `• ${DOCUMENT_TYPE_LABELS[doc]}`)
      .join('\n');
    
    return `Dear Team,

We are processing the SME Health Policy issuance request for ${companyName} (Request ID: ${requestId}).

To proceed with the issuance, we require the following documents:

${missingList}

Please submit the above documents within 24 hours by:
1. Replying to this email with the documents attached, OR
2. Uploading directly via the portal

If you have any questions, please don't hesitate to reach out.

Best regards,
Ops Team
SME Health Policy Issuance`;
  };

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(generateEmailBody());

  const handleCopyEmail = () => {
    const fullEmail = `To: ${brokerEmail}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(fullEmail);
    toast.success('Email copied to clipboard');
  };

  const handleMarkAsSent = () => {
    onMarkAsSent();
    onOpenChange(false);
    toast.success('Email marked as sent');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Request Missing Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              value={brokerEmail}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="font-mono text-sm"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Missing Documents:</strong>{' '}
              {missingDocuments.map(doc => DOCUMENT_TYPE_LABELS[doc]).join(', ')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCopyEmail} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Email
          </Button>
          <Button onClick={handleMarkAsSent} className="gap-2">
            <Send className="h-4 w-4" />
            Mark as Sent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
