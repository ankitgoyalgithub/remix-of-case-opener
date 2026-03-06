import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { setTokens } from '@/lib/auth';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
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
            toast.success('Successfully logged in');
            navigate('/requests');
        } catch (err: any) {
            console.error('Login failed:', err);
            setError('Invalid username or password. Please try again.');
            toast.error('Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-zinc-950 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 p-1.5 rounded-3xl bg-white shadow-2xl mb-6 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                        <img src="/logo.png" alt="InsureAuto Logo" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black tracking-tight text-white mb-1 uppercase bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                            InsureAuto
                        </h1>
                        <p className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase opacity-80">
                            Precision Risk Automation
                        </p>
                    </div>
                </div>

                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-xl">Sign In</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Access your workspace with your admin credentials.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4 text-zinc-300">
                            {error && (
                                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 focus:border-primary"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 focus:border-primary"
                                    required
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col">
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Sign In
                            </Button>
                            <p className="text-xs text-center text-zinc-500 mt-4">
                                Dubai International Financial Centre (DIFC) Compliance Mode
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
