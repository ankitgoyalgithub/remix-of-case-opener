import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { mockCaseData } from '@/data/mockCaseData';
import { 
  ArrowLeft, 
  Download, 
  Building2, 
  FileText,
  ClipboardCheck,
  Database,
  Clock,
  Check,
  AlertCircle,
  Shield,
  AlertTriangle,
  User
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { EvidencePackSummary } from '@/components/evidence/EvidencePackSummary';
import { EvidencePackChecklist } from '@/components/evidence/EvidencePackChecklist';
import { EvidencePackExtractedData } from '@/components/evidence/EvidencePackExtractedData';
import { EvidencePackOverrides } from '@/components/evidence/EvidencePackOverrides';
import { EvidencePackTimeline } from '@/components/evidence/EvidencePackTimeline';
import { EvidencePackDocuments } from '@/components/evidence/EvidencePackDocuments';

export default function EvidencePack() {
  const handleExportPdf = () => {
    toast.success('Evidence Pack PDF downloaded', {
      description: 'The evidence pack has been exported successfully',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/requests">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Evidence Pack</h1>
              <p className="text-sm text-muted-foreground">{mockCaseData.id} • Audit-Ready Export</p>
            </div>
          </div>
          <Button onClick={handleExportPdf} className="gap-2">
            <Download className="h-4 w-4" />
            Export Evidence Pack (PDF)
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Request Summary */}
          <EvidencePackSummary caseData={mockCaseData} />

          {/* Stage Completion Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Stage Completion Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockCaseData.stages.map(stage => (
                  <div key={stage.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium w-8">S{stage.id}</span>
                      <span className="text-sm">{stage.name}</span>
                    </div>
                    <Badge 
                      className={
                        stage.status === 'complete' 
                          ? 'bg-success/20 text-success border-0' 
                          : stage.status === 'needs-review'
                          ? 'bg-warning/20 text-warning-foreground border-0'
                          : 'bg-muted text-muted-foreground border-0'
                      }
                    >
                      {stage.status === 'complete' && <Check className="h-3 w-3 mr-1" />}
                      {stage.status === 'needs-review' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {stage.status.replace('-', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Checklist Snapshot */}
          <EvidencePackChecklist stages={mockCaseData.stages} checklist={mockCaseData.checklist} />

          {/* Extracted Data Snapshot with Verification Status */}
          <EvidencePackExtractedData extractedData={mockCaseData.extractedData} />

          {/* Override Reasons */}
          <EvidencePackOverrides workforceMismatch={mockCaseData.workforceMismatch} />

          {/* Timeline */}
          <EvidencePackTimeline timeline={mockCaseData.timeline} />

          {/* Documents List */}
          <EvidencePackDocuments documents={mockCaseData.documents} />
        </div>
      </ScrollArea>
    </div>
  );
}
