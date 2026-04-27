import { cn } from '@/lib/utils';
import {
  Workflow,
  FileText,
  Database,
  ClipboardCheck,
  Mail,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useStudioStages, useStudioDocuments, useStudioFields, useStudioInstructions, useStudioChecklist, useStudioEmails } from '@/hooks/useStudioStore';

interface ReviewSection {
  icon: React.ElementType;
  title: string;
  count: number;
  status: 'complete' | 'warning' | 'info';
  details: string;
}

export function WizardStepReview() {
  const { stages } = useStudioStages();
  const { documents } = useStudioDocuments();
  const { fields } = useStudioFields();
  const { instructions } = useStudioInstructions();
  const { items: checklist } = useStudioChecklist();
  const { templates } = useStudioEmails();

  const sections: ReviewSection[] = [
    {
      icon: Workflow,
      title: 'Architectural Pipeline',
      count: stages.length,
      status: stages.length > 0 ? 'complete' : 'warning',
      details: `${stages.length} Operational stages fully sequenced.`,
    },
    {
      icon: FileText,
      title: 'Document Registry',
      count: documents.length,
      status: documents.length > 0 ? 'complete' : 'warning',
      details: `${documents.filter(d => d.mandatory).length} Critical requirements mapped.`,
    },
    {
      icon: Database,
      title: 'Intelligence Schema',
      count: fields.length,
      status: fields.length > 0 ? 'complete' : 'info',
      details: `${fields.length} Data points configured for extraction.`,
    },
    {
      icon: ClipboardCheck,
      title: 'Validation Logic',
      count: checklist.length,
      status: checklist.length > 0 ? 'complete' : 'warning',
      details: `${checklist.length} Checkpoints established for verification.`,
    },
    {
      icon: Mail,
      title: 'Notification Matrix',
      count: templates.length,
      status: templates.length > 0 ? 'complete' : 'info',
      details: `${templates.length} Active communication templates.`,
    },
  ];

  const warnings = sections.filter(s => s.status === 'warning');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-foreground">Mission Control Review</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Finalize and deploy your enterprise configuration. Publishing will activate these parameters for all future requests.
        </p>
      </div>

      {/* Summary Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="group relative">
              <div className={cn(
                "bg-card rounded-xl border p-6 transition-all duration-200",
                "hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-10 h-10 rounded-lg bg-muted border flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  {section.status === 'complete' ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success/10 text-success">
                      <Check className="h-3 w-3" />
                      <span className="text-xs font-semibold">Validated</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warning/10 text-warning">
                      <AlertCircle className="h-3 w-3" />
                      <span className="text-xs font-semibold">Review</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-muted-foreground">{section.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{section.count}</span>
                    <span className="text-xs font-medium text-muted-foreground">Active nodes</span>
                  </div>
                </div>

                <p className="text-sm font-medium text-muted-foreground/60 mt-4 leading-relaxed">{section.details}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning Panel */}
      {warnings.length > 0 && (
        <div className="bg-warning/5 rounded-xl border border-warning/20 p-6 relative overflow-hidden">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0 mt-1">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h4 className="text-base font-semibold text-warning">Configuration Vulnerabilities</h4>
                <p className="text-sm text-warning/80 mt-1">We've identified potential gaps in your operational architecture.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {warnings.map(w => (
                  <div key={w.title} className="flex items-center gap-3 bg-background/50 p-2.5 rounded-lg border border-warning/10 text-sm font-medium text-warning/90">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="truncate">{w.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
