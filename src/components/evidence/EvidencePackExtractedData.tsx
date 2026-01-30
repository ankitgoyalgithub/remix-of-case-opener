import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Check, AlertCircle, Lock } from 'lucide-react';
import { ExtractedDataSection } from '@/types/case';
import { cn } from '@/lib/utils';

interface EvidencePackExtractedDataProps {
  extractedData: ExtractedDataSection[];
}

export function EvidencePackExtractedData({ extractedData }: EvidencePackExtractedDataProps) {
  const getSectionVerificationStatus = (section: ExtractedDataSection) => {
    const verifiedCount = section.fields.filter(f => f.status === 'verified').length;
    if (verifiedCount === section.fields.length) return 'verified';
    if (verifiedCount > 0) return 'partial';
    return 'needs-review';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Extracted Data Snapshot
          <Badge variant="outline" className="ml-2 text-xs">
            <Lock className="h-3 w-3 mr-1" />
            Read-Only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {extractedData.map(section => {
            const sectionStatus = getSectionVerificationStatus(section);
            const verifiedCount = section.fields.filter(f => f.status === 'verified').length;
            
            return (
              <div key={section.title} className="border-b border-border pb-4 last:border-0">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">{section.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {verifiedCount}/{section.fields.length} verified
                    </span>
                    <Badge 
                      className={cn(
                        "text-xs border-0",
                        sectionStatus === 'verified' 
                          ? 'bg-success/20 text-success' 
                          : sectionStatus === 'partial'
                          ? 'bg-warning/20 text-warning-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {sectionStatus === 'verified' && <Check className="h-3 w-3 mr-1" />}
                      {sectionStatus !== 'verified' && <AlertCircle className="h-3 w-3 mr-1" />}
                      {sectionStatus === 'verified' ? 'All Verified' : sectionStatus === 'partial' ? 'Partial' : 'Needs Review'}
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {section.fields.map(field => (
                    <div 
                      key={field.label} 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg text-sm",
                        field.status === 'verified' ? 'bg-success/5' : 'bg-muted/50'
                      )}
                    >
                      <div className="flex-1">
                        <span className="text-muted-foreground">{field.label}: </span>
                        <span className="font-medium">{field.value || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "text-xs",
                          field.confidence >= 95 ? 'text-success' 
                            : field.confidence >= 85 ? 'text-warning'
                            : 'text-destructive'
                        )}>
                          {field.confidence}%
                        </span>
                        {field.status === 'verified' ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
