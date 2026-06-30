import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Save,
  Clock,
  Users,
  Shield,
  AlertCircle,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface GlobalSettings {
  id?: number;
  default_sla_normal: number;
  default_sla_urgent: number;
  default_queues: string[];
  override_roles: string[];
  override_reason_mandatory: boolean;
}

export default function StudioSettings() {
  const queryClient = useQueryClient();

  const { data: globalSettings, isLoading } = useQuery<GlobalSettings>({
    queryKey: ['globalSettings'],
    queryFn: () => api.settings.get(),
  });

  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [newQueue, setNewQueue] = useState('');
  const [newRole, setNewRole] = useState('');

  // Sync state when data loads
  useEffect(() => {
    if (globalSettings) {
      setSettings(globalSettings);
      setHasChanges(false);
    }
  }, [globalSettings]);

  const updateMutation = useMutation({
    mutationFn: (newSettings: GlobalSettings) => api.settings.update(newSettings),
    onSuccess: (data) => {
      queryClient.setQueryData(['globalSettings'], data);
      toast.success('Saved', {
        description: 'Your workspace rules have been updated.',
      });
      setHasChanges(false);
    },
    onError: () => {
      toast.error("We couldn't save your changes. Please try again.");
    }
  });

  const handleSave = () => {
    if (settings) {
      updateMutation.mutate(settings);
    }
  };

  const handleAddQueue = () => {
    if (settings && newQueue.trim() && !settings.default_queues.includes(newQueue.trim())) {
      setSettings(prev => prev ? ({
        ...prev,
        default_queues: [...prev.default_queues, newQueue.trim()],
      }) : null);
      setNewQueue('');
      setHasChanges(true);
    }
  };

  const handleRemoveQueue = (queue: string) => {
    setSettings(prev => prev ? ({
      ...prev,
      default_queues: prev.default_queues.filter(q => q !== queue),
    }) : null);
    setHasChanges(true);
  };

  const handleAddRole = () => {
    if (settings && newRole.trim() && !settings.override_roles.includes(newRole.trim())) {
      setSettings(prev => prev ? ({
        ...prev,
        override_roles: [...prev.override_roles, newRole.trim()],
      }) : null);
      setNewRole('');
      setHasChanges(true);
    }
  };

  const handleRemoveRole = (role: string) => {
    setSettings(prev => prev ? ({
      ...prev,
      override_roles: prev.override_roles.filter(r => r !== role),
    }) : null);
    setHasChanges(true);
  };

  if (isLoading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Configuration · Workspace rules"
        title="Workspace rules"
        description="Set the defaults that apply across your workspace — deadlines, the teams requests can be assigned to, and who can approve anyway."
        actions={
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending} size="sm" className="gap-1.5">
            {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" aria-hidden />}
            Save changes
          </Button>
        }
      />

      <div className="space-y-4">
        {/* SLA Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" aria-hidden />
              Deadlines
            </CardTitle>
            <CardDescription className="text-xs">How long the team has to decide a new request, by priority.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sla-normal">Normal priority (hours)</Label>
                <Input
                  id="sla-normal"
                  type="number"
                  value={settings.default_sla_normal}
                  onChange={(e) => {
                    setSettings(prev => prev ? ({ ...prev, default_sla_normal: parseInt(e.target.value) }) : null);
                    setHasChanges(true);
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sla-urgent">Urgent priority (hours)</Label>
                <Input
                  id="sla-urgent"
                  type="number"
                  value={settings.default_sla_urgent}
                  onChange={(e) => {
                    setSettings(prev => prev ? ({ ...prev, default_sla_urgent: parseInt(e.target.value) }) : null);
                    setHasChanges(true);
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Queue Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden />
              Assigned teams
            </CardTitle>
            <CardDescription className="text-xs">The teams a request can be assigned to.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings.default_queues.map(queue => (
                <Badge key={queue} variant="secondary" className="gap-1.5 py-1.5 px-3">
                  {queue}
                  <button onClick={() => handleRemoveQueue(queue)} className="ml-1 hover:text-destructive" aria-label={`Remove team ${queue}`}>
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Label htmlFor="new-team" className="sr-only">Add a team</Label>
              <Input
                id="new-team"
                placeholder="Add a team…"
                value={newQueue}
                onChange={(e) => setNewQueue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQueue()}
              />
              <Button variant="outline" onClick={handleAddQueue} aria-label="Add team">
                <Plus className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Override Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" aria-hidden />
              Approving anyway
            </CardTitle>
            <CardDescription className="text-xs">Who can approve a request even when something doesn't match, and whether they must give a reason.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Roles allowed to approve anyway</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.override_roles.map(role => (
                  <Badge key={role} variant="outline" className="gap-1.5 py-1.5 px-3">
                    {role}
                    <button onClick={() => handleRemoveRole(role)} className="ml-1 hover:text-destructive" aria-label={`Remove role ${role}`}>
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Label htmlFor="new-role" className="sr-only">Add a role</Label>
                <Input
                  id="new-role"
                  placeholder="Add a role…"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                />
                <Button variant="outline" onClick={handleAddRole} aria-label="Add role">
                  <Plus className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="reason-required">Require a reason</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ask for a written reason whenever someone approves anyway.
                </p>
              </div>
              <Switch
                id="reason-required"
                checked={settings.override_reason_mandatory}
                onCheckedChange={(checked) => {
                  setSettings(prev => prev ? ({ ...prev, override_reason_mandatory: checked }) : null);
                  setHasChanges(true);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Configuration Note</p>
            <p className="mt-1">
              Changes made here affect all future requests. Existing requests will continue with their original settings.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
