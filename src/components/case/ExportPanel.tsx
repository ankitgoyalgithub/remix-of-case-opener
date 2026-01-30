import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Send, FileJson, Check, Loader2, Lock, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportPanelProps {
  payload: object;
  isExported: boolean;
  isIssued: boolean;
  allStagesComplete: boolean;
  activeStage?: number;
  onExport: () => void;
  onMarkIssued: () => void;
}

export function ExportPanel({ 
  payload, 
  isExported, 
  isIssued, 
  allStagesComplete,
  activeStage = 7,
  onExport, 
  onMarkIssued 
}: ExportPanelProps) {
  const [isPushing, setIsPushing] = useState(false);
  const isExportStageActive = activeStage === 7;

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'request-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON file downloaded');
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

  const canExport = allStagesComplete && !isExported;

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
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          onClick={handleDownloadJson}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Download JSON
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
