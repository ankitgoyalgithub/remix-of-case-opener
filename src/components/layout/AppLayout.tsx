import { Outlet } from 'react-router-dom';
import { GlobalHeader } from './GlobalHeader';

export function AppLayout() {
    return (
        <div className="h-screen flex flex-col bg-background">
            <GlobalHeader />
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}
