import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';
import { api } from '@/lib/api';

const AUTO_POLL_INTERVAL_MS = 10_000;

/**
 * Custom event emitted after every successful inbound-email auto-poll. Pages
 * (Inbox, Studio Inbound, Jobs) listen for it and refetch their data so new
 * matches appear without a manual refresh.
 */
export const INBOUND_POLL_EVENT = 'inbound-email:polled';

export function AppLayout() {
    const inFlightRef = useRef(false);

    // Background poll every 10 seconds while the user is signed in. We dedupe
    // overlapping calls (the previous poll might still be running when the
    // next tick fires) and stay quiet on errors so a flaky network doesn't
    // spam toasts.
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
                // Silent — endpoint is best-effort. The Jobs page surfaces failures.
            } finally {
                inFlightRef.current = false;
            }
        };

        const id = window.setInterval(tick, AUTO_POLL_INTERVAL_MS);
        // Kick off one immediate poll so users don't wait the first 10s.
        tick();
        return () => window.clearInterval(id);
    }, []);

    return (
        <div className="h-screen flex flex-col bg-background">
            <GlobalHeader />
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}
