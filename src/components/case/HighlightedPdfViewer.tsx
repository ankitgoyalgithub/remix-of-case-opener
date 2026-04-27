import { useEffect, useRef, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, Minus, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HighlightedPdfViewerProps {
    /**
     * URL pdf.js will fetch() (should be same-origin so it isn't blocked by
     * CORS). Backend stream endpoint works well here.
     */
    url: string;
    /**
     * URL used for the "Open in new tab" action — usually the original signed URL.
     * Iframe fallback also uses this when pdf.js can't fetch.
     */
    externalUrl?: string;
    /**
     * Text the viewer should find + highlight on the page and scroll to.
     * Changes here are reactive: pass a new value to jump to a new match.
     */
    highlightText?: string | null;
    fileName?: string;
}

interface RenderedPage {
    pageNumber: number;
    canvas: HTMLCanvasElement;
    textLayerEl: HTMLDivElement;
    viewport: any;
}

async function loadPdfjs(): Promise<any> {
    const pdfjs: any = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    return pdfjs;
}

function clearHighlights(container: HTMLElement) {
    container.querySelectorAll('.pdf-highlight').forEach(el => {
        el.classList.remove('pdf-highlight', 'pdf-highlight-active');
    });
}

/**
 * Normalise a string for cross-span matching: lowercase, collapse whitespace,
 * drop punctuation that commonly differs between PDF extracts and UI values
 * ("L.L.C" vs "LLC", "trn:" vs "trn", non-breaking spaces, etc.).
 */
function normalise(s: string): string {
    return s
        .toLowerCase()
        .replace(/[\u00a0]/g, ' ')       // nbsp
        .replace(/[\.,;:()\[\]"“”‘’'`]/g, '') // common punctuation
        .replace(/\s+/g, ' ')
        .trim();
}

interface SpanRange {
    span: HTMLElement;
    start: number; // inclusive offset into the normalised fullText
    end: number;   // exclusive
}

/**
 * pdf.js splits text into many <span> elements; a multi-word value almost
 * never fits in a single span. We concatenate all span texts into one string,
 * remember each span's [start, end] range, then search the concatenation for
 * the query and highlight every span whose range overlaps a match.
 */
function findAndHighlight(container: HTMLElement, query: string): HTMLElement | null {
    clearHighlights(container);
    if (!query) return null;

    const q = normalise(query);
    if (!q) return null;

    // Iterate in DOM order across all pages. Reset offsets between pages so a
    // match can't straddle the gap between two pages.
    const pageWraps = container.querySelectorAll<HTMLElement>('.pdf-page-wrap');
    let firstHit: HTMLElement | null = null;

    for (const pageWrap of Array.from(pageWraps)) {
        const spans = pageWrap.querySelectorAll<HTMLElement>('.pdf-text-layer span');
        if (spans.length === 0) continue;

        let fullText = '';
        const ranges: SpanRange[] = [];

        spans.forEach(span => {
            const raw = span.textContent || '';
            if (!raw) return;
            // Normalise on the fly; keep a trailing space between spans so word
            // boundaries are preserved even when pdf.js didn't include one.
            const chunk = normalise(raw);
            if (!chunk) {
                fullText += ' ';
                return;
            }
            const start = fullText.length;
            fullText += chunk;
            const end = fullText.length;
            ranges.push({ span, start, end });
            fullText += ' ';
        });

        if (!fullText || !ranges.length) continue;

        // Collect all match ranges (case-insensitive, normalised).
        const matches: Array<[number, number]> = [];
        let from = 0;
        while (true) {
            const idx = fullText.indexOf(q, from);
            if (idx === -1) break;
            matches.push([idx, idx + q.length]);
            from = idx + q.length;
        }

        // If the full phrase didn't match, try the longest single word of the query
        // so we still land somewhere useful (better than no highlight at all).
        if (matches.length === 0 && q.includes(' ')) {
            const longest = q.split(' ').filter(p => p.length >= 4).sort((a, b) => b.length - a.length)[0];
            if (longest) {
                let f = 0;
                while (true) {
                    const idx = fullText.indexOf(longest, f);
                    if (idx === -1) break;
                    matches.push([idx, idx + longest.length]);
                    f = idx + longest.length;
                }
            }
        }

        if (matches.length === 0) continue;

        // Highlight every span whose [start, end] overlaps any match range.
        for (const { span, start, end } of ranges) {
            const hit = matches.some(([ms, me]) => start < me && end > ms);
            if (hit) {
                span.classList.add('pdf-highlight');
                if (!firstHit) firstHit = span;
            }
        }

        if (firstHit) break; // stop at the first page with a hit
    }

    if (firstHit) {
        (firstHit as HTMLElement).classList.add('pdf-highlight-active');
    }
    return firstHit;
}

export function HighlightedPdfViewer({ url, externalUrl, highlightText, fileName }: HighlightedPdfViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1.2);
    const [pageCount, setPageCount] = useState(0);
    const [rendered, setRendered] = useState<RenderedPage[]>([]);

    // Render the PDF whenever url or scale changes
    useEffect(() => {
        let cancelled = false;
        const container = containerRef.current;
        if (!container) return;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                container.innerHTML = '';

                const pdfjs = await loadPdfjs();
                const pdf = await pdfjs.getDocument({ url }).promise;
                if (cancelled) return;
                setPageCount(pdf.numPages);

                const pages: RenderedPage[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale });

                    // Wrap each page in its own positioned container so the
                    // text layer can overlay the canvas.
                    const wrap = document.createElement('div');
                    wrap.className = 'pdf-page-wrap';
                    wrap.style.position = 'relative';
                    wrap.style.width = `${viewport.width}px`;
                    wrap.style.height = `${viewport.height}px`;
                    wrap.style.margin = '0 auto 12px';
                    wrap.style.background = 'white';
                    wrap.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    canvas.style.display = 'block';
                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    const textLayerEl = document.createElement('div');
                    // pdf.js uses the "textLayer" class internally + needs --scale-factor
                    // set on the container so each span's `left: calc(var(--scale-factor)*Npx)`
                    // resolves to a real CSS pixel value. Without this every span ends up at 0,0.
                    textLayerEl.className = 'textLayer pdf-text-layer';
                    textLayerEl.style.setProperty('--scale-factor', String(scale));

                    wrap.appendChild(canvas);
                    wrap.appendChild(textLayerEl);
                    container.appendChild(wrap);

                    await page.render({ canvasContext: ctx, viewport }).promise;
                    const textContent = await page.getTextContent();

                    if (cancelled) return;

                    // pdf.js v4 uses the TextLayer class. Older versions (v3-)
                    // expose a standalone renderTextLayer function. Try both.
                    const TextLayerCtor = (pdfjs as any).TextLayer;
                    if (typeof TextLayerCtor === 'function') {
                        const tl = new TextLayerCtor({
                            textContentSource: textContent,
                            container: textLayerEl,
                            viewport,
                        });
                        await tl.render();
                    } else if (typeof (pdfjs as any).renderTextLayer === 'function') {
                        await (pdfjs as any).renderTextLayer({
                            textContentSource: textContent,
                            container: textLayerEl,
                            viewport,
                            textDivs: [],
                        }).promise;
                    } else {
                        // Last-resort fallback: flow-layout spans (positions will be wrong).
                        for (const item of (textContent.items || []) as any[]) {
                            const span = document.createElement('span');
                            span.textContent = item.str;
                            textLayerEl.appendChild(span);
                        }
                    }

                    pages.push({ pageNumber: i, canvas, textLayerEl, viewport });
                }

                if (!cancelled) {
                    setRendered(pages);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error('Pdf viewer failed', err);
                if (!cancelled) {
                    setError(err?.message || 'Failed to load PDF');
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [url, scale]);

    // Apply highlight whenever highlightText changes OR pages finish rendering.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        if (loading) return;

        const firstHit = findAndHighlight(container, highlightText || '');
        if (firstHit) {
            // Scroll into view with some breathing room.
            firstHit.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightText, rendered, loading]);

    return (
        <div className="flex flex-col h-full bg-muted/20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-background shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground shrink-0">
                        {pageCount > 0 ? `${pageCount} page${pageCount > 1 ? 's' : ''}` : 'Loading…'}
                    </span>
                    {highlightText && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-[240px]">
                            Highlighting: {highlightText}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setScale(s => Math.max(0.6, s - 0.2))}
                        title="Zoom out"
                    >
                        <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(scale * 100)}%</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setScale(s => Math.min(3, s + 0.2))}
                        title="Zoom in"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <a href={externalUrl || url} target="_blank" rel="noreferrer">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Open in new tab">
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                    </a>
                </div>
            </div>

            <div className="relative flex-1 overflow-auto p-3">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/10 z-10">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {error ? (
                    // Fallback: iframes don't require CORS, so we can at least show
                    // the file even when pdf.js can't fetch it. Highlights aren't
                    // available in this mode.
                    <div className="h-full flex flex-col">
                        <div className="mb-2 text-[11px] text-muted-foreground bg-warning/10 text-warning border border-warning/30 rounded px-2 py-1">
                            Showing fallback preview — highlights are unavailable because the file stream returned an error.
                        </div>
                        {(externalUrl || url) && (
                            <iframe
                                src={`${externalUrl || url}#toolbar=0&view=FitH`}
                                className="flex-1 border-0 bg-white rounded"
                                title={fileName || 'Document preview'}
                            />
                        )}
                    </div>
                ) : (
                    <>
                        <div ref={containerRef} className={cn('pdf-viewer-container', loading && 'opacity-0')} />
                        <p className="sr-only">{fileName}</p>
                    </>
                )}
            </div>
        </div>
    );
}
