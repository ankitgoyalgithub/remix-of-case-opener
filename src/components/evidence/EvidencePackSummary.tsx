import { format } from 'date-fns';
import { Building2, Hash, Calendar, User, Layers, AlertTriangle, Users, CheckCircle2, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { CaseData } from '@/types/case';
import { Badge } from '@/components/ui/badge';
import { requestStatusMeta } from '@/lib/status';

interface EvidencePackSummaryProps {
  caseData: CaseData;
}

function MetaCell({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5 min-w-0">
      <div className="h-7 w-7 rounded-md bg-muted/60 border border-border flex items-center justify-center shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono font-semibold tracking-[0.14em] uppercase text-muted-foreground leading-none mb-1.5">
          {label}
        </p>
        <div className="text-[13px] font-medium text-foreground break-words leading-tight">{children}</div>
      </div>
    </div>
  );
}

export function EvidencePackSummary({ caseData }: EvidencePackSummaryProps) {
  const created = caseData.createdAt
    ? format(new Date(caseData.createdAt), 'dd MMM yyyy HH:mm')
    : caseData.timeline?.[0]?.timestamp
      ? format(new Date(caseData.timeline[0].timestamp), 'dd MMM yyyy HH:mm')
      : '—';

  const stageName = caseData.stages.find(s => s.id === caseData.currentStage)?.name;
  const status = requestStatusMeta(caseData.status);

  // Broker / owner come from the request mapper and are '' (empty) until the
  // backend sends them. Treat empty as "no data" and hide the cell rather than
  // render a blank or fabricated value in an audit document.
  const hasOwner = Boolean(caseData.owner && caseData.owner.trim());
  const hasBroker = Boolean(caseData.brokerEmail && caseData.brokerEmail.trim());

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Headline strip — company name + key status badges */}
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-[10.5px] font-mono font-semibold tracking-[0.16em] uppercase text-muted-foreground">
                Subject company
              </span>
            </div>
            <h3 className="text-[20px] font-semibold tracking-tight text-foreground leading-tight">
              {caseData.companyName}
            </h3>
            <p className="text-[11.5px] font-mono text-muted-foreground mt-1 break-all">
              {caseData.smartId || caseData.id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <Badge variant={status.variant}>{status.label}</Badge>
            {caseData.priority === 'Urgent' ? (
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" aria-hidden />
                Urgent priority
              </Badge>
            ) : (
              <Badge variant="neutral">Normal priority</Badge>
            )}
            {caseData.isIssued ? (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Final
              </Badge>
            ) : (
              <Badge variant="neutral" className="gap-1">
                <FileText className="h-3 w-3" aria-hidden />
                Draft
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Meta grid */}
      <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-4">
        <MetaCell icon={<Layers className="h-3.5 w-3.5" />} label="Current stage">
          <div className="leading-tight">
            <div>Stage {caseData.currentStage} of {caseData.stages.length}</div>
            {stageName && (
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{stageName}</div>
            )}
          </div>
        </MetaCell>

        <MetaCell icon={<Calendar className="h-3.5 w-3.5" />} label="Created">
          {created}
        </MetaCell>

        {hasOwner && (
          <MetaCell icon={<User className="h-3.5 w-3.5" />} label="Assigned to">
            {caseData.owner}
          </MetaCell>
        )}

        <MetaCell icon={<Users className="h-3.5 w-3.5" />} label="Assigned team">
          {caseData.queue}
        </MetaCell>

        <MetaCell icon={<Hash className="h-3.5 w-3.5" />} label="Request ID">
          <span className="font-mono text-[11.5px] break-all">{caseData.id}</span>
        </MetaCell>

        {hasBroker && (
          <MetaCell icon={<User className="h-3.5 w-3.5" />} label="Broker">
            <span className="break-all">{caseData.brokerEmail}</span>
          </MetaCell>
        )}

        <MetaCell icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Open risk flags">
          {caseData.riskFlags && caseData.riskFlags.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="font-mono tabular-nums">
                {caseData.riskFlags.filter(f => !f.resolved).length}
              </span>
              <span className="text-[11px] text-muted-foreground">
                of {caseData.riskFlags.length} total
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </MetaCell>

        <MetaCell icon={<Layers className="h-3.5 w-3.5" />} label="Documents">
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums">{caseData.documents.length}</span>
            <span className="text-[11px] text-muted-foreground">uploaded</span>
          </div>
        </MetaCell>
      </div>
    </div>
  );
}
