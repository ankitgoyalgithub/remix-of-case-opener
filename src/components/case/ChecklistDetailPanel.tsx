import React, { useState } from 'react';
import { ChecklistItem, ChecklistRuleResult } from '@/types/case';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Check, X, Clock, AlertCircle, Play, ChevronRight,
  FileText, GitCompare, Globe, User, Loader2, Zap,
  ArrowRight, Info, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ChecklistDetailPanelProps {
  item: ChecklistItem;
  onValidationComplete?: (updatedItem: ChecklistItem) => void;
  onRunValidation?: (itemId: string) => Promise<void>;
}

const TYPE_CONFIG = {
  'manual': {
    icon: User,
    label: 'Manual Task',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  'extraction': {
    icon: Zap,
    label: 'AI Extraction',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  'cross-validation': {
    icon: GitCompare,
    label: 'Cross-Validation',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  'third-party-api': {
    icon: Globe,
    label: 'Third-Party API',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  'verification': {
    icon: AlertCircle,
    label: 'Verification',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
} as const;

const RESULT_STATUS_CONFIG = {
  pass: { icon: Check, label: 'PASSED', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  fail: { icon: X, label: 'FAILED', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30' },
  pending: { icon: Clock, label: 'PENDING', color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border/50' },
  error: { icon: AlertCircle, label: 'ERROR', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
};



export function ChecklistDetailPanel({ item, onValidationComplete, onRunValidation }: ChecklistDetailPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [localResult, setLocalResult] = useState(item.result || null);

  React.useEffect(() => {
    setLocalResult(item.result || null);
  }, [item]);

  const typeConfig = TYPE_CONFIG[item.itemType] || TYPE_CONFIG['manual'];
  const TypeIcon = typeConfig.icon;

  const resultStatus = localResult?.status || 'pending';
  const resultConfig = RESULT_STATUS_CONFIG[resultStatus];
  const ResultIcon = resultConfig.icon;

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="mb-8 flex items-start gap-5">
          <div className={cn('w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border shadow-sm', typeConfig.bg, typeConfig.border)}>
            <TypeIcon className={cn('h-8 w-8', typeConfig.color)} />
          </div>
          <div className="pt-1">
            <h3 className="text-xl font-bold text-foreground mb-3 leading-tight">{item.label}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('text-xs', typeConfig.color)}>
                {typeConfig.label}
              </Badge>
              {item.required && (
                <Badge variant="destructive" className="text-xs px-2 py-0">
                  MANDATORY
                </Badge>
              )}
            </div>
          </div>
      </div>

      <div className="space-y-10">
        {item.taskDescription && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Objective Analysis</p>
            <p className="text-base text-foreground leading-relaxed">{item.taskDescription}</p>
          </div>
        )}

        {item.taskDetails && (
          <div className="rounded-lg bg-muted/20 border p-5 flex gap-4">
            <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-foreground/80 leading-relaxed">{item.taskDetails}</p>
          </div>
        )}

        {localResult ? (
          <div className="space-y-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Validation Intelligence</p>
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
                    title="Execute Validation Again"
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

            {localResult.details && localResult.details.length > 0 && (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Rule / Field</th>
                      <th className="px-4 py-3 font-semibold">Source Document</th>
                      <th className="px-4 py-3 font-semibold">Target Document</th>
                      <th className="px-4 py-3 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {localResult.details.map((rule, idx) => {
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
                            {rule.source_value !== null ? (
                              <div>
                                <div className="font-semibold text-foreground">{String(rule.source_value)}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                                  {rule.source_doc_type || 'Source'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 italic font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {rule.target_value !== null || rule.target_field ? (
                              <div>
                                <div className="font-semibold text-foreground">{rule.target_value !== null ? String(rule.target_value) : <span className="text-muted-foreground/40 italic font-medium">Not detected</span>}</div>
                                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                                  {rule.target_doc_type || 'Target'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 italic font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top text-right">
                            <Badge variant="outline" className={cn("text-xs font-bold uppercase ml-auto inline-flex items-center", 
                              isPending ? "text-muted-foreground border-border" : (rule.passed ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10")
                            )}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {isPending ? 'Pending' : (rule.passed ? 'Passed' : 'Failed')}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (item.verifications?.some(v => v.type !== 'manual') || (item.handlerName && item.handlerName !== 'manual') || item.itemType === 'cross-validation') ? (
          <div className="flex flex-col items-center justify-center py-20 text-center relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl border border-dashed border-primary/20 -z-10 group-hover:bg-primary/10 transition-all"></div>
            <Play className="h-12 w-12 text-primary/30 mb-6" />
            <h4 className="text-lg font-black text-primary font-headline">Verification Pending</h4>
            <p className="font-label text-sm text-muted-foreground mt-2 max-w-xs mb-8">This check can be executed automatically using the system logic.</p>
            <Button 
              onClick={async () => {
                setIsRunning(true);
                try {
                  if (onRunValidation) await onRunValidation(item.id);
                } finally {
                  setIsRunning(false);
                }
              }}
              disabled={isRunning}
              className="rounded-xl px-10 h-12 font-bold gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
            >
              {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
              {isRunning ? 'EXECUTIVE AGENT RUNNING...' : 'TRIGGER AUTOMATED CHECK'}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

