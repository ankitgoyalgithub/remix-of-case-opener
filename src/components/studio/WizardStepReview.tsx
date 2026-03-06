import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Workflow,
  FileText,
  Database,
  Brain,
  ClipboardCheck,
  Mail,
  Check,
  AlertCircle,
  Rocket,
  Save,
} from 'lucide-react';
import { useStudioStages, useStudioDocuments, useStudioFields, useStudioInstructions, useStudioChecklist, useStudioEmails } from '@/hooks/useStudioStore';
import { toast } from 'sonner';

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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tighter text-foreground">Mission Control Review</h2>
        <p className="text-sm font-medium text-muted-foreground/70 max-w-2xl">
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
                "glass-card rounded-[2rem] p-6 border-border/40 transition-all duration-500",
                "hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  {section.status === 'complete' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20">
                      <Check className="h-3 w-3 text-success" />
                      <span className="text-[9px] font-black text-success uppercase tracking-widest">VALIDATED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/20">
                      <AlertCircle className="h-3 w-3 text-warning" />
                      <span className="text-[9px] font-black text-warning uppercase tracking-widest">REVIEW REQUIRED</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase">{section.title}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tighter text-foreground">{section.count}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Active nodes</span>
                  </div>
                </div>

                <p className="text-[11px] font-medium text-muted-foreground/60 mt-4 leading-relaxed">{section.details}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning Panel */}
      {warnings.length > 0 && (
        <div className="glass-card rounded-[2.5rem] border-warning/20 bg-warning/5 p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <AlertCircle className="h-32 w-32 text-warning" />
          </div>

          <div className="flex items-start gap-6 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center text-warning shrink-0">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-xl font-black tracking-tight text-warning/90">Configuration Vulnerabilities</h4>
                <p className="text-sm font-medium text-warning/60 mt-1">We've identified potential gaps in your operational architecture.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warnings.map(w => (
                  <div key={w.title} className="flex items-center gap-3 bg-white/40 p-3 rounded-xl border border-warning/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="text-xs font-bold text-warning/80 truncate">{w.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Command Center */}
      <div className="glass-card rounded-[2.5rem] p-8 border-primary/20 bg-primary/5 shadow-2xl shadow-primary/5 flex items-center justify-between mt-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Rocket className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-black tracking-tight text-foreground">Ready for Deployment</h4>
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">System Engine v4.2 • Autonomous Mode Enabled</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" className="h-14 px-8 rounded-2xl text-muted-foreground hover:bg-muted/50 font-black text-xs tracking-widest uppercase transition-all" onClick={() => {
            toast.success('Configuration cataloged as draft');
          }}>
            <Save className="h-5 w-5 mr-3" />
            SAVE DRAFT
          </Button>
          <Button className="h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 font-black text-xs tracking-widest uppercase transition-all group overflow-hidden relative" onClick={() => {
            toast.success('Enterprise Configuration Published', {
              description: 'The operational environment has been recalibrated.',
            });
          }}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            <Rocket className="h-5 w-5 mr-3 relative z-10" />
            <span className="relative z-10">PUBLISH ARCHITECTURE</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
