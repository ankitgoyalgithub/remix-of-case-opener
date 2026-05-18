import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users as UsersIcon, Plus, Search, Loader2, KeyRound, Trash2, Shield, Eye, Pencil, Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'operator' | 'viewer';

interface AppUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
  role: Role;
}

const ROLE_META: Record<Role, { label: string; description: string; tone: string }> = {
  admin:    { label: 'Admin',    description: 'Full access, can manage users.', tone: 'bg-destructive/10 text-destructive border-destructive/30' },
  operator: { label: 'Operator', description: 'Works on requests day-to-day.',  tone: 'bg-info/10 text-info border-info/30' },
  viewer:   { label: 'Viewer',   description: 'Read-only access.',               tone: 'bg-muted text-muted-foreground border-border' },
};

interface FormState {
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  is_active: boolean;
  password: string;
}

const blankForm: FormState = {
  email: '', first_name: '', last_name: '',
  role: 'operator', is_active: true, password: '',
};

interface Props {
  /** The currently signed-in user. We hide destructive actions on their own row. */
  currentUserId?: number;
}

export function UsersPanel({ currentUserId }: Props) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [resetting, setResetting] = useState<AppUser | null>(null);

  const [form, setForm] = useState<FormState>(blankForm);
  const [resetPassword, setResetPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await api.users.list()) as AppUser[];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      // Most likely cause: not a superuser. Show a graceful fallback.
      const msg = err?.message || 'Failed to load users';
      const denied = /401|403|unauth/i.test(msg);
      setError(denied
        ? 'You need admin access to manage users. Ask an administrator to grant you the role.'
        : msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const openCreate = () => { setForm({ ...blankForm }); setCreateOpen(true); };

  const openEdit = (u: AppUser) => {
    setForm({
      email: u.email, first_name: u.first_name, last_name: u.last_name,
      role: u.role, is_active: u.is_active, password: '',
    });
    setEditing(u);
  };

  const handleCreate = async () => {
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    setBusy(true);
    try {
      const payload: any = {
        email: form.email.trim(),
        first_name: form.first_name,
        last_name: form.last_name,
        role_input: form.role,
        is_active: form.is_active,
      };
      if (form.password.trim()) payload.password = form.password;
      await api.users.create(payload);
      toast.success('User created', {
        description: form.password
          ? 'Share the temporary password with them securely.'
          : 'A random password was set — use Reset password to send them a known one.',
      });
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not create user');
    } finally { setBusy(false); }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      const payload: any = {
        email: form.email.trim(),
        first_name: form.first_name,
        last_name: form.last_name,
        role_input: form.role,
        is_active: form.is_active,
      };
      await api.users.update(editing.id, payload);
      toast.success('User updated');
      setEditing(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not update user');
    } finally { setBusy(false); }
  };

  const handleDelete = async (u: AppUser) => {
    setBusy(true);
    try {
      await api.users.delete(u.id);
      toast.success(`${u.full_name || u.email} deleted`);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete user');
    } finally { setBusy(false); }
  };

  const handleReset = async () => {
    if (!resetting) return;
    if (resetPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setBusy(true);
    try {
      await api.users.resetPassword(resetting.id, resetPassword);
      toast.success('Password reset');
      setResetting(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not reset password');
    } finally { setBusy(false); }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Users</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Add team members, set their role, and reset access when needed.
                </CardDescription>
              </div>
            </div>
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" />
              Add user
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-5 py-3 border-b border-border">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search users by name or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                {search ? 'No users match your search.' : 'No users yet.'}
              </p>
              {!search && (
                <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={openCreate}>
                  <Plus className="h-3.5 w-3.5" />
                  Add the first user
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold shrink-0">
                    {(u.full_name || u.email)[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{u.full_name || u.username || u.email}</p>
                      <Badge variant="outline" className={cn('text-[10px] uppercase', ROLE_META[u.role].tone)}>
                        {u.role === 'admin' && <Shield className="h-2.5 w-2.5 mr-1" />}
                        {u.role === 'viewer' && <Eye className="h-2.5 w-2.5 mr-1" />}
                        {ROLE_META[u.role].label}
                      </Badge>
                      {!u.is_active && <Badge variant="outline" className="text-[10px] uppercase bg-muted">Disabled</Badge>}
                      {currentUserId === u.id && <Badge variant="outline" className="text-[10px] uppercase">You</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {u.email}
                      {u.last_login && (
                        <> · last seen {format(new Date(u.last_login), 'dd MMM HH:mm')}</>
                      )}
                      {!u.last_login && <> · never signed in</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setResetting(u); setResetPassword(''); }} title="Reset password">
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    {currentUserId !== u.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {u.full_name || u.email}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              The user will lose access immediately. Their existing comments and decisions stay attached for the audit trail. This can't be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(u)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete user
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>They'll be able to sign in with the email + password you set here.</DialogDescription>
          </DialogHeader>
          <UserForm form={form} onChange={setForm} mode="create" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Add user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit {editing?.full_name || editing?.email}</DialogTitle>
            <DialogDescription>Use Reset password if you need to change their sign-in credentials.</DialogDescription>
          </DialogHeader>
          <UserForm form={form} onChange={setForm} mode="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetting !== null} onOpenChange={(v) => { if (!v) { setResetting(null); setResetPassword(''); }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password for {resetting?.full_name || resetting?.email}</DialogTitle>
            <DialogDescription>Send the new password to them through a secure channel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">New password</Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={resetPassword}
              onChange={e => setResetPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)} disabled={busy}>Cancel</Button>
            <Button onClick={handleReset} disabled={busy || resetPassword.length < 8}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UserForm({
  form, onChange, mode,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  mode: 'create' | 'edit';
}) {
  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">First name</Label>
          <Input value={form.first_name} onChange={e => onChange({ ...form, first_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Last name</Label>
          <Input value={form.last_name} onChange={e => onChange({ ...form, last_name: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={e => onChange({ ...form, email: e.target.value })}
          placeholder="user@company.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Role</Label>
        <Select value={form.role} onValueChange={(v) => onChange({ ...form, role: v as Role })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['admin', 'operator', 'viewer'] as Role[]).map(r => (
              <SelectItem key={r} value={r}>
                <div className="flex flex-col">
                  <span className="font-medium">{ROLE_META[r].label}</span>
                  <span className="text-[11px] text-muted-foreground">{ROLE_META[r].description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {mode === 'create' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Initial password <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={e => onChange({ ...form, password: e.target.value })}
            placeholder="Leave blank to auto-generate"
          />
          <p className="text-[10px] text-muted-foreground">
            Leave blank and we'll set a random one — use <strong>Reset password</strong> to set a known value later.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <Label className="text-sm">Active</Label>
          <p className="text-[11px] text-muted-foreground">Disabled users can't sign in.</p>
        </div>
        <Switch checked={form.is_active} onCheckedChange={(v) => onChange({ ...form, is_active: v })} />
      </div>
    </div>
  );
}
