import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Download, Send, FileJson, Check, Loader2, Lock, AlertCircle, Info, Shield, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VerificationSummary {
  section: string;
  status: 'verified' | 'partial' | 'needs-review';
  verifiedCount: number;
  totalCount: number;
}

interface ExportPanelProps {
  payload: object;
  isExported: boolean;
  isIssued: boolean;
  allStagesComplete: boolean;
  activeStage?: number;
  onExport: () => void;
  onMarkIssued: () => void;
  verificationSummary?: VerificationSummary[];
}

export function ExportPanel({ 
  payload, 
  isExported, 
  isIssued, 
  allStagesComplete,
  activeStage = 7,
  onExport, 
  onMarkIssued,
  verificationSummary = [
    { section: 'Employer & Legal', status: 'verified', verifiedCount: 5, totalCount: 5 },
    { section: 'Workforce', status: 'verified', verifiedCount: 3, totalCount: 3 },
    { section: 'Commercial', status: 'verified', verifiedCount: 3, totalCount: 3 },
    { section: 'Signatory', status: 'partial', verifiedCount: 1, totalCount: 2 },
  ]
}: ExportPanelProps) {
  const [isPushing, setIsPushing] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'excel'>('json');
  const isExportStageActive = activeStage === 7;

  // Enhanced payload with audit information
  const enhancedPayload = {
    ...payload as object,
    auditSummary: {
      totalFieldsVerified: verificationSummary.reduce((acc, s) => acc + s.verifiedCount, 0),
      totalFieldsNeedingReview: verificationSummary.reduce((acc, s) => acc + (s.totalCount - s.verifiedCount), 0),
      exportedAt: new Date().toISOString(),
      exportedBy: 'Sarah Ahmed',
    },
    verificationStatus: {
      employer: verificationSummary.find(s => s.section === 'Employer & Legal')?.status || 'needs-review',
      workforce: verificationSummary.find(s => s.section === 'Workforce')?.status || 'needs-review',
      commercial: verificationSummary.find(s => s.section === 'Commercial')?.status || 'needs-review',
      signatory: verificationSummary.find(s => s.section === 'Signatory')?.status || 'needs-review',
    },
  };

  const handleDownload = () => {
    if (exportFormat === 'json') {
      const blob = new Blob([JSON.stringify(enhancedPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'request-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('JSON file downloaded');
    } else {
      // Mock Excel download
      toast.success('Excel file downloaded', {
        description: 'Export payload converted to Excel format',
      });
    }
  };

  const handlePushToCore = async () => {
    if (!allStagesComplete) {
      toast.error('Cannot export', {
        description: 'All previous stages must be complete before export.',
      });
      return;
    }
    
    setIsPushing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPushing(false);
    onExport();
    toast.success('Export successful', {
      description: 'Request has been pushed to core system',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <Check className="h-3.5 w-3.5 text-success" />;
      case 'partial':
        return <AlertCircle className="h-3.5 w-3.5 text-warning" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-success/20 text-success border-0 text-xs">Verified</Badge>;
      case 'partial':
        return <Badge className="bg-warning/20 text-warning-foreground border-0 text-xs">Partial</Badge>;
      default:
        return <Badge className="bg-destructive/20 text-destructive border-0 text-xs">Needs Review</Badge>;
    }
  };

  // Show informational message when Export stage is not active
  if (!isExportStageActive) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Alert className="border-muted-foreground/20 bg-muted/50">
          <Info className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground">
            <strong>Export will be enabled once all validation stages are complete.</strong>
            <p className="mt-1 text-sm">
              Navigate to Stage 7 (Export to Core System) to view the export payload and push to the core system.
            </p>
          </AlertDescription>
        </Alert>
        
        <Card className="opacity-60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
              <Lock className="h-5 w-5" />
              Export Payload Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Complete stages 1-6 and select the Export stage to access export functionality.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stage 7 gating warning */}
      {!allStagesComplete && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Export blocked:</strong> All previous stages (1-6) must be completed before you can export to the core system.
          </AlertDescription>
        </Alert>
      )}

      {/* Verification Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Verification Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {verificationSummary.map((section) => (
              <div 
                key={section.section}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  section.status === 'verified' 
                    ? "bg-success/5 border-success/20" 
                    : section.status === 'partial'
                    ? "bg-warning/5 border-warning/20"
                    : "bg-destructive/5 border-destructive/20"
                )}
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(section.status)}
                  <span className="text-sm font-medium">{section.section}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {section.verifiedCount}/{section.totalCount}
                  </span>
                  {getStatusBadge(section.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Payload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileJson className="h-5 w-5 text-primary" />
            Export Payload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 max-h-[400px] overflow-auto">
            <pre className="text-xs font-mono text-foreground/80">
              {JSON.stringify(enhancedPayload, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <div className="flex flex-col gap-4">
        {/* Download Options */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground mr-2">Format:</span>
          <Button
            variant={exportFormat === 'json' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExportFormat('json')}
            className={cn("gap-1.5", exportFormat === 'json' && "bg-primary")}
          >
            <FileJson className="h-3.5 w-3.5" />
            JSON
          </Button>
          <Button
            variant={exportFormat === 'excel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setExportFormat('excel')}
            className={cn("gap-1.5", exportFormat === 'excel' && "bg-primary")}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Excel
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download {exportFormat.toUpperCase()}
          </Button>

          <Button
            onClick={handlePushToCore}
            disabled={isPushing || isExported || !allStagesComplete}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            {isPushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Pushing...
              </>
            ) : isExported ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Exported to Core
              </>
            ) : !allStagesComplete ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Export Locked
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Push to Core System
              </>
            )}
          </Button>
        </div>
      </div>

      {isExported && !isIssued && (
        <Card className="border-success/30 bg-success/5 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Export complete</span>
              </div>
              <Button
                size="sm"
                onClick={onMarkIssued}
                className="bg-success hover:bg-success/90"
              >
                Mark as Issued
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: "Mark as Issued" is visible only to Ops Managers.
            </p>
          </CardContent>
        </Card>
      )}

      {isIssued && (
        <Card className="border-success/50 bg-success/10 animate-fade-in">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              <span className="text-sm font-medium text-success">Policy Issued Successfully</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
