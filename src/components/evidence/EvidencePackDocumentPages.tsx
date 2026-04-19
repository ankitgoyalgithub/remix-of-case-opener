import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Document, DOCUMENT_TYPE_LABELS } from '@/types/case';

interface EvidencePackDocumentPagesProps {
    documents: Document[];
}

type RenderedDoc = {
    doc: Document;
    pageImages: string[];
    kind: 'pdf' | 'image' | 'other';
    error?: string;
};

async function renderPdfPages(url: string): Promise<string[]> {
    // Lazy-import pdfjs so it's only pulled in on this page
    const pdfjs: any = await import('pdfjs-dist');
    // Vite-friendly worker resolution
    // @ts-expect-error — worker module URL resolved at build time
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const loadingTask = pdfjs.getDocument({ url, withCredentials: false });
    const pdf = await loadingTask.promise;
    const images: string[] = [];
    // Render at ~1.5x for decent print resolution without ballooning memory
    const scale = 1.5;
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL('image/jpeg', 0.85));
    }
    return images;
}

function classifyDoc(doc: Document): RenderedDoc['kind'] {
    if (/\.pdf($|\?)/i.test(doc.name) || /\.pdf($|\?)/i.test(doc.url || '')) return 'pdf';
    if (/\.(png|jpe?g|webp|gif|bmp)($|\?)/i.test(doc.name) || /\.(png|jpe?g|webp|gif|bmp)($|\?)/i.test(doc.url || '')) return 'image';
    return 'other';
}

export function EvidencePackDocumentPages({ documents }: EvidencePackDocumentPagesProps) {
    const [rendered, setRendered] = useState<RenderedDoc[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            const out: RenderedDoc[] = [];
            for (const doc of documents) {
                if (!doc.url) {
                    out.push({ doc, pageImages: [], kind: 'other', error: 'No file available' });
                    continue;
                }
                const kind = classifyDoc(doc);
                try {
                    if (kind === 'pdf') {
                        const pages = await renderPdfPages(doc.url);
                        out.push({ doc, pageImages: pages, kind });
                    } else if (kind === 'image') {
                        out.push({ doc, pageImages: [doc.url], kind });
                    } else {
                        out.push({ doc, pageImages: [], kind, error: 'Preview not supported for this file type.' });
                    }
                } catch (err: any) {
                    console.error('Failed to render doc for evidence pack:', doc.name, err);
                    out.push({ doc, pageImages: [], kind, error: err?.message || 'Render failed' });
                }
                if (cancelled) return;
            }
            if (!cancelled) {
                setRendered(out);
                setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [documents]);

    if (documents.length === 0) return null;

    return (
        <section className="evidence-document-pages">
            <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-semibold">Document pages</h2>
                {loading && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Preparing pages…
                    </span>
                )}
            </div>
            <p className="text-xs text-muted-foreground mb-4 print:hidden">
                Each uploaded document is flattened below so it flows into the printed PDF.
            </p>

            <div className="space-y-6">
                {rendered.map(({ doc, pageImages, error, kind }) => (
                    <div key={doc.id} className="doc-render break-before-page first:break-before-auto">
                        <div className="border border-border rounded-md px-3 py-2 mb-3 bg-muted/20">
                            <p className="text-sm font-medium">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {DOCUMENT_TYPE_LABELS[doc.type] || doc.type} · uploaded {format(doc.uploadedAt, 'dd MMM yyyy HH:mm')}
                            </p>
                        </div>

                        {error && (
                            <p className="text-xs text-muted-foreground italic">{error}</p>
                        )}

                        {!error && pageImages.length === 0 && !loading && (
                            <p className="text-xs text-muted-foreground italic">No renderable pages.</p>
                        )}

                        {pageImages.map((src, pageIdx) => (
                            <div
                                key={`${doc.id}-page-${pageIdx}`}
                                className="doc-page mb-4 break-inside-avoid"
                            >
                                <img
                                    src={src}
                                    alt={`${doc.name} page ${pageIdx + 1}`}
                                    className="w-full border border-border rounded-sm bg-white"
                                />
                                {kind === 'pdf' && (
                                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                        Page {pageIdx + 1} of {pageImages.length}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </section>
    );
}
