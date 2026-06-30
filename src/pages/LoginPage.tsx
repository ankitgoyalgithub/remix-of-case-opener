import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import {
    ShieldCheck, Loader2, AlertCircle, ArrowRight,
    LayoutDashboard, FileSearch, ListChecks,
} from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const data = await api.auth.login({ username, password });
            setTokens(data.access, data.refresh);
            toast.success('Welcome back');
            navigate('/dashboard');
        } catch (err: any) {
            console.error('Login failed:', err);
            setError('Invalid username or password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-background flex flex-col">
            {/* Slim top bar — mirrors the in-app TopBar so the transition into the
                app feels continuous, not a marketing-to-tool jump. */}
            <header className="h-14 border-b border-border px-4 md:px-6 flex items-center">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-foreground flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-background" strokeWidth={2.4} aria-hidden />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="ax-brand text-[15px] text-foreground">Insure Auto</span>
                        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">ops</span>
                    </div>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>SOC 2</span>
                    <span className="text-border">·</span>
                    <span>ISO 27001</span>
                    <span className="text-border">·</span>
                    <span>DIFC</span>
                </div>
            </header>

            <main className="relative flex-1 flex items-center justify-center px-4 md:px-6 py-10 md:py-14">
                {/* Restrained atmosphere — a faint grid, the one premium flourish
                    reserved for the sign-in surface. Decorative only. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 ax-grid opacity-50" />

                <div className="relative w-full max-w-[960px] grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
                    {/* Left — value prop, calm */}
                    <div className="hidden lg:block">
                        <p className="page-eyebrow mb-3">Underwriting operations</p>
                        <h1 className="ax-display text-[clamp(28px,3.6vw,40px)] leading-[1.06] max-w-md">
                            Triage, review, and decide — with a record you can stand behind.
                        </h1>
                        <p className="text-sm text-muted-foreground mt-5 max-w-md leading-relaxed">
                            Sign in to see what needs your attention, work through each request, and save every decision with a clear paper trail.
                        </p>

                        <ul className="mt-8 space-y-4 max-w-md">
                            <FeatureRow
                                icon={LayoutDashboard}
                                title="Your queue at a glance"
                                description="See what's due, what's at risk, and what's waiting on a broker — all in one view."
                            />
                            <FeatureRow
                                icon={FileSearch}
                                title="Documents read for you"
                                description="Each file is read and checked against the request, so you can focus on the calls that need your judgement."
                            />
                            <FeatureRow
                                icon={ListChecks}
                                title="Decisions you can defend"
                                description="Every approval and rejection is saved with your reason — an audit-ready record."
                            />
                        </ul>
                    </div>

                    {/* Right — sign-in card */}
                    <div className="w-full max-w-md mx-auto lg:ml-auto">
                        <div className="lg:hidden mb-6">
                            <p className="page-eyebrow mb-2">Underwriting operations</p>
                            <h1 className="ax-display text-[24px] leading-[1.1] text-foreground">
                                Sign in to Insure Auto
                            </h1>
                        </div>

                        <div className="rounded-md border border-border bg-card">
                            <div className="px-6 pt-6 pb-2">
                                <h2 className="text-[18px] font-semibold tracking-tight text-foreground">Sign in</h2>
                                <p className="text-sm text-muted-foreground mt-1">Pick up where you left off.</p>
                            </div>

                            <form onSubmit={handleLogin} className="px-6 pt-5 pb-6 space-y-4">
                                {error && (
                                    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 text-destructive text-sm px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="admin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full gap-1.5" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                            Signing in…
                                        </>
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight className="h-4 w-4" aria-hidden />
                                        </>
                                    )}
                                </Button>

                                <p className="text-xs text-center text-muted-foreground pt-1">
                                    Trouble signing in? Ask your administrator.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-border px-4 md:px-6 h-12 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>© Insure Auto · Underwriting Operations</span>
                <span className="font-mono">Build 2026.05</span>
            </footer>
        </div>
    );
}

function FeatureRow({
    icon: Icon, title, description,
}: {
    icon: any; title: string; description: string;
}) {
    return (
        <li className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-md border border-border bg-muted/40 text-foreground flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4" aria-hidden />
            </div>
            <div>
                <p className="text-[13px] font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{description}</p>
            </div>
        </li>
    );
}
