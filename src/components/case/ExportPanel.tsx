import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Send, FileJson, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExportPanelProps {
  payload: object;
  isExported: boolean;
  isIssued: boolean;
  onExport: () => void;
  onMarkIssued: () => void;
}

export function ExportPanel({ payload, isExported, isIssued, onExport, onMarkIssued }: ExportPanelProps) {
  const [isPushing, setIsPushing] = useState(false);

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'case-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('JSON file downloaded');
  };

  const handlePushToCore = async () => {
    setIsPushing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPushing(false);
    onExport();
    toast.success('Export successful', {
      description: 'Case has been pushed to core system',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
          disabled={isPushing || isExported}
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
