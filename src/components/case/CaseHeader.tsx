import { Badge } from '@/components/ui/badge';
import { Building2, Hash, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface CaseHeaderProps {
  caseId: string;
  companyName: string;
  status: string;
  currentStage: number;
  totalStages: number;
}

export function CaseHeader({ caseId, companyName, status, currentStage, totalStages }: CaseHeaderProps) {
  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{companyName}</h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5" />
                  {caseId}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(new Date(), 'dd MMM yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Sarah Ahmed
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm py-1 px-3">
            Stage {currentStage} of {totalStages}
          </Badge>
          <Badge 
            className="text-sm py-1 px-3 bg-info/20 text-info border-0"
          >
            {status}
          </Badge>
        </div>
      </div>
    </div>
  );
}
