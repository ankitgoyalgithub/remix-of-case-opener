import { useState } from 'react';
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
  X
} from 'lucide-react';
import { mockGlobalSettings, GlobalSettings } from '@/data/mockStudioData';
import { toast } from 'sonner';

export default function StudioSettings() {
  const [settings, setSettings] = useState<GlobalSettings>(mockGlobalSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [newQueue, setNewQueue] = useState('');
  const [newRole, setNewRole] = useState('');

  const handleSave = () => {
    toast.success('Settings saved', {
      description: 'Global configuration updated successfully',
    });
    setHasChanges(false);
  };

  const handleAddQueue = () => {
    if (newQueue.trim() && !settings.defaultQueues.includes(newQueue.trim())) {
      setSettings(prev => ({
        ...prev,
        defaultQueues: [...prev.defaultQueues, newQueue.trim()],
      }));
      setNewQueue('');
      setHasChanges(true);
    }
  };

  const handleRemoveQueue = (queue: string) => {
    setSettings(prev => ({
      ...prev,
      defaultQueues: prev.defaultQueues.filter(q => q !== queue),
    }));
    setHasChanges(true);
  };

  const handleAddRole = () => {
    if (newRole.trim() && !settings.overrideRoles.includes(newRole.trim())) {
      setSettings(prev => ({
        ...prev,
        overrideRoles: [...prev.overrideRoles, newRole.trim()],
      }));
      setNewRole('');
      setHasChanges(true);
    }
  };

  const handleRemoveRole = (role: string) => {
    setSettings(prev => ({
      ...prev,
      overrideRoles: prev.overrideRoles.filter(r => r !== role),
    }));
    setHasChanges(true);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure global defaults and permissions
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <div className="space-y-6">
        {/* SLA Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              SLA Configuration
            </CardTitle>
            <CardDescription>Default SLA targets for request processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Normal Priority (hours)</Label>
                <Input
                  type="number"
                  value={settings.defaultSlaNormal}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, defaultSlaNormal: parseInt(e.target.value) }));
                    setHasChanges(true);
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Urgent Priority (hours)</Label>
                <Input
                  type="number"
                  value={settings.defaultSlaUrgent}
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, defaultSlaUrgent: parseInt(e.target.value) }));
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
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Queue Management
            </CardTitle>
            <CardDescription>Configure available ops queues for request routing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {settings.defaultQueues.map(queue => (
                <Badge key={queue} variant="secondary" className="gap-1.5 py-1.5 px-3">
                  {queue}
                  <button onClick={() => handleRemoveQueue(queue)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add new queue..."
                value={newQueue}
                onChange={(e) => setNewQueue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQueue()}
              />
              <Button variant="outline" onClick={handleAddQueue}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Override Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Override Permissions
            </CardTitle>
            <CardDescription>Configure who can override mismatches and discrepancies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Roles allowed to override</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.overrideRoles.map(role => (
                  <Badge key={role} variant="outline" className="gap-1.5 py-1.5 px-3">
                    {role}
                    <button onClick={() => handleRemoveRole(role)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Input
                  placeholder="Add role..."
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                />
                <Button variant="outline" onClick={handleAddRole}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Override Reason Mandatory</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Require a reason when accepting discrepancies
                </p>
              </div>
              <Switch
                checked={settings.overrideReasonMandatory}
                onCheckedChange={(checked) => {
                  setSettings(prev => ({ ...prev, overrideReasonMandatory: checked }));
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
    </div>
  );
}
