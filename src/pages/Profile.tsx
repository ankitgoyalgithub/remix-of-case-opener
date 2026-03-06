import { useState } from 'react';
import { User, Mail, Shield, Bell, Camera, MapPin, Briefcase, Globe, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function Profile() {
    const { data: user, isLoading } = useQuery({
        queryKey: ['userMe'],
        queryFn: () => api.user.me(),
    });

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise(r => setTimeout(r, 1000));
        setIsSaving(false);
        toast.success('Profile updated successfully');
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const initials = user?.first_name && user?.last_name
        ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
        : user?.username?.substring(0, 2).toUpperCase() || 'AD';

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <Avatar className="h-24 w-24 border-4 border-background shadow-2xl rounded-3xl overflow-hidden ring-1 ring-primary/10">
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">{initials}</AvatarFallback>
                        </Avatar>
                        <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-xl shadow-lg hover:scale-110 transition-transform border-4 border-background">
                            <Camera className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                            {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username || 'System Admin'}
                            <Badge className="bg-success/10 text-success border-success/20 font-bold uppercase tracking-widest text-[10px] px-2 py-0.5">Verified</Badge>
                        </h1>
                        <p className="text-muted-foreground font-medium flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Senior Operations Lead · <span className="text-primary font-bold tracking-tight lowercase">stratiq.labs</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl font-bold text-xs uppercase tracking-wider px-6 border-primary/20 hover:bg-primary/5">Discard</Button>
                    <Button
                        className="rounded-xl font-black text-xs uppercase tracking-widest px-8 shadow-lg shadow-primary/20"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden">
                        <CardHeader className="bg-primary/5 border-b border-primary/5 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                                <User className="h-4 w-4" />
                                Personal Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">First Name</Label>
                                <Input id="firstName" defaultValue={user?.first_name || 'Ankit'} className="bg-background/50 border-border/50 rounded-xl font-bold py-6 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Last Name</Label>
                                <Input id="lastName" defaultValue={user?.last_name || 'Sharma'} className="bg-background/50 border-border/50 rounded-xl font-bold py-6 focus:ring-primary/20" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="email" defaultValue={user?.email || 'ankit@stratiq.com'} className="pl-11 bg-background/50 border-border/50 rounded-xl font-bold py-6 focus:ring-primary/20" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Location</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input id="location" defaultValue="Dubai, UAE" className="pl-11 bg-background/50 border-border/50 rounded-xl font-bold py-6 focus:ring-primary/20" />
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <Label htmlFor="bio" className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Professional Bio</Label>
                                <textarea
                                    id="bio"
                                    className="w-full min-h-[120px] p-4 bg-background/50 border border-border/50 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                                    placeholder="Tell us about yourself..."
                                    defaultValue="Leading insurance operations with a focus on AI-driven automation and zero-touch processing."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden">
                        <CardHeader className="bg-indigo-500/5 border-b border-indigo-500/5 pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 text-indigo-500">
                                <Shield className="h-4 w-4" />
                                Security & Authentication
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/40 group hover:border-indigo-500/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <Shield className="h-5 w-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">Two-Factor Authentication</h4>
                                        <p className="text-[11px] text-muted-foreground">Add an extra layer of security to your account.</p>
                                    </div>
                                </div>
                                <Badge className="bg-success text-white font-bold uppercase text-[9px]">Active</Badge>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border/40 group hover:border-indigo-500/30 transition-all opacity-60">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                        <Globe className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold">Authorized Devices</h4>
                                        <p className="text-[11px] text-muted-foreground">Manage devices currently logged into your account.</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-wider">Review</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card className="glass-card border-none shadow-none bg-primary/5 overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Star className="h-4 w-4 fill-primary" />
                                User Level
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                                    <span>Elite Operations</span>
                                    <span className="text-primary text-opacity-80">92% to Legend</span>
                                </div>
                                <div className="h-3 w-full bg-primary/10 rounded-full overflow-hidden p-0.5">
                                    <div className="h-full w-[92%] bg-gradient-to-r from-primary to-primary-foreground/30 rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]"></div>
                                </div>
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground leading-relaxed italic">
                                You've processed 1,240 requests this month with 99.8% accuracy. Keep it up!
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none shadow-none bg-card/40 overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Regional Details</CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-border/40">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Timezone</span>
                                <span className="text-xs font-black tracking-tight">(GMT+04:00) Dubai</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border/40">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Language</span>
                                <span className="text-xs font-black tracking-tight">English (International)</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60">Currency</span>
                                <span className="text-xs font-black tracking-tight">AED (Dirham)</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function Star(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    )
}
