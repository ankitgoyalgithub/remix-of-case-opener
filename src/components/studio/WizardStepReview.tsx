import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      title: 'Workflow Stages',
      count: stages.length,
      status: stages.length > 0 ? 'complete' : 'warning',
      details: `${stages.length} stages defined, ${stages.filter(s => s.slaHours).length} with SLA targets`,
    },
    {
      icon: FileText,
      title: 'Document Library',
      count: documents.length,
      status: documents.length > 0 ? 'complete' : 'warning',
      details: `${documents.filter(d => d.mandatory).length} required, ${documents.filter(d => !d.mandatory).length} optional documents`,
    },
    {
      icon: Database,
      title: 'Fields to Extract',
      count: fields.length,
      status: fields.length > 0 ? 'complete' : 'warning',
      details: `${fields.filter(f => f.mandatory).length} required fields across ${new Set(fields.map(f => f.documentType)).size} document types`,
    },
    {
      icon: Brain,
      title: 'AI Notes',
      count: instructions.length,
      status: instructions.length < documents.length ? 'warning' : 'complete',
      details: instructions.length < documents.length
        ? `${documents.length - instructions.length} documents missing extraction guidance`
        : 'All document types have extraction guidance configured',
    },
    {
      icon: ClipboardCheck,
      title: 'Stage Checklist',
      count: checklist.length,
      status: checklist.length > 0 ? 'complete' : 'warning',
      details: `${checklist.filter(c => c.required).length} required items, ${checklist.filter(c => c.autoCheckRule !== 'manual').length} auto-checked`,
    },
    {
      icon: Mail,
      title: 'Email Templates',
      count: templates.length,
      status: templates.length > 0 ? 'complete' : 'warning',
      details: `${templates.length} templates configured`,
    },
  ];

  const warnings = sections.filter(s => s.status === 'warning');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">
          Review your configuration before publishing. Changes will apply to new requests only.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{section.title}</span>
                  </div>
                  {section.status === 'complete' ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                </div>
                <p className="text-2xl font-bold">{section.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{section.details}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-sm">Soft Warnings</p>
                <ul className="mt-1 space-y-1">
                  {warnings.map(w => (
                    <li key={w.title} className="text-sm text-muted-foreground">
                      • {w.details}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          ⚠️ Publishing only updates AI Ops Studio configuration. It does NOT affect in-flight requests.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => {
            toast.success('Configuration saved as draft');
          }}>
            <Save className="h-4 w-4" />
            Save as Draft
          </Button>
          <Button className="gap-2" onClick={() => {
            toast.success('Configuration published', {
              description: 'New requests will use the updated configuration',
            });
          }}>
            <Rocket className="h-4 w-4" />
            Publish Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
