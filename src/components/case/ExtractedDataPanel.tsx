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
  isCompact?: boolean;
}

export function ExtractedDataPanel({ sections, onVerify, currentUser = 'Sarah Ahmed', isCompact }: ExtractedDataPanelProps) {
  // Track verification state
  const [verifications, setVerifications] = useState<Record<string, FieldVerification>>({});

  const handleVerify = useCallback((sectionTitle: string, fieldLabel: string, isVerified: boolean) => {
    const key = `${sectionTitle}:${fieldLabel}`;
    if (isVerified) {
      setVerifications(prev => ({
        ...prev,
        [key]: { verifiedBy: currentUser, verifiedAt: new Date() },
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

  return (
    <TooltipProvider>
      <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase">
                {section.title}
              </span>
              <Badge variant="outline" className="text-[9px] font-bold py-0 bg-primary/5 text-primary border-primary/20">
                {section.fields.filter(f => f.value).length}/{section.fields.length} FIELDS
              </Badge>
            </div>

            <div className="grid gap-1.5">
              {section.fields.map((field) => (
                <ExtractedFieldRow
                  key={`${field.documentId}-${field.label}`}
                  field={field}
                  sectionTitle={section.title}
                  verification={verifications[`${section.title}:${field.label}`]}
                  onVerify={(checked) => handleVerify(section.title, field.label, checked)}
                  isCompact={isCompact}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

interface ExtractedFieldRowProps {
  field: ExtractedField;
  sectionTitle: string;
  verification?: FieldVerification;
  onVerify: (checked: boolean) => void;
  isCompact?: boolean;
}

function ExtractedFieldRow({ field, sectionTitle, verification, onVerify, isCompact }: ExtractedFieldRowProps) {
  const isVerified = !!verification;
  const hasValue = field.value !== null && field.value !== undefined;

  return (
    <div className={cn(
      "group flex items-center justify-between p-3 rounded-2xl border transition-all duration-300",
      isVerified ? "bg-success/5 border-success/30" : "bg-card/50 border-border/50 hover:border-primary/30"
    )}>
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight block mb-0.5">
          {field.label}
        </span>
        <div className="flex items-center gap-2">
          {hasValue ? (
            <p className="text-xs font-bold text-foreground tabular-nums">
              {field.value}
            </p>
          ) : (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 text-destructive/50" />
              <span className="text-xs font-bold text-destructive/40 italic">Not detected in source</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {hasValue && (
          <div className={cn(
            "px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter",
            field.confidence > 90 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
          )}>
            {Math.round(field.confidence)}% AI
          </div>
        )}

        <Switch
          checked={isVerified}
          onCheckedChange={onVerify}
          disabled={!hasValue}
          className={cn(
            "data-[state=checked]:bg-success scale-75",
            !hasValue && "opacity-20"
          )}
        />
      </div>
    </div>
  );
}
