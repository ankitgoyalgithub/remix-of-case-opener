import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Document, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { format } from 'date-fns';
import { ArrowRightLeft, ExternalLink, GitCompare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface ExtractionDiffDialogProps {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    previous?: Document;
    current?: Document;
}

type ScalarChange = {
    label: string;
    kind: 'changed' | 'added' | 'removed' | 'unchanged';
    oldValue: any;
    newValue: any;
};

function unwrap(raw: any): any {
    if (raw && typeof raw === 'object' && 'value' in raw) return raw.value;
    return raw;
}

function equalish(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null && b == null) return true;
    if (typeof a === 'object' && typeof b === 'object') {
        try {
            return JSON.stringify(a) === JSON.stringify(b);
        } catch {
            return false;
        }
    }
    const sa = a == null ? '' : String(a).trim();
    const sb = b == null ? '' : String(b).trim();
    return sa.toLowerCase() === sb.toLowerCase();
}

function diffExtractions(prev: Record<string, any>, curr: Record<string, any>): ScalarChange[] {
    const keys = new Set<string>([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
    const out: ScalarChange[] = [];
    keys.forEach(key => {
        const p = unwrap(prev?.[key]);
        const c = unwrap(curr?.[key]);
        const pPresent = prev && key in prev && p !== undefined && p !== null && p !== '';
        const cPresent = curr && key in curr && c !== undefined && c !== null && c !== '';

        if (!pPresent && cPresent) {
            out.push({ label: key, kind: 'added', oldValue: p, newValue: c });
        } else if (pPresent && !cPresent) {
            out.push({ label: key, kind: 'removed', oldValue: p, newValue: c });
        } else if (pPresent && cPresent) {
            if (equalish(p, c)) {
                out.push({ label: key, kind: 'unchanged', oldValue: p, newValue: c });
            } else {
                out.push({ label: key, kind: 'changed', oldValue: p, newValue: c });
            }
        }
    });
    return out;
}

function stringify(v: any): string {
    if (v == null || v === '') return '—';
    if (typeof v === 'object') {
        try {
            return JSON.stringify(v, null, 2);
        } catch {
            return String(v);
        }
    }
    return String(v);
}

export function ExtractionDiffDialog({ open, onOpenChange, previous, current }: ExtractionDiffDialogProps) {
    const changes = useMemo(() => {
        if (!previous?.extraction?.data || !current?.extraction?.data) return [];
        return diffExtractions(previous.extraction.data, current.extraction.data);
    }, [previous, current]);

    const changedOnly = changes.filter(c => c.kind !== 'unchanged');
    const summary = useMemo(() => {
        return {
            changed: changes.filter(c => c.kind === 'changed').length,
            added: changes.filter(c => c.kind === 'added').length,
            removed: changes.filter(c => c.kind === 'removed').length,
            unchanged: changes.filter(c => c.kind === 'unchanged').length,
        };
    }, [changes]);

    if (!previous || !current) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Compare versions</DialogTitle>
                        <DialogDescription>Need two versions of the same document type to diff.</DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    const docTypeLabel = DOCUMENT_TYPE_LABELS[current.type] || current.type;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[880px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitCompare className="h-4 w-4 text-primary" />
                        Compare versions — {docTypeLabel}
                    </DialogTitle>
                    <DialogDescription>
                        Field-level diff between the two uploaded copies. Previous → current.
                    </DialogDescription>
                </DialogHeader>

                {/* Version header */}
                <div className="grid grid-cols-2 gap-3">
                    <VersionCard label="Previous" document={previous} tone="neutral" />
                    <VersionCard label="Current" document={current} tone="primary" />
                </div>

                {/* Summary strip */}
                <div className="flex items-center gap-2 border-y border-border py-2">
                    <span className="text-xs text-muted-foreground">Summary:</span>
                    {summary.changed > 0 && (
                        <Badge className="bg-warning/15 text-warning border-warning/30 border">{summary.changed} changed</Badge>
                    )}
                    {summary.added > 0 && (
                        <Badge className="bg-success/15 text-success border-success/30 border">{summary.added} added</Badge>
                    )}
                    {summary.removed > 0 && (
                        <Badge className="bg-destructive/15 text-destructive border-destructive/30 border">{summary.removed} removed</Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{summary.unchanged} unchanged</span>
                </div>

                {/* Diff list */}
                <div className="flex-1 overflow-auto -mx-6 px-6">
                    {changedOnly.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            No field-level differences between these two versions.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {changedOnly.map((c, i) => (
                                <DiffRow key={`${c.label}-${i}`} change={c} />
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function VersionCard({ label, document, tone }: { label: string; document: Document; tone: 'neutral' | 'primary' }) {
    return (
        <div className={cn(
            'border rounded-md px-3 py-2',
            tone === 'primary' ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/10',
        )}>
            <div className="flex items-center justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium truncate">{document.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                        {format(document.uploadedAt, 'dd MMM yyyy HH:mm')}
                    </p>
                </div>
                {document.url && (
                    <a href={document.url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </a>
                )}
            </div>
        </div>
    );
}

function DiffRow({ change }: { change: ScalarChange }) {
    const badgeClass = change.kind === 'added'
        ? 'bg-success/15 text-success border-success/30'
        : change.kind === 'removed'
        ? 'bg-destructive/15 text-destructive border-destructive/30'
        : 'bg-warning/15 text-warning border-warning/30';

    const label = change.kind === 'added' ? 'Added'
        : change.kind === 'removed' ? 'Removed'
        : 'Changed';

    const isObj = (v: any) => v != null && typeof v === 'object';

    return (
        <div className="border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30">
                <span className="text-sm font-medium">{change.label}</span>
                <Badge className={cn('text-[10px] font-semibold uppercase border', badgeClass)}>
                    {label}
                </Badge>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
                <pre className={cn(
                    'text-xs px-3 py-2 whitespace-pre-wrap break-words',
                    change.kind === 'removed' || change.kind === 'changed' ? 'bg-destructive/5 text-foreground' : 'bg-muted/10 text-muted-foreground',
                    isObj(change.oldValue) && 'font-mono',
                )}>
                    {stringify(change.oldValue)}
                </pre>
                <div className="px-2 flex items-center justify-center bg-muted/10">
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                </div>
                <pre className={cn(
                    'text-xs px-3 py-2 whitespace-pre-wrap break-words',
                    change.kind === 'added' || change.kind === 'changed' ? 'bg-success/5 text-foreground' : 'bg-muted/10 text-muted-foreground',
                    isObj(change.newValue) && 'font-mono',
                )}>
                    {stringify(change.newValue)}
                </pre>
            </div>
        </div>
    );
}
