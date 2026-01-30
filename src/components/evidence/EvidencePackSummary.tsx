import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { CaseData } from '@/types/case';

interface EvidencePackSummaryProps {
  caseData: CaseData;
}

export function EvidencePackSummary({ caseData }: EvidencePackSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Request Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Request ID</p>
              <p className="font-medium">{caseData.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{caseData.companyName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Request Status</p>
              <Badge className="bg-info/20 text-info border-0">{caseData.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queue</p>
              <p className="font-medium">{caseData.queue}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Current Stage</p>
              <p className="font-medium">Stage {caseData.currentStage} of {caseData.stages.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created Date</p>
              <p className="font-medium">{format(caseData.timeline[0].timestamp, 'dd MMM yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Assigned To</p>
              <p className="font-medium">{caseData.owner}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge 
                className={
                  caseData.priority === 'Urgent' 
                    ? 'bg-destructive/20 text-destructive border-0'
                    : 'bg-muted text-muted-foreground border-0'
                }
              >
                {caseData.priority}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
