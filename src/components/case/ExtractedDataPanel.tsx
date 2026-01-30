import { ExtractedDataSection, ExtractedField } from '@/types/case';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, FileText, Lock, User, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FieldVerification {
  verifiedBy: string;
  verifiedAt: Date;
}

interface ExtractedDataPanelProps {
  sections: ExtractedDataSection[];
  onVerify: (sectionTitle: string, fieldLabel: string) => void;
  currentUser?: string;
}

export function ExtractedDataPanel({ sections, onVerify, currentUser = 'Sarah Ahmed' }: ExtractedDataPanelProps) {
  // Track verification state with user and timestamp
  const [verifications, setVerifications] = useState<Record<string, FieldVerification>>(() => {
    const initial: Record<string, FieldVerification> = {};
    sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.status === 'verified') {
          initial[`${section.title}:${field.label}`] = {
            verifiedBy: 'System',
            verifiedAt: new Date(Date.now() - 3600000), // 1 hour ago for pre-verified
          };
        }
      });
    });
    return initial;
  });

  const handleVerify = useCallback((sectionTitle: string, fieldLabel: string, isVerified: boolean) => {
    const key = `${sectionTitle}:${fieldLabel}`;
    if (isVerified) {
      setVerifications(prev => ({
        ...prev,
        [key]: {
          verifiedBy: currentUser,
          verifiedAt: new Date(),
        },
      }));
      onVerify(sectionTitle, fieldLabel);
    } else {
      setVerifications(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  }, [currentUser, onVerify]);

  const getSectionStatus = (section: ExtractedDataSection) => {
    const verifiedCount = section.fields.filter(
      f => verifications[`${section.title}:${f.label}`]
    ).length;
    if (verifiedCount === section.fields.length) return 'verified';
    if (verifiedCount > 0) return 'partial';
    return 'needs-review';
  };

  const getSectionStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-success/20 text-success border-0 text-xs gap-1">
            <Check className="h-3 w-3" />
            All Verified
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-warning/20 text-warning-foreground border-0 text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Partially Verified
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-0 text-xs gap-1">
            <AlertCircle className="h-3 w-3" />
            Needs Review
          </Badge>
        );
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-fade-in">
        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-2 bg-muted/30 rounded-lg text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" />
            <span>Values are read-only</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch className="scale-75" disabled checked={false} />
            <span>Toggle to verify</span>
          </div>
        </div>

        {sections.map((section) => {
          const sectionStatus = getSectionStatus(section);
          
          return (
            <Card key={section.title} className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {section.title}
                  </CardTitle>
                  {getSectionStatusBadge(sectionStatus)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {section.fields.map((field) => (
                    <ExtractedFieldRow 
                      key={field.label} 
                      field={field}
                      sectionTitle={section.title}
                      verification={verifications[`${section.title}:${field.label}`]}
                      onVerify={(checked) => handleVerify(section.title, field.label, checked)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface ExtractedFieldRowProps {
  field: ExtractedField;
  sectionTitle: string;
  verification?: FieldVerification;
  onVerify: (checked: boolean) => void;
}

function ExtractedFieldRow({ field, sectionTitle, verification, onVerify }: ExtractedFieldRowProps) {
  const isVerified = !!verification;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 95) return 'text-success';
    if (confidence >= 85) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 95) return 'bg-success/10';
    if (confidence >= 85) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  const handleVerifyToggle = (checked: boolean) => {
    onVerify(checked);
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          {field.source && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground/60 truncate max-w-[150px] cursor-help" title={field.source}>
                  • {field.source}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Extracted from: {field.source}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Lock className="h-3 w-3 text-muted-foreground/50" />
          <p className="text-sm font-medium truncate">
            {field.value || <span className="text-muted-foreground italic">Unknown</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Confidence */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium cursor-help", getConfidenceBg(field.confidence))}>
              <span className={getConfidenceColor(field.confidence)}>{field.confidence}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI Extraction Confidence: {field.confidence}%</p>
            {field.confidence < 95 && <p className="text-xs text-muted-foreground">Manual verification recommended</p>}
          </TooltipContent>
        </Tooltip>

        {/* Status Badge with verification info */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isVerified ? "default" : "secondary"}
              className={cn(
                "text-xs gap-1 cursor-help",
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
          </TooltipTrigger>
          <TooltipContent>
            {isVerified && verification ? (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  <span>{verification.verifiedBy}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{format(verification.verifiedAt, 'dd MMM yyyy HH:mm')}</span>
                </div>
              </div>
            ) : (
              <p>Awaiting manual verification</p>
            )}
          </TooltipContent>
        </Tooltip>

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
