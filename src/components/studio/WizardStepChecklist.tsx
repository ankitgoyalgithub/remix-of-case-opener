import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  GripVertical,
  Zap,
  Hand,
  Link2,
  Trash2,
  Check,
  X,
  Settings2,
  ChevronDown,
  ChevronUp,
  GitCompare,
  User,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { ChecklistDefinition, VerificationConfig, DocumentDefinition } from '@/data/mockStudioData';
import { DOCUMENT_TYPE_LABELS } from '@/types/case';
import { useStudioChecklist, useStudioStages, useStudioDocuments } from '@/hooks/useStudioStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function WizardStepChecklist() {
  const { items, addItem, removeItem, updateItem } = useStudioChecklist();
  const { stages } = useStudioStages();
  const { documents } = useStudioDocuments();
  const [selectedStage, setSelectedStage] = useState<string | number>(stages[0]?.id || 1);
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [configuringItem, setConfiguringItem] = useState<string | null>(null);

  // Sync selectedStage once stages are loaded from API
  useEffect(() => {
    if (stages.length > 0 && (!selectedStage || selectedStage === 1)) {
      setSelectedStage(stages[0].id);
    }
  }, [stages, selectedStage]);

  const filteredItems = items.filter(item => item.stageId === selectedStage);
  const itemToDelete = items.find(i => i.id === deleteConfirm);

  const handleAddItem = () => {
    const trimmedName = newItemName.trim();
    if (!trimmedName) return;
    addItem({
      stageId: selectedStage,
      name: trimmedName,
      required: false,
      linkedDocuments: [],
      autoCheckRule: 'manual',
      manualOverrideAllowed: true,
      itemType: 'manual',
      handlerName: 'manual',
      configPayload: {}
    });
    setNewItemName('');
    setAddingItem(false);
    toast.success('Checklist item added');
  };

  const handleDeleteItem = (id: string) => {
    removeItem(id);
    setDeleteConfirm(null);
    toast.success('Checklist item removed');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">Validation Guardrails</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define precise verification checkpoints for each operational phase.
        </p>
      </div>

      {/* Top: Horizontal Stage Navigation Strip */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar shrink-0">
        {stages.map(stage => {
          const count = items.filter(i => i.stageId === stage.id).length;
          const isSelected = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={cn(
                "group flex items-center gap-3 whitespace-nowrap px-4 py-2.5 rounded-full transition-all duration-200 border",
                isSelected
                  ? "bg-foreground border-foreground text-background font-semibold shadow-md"
                  : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                isSelected ? "bg-background/20" : "bg-muted text-muted-foreground"
              )}>
                {stage.order}
              </div>
              <span className="text-sm truncate max-w-[150px]">{stage.name}</span>
              {count > 0 && (
                <Badge variant="secondary" className={cn(
                  "ml-1 text-[11px] font-black h-5 min-w-[20px] rounded-full flex items-center justify-center transition-colors",
                  isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                )}>
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Main Workspace: Checklist Items */}
          <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
            <div className="space-y-4 pb-10">
              {filteredItems.map(item => (
                <div key={item.id} className="group relative">
                  <div className={cn(
                    "bg-card rounded-lg border p-4 transition-all duration-200",
                    "hover:border-primary/40 shadow-sm hover:shadow"
                  )}>
                    <div className="flex items-center gap-4">
                      <GripVertical className="h-4 w-4 text-muted-foreground/30 hover:text-primary transition-colors cursor-move shrink-0" />

                      <div className="flex-1 min-w-0">
                        <Input
                          defaultValue={item.name}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val && val !== item.name) {
                              updateItem(item.id, { name: val });
                            }
                          }}
                          className="border-0 p-0 h-auto text-sm font-bold tracking-tight focus-visible:ring-0 bg-transparent text-foreground"
                          maxLength={200}
                        />
                        <div className="flex items-center gap-4 mt-2">
                          {(() => {
                            const hasAuto = item.verifications?.some(v => v.type === 'document_verification' || v.type === 'cross_validation' || v.type === 'external_api' || v.type === 'agent_orchestrator' || v.type === 'entity_screening' || v.type === 'risk_review');
                            return hasAuto ? (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-warning/10 border border-warning/20">
                                <Zap className="h-3 w-3 text-warning" />
                                <span className="text-[11px] font-black text-warning uppercase tracking-widest">AUTO CHECKS ENABLED</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border/50">
                                <Hand className="h-3 w-3 text-muted-foreground" />
                                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">MANUAL ONLY</span>
                              </div>
                            );
                          })()}

                          {(item.linkedDocuments?.length || 0) > 0 && (
                            <div className="flex items-center gap-1.5 text-muted-foreground/60">
                              <Link2 className="h-3 w-3" />
                              <span className="text-xs font-medium truncate max-w-[200px]">
                                {item.linkedDocuments?.map(d => DOCUMENT_TYPE_LABELS[d as keyof typeof DOCUMENT_TYPE_LABELS] || d).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 ml-4 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Verifications</Label>
                          <div className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-muted/50 border border-border/50">
                            <span className="text-sm font-bold text-foreground">
                              {item.verifications?.length || 0} checks
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-8 w-8 rounded-md transition-all",
                            configuringItem === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                          )}
                          onClick={() => setConfiguringItem(configuringItem === item.id ? null : item.id)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>

                        <div className="flex flex-col items-center gap-1 px-3 border-l border-border/30">
                          <Label className="text-xs font-medium text-muted-foreground">Req.</Label>
                          <Switch
                            checked={item.required}
                            onCheckedChange={(checked) => updateItem(item.id, { required: checked })}
                            className="scale-75"
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => setDeleteConfirm(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Configuration Expander */}
                    {configuringItem === item.id && (
                      <div className="mt-4 pt-6 border-t border-dashed border-border/60 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col w-full gap-8">
                          
                          {/* Top Section: Target Docs */}
                          <div className="w-full space-y-3 pb-6 border-b border-dashed border-border/40">
                            <Label className="text-xs font-black uppercase tracking-widest text-primary">Item-Level Target Documents</Label>
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    className="w-full md:w-[320px] justify-between h-10 text-xs font-medium bg-muted/30 border-dashed"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Link2 className="h-4 w-4 text-muted-foreground" />
                                      {item.linkedDocuments?.length ? (
                                        `${item.linkedDocuments.length} Documents Selected`
                                      ) : (
                                        "Select documents..."
                                      )}
                                    </div>
                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[350px] p-0 shadow-2xl" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search documents..." className="h-9 text-sm" />
                                    <CommandList>
                                      <CommandEmpty>No document found.</CommandEmpty>
                                      <CommandGroup>
                                        {documents.map(doc => {
                                          const isSelected = item.linkedDocuments?.includes(doc.type);
                                          return (
                                            <CommandItem
                                              key={doc.id}
                                              onSelect={() => {
                                                const currentDocs = item.linkedDocuments || [];
                                                const newDocs = isSelected
                                                  ? currentDocs.filter(d => d !== doc.type)
                                                  : [...currentDocs, doc.type];
                                                updateItem(item.id, { linkedDocuments: newDocs });
                                              }}
                                              className="text-sm"
                                            >
                                              <div className={cn(
                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                              )}>
                                                <Check className="h-3 w-3" />
                                              </div>
                                              {doc.name}
                                            </CommandItem>
                                          );
                                        })}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              
                              <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
                                {item.linkedDocuments?.map(docType => {
                                  const doc = documents.find(d => d.type === docType);
                                  return (
                                    <Badge key={docType} variant="secondary" className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-tight py-0 bg-primary/5 text-primary border-primary/10">
                                      {doc?.name || docType}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="w-full space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-black uppercase tracking-widest text-primary">Verification Pipeline</Label>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 text-xs font-bold border-primary/30 text-primary hover:bg-primary/5 uppercase gap-2">
                                    <Plus className="h-3.5 w-3.5" /> Provision New Check
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56">
                                  <DropdownMenuItem className="text-xs font-bold gap-2 cursor-pointer" onClick={() => {
                                    const next = [...(item.verifications || [])];
                                    next.push({ id: Math.random().toString(36).substr(2, 9), type: 'manual', config: {} });
                                    updateItem(item.id, { verifications: next });
                                  }}>
                                    <User className="h-3.5 w-3.5 text-blue-500" />
                                    Manual Attestation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-bold gap-2 cursor-pointer" onClick={() => {
                                    const next = [...(item.verifications || [])];
                                    next.push({ id: Math.random().toString(36).substr(2, 9), type: 'document_verification', config: { prompt: 'Verify that this document is valid, authentic, and not expired. Do not flag missing fields that are unrelated to the core document validity (like tax details) unless explicitly required.' } });
                                    updateItem(item.id, { verifications: next });
                                  }}>
                                    <Zap className="h-3.5 w-3.5 text-indigo-500" />
                                    AI Document Verification
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-bold gap-2 cursor-pointer" onClick={() => {
                                    const next = [...(item.verifications || [])];
                                    next.push({ id: Math.random().toString(36).substr(2, 9), type: 'cross_validation', config: { prompt: 'Compare the following fields across the selected documents and ensure they are semantically consistent. Highlight any discrepancies.' } });
                                    updateItem(item.id, { verifications: next });
                                  }}>
                                    <GitCompare className="h-3.5 w-3.5 text-purple-500" />
                                    Intelligent Cross-Validation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-bold gap-2 cursor-pointer" onClick={() => {
                                    const next = [...(item.verifications || [])];
                                    next.push({
                                      id: Math.random().toString(36).substr(2, 9),
                                      type: 'agent_orchestrator',
                                      handler: 'agent_orchestrator',
                                      config: { prompt: 'Cross-verify the Trade License with the VAT Certificate — the company name and TRN must match across both.' },
                                    });
                                    updateItem(item.id, { verifications: next });
                                  }}>
                                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                                    Agent (Prompt-Driven)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-bold gap-2 cursor-pointer" onClick={() => {
                                    const next = [...(item.verifications || [])];
                                    next.push({
                                      id: Math.random().toString(36).substr(2, 9),
                                      type: 'entity_screening',
                                      handler: 'entity_screening',
                                      config: { focus: '' },
                                    });
                                    updateItem(item.id, { verifications: next });
                                  }}>
                                    <Globe className="h-3.5 w-3.5 text-rose-500" />
                                    Entity Screening (AML/PEP/Adverse)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs font-bold gap-2 cursor-pointer" onClick={() => {
                                    const next = [...(item.verifications || [])];
                                    next.push({
                                      id: Math.random().toString(36).substr(2, 9),
                                      type: 'risk_review',
                                      handler: 'risk_review',
                                      config: { block_on: ['critical', 'high'] },
                                    });
                                    updateItem(item.id, { verifications: next });
                                  }}>
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                    Risk Review (Aggregate)
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            <div className="space-y-4">
                              {item.verifications?.map((verif, vIndex) => (
                                <div key={verif.id} className="w-full p-6 rounded-xl bg-muted/5 border border-border/60 relative group/verif shadow-sm">
                                  <Button 
                                    variant="ghost" size="icon" 
                                    className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover/verif:opacity-100 transition-opacity"
                                    onClick={() => {
                                      const next = [...(item.verifications || [])];
                                      next.splice(vIndex, 1);
                                      updateItem(item.id, { verifications: next });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  
                                  <div className="flex flex-col w-full gap-8">
                                    <div className="w-full md:w-[280px] space-y-2 shrink-0">
                                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Check Type</Label>
                                      <Select
                                        value={verif.type}
                                        onValueChange={(val: any) => {
                                          const next = [...(item.verifications || [])];
                                          let config: any = { prompt: '' };
                                          if (val === 'document_verification') config = { prompt: 'Verify that this document is valid, not expired, and all mandatory fields are correctly filled.' };
                                          if (val === 'cross_validation') config = { prompt: 'Compare the following fields across the selected documents and ensure they are semantically consistent. Highlight any discrepancies.' };
                                          if (val === 'agent_orchestrator') config = { prompt: 'Cross-verify the Trade License with the VAT Certificate — the company name and TRN must match across both.' };
                                          if (val === 'entity_screening') config = { focus: '' };
                                          if (val === 'risk_review') config = { block_on: ['critical', 'high'] };

                                          const nextVerif: any = { ...next[vIndex], type: val, config };
                                          if (val === 'agent_orchestrator') nextVerif.handler = 'agent_orchestrator';
                                          else if (val === 'entity_screening') nextVerif.handler = 'entity_screening';
                                          else if (val === 'risk_review') nextVerif.handler = 'risk_review';
                                          else delete nextVerif.handler;
                                          next[vIndex] = nextVerif;
                                          updateItem(item.id, { verifications: next });
                                        }}
                                      >
                                        <SelectTrigger className="h-10 text-sm font-bold bg-background shadow-inner">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="manual">Manual Attestation</SelectItem>
                                          <SelectItem value="document_verification">Document Verification</SelectItem>
                                          <SelectItem value="cross_validation">Cross-Validation</SelectItem>
                                          <SelectItem value="external_api">External API</SelectItem>
                                          <SelectItem value="agent_orchestrator">Agent (Prompt-Driven)</SelectItem>
                                          <SelectItem value="entity_screening">Entity Screening</SelectItem>
                                          <SelectItem value="risk_review">Risk Review (Aggregate)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div className="w-full space-y-4 pt-6 border-t border-dashed border-border/40">
                                      {verif.type !== 'manual' && (
                                        <Label className="text-xs font-black uppercase tracking-[0.15em] text-primary/80">Agent Instructions & Parameterization</Label>
                                      )}
                                      
                                      {verif.type === 'manual' && (
                                        <div className="w-full space-y-2">
                                          <Label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">Instructions for Operator</Label>
                                          <textarea
                                            className="flex min-h-[100px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner"
                                            placeholder="Describe what the operator needs to check manually..."
                                            value={verif.config?.taskDescription || ''}
                                            onChange={(e) => {
                                              const next = [...(item.verifications || [])];
                                              next[vIndex].config.taskDescription = e.target.value;
                                              updateItem(item.id, { verifications: next });
                                            }}
                                          />
                                        </div>
                                      )}

                                      {verif.type === 'document_verification' && (
                                        <div className="flex flex-col lg:flex-row gap-8 w-full">
                                          <div className="w-full lg:w-[320px] space-y-2 shrink-0">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Target Document</Label>
                                            <Select
                                              value={verif.config?.target_document || ''}
                                              onValueChange={(val) => {
                                                const next = [...(item.verifications || [])];
                                                next[vIndex].config.target_document = val;
                                                updateItem(item.id, { verifications: next });
                                              }}
                                            >
                                              <SelectTrigger className="h-10 text-sm font-semibold bg-background shadow-inner">
                                                <SelectValue placeholder="Select reference..." />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {documents.map(doc => (
                                                  <SelectItem key={doc.type} value={doc.type}>{doc.name}</SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          
                                          <div className="flex-1 space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Agent Instruction / Prompt</Label>
                                            <textarea
                                              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner leading-relaxed"
                                              placeholder="Instructions for the AI agent..."
                                              value={verif.config?.prompt || ''}
                                              onChange={(e) => {
                                                const next = [...(item.verifications || [])];
                                                next[vIndex].config.prompt = e.target.value;
                                                updateItem(item.id, { verifications: next });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {verif.type === 'cross_validation' && (
                                        <div className="flex flex-col lg:flex-row gap-8 w-full">
                                          <div className="w-full lg:w-[380px] space-y-6 shrink-0">
                                            <div className="space-y-2">
                                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Documents to Compare</Label>
                                              <Popover>
                                                <PopoverTrigger asChild>
                                                  <Button 
                                                    variant="outline" 
                                                    className="w-full justify-between h-10 text-sm font-medium bg-background shadow-inner border-dashed"
                                                  >
                                                    <div className="flex items-center gap-2 truncate">
                                                      <Link2 className="h-4 w-4 text-muted-foreground" />
                                                      {(verif.config?.target_documents?.length || 0) > 0 ? (
                                                        `${verif.config.target_documents.length} Selected`
                                                      ) : (
                                                        "Select documents..."
                                                      )}
                                                    </div>
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                  </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[350px] p-0 shadow-2xl" align="start">
                                                  <Command>
                                                    <CommandInput placeholder="Search documents..." className="h-9 text-sm" />
                                                    <CommandList>
                                                      <CommandEmpty>No document found.</CommandEmpty>
                                                      <CommandGroup>
                                                        {documents.map(doc => {
                                                          const isSelected = (verif.config?.target_documents || []).includes(doc.type);
                                                          return (
                                                            <CommandItem
                                                              key={doc.type}
                                                              onSelect={() => {
                                                                const current = verif.config?.target_documents || [];
                                                                const nextDocs = isSelected 
                                                                  ? current.filter((d: string) => d !== doc.type) 
                                                                  : [...current, doc.type];
                                                                const next = [...(item.verifications || [])];
                                                                next[vIndex].config.target_documents = nextDocs;
                                                                updateItem(item.id, { verifications: next });
                                                              }}
                                                              className="text-sm"
                                                            >
                                                              <div className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                                              )}>
                                                                <Check className="h-3 w-3" />
                                                              </div>
                                                              {doc.name}
                                                            </CommandItem>
                                                          );
                                                        })}
                                                      </CommandGroup>
                                                    </CommandList>
                                                  </Command>
                                                </PopoverContent>
                                              </Popover>
                                            </div>
                                          </div>
                                          
                                          <div className="flex-1 space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Agent Cross-Validation Instruction</Label>
                                            <textarea
                                              className="flex min-h-[180px] w-full rounded-xl border border-input bg-background px-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner leading-relaxed"
                                              placeholder="Detailed comparison rules for the AI agent..."
                                              value={verif.config?.prompt || ''}
                                              onChange={(e) => {
                                                const next = [...(item.verifications || [])];
                                                next[vIndex].config.prompt = e.target.value;
                                                updateItem(item.id, { verifications: next });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {verif.type === 'external_api' && (
                                        <div className="flex flex-col lg:flex-row gap-8 w-full">
                                          <div className="w-full lg:w-[320px] space-y-2 shrink-0">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Endpoint URI</Label>
                                            <Input
                                              className="h-10 text-sm bg-background shadow-inner"
                                              placeholder="https://api..."
                                              value={verif.config?.endpoint || ''}
                                              onChange={(e) => {
                                                const next = [...(item.verifications || [])];
                                                next[vIndex].config.endpoint = e.target.value;
                                                next[vIndex].handler = 'external_generic_api';
                                                updateItem(item.id, { verifications: next });
                                              }}
                                            />
                                          </div>

                                          <div className="flex-1 space-y-2">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Response Agent Instruction</Label>
                                            <textarea
                                              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner leading-relaxed"
                                              placeholder="Instructions for processing API response..."
                                              value={verif.config?.prompt || ''}
                                              onChange={(e) => {
                                                const next = [...(item.verifications || [])];
                                                next[vIndex].config.prompt = e.target.value;
                                                updateItem(item.id, { verifications: next });
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {verif.type === 'risk_review' && (
                                        <div className="w-full space-y-3">
                                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Risk Review — no config needed. Aggregates all RiskFlags raised on this request.
                                          </Label>
                                          <div className="space-y-1.5">
                                            <Label className="text-[11px] text-muted-foreground">Block the stage when any unresolved flag has severity…</Label>
                                            <div className="flex flex-wrap gap-2">
                                              {(['critical', 'high', 'medium', 'low', 'info'] as const).map(sev => {
                                                const checked = (verif.config?.block_on || ['critical', 'high']).includes(sev);
                                                return (
                                                  <button
                                                    key={sev}
                                                    type="button"
                                                    onClick={() => {
                                                      const next = [...(item.verifications || [])];
                                                      const current: string[] = next[vIndex].config.block_on || ['critical', 'high'];
                                                      const updated = checked ? current.filter(s => s !== sev) : [...current, sev];
                                                      next[vIndex].config.block_on = updated;
                                                      next[vIndex].handler = 'risk_review';
                                                      updateItem(item.id, { verifications: next });
                                                    }}
                                                    className={cn(
                                                      'text-xs font-semibold uppercase tracking-wide px-2.5 h-7 rounded-md border transition-colors',
                                                      checked
                                                        ? 'bg-primary/10 text-primary border-primary/30'
                                                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                                                    )}
                                                  >
                                                    {sev}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground">
                                            At runtime this lists every risk flag on the request (with severity + source document) and
                                            lets the operator resolve or override each. The stage auto-completes when no flag at a
                                            blocking severity remains unresolved.
                                          </p>
                                        </div>
                                      )}

                                      {verif.type === 'entity_screening' && (
                                        <div className="w-full space-y-2">
                                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Screening Focus (optional) — narrow the screening, or leave blank for a standard AML/PEP/Adverse Media sweep
                                          </Label>
                                          <textarea
                                            className="flex min-h-[90px] w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner leading-relaxed"
                                            placeholder="e.g. Focus on UAE and GCC sanctions lists. Ignore minor civil disputes."
                                            value={verif.config?.focus || ''}
                                            onChange={(e) => {
                                              const next = [...(item.verifications || [])];
                                              next[vIndex].config.focus = e.target.value;
                                              next[vIndex].handler = 'entity_screening';
                                              updateItem(item.id, { verifications: next });
                                            }}
                                          />
                                          <p className="text-[11px] text-muted-foreground">
                                            Uses the <span className="font-semibold">Entity Name</span> set on the request, or falls back to the
                                            Company Name from the Trade Licence. Runs a web search via Tavily and uses an LLM to classify
                                            sanctions, PEP, and adverse-media signals. Requires <code className="px-1 py-0.5 rounded bg-muted text-[10px]">TAVILY_API_KEY</code> in the backend env.
                                          </p>
                                        </div>
                                      )}

                                      {verif.type === 'agent_orchestrator' && (
                                        <div className="w-full space-y-2">
                                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Check Prompt — write in plain English, AI resolves to a concrete check on save
                                          </Label>
                                          <textarea
                                            className="flex min-h-[140px] w-full rounded-xl border border-input bg-background px-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner leading-relaxed"
                                            placeholder="e.g. Cross-verify the Trade License with the VAT Certificate — company name and TRN must match."
                                            value={verif.config?.prompt || ''}
                                            onChange={(e) => {
                                              const next = [...(item.verifications || [])];
                                              next[vIndex].config.prompt = e.target.value;
                                              next[vIndex].handler = 'agent_orchestrator';
                                              // Mark the saved plan as stale — backend re-plans on save.
                                              if (next[vIndex].config.plan) {
                                                next[vIndex].config.plan = { ...next[vIndex].config.plan, stale: true };
                                              }
                                              updateItem(item.id, { verifications: next });
                                            }}
                                          />

                                          {/* Show the resolved plan (saved by the backend) */}
                                          {(() => {
                                            const plan = verif.config?.plan;
                                            if (!plan) {
                                              return (
                                                <p className="text-[11px] text-muted-foreground">
                                                  Save the checklist to compute the plan. This runs once at save time — every request
                                                  then uses the saved plan deterministically.
                                                </p>
                                              );
                                            }
                                            if (plan.stale) {
                                              return (
                                                <div className="text-[11px] text-warning px-3 py-2 rounded-md bg-warning/5 border border-warning/20">
                                                  Prompt changed — save to re-compute the plan.
                                                </div>
                                              );
                                            }
                                            if (plan.action === 'unsupported') {
                                              return (
                                                <div className="text-[11px] text-destructive px-3 py-2 rounded-md bg-destructive/5 border border-destructive/20">
                                                  Planner could not map this prompt to a concrete check. {plan.explanation || ''}
                                                </div>
                                              );
                                            }
                                            const docsLabel = (plan.documents || []).join(', ') || '—';
                                            const actionLabel = plan.action === 'cross_validation' ? 'Cross-validate' : 'Verify';
                                            return (
                                              <div className="text-[12px] px-3 py-2.5 rounded-md bg-primary/5 border border-primary/15 space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                  <Zap className="h-3.5 w-3.5 text-primary" />
                                                  <span className="font-semibold text-primary uppercase tracking-wide text-[10px]">Resolved plan</span>
                                                </div>
                                                <div className="text-foreground leading-relaxed">
                                                  <span className="font-medium">{actionLabel}</span>
                                                  {' using '}
                                                  <span className="font-mono text-[11px] bg-background px-1.5 py-0.5 rounded">{docsLabel}</span>
                                                </div>
                                                {plan.instruction && (
                                                  <p className="text-muted-foreground text-[11px] italic">"{plan.instruction}"</p>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                              {(!item.verifications || item.verifications.length === 0) && (
                                <div className="text-center py-12 border border-dashed rounded-xl bg-muted/5 text-sm text-muted-foreground">
                                  No active verifications defined. Start by adding a check to the pipeline.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredItems.length === 0 && !addingItem && (
                <div className="h-[200px] flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 gap-3">
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">No Guardrails Defined</p>
                  </div>
                </div>
              )}

              {/* Inline Add Interaction */}
              <div className="pt-2">
                {addingItem ? (
                  <div className="border rounded-lg bg-card p-4 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-4">
                      <Input
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Specify checking requirement..."
                        className="flex-1 h-9 rounded-md bg-background text-sm"
                        maxLength={200}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleAddItem} disabled={!newItemName.trim()} className="h-9 px-4">
                          <Check className="h-4 w-4 mr-2" />
                          Add Task
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => { setAddingItem(false); setNewItemName(''); }} className="h-9 w-9 text-muted-foreground">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full h-12 border-dashed font-medium text-muted-foreground hover:text-foreground" onClick={() => setAddingItem(true)}>
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Manual Attestation Task</span>
                    </div>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight">Purge Checkpoint</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-muted-foreground/80 leading-relaxed">
              Are you sure you want to remove <span className="text-foreground font-bold italic">"{itemToDelete?.name}"</span>?
              <br />This validation rule will be permanently deleted from the engine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-4">
            <AlertDialogCancel className="rounded-xl font-bold text-xs tracking-wider">CANCEL</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteItem(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl font-bold text-xs tracking-wider shadow-lg shadow-destructive/20"
            >
              DELETE TASK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
