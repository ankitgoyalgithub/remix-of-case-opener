import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Configuration shell.
 *
 * Previously this rendered a SECOND 240px sidebar ("AI Studio") that swapped in
 * over the global rail — the "two-rail split" the revamp removes. Navigation now
 * lives in the ONE persistent left nav (the Configuration group in Sidebar /
 * MobileNav), with plain-language labels defined in src/components/layout/
 * navItems.ts. This file is now just a content wrapper so Configuration pages
 * share the same max-width and rhythm as the rest of the app.
 *
 * The Suspense boundary scopes the lazy-route fallback to the content area so
 * switching between Configuration modules doesn't blank the whole shell.
 */
export default function AIStudioLayout() {
    return (
        <div className="flex-1 min-h-0 overflow-auto bg-background">
            <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 pt-4 lg:pt-5 pb-6 lg:pb-8 space-y-6">
                <Suspense fallback={<ConfigFallback />}>
                    <Outlet />
                </Suspense>
            </div>
        </div>
    );
}

function ConfigFallback() {
    return (
        <div className="flex items-center justify-center py-20 text-muted-foreground" role="status" aria-live="polite">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="sr-only">Loading…</span>
        </div>
    );
}
