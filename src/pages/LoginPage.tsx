import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import {
    ShieldCheck, Loader2, AlertCircle, Sparkles, LayoutDashboard,
    Zap, Lock, ArrowRight,
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
        <div className="h-screen w-full flex bg-background relative overflow-hidden">
            {/* Soft animated accents */}
            <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-[pulse_8s_ease-in-out_infinite]" />
            <div className="absolute -bottom-32 -right-24 w-[460px] h-[460px] bg-info/15 rounded-full blur-[120px] pointer-events-none animate-[pulse_10s_ease-in-out_infinite]" />
            <div className="absolute top-1/2 left-1/3 w-[320px] h-[320px] bg-warning/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Left: brand + value */}
                    <div className="hidden lg:flex flex-col gap-8 animate-in fade-in slide-in-from-left-4 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                                <ShieldCheck className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-lg font-semibold tracking-tight">InsureAuto</p>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-[0.2em]">Operations platform</p>
                            </div>
                        </div>

                        <div>
                            <h1 className="text-4xl font-semibold tracking-tight text-foreground leading-tight">
                                Automate the ops.<br />
                                <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                                    Keep the judgment.
                                </span>
                            </h1>
                            <p className="text-sm text-muted-foreground mt-3 max-w-md leading-relaxed">
                                Document intake, extraction, verification, and risk screening in one workbench — with a paper trail your regulator will love.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 max-w-md">
                            <FeatureRow
                                icon={LayoutDashboard}
                                title="Live operations dashboard"
                                description="SLA health, risk distribution, and agent performance in one view."
                            />
                            <FeatureRow
                                icon={Zap}
                                title="AI-backed extraction"
                                description="Documents turn into structured fields with confidence scoring."
                            />
                            <FeatureRow
                                icon={Lock}
                                title="Auditable decisions"
                                description="Every approve/reject carries the agent trace + operator comment."
                            />
                        </div>
                    </div>

                    {/* Right: login card */}
                    <div className="w-full max-w-md mx-auto lg:mx-0 lg:ml-auto animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="lg:hidden flex items-center gap-2.5 mb-6">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
                                <ShieldCheck className="h-4 w-4 text-white" />
                            </div>
                            <p className="text-base font-semibold tracking-tight">InsureAuto</p>
                        </div>

                        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-xl shadow-xl shadow-black/5 overflow-hidden">
                            <div className="px-7 pt-7 pb-2">
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                                    <Sparkles className="h-3 w-3" />
                                    Sign in
                                </div>
                                <h2 className="text-2xl font-semibold tracking-tight mt-2">Welcome back</h2>
                                <p className="text-sm text-muted-foreground mt-1">Pick up where you left off.</p>
                            </div>

                            <form onSubmit={handleLogin} className="px-7 pt-5 pb-6 space-y-4">
                                {error && (
                                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {error}
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                                    <Input
                                        id="username"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="admin"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="h-10 bg-background"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="h-10 bg-background"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-10 gap-1.5 shadow-md shadow-primary/25 group relative overflow-hidden"
                                    disabled={loading}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Signing in…
                                        </>
                                    ) : (
                                        <>
                                            Sign in
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                                        </>
                                    )}
                                </Button>

                                <p className="text-[11px] text-center text-muted-foreground pt-2">
                                    Trouble signing in? Ask your administrator.
                                </p>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({
    icon: Icon, title, description,
}: {
    icon: any; title: string; description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-inset ring-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4" />
            </div>
            <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}
