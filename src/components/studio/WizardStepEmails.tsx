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
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Email templates</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Set up the standard emails the platform sends to your team and brokers.
        </p>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Left: Template Rail */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <Label className="text-xs font-black text-primary/40 uppercase tracking-[0.2em]">Contextual Notifications</Label>
          </div>
          <div className="flex-1 overflow-auto pr-2 space-y-1.5 custom-scrollbar">
            {templates.map(template => {
              const Icon = templateTypeIcons[template.type] || Mail;
              const isSelected = template.id === selectedTemplate;
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={cn(
                    "w-full group text-left px-3 py-2.5 rounded-md transition-all duration-200 relative",
                    isSelected
                      ? "bg-muted text-foreground font-medium"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center transition-all",
                      isSelected ? "bg-background border text-foreground" : "bg-muted border text-muted-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm truncate">{templateTypeLabels[template.type] || template.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Premium Editor & Preview */}
        {currentTemplate && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between bg-muted/20 p-2 rounded-lg border">
              <div className="px-3">
                <h3 className="text-sm font-semibold text-foreground">{currentTemplate.name}</h3>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={!showPreview ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className={cn(
                    "h-8 px-4 text-xs font-medium transition-all",
                    !showPreview ? "bg-background shadow-sm border text-foreground" : "text-muted-foreground"
                  )}
                >
                  Editor
                </Button>
                <Button
                  variant={showPreview ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className={cn(
                    "h-8 px-4 text-xs font-medium transition-all",
                    showPreview ? "bg-background shadow-sm border text-foreground" : "text-muted-foreground"
                  )}
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  Preview
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
              <div className="space-y-6 pb-10">
                {/* Subject Row */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground px-1">Message Subject</Label>
                  {showPreview ? (
                    <div className="border rounded-md p-3 bg-muted/10 text-sm font-medium text-foreground">
                      {getPreviewContent(currentTemplate.subject)}
                    </div>
                  ) : (
                    <Input
                      value={currentTemplate.subject}
                      onChange={(e) => handleUpdateTemplate('subject', e.target.value)}
                      className="h-10 rounded-md bg-background text-sm font-medium"
                    />
                  )}
                </div>

                {/* Body Row */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-muted-foreground px-1">Email Payload</Label>
                  {showPreview ? (
                    <div className="rounded-lg p-6 border bg-muted/5 min-h-[300px]">
                      <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                        {getPreviewContent(currentTemplate.body)}
                      </pre>
                    </div>
                  ) : (
                    <Textarea
                      value={currentTemplate.body}
                      onChange={(e) => handleUpdateTemplate('body', e.target.value)}
                      className="min-h-[300px] rounded-lg bg-background p-6 font-mono text-sm leading-relaxed"
                    />
                  )}
                </div>

                {/* Variables Section */}
                <div className="border rounded-lg p-5 bg-muted/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Variable className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs font-medium text-muted-foreground">Dynamic Injections</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentTemplate.variables.map(v => (
                      <button
                        key={v}
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${v}}}`);
                          toast.success(`{{${v}}} copied`);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-background border text-xs font-mono text-muted-foreground hover:bg-muted transition-colors shadow-sm"
                      >
                        <span className="opacity-50">{"{{"}</span>
                        <span className="text-foreground">{v}</span>
                        <span className="opacity-50">{"}}"}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Click a variable to copy the logic tag.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
