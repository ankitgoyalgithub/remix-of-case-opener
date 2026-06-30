import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { ROUTE_LABELS } from './navItems';

interface Crumb {
    label: string;
    to?: string;
}

/**
 * Wayfinding for deep routes. Renders nothing for top-level pages (the page's
 * own <PageHeader> title is enough there) and shows a trail for request
 * sub-pages and Configuration modules, e.g.
 *   Requests › Acme Trading LLC › Review
 *   Configuration › Documents & data capture
 */
export function Breadcrumbs() {
    const { pathname } = useLocation();

    // Pull the company name for request routes (best-effort, cached).
    const requestMatch = pathname.match(/^\/request\/([^/]+)/);
    const requestId = requestMatch?.[1];
    const { data: request } = useQuery({
        queryKey: ['request', requestId],
        queryFn: () => api.requests.get(requestId!),
        enabled: !!requestId,
        staleTime: 60_000,
    });

    const crumbs = buildCrumbs(pathname, (request as any)?.company_name);
    if (crumbs.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center gap-1.5 text-[13px] min-w-0">
                {crumbs.map((c, i) => {
                    const last = i === crumbs.length - 1;
                    return (
                        <li key={`${c.label}-${i}`} className="flex items-center gap-1.5 min-w-0">
                            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" aria-hidden />}
                            {last || !c.to ? (
                                <span
                                    className="text-foreground font-medium truncate max-w-[180px] sm:max-w-[260px]"
                                    aria-current={last ? 'page' : undefined}
                                    title={c.label}
                                >
                                    {c.label}
                                </span>
                            ) : (
                                <Link
                                    to={c.to}
                                    className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[140px]"
                                    title={c.label}
                                >
                                    {c.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function buildCrumbs(pathname: string, companyName?: string): Crumb[] {
    // Request sub-pages: Requests › [Company] › [sub]
    const reqMatch = pathname.match(/^\/request\/([^/]+)(?:\/([^/]+))?/);
    if (reqMatch) {
        const id = reqMatch[1];
        const sub = reqMatch[2];
        const crumbs: Crumb[] = [{ label: 'Requests', to: '/requests' }];
        const company = companyName || 'Request';
        if (sub) {
            crumbs.push({ label: company, to: `/request/${id}` });
            crumbs.push({ label: SUBPAGE_LABELS[sub] ?? sub });
        } else {
            crumbs.push({ label: company });
        }
        return crumbs;
    }

    // Configuration modules: Configuration › [module]
    if (pathname.startsWith('/studio')) {
        const crumbs: Crumb[] = [{ label: 'Configuration', to: '/studio' }];
        if (pathname !== '/studio' && pathname !== '/studio/') {
            const label = ROUTE_LABELS[pathname] ?? STUDIO_EXTRA_LABELS[pathname];
            if (label) crumbs.push({ label });
        }
        return crumbs;
    }

    return [];
}

const SUBPAGE_LABELS: Record<string, string> = {
    workbench: 'Review',
    'evidence-pack': 'Decision file',
};

// Studio routes that aren't in the nav (deep links) but still deserve a crumb.
const STUDIO_EXTRA_LABELS: Record<string, string> = {
    '/studio/setup': 'Setup',
};
