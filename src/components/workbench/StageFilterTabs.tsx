import { cn } from '@/lib/utils';

export type StageFilter = 'all' | 'failed' | 'passed' | 'pending';

export interface StageFilterCounts {
  all: number;
  failed: number;
  passed: number;
  pending: number;
}

interface StageFilterTabsProps {
  value: StageFilter;
  onChange: (value: StageFilter) => void;
  counts: StageFilterCounts;
}

const TABS: { key: StageFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'failed', label: 'Failed' },
  { key: 'passed', label: 'Passed' },
  { key: 'pending', label: 'Pending' },
];

/** Segmented filter for the active stage's checklist items, with per-bucket counts. */
export function StageFilterTabs({ value, onChange, counts }: StageFilterTabsProps) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/60">
      {TABS.map(tab => {
        const active = value === tab.key;
        const count = counts[tab.key];
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors',
              active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span className={cn(
              'tabular-nums text-[10px] px-1 rounded',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground/70',
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Bucket a checklist item by its validation result + checked state. */
export function classifyChecklistItem(item: { checked?: boolean; result?: { status?: string } | null }): StageFilter {
  const status = item.result?.status;
  if (status === 'fail' || status === 'error') return 'failed';
  if (status === 'pass') return 'passed';
  if (item.checked) return 'passed';
  return 'pending';
}
