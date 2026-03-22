import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Link2, 
  Plus, 
  Save, 
  Trash2, 
  ShieldCheck, 
  ArrowRight,
  Settings2,
  AlertCircle,
  Loader2,
  Search
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS, DocumentType, CrossValidationRule, FieldMatchRule } from '@/types/case';
import { cn } from '@/lib/utils';

export default function CrossValidationRules() {
  const [rules, setRules] = useState<CrossValidationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CrossValidationRule | null>(null);
  
  const [newRule, setNewRule] = useState({
    name: '',
    source_doc_type: '',
    target_doc_type: '',
    description: ''
  });

  const [newFieldRule, setNewFieldRule] = useState<Partial<FieldMatchRule>>({
    source_field: '',
    target_field: '',
    comparison_type: 'exact',
    tolerance_percentage: 0
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.studio.cvRules.list();
      setRules(data);
    } catch (error) {
      toast.error('Failed to load cross-validation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.source_doc_type || !newRule.target_doc_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const created = await api.studio.cvRules.create(newRule);
      setRules([...rules, { ...created, field_rules: [] }]);
      setIsCreateDialogOpen(false);
      setNewRule({ name: '', source_doc_type: '', target_doc_type: '', description: '' });
      toast.success('Rule created successfully');
    } catch (error) {
      toast.error('Failed to create rule');
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await api.studio.cvRules.delete(id);
      setRules(rules.filter(r => r.id !== id));
      toast.success('Rule deleted');
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleAddFieldRule = async () => {
    if (!selectedRule || !newFieldRule.source_field || !newFieldRule.target_field) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const payload = {
        ...newFieldRule,
        rule: selectedRule.id
      };
      const created = await api.studio.fieldMatchRules.create(payload);
      
      setRules(rules.map(r => {
        if (r.id === selectedRule.id) {
          return { ...r, field_rules: [...r.field_rules, created] };
        }
        return r;
      }));
      
      setIsFieldDialogOpen(false);
      setNewFieldRule({ source_field: '', target_field: '', comparison_type: 'exact', tolerance_percentage: 0 });
      toast.success('Field match rule added');
    } catch (error) {
      toast.error('Failed to add field match');
    }
  };

  const handleDeleteFieldRule = async (ruleId: number, fieldRuleId: number) => {
    try {
      await api.studio.fieldMatchRules.delete(fieldRuleId);
      setRules(rules.map(r => {
        if (r.id === ruleId) {
          return { ...r, field_rules: r.field_rules.filter(f => f.id !== fieldRuleId) };
        }
        return r;
      }));
      toast.success('Field match removed');
    } catch (error) {
      toast.error('Failed to remove field match');
    }
  };

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.source_doc_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.target_doc_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const documentTypes = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" />
            Cross-Validation Rules
          </h1>
          <p className="text-muted-foreground mt-1">
            Define mandatory matching rules between different document types.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Rule
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map(rule => (
          <Card key={rule.id} className="overflow-hidden border-primary/10 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{rule.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{rule.description || 'No description provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-background/50 border-primary/20 text-primary">ID: {rule.id}</Badge>
                  <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDeleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-6 mb-6 px-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Source Document</span>
                  <Badge className="py-1 px-3 bg-blue-500/10 text-blue-600 border-blue-500/20">{DOCUMENT_TYPE_LABELS[rule.source_doc_type as DocumentType] || rule.source_doc_type}</Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground mt-4" />
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Target Document</span>
                  <Badge className="py-1 px-3 bg-purple-500/10 text-purple-600 border-purple-500/20">{DOCUMENT_TYPE_LABELS[rule.target_doc_type as DocumentType] || rule.target_doc_type}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-2">
                    <Settings2 className="h-3 w-3" />
                    Field Match Conditions
                  </h4>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2" onClick={() => {
                    setSelectedRule(rule);
                    setIsFieldDialogOpen(true);
                  }}>
                    <Plus className="h-3 w-3" /> Add Field
                  </Button>
                </div>

                <div className="grid gap-2">
                  {rule.field_rules.map(field => (
                    <div key={field.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 group hover:border-primary/20 transition-colors">
                      <div className="flex-1 flex items-center gap-2 text-sm">
                        <span className="font-mono text-xs bg-muted p-1 px-2 rounded border">{field.source_field}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-xs bg-muted p-1 px-2 rounded border">{field.target_field}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 h-5">{field.comparison_type}</Badge>
                        {field.comparison_type === 'numeric' && field.tolerance_percentage !== undefined && (
                          <Badge variant="outline" className="text-[10px] h-5">±{field.tolerance_percentage}%</Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => field.id && handleDeleteFieldRule(rule.id, field.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {rule.field_rules.length === 0 && (
                    <div className="text-center py-6 border border-dashed rounded-xl bg-muted/5">
                      <p className="text-xs text-muted-foreground">No field matches defined. Click 'Add Field' to configure.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRules.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed rounded-3xl bg-muted/5">
            <Link2 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-muted-foreground">No rules found</h3>
            <p className="text-sm text-muted-foreground mt-1">Start by creating your first cross-validation rule.</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Create Rule
            </Button>
          </div>
        )}
      </div>

      {/* Create Rule Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Cross-Validation Rule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input 
                id="name" 
                placeholder="e.g. Trade License vs MOA Name Match" 
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="source">Source Document Type</Label>
              <Select onValueChange={(v) => setNewRule({ ...newRule, source_doc_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target">Target Document Type</Label>
              <Select onValueChange={(v) => setNewRule({ ...newRule, target_doc_type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map(type => (
                    <SelectItem key={type} value={type}>{DOCUMENT_TYPE_LABELS[type]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Description (Optional)</Label>
              <Input 
                id="desc" 
                placeholder="What does this rule verify?" 
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRule}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Field Match Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Field Match Condition</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="sfield">Source Field (AI Key)</Label>
              <Input 
                id="sfield" 
                placeholder="e.g. company_name" 
                value={newFieldRule.source_field}
                onChange={(e) => setNewFieldRule({ ...newFieldRule, source_field: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tfield">Target Field (AI Key)</Label>
              <Input 
                id="tfield" 
                placeholder="e.g. establishment_name" 
                value={newFieldRule.target_field}
                onChange={(e) => setNewFieldRule({ ...newFieldRule, target_field: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Comparison Type</Label>
              <Select defaultValue="exact" onValueChange={(v: any) => setNewFieldRule({ ...newFieldRule, comparison_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exact">Exact Match</SelectItem>
                  <SelectItem value="fuzzy">Fuzzy (Text)</SelectItem>
                  <SelectItem value="numeric">Numeric (Tolerance)</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newFieldRule.comparison_type === 'numeric' && (
              <div className="grid gap-2">
                <Label htmlFor="tolerance">Tolerance Percentage (±%)</Label>
                <Input 
                  id="tolerance" 
                  type="number"
                  value={newFieldRule.tolerance_percentage}
                  onChange={(e) => setNewFieldRule({ ...newFieldRule, tolerance_percentage: parseFloat(e.target.value) })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddFieldRule}>Add Match</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
