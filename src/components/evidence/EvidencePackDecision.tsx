import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gavel, Send, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DecisionTrail, PublicationTrail } from '@/types/case';

interface EvidencePackDecisionProps {
    decision?: DecisionTrail;
    publication?: PublicationTrail;
}

export function EvidencePackDecision({ decision, publication }: EvidencePackDecisionProps) {
    if (!decision && !publication) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gavel className="h-5 w-5 text-primary" />
                        Decision & Publication
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No decision recorded yet. Approve or reject the request from the header to log a decision.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-primary" />
                    Decision & Publication
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {decision && (
                    <div className="border border-border rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Badge
                                    className={cn(
                                        'border-0',
                                        decision.outcome === 'Approved'
                                            ? 'bg-success/15 text-success'
                                            : 'bg-destructive/15 text-destructive',
                                    )}
                                >
                                    {decision.outcome}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(decision.at, 'dd MMM yyyy HH:mm')}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                by <span className="font-medium text-foreground">{decision.by || 'System'}</span>
                            </span>
                        </div>
                        {decision.comment && (
                            <p className="text-sm text-foreground whitespace-pre-line">
                                {decision.comment}
                            </p>
                        )}
                    </div>
                )}

                {publication && (
                    <div className="border border-border rounded-md p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Badge className="border-0 bg-primary/15 text-primary flex items-center gap-1">
                                    <Send className="h-3 w-3" /> Published
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(publication.at, 'dd MMM yyyy HH:mm')}
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                by <span className="font-medium text-foreground">{publication.by || 'System'}</span>
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Data pushed to the core policy system.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
