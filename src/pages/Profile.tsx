import { User, Mail, AtSign, ShieldCheck, Loader2, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PageShell, PageHeader } from '@/components/layout/PageShell';

const ROLE_LABEL: Record<string, string> = {
    admin: 'Administrator',
    operator: 'Operator',
    viewer: 'Viewer (read-only)',
};

export default function Profile() {
    const { data: user, isLoading } = useQuery({
        queryKey: ['userMe'],
        queryFn: () => api.user.me(),
    });

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
        );
    }

    const initials = user?.first_name && user?.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
        : user?.username?.substring(0, 2).toUpperCase() || 'U';

    const fullName = user?.first_name
        ? `${user.first_name} ${user.last_name}`.trim()
        : user?.username || 'Your account';

    const roleKey: string = user?.role || '';
    const roleLabel = ROLE_LABEL[roleKey] || (roleKey ? roleKey : 'Team member');

    return (
        <PageShell>
            <PageHeader
                eyebrow="Account · My profile"
                title={fullName}
                description="Your account details, as they appear to your team and on the decisions you record."
            />

            {/* Identity strip */}
            <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-full border border-border">
                    <AvatarFallback className="bg-muted text-foreground text-base font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                    <p className="text-base font-semibold text-foreground">{fullName}</p>
                    <Badge variant="info" className="gap-1">
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                        {roleLabel}
                    </Badge>
                </div>
            </div>

            {/* Account details — read-only. There is no self-service edit endpoint,
                so we show real values and point to an admin for changes rather than
                pretending the fields save. */}
            <Card>
                <CardHeader className="border-b border-border">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <User className="h-4 w-4 text-muted-foreground" aria-hidden />
                        Account details
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <dl className="divide-y divide-border">
                        <DetailRow icon={User} label="Full name" value={fullName} />
                        <DetailRow icon={AtSign} label="Username" value={user?.username || '—'} mono />
                        <DetailRow icon={Mail} label="Email" value={user?.email || '—'} />
                        <DetailRow icon={ShieldCheck} label="Role" value={roleLabel} />
                    </dl>
                </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
                <p>
                    To change your name, email, or password, contact your workspace administrator.
                    Your role controls what you can see and do across the platform.
                </p>
            </div>
        </PageShell>
    );
}

function DetailRow({
    icon: Icon, label, value, mono = false,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 px-5 py-3.5">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <dt className="text-sm text-muted-foreground w-32 shrink-0">{label}</dt>
            <dd className={`text-sm text-foreground font-medium min-w-0 truncate ${mono ? 'font-mono' : ''}`}>{value}</dd>
        </div>
    );
}
