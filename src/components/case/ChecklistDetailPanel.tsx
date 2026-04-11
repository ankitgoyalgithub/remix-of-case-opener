import React, { useState } from 'react';
import { ChecklistItem, ChecklistRuleResult, DOCUMENT_TYPE_LABELS } from '@/types/case';
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
        
        {item.verifications && item.verifications.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verification Pipeline</p>
              <Badge variant="outline" className="text-[10px] font-bold tracking-tighter uppercase opacity-60">Definition</Badge>
            </div>
            <div className="rounded-lg border border-border/40 overflow-hidden bg-card/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">Check Type</th>
                    <th className="px-4 py-2.5">Protocol / Target</th>
                    <th className="px-4 py-2.5 text-right">Methodology</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {item.verifications.map((v, idx) => {
                    const iconConfig = TYPE_CONFIG[v.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG['manual'];
                    const Icon = iconConfig.icon;
                    return (
                      <tr key={v.id || idx} className="hover:bg-muted/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1 rounded bg-muted border", iconConfig.color)}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-semibold text-foreground">{iconConfig.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-muted-foreground truncate max-w-[200px]">
                            {v.config?.taskDescription || v.config?.target_document || (v.config?.target_documents?.join(', ')) || 'Standard Logic'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold border uppercase transition-colors shadow-sm",
                            v.type === 'manual' 
                              ? "bg-muted text-muted-foreground border-border" 
                              : "bg-primary/10 text-primary border-primary/20 shadow-primary/5"
                          )}>
                            {v.type === 'manual' ? 'Manual Check' : 'Automated Check'}
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
                            <div className="flex flex-col">
                              {rule.source_value != null ? (
                                <div className="font-semibold text-foreground">{String(rule.source_value)}</div>
                              ) : (
                                <span className="text-muted-foreground/40 italic font-medium">-</span>
                              )}
                              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 opacity-70">
                                {rule.source_doc_type ? (DOCUMENT_TYPE_LABELS[rule.source_doc_type as keyof typeof DOCUMENT_TYPE_LABELS] || rule.source_field || 'Source') : 'Source'}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="flex flex-col">
                              {rule.target_value != null || rule.target_field ? (
                                <div className="font-semibold text-foreground">
                                  {rule.target_value != null ? String(rule.target_value) : (rule.target_field ? rule.target_field.replace(/_/g, ' ') : <span className="text-muted-foreground/40 italic font-medium">Not detected</span>)}
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40 italic font-medium">-</span>
                              )}
                              <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black mt-1 opacity-70">
                                {rule.target_doc_type ? (
                                  rule.target_doc_type.includes(',') 
                                    ? rule.target_doc_type.split(',').map(s => DOCUMENT_TYPE_LABELS[s.trim() as keyof typeof DOCUMENT_TYPE_LABELS] || s.trim()).join(', ')
                                    : (DOCUMENT_TYPE_LABELS[rule.target_doc_type as keyof typeof DOCUMENT_TYPE_LABELS] || rule.target_doc_type || 'Target')
                                ) : (rule.target_field ? 'Mapped Field' : 'Target')}
                              </div>
                            </div>
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
              <Play className="h-5 w-5 text-primary/40 ml-0.5" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Awaiting Automated Execution</h4>
            <p className="text-xs text-muted-foreground mt-1 px-8">Trigger this check using the play icon in the checklist sidebar to begin AI verification.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

