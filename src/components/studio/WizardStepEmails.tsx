import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  AlertTriangle,
  Variable,
} from 'lucide-react';
import { useStudioEmails } from '@/hooks/useStudioStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const templateTypeIcons: Record<string, React.ElementType> = {
  'missing-info': AlertCircle,
  'sla-reminder': Clock,
  'escalation': AlertTriangle,
};

const templateTypeLabels: Record<string, string> = {
  'missing-info': 'Missing Information Request',
  'sla-reminder': 'SLA Risk Alert',
  'escalation': 'Escalation',
};

export function WizardStepEmails() {
  const { templates, setTemplates } = useStudioEmails();
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]?.id ?? '');
  const [showPreview, setShowPreview] = useState(false);

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  const handleUpdateTemplate = (field: 'subject' | 'body', value: string) => {
    setTemplates(prev => prev.map(t =>
      t.id === selectedTemplate ? { ...t, [field]: value } : t
    ));
  };

  const getPreviewContent = (text: string) => {
    return text
      .replace(/\{\{RequestID\}\}/g, 'REQ-2024-00142')
      .replace(/\{\{CompanyName\}\}/g, 'Al Noor Trading LLC')
      .replace(/\{\{MissingDocuments\}\}/g, '• Trade License\n• Establishment Card')
      .replace(/\{\{BrokerName\}\}/g, 'Gulf Insurance Brokers')
      .replace(/\{\{RemainingHours\}\}/g, '8')
      .replace(/\{\{CurrentStage\}\}/g, 'Workforce Validation')
      .replace(/\{\{Owner\}\}/g, 'Sarah Ahmed')
      .replace(/\{\{EscalationReason\}\}/g, 'SLA Breach')
      .replace(/\{\{EscalatedBy\}\}/g, 'System');
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Emails & Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Configure notification templates for ops workflows.
        </p>
      </div>

      <div className="flex gap-4">
        {/* Template cards */}
        <div className="w-52 shrink-0 space-y-2">
          {templates.map(template => {
            const Icon = templateTypeIcons[template.type] || Mail;
            const isSelected = template.id === selectedTemplate;
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg text-sm transition-all flex items-center gap-2.5",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted text-muted-foreground border border-transparent"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{templateTypeLabels[template.type] || template.name}</span>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        {currentTemplate && (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{currentTemplate.name}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-1.5"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showPreview ? 'Edit' : 'Preview'}
              </Button>
            </div>

            <div>
              <Label className="text-sm">Subject Line</Label>
              {showPreview ? (
                <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm">
                  {getPreviewContent(currentTemplate.subject)}
                </div>
              ) : (
                <Input
                  value={currentTemplate.subject}
                  onChange={(e) => handleUpdateTemplate('subject', e.target.value)}
                  className="mt-1"
                />
              )}
            </div>

            <div>
              <Label className="text-sm">Email Body</Label>
              {showPreview ? (
                <div className="mt-1 p-4 bg-muted/50 rounded-lg min-h-[200px]">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {getPreviewContent(currentTemplate.body)}
                  </pre>
                </div>
              ) : (
                <Textarea
                  value={currentTemplate.body}
                  onChange={(e) => handleUpdateTemplate('body', e.target.value)}
                  className="mt-1 min-h-[200px] text-sm"
                />
              )}
            </div>

            <div>
              <Label className="text-sm flex items-center gap-1.5">
                <Variable className="h-4 w-4" />
                Available Variables
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentTemplate.variables.map(v => (
                  <Badge
                    key={v}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-primary/10"
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${v}}}`);
                      toast.success(`{{${v}}} copied`);
                    }}
                  >
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
