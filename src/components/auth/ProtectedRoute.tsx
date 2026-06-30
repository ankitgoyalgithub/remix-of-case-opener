import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { Role } from '@/components/layout/navItems';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /**
     * Optional role gate. Pass one role or a list of allowed roles to restrict
     * a route (e.g. the Configuration/Studio group is admin/operator only).
     * Auth (token presence) is always required regardless.
     */
    requiredRole?: Role | Role[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
    const allowed = requiredRole
        ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
        : null;

    // Only fetch the user when a route actually needs a role check. Shares the
    // ['userMe'] cache with TopBar/Sidebar so it's a single request.
    const { data: user } = useQuery({
        queryKey: ['userMe'],
        queryFn: () => api.user.me(),
        enabled: !!allowed && isAuthenticated(),
        staleTime: 5 * 60_000,
    });

    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (allowed) {
        const role = (user as any)?.role as Role | undefined;
        // Fail-safe: only block when we KNOW the role and it isn't allowed.
        // While the role is still loading (undefined) we render through, so an
        // admin is never bounced by a transient fetch.
        // TODO(Phase B): make this strict once /user/me always returns a role.
        if (role && !allowed.includes(role)) {
            return <NoAccess />;
        }
    }

    return <>{children}</>;
};

function NoAccess() {
    return (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
            <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <h1 className="text-base font-semibold text-foreground">You don't have access to this area</h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                    Configuration is limited to administrators and operators. If you think you
                    should have access, ask an administrator to update your role.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-4">
                    <Link to="/dashboard">Back to My Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}
