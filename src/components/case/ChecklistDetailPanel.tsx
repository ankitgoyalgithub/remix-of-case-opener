import React, { useState } from 'react';
import { ChecklistItem, ChecklistRuleResult } from '@/types/case';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Check, X, Clock, AlertCircle, Play, ChevronRight,
  FileText, GitCompare, Globe, User, Loader2, Zap,
  ArrowRight, Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ChecklistDetailPanelProps {
  item: ChecklistItem;
  onValidationComplete?: (updatedItem: ChecklistItem) => void;
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

function RuleResultRow({ rule }: { rule: ChecklistRuleResult }) {
  const StatusIcon = rule.passed ? Check : X;
  return (
    <div className={cn(
      'rounded-xl p-3 border text-xs flex flex-col gap-2',
      rule.passed ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
            rule.passed ? 'bg-success/20' : 'bg-destructive/20'
          )}>
            <StatusIcon className={cn('h-3 w-3', rule.passed ? 'text-success' : 'text-destructive')} />
          </div>
          <span className="font-semibold text-foreground truncate">
            {rule.source_field && rule.target_field 
              ? `${rule.source_field} ↔ ${rule.target_field}` 
              : rule.rule}
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[9px] font-black uppercase shrink-0',
            rule.passed ? 'text-success border-success/30 bg-success/5' : 'text-destructive border-destructive/30 bg-destructive/5'
          )}
        >
          {rule.passed ? 'MATCH' : 'MISMATCH'}
        </Badge>
      </div>

      {(rule.source_value !== null || rule.target_value !== null) && (
        <div className="flex flex-col gap-2 pl-0 sm:pl-7">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 bg-muted/30 rounded-lg px-2.5 py-1.5 min-w-0 border border-border/40">
              <div className="flex justify-between items-center mb-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">
                   {rule.source_doc_type?.replace(/-/g, ' ') || 'Source'}
                 </p>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                 <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-primary/5 text-primary border-primary/20 font-bold">
                   {rule.source_field || 'Unknown Field'}
                 </Badge>
              </div>
              <p className="text-xs font-bold text-foreground truncate">
                {rule.source_value ?? <span className="text-muted-foreground italic">Not found</span>}
              </p>
            </div>
            <div className="flex items-center justify-center sm:block">
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
            </div>
            <div className="flex-1 bg-muted/30 rounded-lg px-2.5 py-1.5 min-w-0 border border-border/40">
              <div className="flex justify-between items-center mb-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground truncate">
                   {rule.target_doc_type?.replace(/-/g, ' ') || 'Target'}
                 </p>
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                 <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-purple-500/5 text-purple-600 border-purple-500/20 font-bold">
                   {rule.target_field || 'Unknown Field'}
                 </Badge>
              </div>
              <p className="text-xs font-bold text-foreground truncate">
                {rule.target_value ?? <span className="text-muted-foreground italic">Not found</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {rule.note && (
        <p className="pl-7 text-[10px] text-muted-foreground italic">{rule.note}</p>
      )}
    </div>
  );
}

function ExpectedRuleRow({ rule }: { rule: any }) {
  return (
    <div className="rounded-xl p-3 border border-purple-500/15 bg-purple-500/5 text-xs flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GitCompare className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold text-foreground truncate">{rule.source_field} ↔ {rule.target_field}</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pl-0 sm:pl-5.5">
        <div className="flex-1 bg-muted/40 rounded-lg px-2.5 py-1.5 min-w-0 border border-border/30">
           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
             {rule.source_doc_type?.replace(/-/g, ' ') || 'Source'}
           </p>
           <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-primary/5 text-primary border-primary/20 font-bold truncate block w-fit">
             {rule.source_field}
           </Badge>
        </div>
        <div className="flex items-center justify-center sm:block">
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
        </div>
        <div className="flex-1 bg-muted/40 rounded-lg px-2.5 py-1.5 min-w-0 border border-border/30">
           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">
             {rule.target_doc_type?.replace(/-/g, ' ') || 'Target'}
           </p>
           <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-purple-500/5 text-purple-600 border-purple-500/20 font-bold truncate block w-fit">
             {rule.target_field}
           </Badge>
        </div>
      </div>
    </div>
  );
}

export function ChecklistDetailPanel({ item, onValidationComplete }: ChecklistDetailPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [localResult, setLocalResult] = useState(item.result || null);

  const typeConfig = TYPE_CONFIG[item.itemType] || TYPE_CONFIG['manual'];
  const TypeIcon = typeConfig.icon;

  const handleRunValidation = async () => {
    setIsRunning(true);
    try {
      const result = await api.workflow.runChecklistValidation(item.id);
      setLocalResult(result);
      if (result.status === 'pass') {
        toast.success('Validation passed!', { description: result.summary });
      } else {
        toast.error('Validation failed', { description: result.summary });
      }
      onValidationComplete?.({ ...item, result });
    } catch (err: any) {
      toast.error('Failed to run validation', { description: err?.message });
    } finally {
      setIsRunning(false);
    }
  };

  const resultStatus = localResult?.status || 'pending';
  const resultConfig = RESULT_STATUS_CONFIG[resultStatus];
  const ResultIcon = resultConfig.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-muted/10">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', typeConfig.bg, typeConfig.border)}>
            <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight">{item.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={cn('text-[9px] font-black uppercase', typeConfig.color, typeConfig.border, typeConfig.bg)}>
                {typeConfig.label}
              </Badge>
              {item.required && (
                <Badge variant="outline" className="text-[9px] font-black uppercase text-destructive border-destructive/30 bg-destructive/5">
                  Required
                </Badge>
              )}
              {item.checked && (
                <Badge variant="outline" className="text-[9px] font-black uppercase text-success border-success/30 bg-success/5">
                  ✓ Checked
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Task Description - shown for all types */}
        {item.taskDescription && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Task Description</p>
            <p className="text-sm text-foreground font-medium leading-relaxed">{item.taskDescription}</p>
          </div>
        )}

        {/* Task Details */}
        {item.taskDetails && (
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3 flex gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{item.taskDetails}</p>
          </div>
        )}

        {/* Expected Cross-Validation Rules */}
        {item.itemType === 'cross-validation' && item.expectedCrossValidationRules && item.expectedCrossValidationRules.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fields to Validate</p>
            <div className="space-y-1.5">
              {item.expectedCrossValidationRules.map((rule, idx) => (
                <ExpectedRuleRow key={idx} rule={rule} />
              ))}
            </div>
          </div>
        )}

        {/* Fallback to simple Pairs if expected rules aren't available */}
        {item.itemType === 'cross-validation' && (!item.expectedCrossValidationRules || item.expectedCrossValidationRules.length === 0) && item.crossValidationPairs && item.crossValidationPairs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document Pairs to Validate</p>
            <div className="space-y-1.5">
              {item.crossValidationPairs.map((pair, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/5 border border-purple-500/15">
                  <FileText className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="text-[11px] font-bold text-foreground capitalize">{pair.source_doc_type.replace(/-/g, ' ')}</span>
                  <GitCompare className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
                  <FileText className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="text-[11px] font-bold text-foreground capitalize">{pair.target_doc_type.replace(/-/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Third-Party API Config */}
        {item.isThirdPartyApi && item.apiConfig && Object.keys(item.apiConfig).length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">API Configuration</p>
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-3 space-y-1.5">
              {item.apiConfig.provider && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Provider</span>
                  <Badge variant="outline" className="text-[9px] font-black text-emerald-600 border-emerald-500/30">
                    {item.apiConfig.provider}
                  </Badge>
                </div>
              )}
              {item.apiConfig.endpoint && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Endpoint</span>
                  <code className="text-[10px] text-foreground bg-muted/30 px-2 py-1 rounded-lg break-all">{item.apiConfig.endpoint}</code>
                </div>
              )}
              {item.apiConfig.method && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Method</span>
                  <Badge variant="outline" className="text-[9px] font-black">{item.apiConfig.method}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Run Validation CTA (cross-validation only) */}
        {item.itemType === 'cross-validation' && (
          <Button
            size="sm"
            className="w-full gap-2"
            variant={localResult?.status === 'pass' ? 'outline' : 'default'}
            disabled={isRunning}
            onClick={handleRunValidation}
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Running Validation...</>
            ) : (
              <><Play className="h-4 w-4" />Run Cross-Validation</>
            )}
          </Button>
        )}

        {/* Validation Result */}
        {localResult && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Validation Result</p>
              <div className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-black', resultConfig.color, resultConfig.bg, resultConfig.border)}>
                <ResultIcon className="h-3 w-3" />
                {resultConfig.label}
              </div>
            </div>

            {localResult.details && localResult.details.length > 0 && (
              <div className="space-y-2">
                {localResult.details.map((rule, idx) => (
                  <RuleResultRow key={idx} rule={rule} />
                ))}
              </div>
            )}

            {localResult.run_at && (
              <p className="text-[10px] text-muted-foreground text-right">
                Last run: {new Date(localResult.run_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* No result yet for cross-validation */}
        {item.itemType === 'cross-validation' && !localResult && (
          <div className="flex flex-col items-center justify-center py-6 text-center opacity-60">
            <GitCompare className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs font-bold text-muted-foreground">No validation run yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Click "Run Cross-Validation" above to start</p>
          </div>
        )}
      </div>
    </div>
  );
}
