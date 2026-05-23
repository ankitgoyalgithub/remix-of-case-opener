import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
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
            <Sidebar />
            <div className="flex-1 min-w-0 flex flex-col">
                <TopBar />
                <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
