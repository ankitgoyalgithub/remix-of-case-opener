import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { api } from '@/lib/api';

const AUTO_POLL_INTERVAL_MS = 300_000;

/**
 * Custom event emitted after every successful inbound-email auto-poll.
 * Pages listen for it and refetch their data so new matches appear without
 * a manual refresh.
 */
export const INBOUND_POLL_EVENT = 'inbound-email:polled';

export function AppLayout() {
    const inFlightRef = useRef(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        const tick = async () => {
            if (inFlightRef.current) return;
            if (typeof document !== 'undefined' && document.hidden) return;
            inFlightRef.current = true;
            try {
                const res = await api.inboundEmail.accounts.pollAll({ triggered_by: 'auto' } as any);
                window.dispatchEvent(
                    new CustomEvent(INBOUND_POLL_EVENT, { detail: res }),
                );
            } catch {
                // Silent — endpoint is best-effort.
            } finally {
                inFlightRef.current = false;
            }
        };

        const id = window.setInterval(tick, AUTO_POLL_INTERVAL_MS);
        tick();
        return () => window.clearInterval(id);
    }, []);

    return (
        <div className="h-screen flex bg-background">
            {/* Skip link — first focusable element, jumps past the nav to content */}
            <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:z-[100] focus:top-3 focus:left-3 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
                Skip to main content
            </a>

            <Sidebar />
            <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

            <div className="flex-1 min-w-0 flex flex-col">
                <TopBar onOpenMobileNav={() => setMobileNavOpen(true)} />
                <main id="main" tabIndex={-1} className="flex-1 min-h-0 flex flex-col overflow-hidden focus:outline-none">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
