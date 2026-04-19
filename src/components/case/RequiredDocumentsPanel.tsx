import React from 'react';
import { Document, DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, Upload, Loader2, Eye, ChevronDown, ChevronRight } from 'lucide-react';

interface RequiredDocumentsPanelProps {
    documents: Document[];
    requiredDocTypes: DocumentType[];
    onUpload: (file: File, type: DocumentType) => Promise<void>;
    onSelectDocument: (doc: Document) => void;
    selectedDocumentId?: string;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
}

export function RequiredDocumentsPanel({
    documents,
    requiredDocTypes,
    onUpload,
    onSelectDocument,
    selectedDocumentId,
    collapsed = false,
    onToggleCollapsed,
}: RequiredDocumentsPanelProps) {
    const uploadedDocsMap = React.useMemo(() => {
        const map: Record<string, Document> = {};
        documents.forEach(doc => {
            if (!map[doc.type] || doc.status === 'extracted') {
                map[doc.type] = doc;
            }
        });
        return map;
    }, [documents]);

    const stats = React.useMemo(() => {
        const total = requiredDocTypes.length;
        const uploaded = requiredDocTypes.filter(type => uploadedDocsMap[type]).length;
        return { total, uploaded };
    }, [requiredDocTypes, uploadedDocsMap]);

    return (
        <div className="flex flex-col h-full bg-background">
            <button
                type="button"
                onClick={onToggleCollapsed}
                className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0 hover:bg-muted/40 transition-colors text-left"
            >
                <div className="flex items-center gap-1.5">
                    {onToggleCollapsed && (
                        collapsed ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )
                    )}
                    <h3 className="text-sm font-semibold text-foreground">Documents</h3>
                </div>
                <span className="text-xs text-muted-foreground">
                    {stats.uploaded} of {stats.total}
                </span>
            </button>

            <div className={cn('flex-1 overflow-y-auto', collapsed && 'hidden')}>
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
                                'group flex items-center justify-between px-4 py-2.5 border-b border-border/60 transition-colors',
                                isUploaded && 'cursor-pointer hover:bg-muted/50',
                                isSelected && 'bg-primary/5 border-l-2 border-l-primary'
                            )}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                {isUploaded ? (
                                    isProcessing ? (
                                        <Loader2 className="h-4 w-4 text-warning animate-spin shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                    )
                                ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                                )}

                                <div className="min-w-0">
                                    <p className={cn(
                                        'text-sm truncate',
                                        isUploaded ? 'text-foreground font-medium' : 'text-muted-foreground'
                                    )}>
                                        {DOCUMENT_TYPE_LABELS[type] || type}
                                    </p>
                                    {isProcessing && (
                                        <p className="text-[11px] text-warning">Processing…</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                {isUploaded && doc?.url && (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); window.open(doc.url, "_blank"); }}
                                        className="h-7 w-7 rounded inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                                        aria-label="Preview"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                <label
                                    className="h-7 w-7 rounded inline-flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer"
                                    aria-label={isUploaded ? 'Replace' : 'Upload'}
                                    onClick={(e) => e.stopPropagation()}
                                >
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
                {requiredDocTypes.length === 0 && (
                    <p className="text-xs text-muted-foreground px-4 py-6 text-center">
                        No required documents configured for this stage.
                    </p>
                )}
            </div>
        </div>
    );
}
