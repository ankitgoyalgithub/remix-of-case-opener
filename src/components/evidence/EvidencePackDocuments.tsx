import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Check, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Document, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { cn } from '@/lib/utils';

interface EvidencePackDocumentsProps {
    documents: Document[];
}

function extractionEntries(extraction: any): Array<{ label: string; value: string; confidence?: number; verified?: boolean; source?: string }> {
    if (!extraction?.data) return [];
    return Object.entries(extraction.data).map(([label, raw]: [string, any]) => {
        if (raw && typeof raw === 'object' && 'value' in raw) {
            return {
                label,
                value: String(raw.value ?? ''),
                confidence: typeof raw.confidence === 'number' ? Math.round(raw.confidence * 100) : undefined,
                verified: !!raw.verified,
                source: raw.source,
            };
        }
        return { label, value: String(raw ?? '') };
    });
}

function DocumentRow({ doc }: { doc: Document }) {
    const [open, setOpen] = useState(false);
    const entries = extractionEntries(doc.extraction);
    const isImage = /\.(png|jpe?g|webp|gif)$/i.test(doc.name);
    const isPdf = /\.pdf$/i.test(doc.name);

    return (
        <div className="border border-border rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20">
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                >
                    {open ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <FileText className="h-4 w-4 text-info shrink-0" />
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {DOCUMENT_TYPE_LABELS[doc.type] || doc.type} · uploaded {format(doc.uploadedAt, 'dd MMM yyyy HH:mm')}
                        </p>
                    </div>
                </button>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge className={cn(
                        'border-0 text-xs gap-1',
                        doc.status === 'verified' || doc.status === 'extracted'
                            ? 'bg-success/15 text-success'
                            : 'bg-muted text-muted-foreground',
                    )}>
                        <Check className="h-3 w-3" />
                        {doc.status}
                    </Badge>
                    {doc.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                                <ExternalLink className="h-3 w-3" />
                                <span className="text-xs">Open</span>
                            </Button>
                        </a>
                    )}
                </div>
            </div>

            {open && (
                <div className="px-3 py-3 space-y-3">
                    {/* Preview */}
                    {doc.url && (
                        <div className="rounded-md border border-border overflow-hidden bg-muted/30">
                            {isImage ? (
                                <img src={doc.url} alt={doc.name} className="w-full max-h-[420px] object-contain bg-white" />
                            ) : isPdf ? (
                                <iframe
                                    src={doc.url}
                                    title={doc.name}
                                    className="w-full h-[420px] bg-white print:hidden"
                                />
                            ) : (
                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                    Preview not available — use “Open” to view in a new tab.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Extractions */}
                    {entries.length > 0 ? (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Extracted fields
                            </p>
                            <div className="border border-border rounded-md divide-y divide-border">
                                {entries.map((e, idx) => (
                                    <div key={`${e.label}-${idx}`} className="grid grid-cols-[1fr_auto] gap-3 items-start px-3 py-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">{e.label}: </span>
                                            <span className="font-medium">{e.value || '—'}</span>
                                            {e.source && (
                                                <span className="text-[10px] text-muted-foreground ml-2">({e.source})</span>
                                            )}
                                        </div>
                                        {typeof e.confidence === 'number' && (
                                            <span className={cn(
                                                'text-xs shrink-0',
                                                e.confidence >= 95 ? 'text-success' : e.confidence >= 85 ? 'text-warning' : 'text-destructive',
                                            )}>
                                                {e.confidence}%
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground italic">No extracted fields recorded.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export function EvidencePackDocuments({ documents }: EvidencePackDocumentsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Documents ({documents.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {documents.map(doc => (
                        <DocumentRow key={doc.id} doc={doc} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
