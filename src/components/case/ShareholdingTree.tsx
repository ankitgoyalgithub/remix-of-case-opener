/**
 * Render the shareholding structure extracted from an MoA.
 *
 * Accepts the raw extraction object and walks `Shareholders` (or fallbacks)
 * recursively. Each node shows the entity name + share % + nationality, with
 * children indented underneath. UBOs (≥25%) are highlighted.
 */
import { Crown, User, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type ShareholderNode = {
  name: string;
  share?: number | null;
  nationality?: string | null;
  type?: 'individual' | 'company';
  children?: ShareholderNode[];
};

interface Props {
  extraction: any;
  /** UBO threshold — defaults to 25%. Holders at or above are highlighted. */
  uboThreshold?: number;
}

function unwrap(v: any) {
  return v && typeof v === 'object' && 'value' in v ? v.value : v;
}

function num(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).toString().replace('%', ''));
  return Number.isFinite(n) ? n : null;
}

function normalizeShareholder(raw: any): ShareholderNode | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    return { name: raw, type: 'individual' };
  }
  if (typeof raw !== 'object') return null;

  const name =
    unwrap(raw.Name) || unwrap(raw['Full Name']) || unwrap(raw.name) ||
    unwrap(raw['Shareholder Name']) || unwrap(raw['Company Name']) || '';

  if (!name) return null;

  const share = num(unwrap(raw.Share) ?? unwrap(raw['Share Percentage']) ?? unwrap(raw['Ownership %']) ?? unwrap(raw.share_pct));
  const nationality = unwrap(raw.Nationality) || unwrap(raw['Country']) || unwrap(raw.nationality);

  const childrenSrc =
    unwrap(raw['Sub Shareholders']) || unwrap(raw['Subsidiaries']) || unwrap(raw.children) || [];
  const children = Array.isArray(childrenSrc)
    ? childrenSrc.map(normalizeShareholder).filter(Boolean) as ShareholderNode[]
    : [];

  // Heuristic — if a "Type" or "Entity Type" is provided, honour it; otherwise
  // assume individuals unless the name ends with LLC / Ltd / FZE / Inc.
  const explicitType = (unwrap(raw.Type) || unwrap(raw['Entity Type']) || '').toString().toLowerCase();
  let type: 'individual' | 'company' = 'individual';
  if (explicitType.includes('company') || explicitType.includes('corporate') || explicitType.includes('legal')) {
    type = 'company';
  } else if (/(llc|ltd|fze|fzc|inc|s\.a\.|gmbh|plc)\.?$/i.test(String(name).trim())) {
    type = 'company';
  }

  return { name: String(name).trim(), share, nationality, type, children };
}

function extractRoot(extraction: any): ShareholderNode[] {
  if (!extraction || typeof extraction !== 'object') return [];
  const candidates = [
    extraction.Shareholders, extraction.shareholders,
    extraction.UBOs, extraction.Owners,
  ];
  for (const c of candidates) {
    const v = unwrap(c);
    if (Array.isArray(v) && v.length > 0) {
      return v.map(normalizeShareholder).filter(Boolean) as ShareholderNode[];
    }
  }
  return [];
}

export function ShareholdingTree({ extraction, uboThreshold = 25 }: Props) {
  const roots = extractRoot(extraction);
  const totalShare = roots.reduce((s, r) => s + (r.share || 0), 0);

  if (roots.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">No shareholders extracted from this MoA yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {roots.length} {roots.length === 1 ? 'shareholder' : 'shareholders'} ·
          combined {totalShare ? `${totalShare}%` : 'unspecified'}
        </p>
        <Badge variant="outline" className="text-[10px] gap-1">
          <Crown className="h-3 w-3" />
          UBO threshold ≥ {uboThreshold}%
        </Badge>
      </div>
      <div className="space-y-1">
        {roots.map((node, i) => (
          <ShareholderRow key={i} node={node} depth={0} uboThreshold={uboThreshold} />
        ))}
      </div>
    </div>
  );
}

function ShareholderRow({ node, depth, uboThreshold }: { node: ShareholderNode; depth: number; uboThreshold: number }) {
  const isUbo = (node.share ?? 0) >= uboThreshold;
  const Icon = node.type === 'company' ? Building2 : User;
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-md border transition-colors',
          isUbo ? 'border-warning/40 bg-warning/5' : 'border-border hover:bg-muted/30',
        )}
        style={{ marginLeft: depth * 16 }}
      >
        <Icon className={cn('h-3.5 w-3.5 shrink-0', isUbo ? 'text-warning' : 'text-muted-foreground')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{node.name}</p>
            {isUbo && (
              <Badge className="bg-warning/15 text-warning border-0 text-[10px] gap-1 h-4 px-1.5">
                <Crown className="h-3 w-3" />
                UBO
              </Badge>
            )}
            {node.type === 'company' && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">Corporate</Badge>
            )}
          </div>
          {node.nationality && (
            <p className="text-[11px] text-muted-foreground">{node.nationality}</p>
          )}
        </div>
        <div className="text-sm tabular-nums font-semibold">
          {node.share !== null && node.share !== undefined ? `${node.share}%` : '—'}
        </div>
      </div>
      {(node.children || []).map((child, i) => (
        <ShareholderRow key={i} node={child} depth={depth + 1} uboThreshold={uboThreshold} />
      ))}
    </>
  );
}
