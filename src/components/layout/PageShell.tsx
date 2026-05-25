import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Single source of truth for page layout. Every operational page renders
 * inside <PageShell>. This guarantees consistent max-width, x-padding, and
 * vertical rhythm — fixes the "Dashboard has spacing but Inbox doesn't" bug.
 *
 *  <PageShell>
 *    <PageHeader eyebrow="Operations" title="Today's floor" actions={<Button/>} />
 *    <section>…</section>
 *  </PageShell>
 *
 * Pass `fullBleed` to opt out (e.g., the workbench wants a 3-zone layout
 * that touches the viewport edges).
 */
export function PageShell({
    children,
    fullBleed = false,
    className,
}: {
    children: ReactNode;
    fullBleed?: boolean;
    className?: string;
}) {
    if (fullBleed) {
        return <div className={cn('flex-1 min-h-0 flex flex-col bg-background', className)}>{children}</div>;
    }
    return (
        <div className="flex-1 min-h-0 overflow-auto bg-background">
            <div className={cn('mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6', className)}>
                {children}
            </div>
        </div>
    );
}

/**
 * Standard page header. Three slots:
 *  - eyebrow: tiny uppercase context label (uses .page-eyebrow style)
 *  - title:   the page title (uses .page-title style)
 *  - description: optional one-line sub-text
 *  - actions: right-aligned button group
 */
export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
    className,
}: {
    eyebrow?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cn('flex items-start justify-between gap-4 flex-wrap', className)}>
            <div className="min-w-0">
                {eyebrow && <p className="page-eyebrow mb-1.5">{eyebrow}</p>}
                <h1 className="page-title">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
    );
}
