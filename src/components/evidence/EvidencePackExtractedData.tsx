import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Check, AlertCircle, Lock } from 'lucide-react';
import { ExtractedDataSection } from '@/types/case';
import { cn } from '@/lib/utils';

interface EvidencePackExtractedDataProps {
  extractedData: ExtractedDataSection[];
}

/**
 * Defensively render a field value that might be a primitive, an object, or an
 * array. Newer extractions (Trade Licence, MoA, etc.) return nested objects
 * for some fields — rendering those directly would crash React.
 */
function renderFieldValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'N/A';
    if (value.every(v => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    // List of objects → bulleted compact view
    return (
      <ul className="mt-1 space-y-1 list-disc pl-4">
        {value.map((item, i) => (
          <li key={i} className="text-xs">{renderFieldValue(item)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return 'N/A';
    return (
      <span className="block mt-1 space-y-0.5 text-xs">
        {entries.map(([k, v]) => (
          <span key={k} className="block">
            <span className="text-muted-foreground">{k}: </span>
            <span>{renderFieldValue(v)}</span>
          </span>
        ))}
      </span>
    );
  }
  return String(value);
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
          {extractedData.map((section, sectionIdx) => {
            const sectionStatus = getSectionVerificationStatus(section);
            const verifiedCount = section.fields.filter(f => f.status === 'verified').length;

            return (
              <div key={`${section.title}-${sectionIdx}`} className="border-b border-border pb-4 last:border-0">
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
                  {section.fields.map((field, fieldIdx) => (
                    <div
                      key={`${field.label}-${fieldIdx}`}
                      className={cn(
                        "flex items-start justify-between gap-3 p-2 rounded-lg text-sm",
                        field.status === 'verified' ? 'bg-success/5' : 'bg-muted/50'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground">{field.label}: </span>
                        <span className="font-medium break-words">{renderFieldValue(field.value)}</span>
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
