import React, { useState } from 'react';
import { ChecklistItem, ChecklistRuleResult, DOCUMENT_TYPE_LABELS } from '@/types/case';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Check, X, Clock, AlertCircle, Play, ChevronRight,
  FileText, GitCompare, Globe, User, Loader2, Zap,
  ArrowRight, Info, RefreshCw, Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EntityScreeningReport } from './EntityScreeningReport';
import { MolValidationReport } from './MolValidationReport';
import { DecisionModal } from '@/components/request/DecisionModal';

interface ChecklistDetailPanelProps {
  item: ChecklistItem;
  onValidationComplete?: (updatedItem: ChecklistItem) => void;
  onRunValidation?: (itemId: string) => Promise<void>;
}

// Each kind of check, in plain language. Colour is restricted to the two
// semantic tones we need here: automated checks use the brand accent, manual
// checks stay muted — no ad-hoc palette colours.
const TYPE_CONFIG = {
  'manual': { icon: User, label: 'Manual check', color: 'text-muted-foreground' },
  'extraction': { icon: Zap, label: 'Document reading', color: 'text-primary' },
  'cross-validation': { icon: GitCompare, label: 'Compare documents', color: 'text-primary' },
  'third-party-api': { icon: Globe, label: 'External check', color: 'text-primary' },
  'verification': { icon: AlertCircle, label: 'Verification', color: 'text-primary' },
  'mol-validation': { icon: Users, label: 'Employee-list check', color: 'text-primary' },
} as const;

const RESULT_STATUS_CONFIG = {
  pass: { icon: Check, label: 'Passed', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  fail: { icon: X, label: 'Failed', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  pending: { icon: Clock, label: 'Not run yet', color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/50' },
  error: { icon: AlertCircle, label: 'Could not run', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30' },
};



export function ChecklistDetailPanel({ item, onValidationComplete, onRunValidation }: ChecklistDetailPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [localResult, setLocalResult] = useState(item.result || null);
  // The risk flag currently being resolved (drives the styled resolve dialog
  // that replaced the old window.prompt).
  const [resolvingFlag, setResolvingFlag] = useState<{ flagId: string; label: string } | null>(null);

  React.useEffect(() => {
    setLocalResult(item.result || null);
  }, [item]);

  const resultStatus = localResult?.status || 'pending';
  const resultConfig = RESULT_STATUS_CONFIG[resultStatus];
  const ResultIcon = resultConfig.icon;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="space-y-5">
        {/* Objective Analysis — compact muted text */}
        {item.taskDescription && (
          <div>
            <p className="page-eyebrow mb-1.5">What this check does</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{item.taskDescription}</p>
          </div>
        )}

        {item.taskDetails && (
          <div className="rounded-md bg-muted/20 border px-3 py-2.5 flex gap-3">
            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{item.taskDetails}</p>
          </div>
        )}

        {item.verifications && item.verifications.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="page-eyebrow">How this check works</p>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 opacity-60 uppercase">Setup</Badge>
            </div>
            <div className="rounded-md border border-border/40 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Step</th>
                    <th className="px-3 py-2">What it looks at</th>
                    <th className="px-3 py-2 text-right">Run by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {item.verifications.map((v, idx) => {
                    const iconConfig = TYPE_CONFIG[v.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG['manual'];
                    const Icon = iconConfig.icon;
                    return (
                      <tr key={v.id || idx} className="hover:bg-muted/5 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className={cn('h-3.5 w-3.5 shrink-0', iconConfig.color)} />
                            <span className="font-medium text-foreground">{iconConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {(() => {
                            const txt = v.config?.taskDescription || v.config?.target_document || (v.config?.target_documents?.join(', ')) || 'Standard check';
                            return <span className="text-muted-foreground truncate max-w-[200px] block" title={txt}>{txt}</span>;
                          })()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase',
                            v.type === 'manual'
                              ? 'bg-muted text-muted-foreground border-border'
                              : 'bg-primary/10 text-primary border-primary/20',
                          )}>
                            {v.type === 'manual' ? 'Manual' : 'Automated'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {localResult ? (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <p className="page-eyebrow">Result</p>
              <div className="flex items-center gap-3">
                {( (item.handlerName && item.handlerName !== 'manual') || item.itemType === 'cross-validation' || item.verifications?.some(v => v.type !== 'manual') ) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setIsRunning(true);
                      try {
                        if (onRunValidation) await onRunValidation(item.id);
                      } finally {
                        setIsRunning(false);
                      }
                    }}
                    disabled={isRunning}
                    title="Run this check again"
                    aria-label="Run this check again"
                    className="h-7 text-xs font-bold gap-1.5 uppercase tracking-widest text-primary border-primary/20 hover:bg-primary/5"
                  >
                    {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Re-run
                  </Button>
                )}
                <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-semibold', resultConfig.color, resultConfig.bg, resultConfig.border)}>
                  <ResultIcon className="h-3.5 w-3.5" />
                  {resultConfig.label}
                </div>
              </div>
            </div>

            {/* MOL validation gets its own workforce-focused report */}
            {(item.handlerName === 'mol_validation' || item.itemType === 'mol-validation') && localResult.details && localResult.details.length > 0 ? (
              <MolValidationReport result={localResult} />
            ) : (item.handlerName === 'entity_screening' || (item.itemType as any) === 'entity-screening') && localResult.details && localResult.details.length > 0 ? (
              <EntityScreeningReport result={localResult} itemLabel={item.label} />
            ) : localResult.details && localResult.details.length > 0 && (() => {
              // Group rows by step_index so multi-handler checks render one
              // labelled table per handler instead of one undifferentiated blob.
              const groups: Map<number, any[]> = new Map();
              for (const r of localResult.details) {
                const idx = (r as any).step_index ?? 0;
                if (!groups.has(idx)) groups.set(idx, []);
                groups.get(idx)!.push(r);
              }
              const orderedKeys = Array.from(groups.keys()).sort((a, b) => a - b);
              const showGroupHeaders = groups.size > 1;
              const traceSteps = (localResult.trace as any)?.steps || [];

              return (
                <div className="space-y-4">
                  {orderedKeys.map(stepIdx => {
                    const rows = groups.get(stepIdx) || [];
                    const stepMeta = traceSteps[stepIdx] || {};
                    const handlerName = stepMeta.handler || (rows[0] as any)?.handler || 'manual';
                    const stepStatus = stepMeta.status || (rows[0] as any)?.step_status;

                    return (
                      <div key={stepIdx} className="rounded-lg border border-border/50 overflow-hidden">
                        {showGroupHeaders && (
                          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-muted/40 border-b border-border/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-semibold text-muted-foreground tabular-nums shrink-0">#{stepIdx + 1}</span>
                              {/* The raw handler name is engineering detail — keep it out of the UI. */}
                              <span className="text-xs font-medium text-foreground truncate">Check step {stepIdx + 1}</span>
                            </div>
                            {stepStatus && (
                              <Badge variant="outline" className={cn(
                                "text-[10px] uppercase font-bold",
                                stepStatus === 'pass' && "text-success border-success/30 bg-success/10",
                                stepStatus === 'fail' && "text-destructive border-destructive/30 bg-destructive/10",
                                stepStatus === 'pending' && "text-info border-info/30 bg-info/10",
                                stepStatus === 'error' && "text-warning border-warning/30 bg-warning/10",
                              )}>
                                {stepStatus}
                              </Badge>
                            )}
                          </div>
                        )}
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/20 text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-semibold">What’s checked</th>
                              <th className="px-4 py-3 font-semibold">Found in</th>
                              <th className="px-4 py-3 font-semibold">Compared with</th>
                              <th className="px-4 py-3 font-semibold text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {rows.map((rule, idx) => {
                      const isPending = rule.passed === null;
                      const StatusIcon = isPending ? Clock : (rule.passed ? Check : X);
                      
                      return (
                        <tr key={idx} className={cn(
                          "transition-colors hover:bg-muted/10",
                          isPending ? "" : (rule.passed ? "bg-success/5" : "bg-destructive/5")
                        )}>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-foreground">
                              {rule.source_field && rule.target_field 
                                ? `${rule.source_field.replace(/_/g, ' ')} Sync` 
                                : rule.rule}
                            </div>
                            {rule.note && (
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {rule.note}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col">
                              {rule.source_value != null ? (
                                <>
                                  <div className="font-semibold text-foreground">{String(rule.source_value)}</div>
                                  {rule.source_doc_type && (
                                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 opacity-70">
                                      {DOCUMENT_TYPE_LABELS[rule.source_doc_type as keyof typeof DOCUMENT_TYPE_LABELS] || rule.source_field || 'Source'}
                                    </div>
                                  )}
                                </>
                              ) : rule.source_doc_type ? (
                                <div className="font-semibold text-foreground">
                                  {DOCUMENT_TYPE_LABELS[rule.source_doc_type as keyof typeof DOCUMENT_TYPE_LABELS] || rule.source_doc_type}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 italic font-medium">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            {rule.target_value != null || rule.target_field || rule.target_doc_type ? (
                              <div className="flex flex-col">
                                {rule.target_value != null || rule.target_field ? (
                                  <div className="font-semibold text-foreground">
                                    {rule.target_value != null ? String(rule.target_value) : (rule.target_field ? rule.target_field.replace(/_/g, ' ') : <span className="text-muted-foreground/40 italic font-medium">Not detected</span>)}
                                  </div>
                                ) : null}
                                {rule.target_doc_type && (
                                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 opacity-70">
                                    {rule.target_doc_type.includes(',')
                                      ? rule.target_doc_type.split(',').map(s => DOCUMENT_TYPE_LABELS[s.trim() as keyof typeof DOCUMENT_TYPE_LABELS] || s.trim()).join(', ')
                                      : (DOCUMENT_TYPE_LABELS[rule.target_doc_type as keyof typeof DOCUMENT_TYPE_LABELS] || rule.target_doc_type)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 italic font-medium">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {/* Inline Resolve button for unresolved risk rows */}
                              {(rule as any).flag_id && !(rule as any).resolved && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setResolvingFlag({
                                      flagId: (rule as any).flag_id,
                                      label: rule.rule || rule.source_field || 'this risk',
                                    });
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                  Resolve
                                </Button>
                              )}
                              <Badge variant="outline" className={cn("text-xs font-bold uppercase inline-flex items-center",
                                isPending ? "text-muted-foreground border-border" : (rule.passed ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10")
                              )}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {isPending ? 'Pending' : (rule.passed ? 'Passed' : 'Failed')}
                              </Badge>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        ) : (item.verifications?.some(v => v.type !== 'manual') || (item.handlerName && item.handlerName !== 'manual') || item.itemType === 'cross-validation') ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Play className="h-5 w-5 text-primary/40 ml-0.5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Not run yet</h4>
            <p className="text-xs text-muted-foreground mt-1 px-8">Press the play button next to this item to run the check and see results.</p>
          </div>
        ) : null}
      </div>

      {/* Resolve risk flag — styled dialog (replaces the old window.prompt). */}
      <DecisionModal
        open={resolvingFlag !== null}
        action="approve"
        title="Resolve risk flag"
        description={`Resolving “${resolvingFlag?.label ?? 'this risk'}”. Record what was done so the audit trail explains why it’s cleared.`}
        confirmLabel="Mark resolved"
        reasonLabel="What was done to resolve this?"
        reasonPlaceholder="e.g. Confirmed with the broker that the name difference is a legal rename; confirmation attached."
        reasonRequired
        onCancel={() => setResolvingFlag(null)}
        onConfirm={async (note) => {
          if (!resolvingFlag) return;
          try {
            await api.workflow.resolveRiskFlag(resolvingFlag.flagId, note);
            toast.success('Risk flag resolved.');
            if (onRunValidation) await onRunValidation(item.id);
          } catch (err) {
            console.error('Resolve failed', err);
            toast.error("We couldn't resolve this flag. Please try again — if it keeps happening, contact support.");
          } finally {
            setResolvingFlag(null);
          }
        }}
      />
    </div>
  );
}

