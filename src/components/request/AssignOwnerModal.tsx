import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { OPS_TEAM_MEMBERS } from '@/types/case';

interface AssignOwnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOwner: string;
  currentQueue: string;
  onAssign: (owner: string, queue: 'Senior Ops Queue' | 'Standard Ops Queue') => void;
}

export function AssignOwnerModal({
  open,
  onOpenChange,
  currentOwner,
  currentQueue,
  onAssign,
}: AssignOwnerModalProps) {
  const [selectedOwner, setSelectedOwner] = useState<string>(currentOwner);
  const [selectedQueue, setSelectedQueue] = useState<string>(currentQueue);

  const handleAssign = () => {
    const member = OPS_TEAM_MEMBERS.find(m => m.name === selectedOwner);
    if (member) {
      onAssign(member.name, member.queue);
      onOpenChange(false);
      toast.success(`Request assigned to ${member.name}`);
    } else if (selectedOwner === 'Unassigned') {
      onAssign('Unassigned', selectedQueue as 'Senior Ops Queue' | 'Standard Ops Queue');
      onOpenChange(false);
      toast.success('Request unassigned');
    }
  };

  const handleOwnerChange = (value: string) => {
    setSelectedOwner(value);
    // Auto-update queue based on selected owner
    const member = OPS_TEAM_MEMBERS.find(m => m.name === value);
    if (member) {
      setSelectedQueue(member.queue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Owner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={selectedOwner} onValueChange={handleOwnerChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Unassigned">
                  <span className="text-muted-foreground">Unassigned</span>
                </SelectItem>
                {OPS_TEAM_MEMBERS.map(member => (
                  <SelectItem key={member.id} value={member.name}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.queue}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Queue</Label>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{selectedQueue}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Queue is automatically set based on owner assignment.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
