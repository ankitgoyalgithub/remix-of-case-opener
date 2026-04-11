import { ExtractedDataSection, ExtractedField } from '@/types/case';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

interface ExtractedDataPanelProps {
  sections: ExtractedDataSection[];
  isCompact?: boolean;
}

export function ExtractedDataPanel({ sections, isCompact }: ExtractedDataPanelProps) {
  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            {section.title && (
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  {section.title}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {section.fields.filter(f => f.value).length}/{section.fields.length} FIELDS
                </Badge>
              </div>
            )}

            <div className="grid gap-2">
              {section.fields.map((field) => (
                <ExtractedFieldRow
                   key={`${field.documentId}-${field.label}`}
                   field={field}
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
  isCompact?: boolean;
}

function ExtractedFieldRow({ field, isCompact }: ExtractedFieldRowProps) {
  const hasValue = field.value !== null && field.value !== undefined;

  return (
    <div className="group flex items-center justify-between p-3 rounded-md border bg-background hover:border-primary/40 transition-colors shadow-sm">
      <div className="flex-1 min-w-0 pr-4">
        <span className="text-xs font-semibold text-muted-foreground uppercase block mb-1">
          {field.label}
        </span>
        <div className="flex items-center gap-2">
          {hasValue ? (
            <p className="text-sm font-semibold text-foreground break-words">
              {field.value}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-destructive/60" />
              <span className="text-sm font-semibold text-destructive/50 italic">Not detected</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {hasValue && (
          <div className={cn(
            "px-2 py-0.5 rounded text-xs font-bold uppercase shadow-sm border",
            field.confidence > 90 ? "bg-success/10 text-success border-success/10" : "bg-warning/10 text-warning border-warning/10"
          )}>
            {Math.round(field.confidence)}% AI
          </div>
        )}
      </div>
    </div>
  );
}

