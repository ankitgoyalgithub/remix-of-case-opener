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
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

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
              <p className="text-sm text-muted-foreground">{mockCaseData.id}</p>
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
                    <p className="font-medium">{mockCaseData.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{mockCaseData.companyName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Request Status</p>
                    <Badge className="bg-info/20 text-info border-0">{mockCaseData.status}</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Stage</p>
                    <p className="font-medium">Stage {mockCaseData.currentStage} of {mockCaseData.stages.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created Date</p>
                    <p className="font-medium">{format(mockCaseData.timeline[0].timestamp, 'dd MMM yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p className="font-medium">Sarah Ahmed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Checklist Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCaseData.stages.map(stage => {
                  const items = mockCaseData.checklist.filter(c => c.stageId === stage.id);
                  if (items.length === 0) return null;
                  
                  const completed = items.filter(i => i.checked).length;
                  
                  return (
                    <div key={stage.id} className="border-b border-border pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{stage.name}</h4>
                        <Badge 
                          variant="outline" 
                          className={completed === items.length ? 'bg-success/10 text-success border-success/30' : ''}
                        >
                          {completed}/{items.length}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            {item.checked ? (
                              <Check className="h-4 w-4 text-success" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={item.checked ? 'text-muted-foreground' : ''}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Extracted Data Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                Extracted Data Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCaseData.extractedData.map(section => (
                  <div key={section.title} className="border-b border-border pb-3 last:border-0">
                    <h4 className="font-medium text-sm mb-2">{section.title}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {section.fields.map(field => (
                        <div key={field.label} className="text-sm">
                          <span className="text-muted-foreground">{field.label}: </span>
                          <span className="font-medium">{field.value || 'N/A'}</span>
                          <span className="text-xs ml-2 text-muted-foreground">({field.confidence}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockCaseData.timeline.map(event => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <span className="text-muted-foreground w-32 flex-shrink-0">
                      {format(event.timestamp, 'dd MMM HH:mm')}
                    </span>
                    <div>
                      <p className="font-medium">{event.action}</p>
                      <p className="text-muted-foreground text-xs">
                        {event.user}
                        {event.details && ` • ${event.details}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockCaseData.documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-info" />
                      <div>
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {format(doc.uploadedAt, 'dd MMM yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-success/20 text-success border-0 text-xs">
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
