import { useMemo } from 'react';
import { useUiPref } from '@/hooks/useUiPref';
import { cn } from '@/lib/utils';
import {
    ChevronDown, ChevronRight, Check, AlertCircle, Clock,
    FileText, Upload, PanelLeftClose, PanelLeftOpen, Files,
} from 'lucide-react';
import type { Stage, ChecklistItem, Document, DocDef, DocumentType } from '@/types/case';

/**
 * CaseJourney — left rail of the workbench. Shows the case as a vertical
 * journey: every stage, expandable to its checklist items, plus a separate
 * Documents section for case-level uploads. Replaces the old horizontal
 * stepper + ReadinessPanel + OperationsWorkbench's split left pane.
 */
export function CaseJourney({
    stages,
    checklist,
    documents,
    docDefs,
    activeStageId,
    selectedItemId,
    selectedDocId,
    onSelectStage,
    onSelectItem,
    onSelectDoc,
    onUploadDoc,
    collapsed,
    onToggleCollapsed,
}: {
    stages: Stage[];
    checklist: ChecklistItem[];
    documents: Document[];
    docDefs?: DocDef[];
    activeStageId: number;
    selectedItemId: string | null;
    selectedDocId: string | null;
    onSelectStage: (stageId: number) => void;
    onSelectItem: (itemId: string) => void;
    onSelectDoc: (doc: Document) => void;
    onUploadDoc: (file: File, type: DocumentType, checklistId?: string) => Promise<void>;
    collapsed: boolean;
    onToggleCollapsed: () => void;
}) {
    // Auto-expand the active stage by default; user can override per-stage.
    const [expandedRaw, setExpandedRaw] = useUiPref<Record<string, boolean>>('workbench.journey.expanded', {});
    const [showCompleted, setShowCompleted] = useUiPref<boolean>('workbench.journey.showCompleted', true);

    const isExpanded = (stageId: number) => {
        const key = String(stageId);
        if (key in expandedRaw) return expandedRaw[key];
        // Default: only active stage expanded.
        return stageId === activeStageId;
    };
    const toggleStage = (stageId: number) => {
        setExpandedRaw(prev => ({ ...prev, [String(stageId)]: !isExpanded(stageId) }));
    };

    // Items grouped by stage. ChecklistItem.stageId maps to Stage.id.
    const itemsByStage = useMemo(() => {
        const m = new Map<number, ChecklistItem[]>();
        for (const item of checklist) {
            const arr = m.get(item.stageId) || [];
            arr.push(item);
            m.set(item.stageId, arr);
        }
        return m;
    }, [checklist]);

    // Required document types — flatten DocDef.mandatory list.
    const requiredDocTypes = useMemo(
        () => (docDefs ?? []).filter(d => d.mandatory).map(d => d.type as DocumentType),
        [docDefs],
    );

    // Build "doc slots" — one row per required type (uploaded or missing) + any
    // case-level uploaded docs that aren't in the required list.
    const docSlots = useMemo(() => {
        const slots: Array<{ type: DocumentType; doc: Document | null; def?: DocDef }> = [];
        const seen = new Set<DocumentType>();

        for (const type of requiredDocTypes) {
            const doc = documents.find(d => d.type === type) || null;
            const def = docDefs?.find(d => d.type === type);
            slots.push({ type, doc, def });
            seen.add(type);
        }
        // Extras the operator uploaded outside the required set.
        for (const doc of documents) {
            if (!seen.has(doc.type as DocumentType)) {
                const def = docDefs?.find(d => d.type === doc.type);
                slots.push({ type: doc.type as DocumentType, doc, def });
                seen.add(doc.type as DocumentType);
            }
        }
        return slots;
    }, [requiredDocTypes, documents, docDefs]);

    const completedCount = stages.filter(s => s.status === 'complete').length;
    const missingDocCount = docSlots.filter(s => !s.doc).length;
    const totalChecks = checklist.length;
    const passedChecks = checklist.filter(c => c.result?.status === 'pass' || c.checked).length;

    // Collapsed rail — slim 48px icon view, click to expand.
    if (collapsed) {
        return (
            <aside className="w-12 shrink-0 border-r border-border bg-background flex flex-col items-center py-2 gap-1">
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    title="Expand case journey"
                    className="h-8 w-8 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <PanelLeftOpen className="h-4 w-4" />
                </button>
                <div className="w-6 border-t border-border my-1" />
                <RailCounter icon={Check} count={completedCount} total={stages.length} title={`${completedCount} of ${stages.length} stages done`} onClick={onToggleCollapsed} />
                <RailCounter icon={Files} count={docSlots.length - missingDocCount} total={docSlots.length} title={`${missingDocCount} document${missingDocCount === 1 ? '' : 's'} missing`} tone={missingDocCount > 0 ? 'warn' : 'default'} onClick={onToggleCollapsed} />
                <RailCounter icon={AlertCircle} count={passedChecks} total={totalChecks} title={`${passedChecks} of ${totalChecks} checks passed`} onClick={onToggleCollapsed} />
            </aside>
        );
    }

    return (
        <aside className="w-[280px] shrink-0 border-r border-border bg-background flex flex-col overflow-hidden">
            {/* Rail header */}
            <div className="h-9 px-3 border-b border-border flex items-center justify-between shrink-0">
                <span className="page-eyebrow">Case journey</span>
                <button
                    type="button"
                    onClick={onToggleCollapsed}
                    title="Collapse rail"
                    className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                {/* Stages */}
                <section className="p-2">
                    <div className="flex items-center justify-between px-2 mb-1.5">
                        <p className="page-eyebrow">Stages</p>
                        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                            {completedCount}/{stages.length}
                        </span>
                    </div>
                    <ul className="space-y-0.5">
                        {stages
                            .filter(s => showCompleted || s.status !== 'complete' || s.id === activeStageId)
                            .map(stage => {
                                const items = itemsByStage.get(stage.id) || [];
                                const expanded = isExpanded(stage.id);
                                const isActive = stage.id === activeStageId;
                                return (
                                    <li key={stage.id}>
                                        <StageRow
                                            stage={stage}
                                            items={items}
                                            expanded={expanded}
                                            isActive={isActive}
                                            selectedItemId={selectedItemId}
                                            onToggle={() => toggleStage(stage.id)}
                                            onSelectStage={() => onSelectStage(stage.id)}
                                            onSelectItem={onSelectItem}
                                        />
                                    </li>
                                );
                            })}
                    </ul>
                    {stages.some(s => s.status === 'complete' && s.id !== activeStageId) && (
                        <button
                            type="button"
                            onClick={() => setShowCompleted(v => !v)}
                            className="mt-1.5 mx-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showCompleted ? 'Hide completed' : 'Show completed'}
                        </button>
                    )}
                </section>

                <div className="border-t border-border" />

                {/* Documents */}
                <section className="p-2">
                    <div className="flex items-center justify-between px-2 mb-1.5">
                        <p className="page-eyebrow">Documents</p>
                        <span className={cn(
                            'text-[11px] font-mono tabular-nums',
                            missingDocCount > 0 ? 'text-warning' : 'text-muted-foreground',
                        )}>
                            {docSlots.length - missingDocCount}/{docSlots.length}
                        </span>
                    </div>
                    <ul className="space-y-0.5">
                        {docSlots.map((slot, idx) => (
                            <li key={`${slot.type}-${idx}`}>
                                <DocSlotRow
                                    slot={slot}
                                    selected={selectedDocId === slot.doc?.id}
                                    onSelect={() => slot.doc && onSelectDoc(slot.doc)}
                                    onUpload={async (file) => {
                                        await onUploadDoc(file, slot.type);
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </aside>
    );
}

// ─── Rail counter (collapsed mode) ────────────────────────────────────

function RailCounter({
    icon: Icon, count, total, title, tone = 'default', onClick,
}: {
    icon: any;
    count: number;
    total: number;
    title: string;
    tone?: 'default' | 'warn' | 'danger';
    onClick: () => void;
}) {
    const toneCls = {
        default: 'text-muted-foreground hover:text-foreground',
        warn:    'text-warning hover:text-warning',
        danger:  'text-destructive hover:text-destructive',
    }[tone];
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                'h-9 w-9 inline-flex flex-col items-center justify-center rounded hover:bg-muted transition-colors',
                toneCls,
            )}
        >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-[9px] font-mono tabular-nums mt-0.5">{count}/{total}</span>
        </button>
    );
}

// ─── Stage row ────────────────────────────────────────────────────────

function StageRow({
    stage,
    items,
    expanded,
    isActive,
    selectedItemId,
    onToggle,
    onSelectStage,
    onSelectItem,
}: {
    stage: Stage;
    items: ChecklistItem[];
    expanded: boolean;
    isActive: boolean;
    selectedItemId: string | null;
    onToggle: () => void;
    onSelectStage: () => void;
    onSelectItem: (id: string) => void;
}) {
    const passed = items.filter(i => i.result?.status === 'pass' || i.checked).length;
    const failed = items.filter(i => i.result?.status === 'fail').length;

    const statusGlyph = (() => {
        if (stage.status === 'complete') return <Check className="h-3 w-3 text-success" strokeWidth={3} />;
        if (stage.status === 'needs-review') return <AlertCircle className="h-3 w-3 text-warning" />;
        if (isActive) return <span className="w-1.5 h-1.5 rounded-full bg-primary" />;
        return <Clock className="h-3 w-3 text-muted-foreground/50" />;
    })();

    return (
        <div>
            <div
                role="button"
                onClick={onSelectStage}
                className={cn(
                    'group relative flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
                    isActive ? 'bg-muted' : 'hover:bg-muted/50',
                )}
            >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-primary" />}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className="h-4 w-4 inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={expanded ? 'Collapse stage' : 'Expand stage'}
                >
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <span className="w-4 inline-flex items-center justify-center shrink-0">{statusGlyph}</span>
                <span className={cn(
                    'flex-1 truncate text-[13px]',
                    isActive ? 'font-medium text-foreground' : 'text-foreground/80',
                )}>
                    {stage.name}
                </span>
                {items.length > 0 && (
                    <span className={cn(
                        'text-[10px] font-mono tabular-nums shrink-0',
                        failed > 0 ? 'text-destructive' : 'text-muted-foreground',
                    )}>
                        {passed}/{items.length}
                    </span>
                )}
            </div>

            {expanded && items.length > 0 && (
                <ul className="mt-0.5 ml-5 pl-3 border-l border-border space-y-0.5">
                    {items.map(item => (
                        <li key={item.id}>
                            <ItemRow
                                item={item}
                                selected={selectedItemId === item.id}
                                onSelect={() => onSelectItem(item.id)}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ItemRow({
    item, selected, onSelect,
}: {
    item: ChecklistItem;
    selected: boolean;
    onSelect: () => void;
}) {
    const result = item.result?.status;
    const tone = result === 'pass' ? 'success'
        : result === 'fail' ? 'destructive'
        : result === 'pending' ? 'warning'
        : item.checked ? 'success' : 'muted';

    const dotCls = {
        success: 'bg-success',
        destructive: 'bg-destructive',
        warning: 'bg-warning',
        muted: 'bg-muted-foreground/30',
    }[tone];

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'w-full text-left flex items-center gap-2 px-1.5 py-1 rounded transition-colors text-[12.5px]',
                selected ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
            )}
        >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotCls)} />
            <span className="flex-1 truncate">{item.label}</span>
            {item.required && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70 shrink-0">REQ</span>
            )}
        </button>
    );
}

// ─── Document slot row ────────────────────────────────────────────────

function DocSlotRow({
    slot, selected, onSelect, onUpload,
}: {
    slot: { type: DocumentType; doc: Document | null; def?: DocDef };
    selected: boolean;
    onSelect: () => void;
    onUpload: (file: File) => Promise<void>;
}) {
    const label = slot.def?.name || String(slot.type).replace(/-/g, ' ');
    const hasDoc = !!slot.doc;
    const state = slot.doc?.status;

    if (!hasDoc) {
        // Missing — show upload affordance inline.
        return (
            <label
                className="group flex items-center gap-2 px-1.5 py-1.5 rounded cursor-pointer hover:bg-muted/60 transition-colors"
                title="Click to upload"
            >
                <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                <span className="text-[12.5px] text-muted-foreground capitalize truncate flex-1">{label}</span>
                <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-foreground">
                    <Upload className="h-3 w-3" />
                </span>
                <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await onUpload(file);
                    }}
                />
            </label>
        );
    }

    const dotCls = state === 'failed' ? 'bg-destructive'
        : state === 'processing' ? 'bg-warning'
        : 'bg-success';

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'w-full text-left flex items-center gap-2 px-1.5 py-1.5 rounded transition-colors',
                selected ? 'bg-primary/10' : 'hover:bg-muted',
            )}
        >
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotCls)} />
            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className={cn(
                'flex-1 truncate text-[12.5px]',
                selected ? 'text-foreground font-medium' : 'text-foreground/80',
            )}>
                {slot.doc?.name || label}
            </span>
        </button>
    );
}

