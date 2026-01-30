import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Save, 
  Edit2,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  AlertTriangle,
  Check,
  Variable
} from 'lucide-react';
import { mockEmailTemplates, EmailTemplate } from '@/data/mockStudioData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const templateTypeIcons = {
  'missing-info': AlertCircle,
  'sla-reminder': Clock,
  'escalation': AlertTriangle,
};

const templateTypeColors = {
  'missing-info': 'bg-warning/10 text-warning border-warning/20',
  'sla-reminder': 'bg-info/10 text-info border-info/20',
  'escalation': 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockEmailTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const currentTemplate = templates.find(t => t.id === selectedTemplate);

  const handleUpdateTemplate = (field: 'subject' | 'body', value: string) => {
    setTemplates(prev => prev.map(t => 
      t.id === selectedTemplate ? { ...t, [field]: value } : t
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success('Email templates saved', {
      description: `${templates.length} templates configured`,
    });
    setHasChanges(false);
  };

  const handleCopy = () => {
    if (currentTemplate) {
      navigator.clipboard.writeText(`Subject: ${currentTemplate.subject}\n\n${currentTemplate.body}`);
      toast.success('Template copied to clipboard');
    }
  };

  // Preview with sample data
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
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Email Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure notification templates for ops workflows
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Templates
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Template List */}
        <div className="space-y-3">
          {templates.map(template => {
            const Icon = templateTypeIcons[template.type];
            const isSelected = template.id === selectedTemplate;
            return (
              <Card 
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all",
                  isSelected ? "ring-2 ring-primary" : "hover:border-primary/30"
                )}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      templateTypeColors[template.type]
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {template.type.replace('-', ' ')}
                      </p>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Template Editor */}
        <div className="col-span-2">
          {currentTemplate && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{currentTemplate.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowPreview(!showPreview)}
                      className="gap-1.5"
                    >
                      {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showPreview ? 'Edit' : 'Preview'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject */}
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

                {/* Body */}
                <div>
                  <Label className="text-sm">Email Body</Label>
                  {showPreview ? (
                    <div className="mt-1 p-4 bg-muted/50 rounded-lg min-h-[250px]">
                      <pre className="text-sm whitespace-pre-wrap font-sans">
                        {getPreviewContent(currentTemplate.body)}
                      </pre>
                    </div>
                  ) : (
                    <Textarea
                      value={currentTemplate.body}
                      onChange={(e) => handleUpdateTemplate('body', e.target.value)}
                      className="mt-1 min-h-[250px] font-mono text-sm"
                    />
                  )}
                </div>

                {/* Variables */}
                <div>
                  <Label className="text-sm flex items-center gap-1.5">
                    <Variable className="h-4 w-4" />
                    Available Variables
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {currentTemplate.variables.map(variable => (
                      <Badge 
                        key={variable} 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable}}}`);
                          toast.success(`{{${variable}}} copied`);
                        }}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click a variable to copy. Variables are replaced with actual values at send time.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
