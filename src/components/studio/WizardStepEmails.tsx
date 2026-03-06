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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Communication Engine</h2>
        <p className="text-sm font-medium text-muted-foreground/70">
          Customize the autonomous notification templates for all processing cycles.
        </p>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        {/* Left: Template Rail */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <Label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Contextual Notifications</Label>
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
                    "w-full group text-left px-4 py-3.5 rounded-2xl transition-all duration-300 relative overflow-hidden active:scale-95",
                    isSelected
                      ? "bg-primary text-white shadow-lg shadow-primary/20 border-t border-white/20"
                      : "hover:bg-primary/5 text-muted-foreground border border-transparent"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                  )}

                  <div className="flex items-center gap-3 relative z-10">
                    <div className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                      isSelected ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold tracking-tight truncate">{templateTypeLabels[template.type] || template.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Premium Editor & Preview */}
        {currentTemplate && (
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex items-center justify-between glass p-2 rounded-2xl border-border/40">
              <div className="px-4">
                <h3 className="text-sm font-black tracking-tight text-foreground">{currentTemplate.name}</h3>
              </div>
              <div className="flex gap-1">
                <Button
                  variant={!showPreview ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowPreview(false)}
                  className={cn(
                    "h-10 px-6 rounded-xl font-bold text-[10px] tracking-widest transition-all",
                    !showPreview ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground"
                  )}
                >
                  EDITOR
                </Button>
                <Button
                  variant={showPreview ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowPreview(true)}
                  className={cn(
                    "h-10 px-6 rounded-xl font-bold text-[10px] tracking-widest transition-all",
                    showPreview ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground"
                  )}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  PREVIEW
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
              <div className="space-y-6 pb-10">
                {/* Subject Row */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-1">Message Subject</Label>
                  {showPreview ? (
                    <div className="glass-card rounded-2xl p-4 border-primary/10 bg-primary/5 text-sm font-bold tracking-tight text-primary">
                      {getPreviewContent(currentTemplate.subject)}
                    </div>
                  ) : (
                    <Input
                      value={currentTemplate.subject}
                      onChange={(e) => handleUpdateTemplate('subject', e.target.value)}
                      className="h-12 rounded-xl bg-background border-border/50 text-sm font-bold tracking-tight"
                    />
                  )}
                </div>

                {/* Body Row */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] px-1">Email Payload</Label>
                  {showPreview ? (
                    <div className="glass-card rounded-[2rem] p-8 border-border/40 min-h-[300px] shadow-inner">
                      <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                        {getPreviewContent(currentTemplate.body)}
                      </pre>
                    </div>
                  ) : (
                    <Textarea
                      value={currentTemplate.body}
                      onChange={(e) => handleUpdateTemplate('body', e.target.value)}
                      className="min-h-[300px] rounded-[2rem] bg-background border-border/50 text-sm font-medium leading-relaxed p-6 focus-visible:ring-primary/20"
                    />
                  )}
                </div>

                {/* Variables Section */}
                <div className="glass-card rounded-3xl p-6 border-primary/10 bg-primary/5">
                  <div className="flex items-center gap-2 mb-4">
                    <Variable className="h-4 w-4 text-primary" />
                    <Label className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Dynamic Injections</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentTemplate.variables.map(v => (
                      <button
                        key={v}
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${v}}}`);
                          toast.success(`{{${v}}} copied`);
                        }}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-primary/10 text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        <span className="opacity-40 group-hover:opacity-100 italic">{"{{"}</span>
                        {v}
                        <span className="opacity-40 group-hover:opacity-100 italic">{"}}"}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-medium text-primary/40 mt-4 uppercase tracking-tighter">Click a variable to copy the logic tag</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
