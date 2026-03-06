import React from 'react';
import { Document, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, FileText, Upload, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface RequiredDocumentsPanelProps {
    documents: Document[];
    requiredDocTypes: DocumentType[];
    onUpload: (file: File, type: DocumentType) => Promise<void>;
    onSelectDocument: (doc: Document) => void;
    selectedDocumentId?: string;
}

export function RequiredDocumentsPanel({
    documents,
    requiredDocTypes,
    onUpload,
    onSelectDocument,
    selectedDocumentId
}: RequiredDocumentsPanelProps) {
    const uploadedDocsMap = React.useMemo(() => {
        const map: Record<string, Document> = {};
        documents.forEach(doc => {
            // Keep the most recent or already processed one
            if (!map[doc.type] || doc.status === 'extracted') {
                map[doc.type] = doc;
            }
        });
        return map;
    }, [documents]);

    const stats = React.useMemo(() => {
        const total = requiredDocTypes.length;
        const uploaded = requiredDocTypes.filter(type => uploadedDocsMap[type]).length;
        const percentage = total > 0 ? (uploaded / total) * 100 : 0;
        return { total, uploaded, percentage };
    }, [requiredDocTypes, uploadedDocsMap]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border/50 bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Required Documents
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                        {stats.uploaded} / {stats.total}
                    </span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Overall Completion</span>
                        <span>{Math.round(stats.percentage)}%</span>
                    </div>
                    <Progress value={stats.percentage} className="h-1.5 bg-primary/10" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {requiredDocTypes.map(type => {
                    const doc = uploadedDocsMap[type];
                    const isUploaded = !!doc;
                    const isSelected = doc && doc.id === selectedDocumentId;
                    const isProcessing = doc && (doc.status === 'uploaded' || doc.status === 'processing');

                    return (
                        <div
                            key={type}
                            onClick={() => doc && onSelectDocument(doc)}
                            className={cn(
                                "group relative flex items-center justify-between p-2 rounded-xl transition-all border cursor-default",
                                isUploaded ? "bg-card border-border/40 hover:border-primary/30" : "bg-muted/30 border-dashed border-border/60 hover:bg-muted/50",
                                isSelected && "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20",
                                doc && "cursor-pointer"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                                    isUploaded ? (isProcessing ? "bg-amber-500/10 border-amber-500/30" : "bg-success/10 border-success/30") : "bg-muted/50 border-border/50"
                                )}>
                                    {isUploaded ? (
                                        isProcessing ? (
                                            <Clock className="h-4 w-4 text-amber-500" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4 text-success" />
                                        )
                                    ) : (
                                        <Circle className="h-4 w-4 text-muted-foreground/30" />
                                    )}
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                        "text-[11px] font-bold leading-tight truncate",
                                        isUploaded ? "text-foreground" : "text-muted-foreground"
                                    )}>
                                        {DOCUMENT_TYPE_LABELS[type] || type}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tight">
                                        {isUploaded ? (isProcessing ? 'Processing...' : 'Available') : 'Missing'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="cursor-pointer h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors">
                                    <Upload className="h-3.5 w-3.5" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                onUpload(file, type);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
