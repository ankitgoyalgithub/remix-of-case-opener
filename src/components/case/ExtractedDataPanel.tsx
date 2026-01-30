import { ExtractedDataSection, ExtractedField } from '@/types/case';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ExtractedDataPanelProps {
  sections: ExtractedDataSection[];
  onVerify: (sectionTitle: string, fieldLabel: string) => void;
}

export function ExtractedDataPanel({ sections, onVerify }: ExtractedDataPanelProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {sections.map((section) => (
        <Card key={section.title} className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {section.fields.map((field) => (
                <ExtractedFieldRow 
                  key={field.label} 
                  field={field} 
                  onVerify={() => onVerify(section.title, field.label)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface ExtractedFieldRowProps {
  field: ExtractedField;
  onVerify: () => void;
}

function ExtractedFieldRow({ field, onVerify }: ExtractedFieldRowProps) {
  const [isVerified, setIsVerified] = useState(field.status === 'verified');

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-confidence-high';
    if (confidence >= 85) return 'text-confidence-medium';
    return 'text-confidence-low';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 95) return 'bg-success/10';
    if (confidence >= 85) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const handleVerifyToggle = (checked: boolean) => {
    setIsVerified(checked);
    if (checked) {
      onVerify();
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          {field.source && (
            <span className="text-xs text-muted-foreground/60 truncate max-w-[120px]" title={field.source}>
              • {field.source}
            </span>
          )}
        </div>
        <p className="text-sm font-medium truncate">
          {field.value || <span className="text-muted-foreground italic">Unknown</span>}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Confidence */}
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium", getConfidenceBg(field.confidence))}>
          <span className={getConfidenceColor(field.confidence)}>{field.confidence}%</span>
        </div>

        {/* Status Badge */}
        <Badge 
          variant={isVerified ? "default" : "secondary"}
          className={cn(
            "text-xs gap-1",
            isVerified 
              ? "bg-success/20 text-success hover:bg-success/30 border-0" 
              : "bg-warning/20 text-warning-foreground hover:bg-warning/30 border-0"
          )}
        >
          {isVerified ? (
            <>
              <Check className="h-3 w-3" />
              Verified
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" />
              Needs Review
            </>
          )}
        </Badge>

        {/* Verify Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Verify</span>
          <Switch 
            checked={isVerified}
            onCheckedChange={handleVerifyToggle}
            className="data-[state=checked]:bg-success"
          />
        </div>
      </div>
    </div>
  );
}
