import { useState, useCallback, useEffect } from 'react';
import {
  WorkflowStage,
  DocumentDefinition,
  ExtractionField,
  AIInstruction,
  ChecklistDefinition,
  EmailTemplate,
  mockWorkflowStages,
  mockDocumentDefinitions,
  mockExtractionFields,
  mockAIInstructions,
  mockChecklistDefinitions,
  mockEmailTemplates,
} from '@/data/mockStudioData';

const STORAGE_KEYS = {
  stages: 'studio_workflow_stages',
  documents: 'studio_documents',
  fields: 'studio_extraction_fields',
  instructions: 'studio_ai_instructions',
  checklist: 'studio_checklist',
  emails: 'studio_email_templates',
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function useStudioStages() {
  const [stages, setStagesState] = useState<WorkflowStage[]>([]);

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.studio.stages.list().then((data: any[]) => {
        setStagesState(data.map(d => ({
          ...d,
          slaHours: d.sla_hours,
        })).sort((a: any, b: any) => a.order - b.order));
      });
    });
  }, []);

  const setStages = useCallback((updater: WorkflowStage[] | ((prev: WorkflowStage[]) => WorkflowStage[])) => {
    setStagesState(updater);
  }, []);

  const addStage = useCallback((name: string, description: string) => {
    const tempId = `temp-${Date.now()}`;
    let maxOrder = 0;
    
    setStagesState(prev => {
      maxOrder = prev.reduce((max, s) => Math.max(max, s.order), 0);
      const newStage: WorkflowStage = { id: tempId, name, description, order: maxOrder + 1, mandatory: false };
      return [...prev, newStage];
    });

    // Side effect: API call moved outside of setState callback
    import('@/lib/api').then(({ api }) => {
      api.studio.stages.create({
        name,
        description,
        order: maxOrder + 1,
        mandatory: false,
        workflow: 2 // Assign to Standard Insurance Intake (ID 2)
      })
      .then(saved => {
        setStagesState(current => current.map(s => s.id === tempId ? { ...saved, slaHours: saved.sla_hours } : s));
      })
      .catch(err => {
        console.error('Failed to create stage:', err);
        // Rollback on error
        setStagesState(current => current.filter(s => s.id !== tempId));
      });
    });
  }, []);

  const removeStage = useCallback((id: string) => {
    setStagesState(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map((s, i) => ({ ...s, order: i + 1 }));
    });
    if (!id.toString().startsWith('temp-')) {
      import('@/lib/api').then(({ api }) => api.studio.stages.delete(id));
    }
  }, []);

  const reorderStages = useCallback((fromIndex: number, toIndex: number) => {
    setStagesState(prev => {
      const items = [...prev];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      const updated = items.map((s, i) => ({ ...s, order: i + 1 }));
      import('@/lib/api').then(({ api }) => {
        updated.forEach(s => {
          if (!s.id.toString().startsWith('temp-')) {
            api.studio.stages.update(s.id, { order: s.order });
          }
        });
      });
      return updated;
    });
  }, []);

  const updateStage = useCallback((id: string, updates: Partial<WorkflowStage>) => {
    setStagesState(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    if (!id.toString().startsWith('temp-')) {
      import('@/lib/api').then(({ api }) => {
        const payload: any = { ...updates };
        if ('slaHours' in payload) {
          payload.sla_hours = payload.slaHours;
          delete payload.slaHours;
        }
        api.studio.stages.update(id, payload);
      });
    }
  }, []);

  return { stages, setStages, addStage, removeStage, reorderStages, updateStage };
}

export function useStudioDocuments() {
  const [documents, setDocumentsState] = useState<DocumentDefinition[]>([]);

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.studio.documents.list().then((data: any[]) => {
        setDocumentsState(data.map(d => ({
          ...d,
          type: d.doc_type,
          renewalOnly: d.renewal_only,
          cross_validation_rules: d.cross_validation_rules || []
        })));
      });
    });
  }, []);

  const setDocuments = useCallback((updater: DocumentDefinition[] | ((prev: DocumentDefinition[]) => DocumentDefinition[])) => {
    setDocumentsState(updater);
  }, []);

  const addDocument = useCallback((doc: Omit<DocumentDefinition, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    const newDoc = { ...doc, id: tempId };
    setDocumentsState(prev => [...prev, newDoc as DocumentDefinition]);

    import('@/lib/api').then(({ api }) => {
      api.studio.documents.create({
        name: doc.name,
        doc_type: doc.type,
        category: doc.category,
        mandatory: doc.mandatory,
        renewal_only: doc.renewalOnly,
        description: doc.description,
        cross_validation_rules: doc.cross_validation_rules || []
      }).then(saved => {
        setDocumentsState(current => current.map(d => d.id === tempId ? {
          ...saved,
          type: saved.doc_type,
          renewalOnly: saved.renewal_only,
          cross_validation_rules: saved.cross_validation_rules || []
        } : d));
      });
    });
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocumentsState(prev => prev.filter(d => d.id !== id));
    if (!id.toString().startsWith('temp-')) {
      import('@/lib/api').then(({ api }) => api.studio.documents.delete(id));
    }
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<DocumentDefinition>) => {
    setDocumentsState(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    if (!id.toString().startsWith('temp-')) {
      const payload: any = { ...updates };
      if (updates.type !== undefined) payload.doc_type = updates.type;
      if (updates.renewalOnly !== undefined) payload.renewal_only = updates.renewalOnly;
      if (updates.cross_validation_rules !== undefined) payload.cross_validation_rules = updates.cross_validation_rules;

      import('@/lib/api').then(({ api }) => api.studio.documents.update(id, payload));
    }
  }, []);

  return { documents, setDocuments, addDocument, removeDocument, updateDocument };
}

export function useStudioFields() {
  const [fields, setFieldsState] = useState<ExtractionField[]>(() =>
    loadFromStorage(STORAGE_KEYS.fields, mockExtractionFields)
  );

  const setFields = useCallback((updater: ExtractionField[] | ((prev: ExtractionField[]) => ExtractionField[])) => {
    setFieldsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEYS.fields, next);
      return next;
    });
  }, []);

  const addField = useCallback((field: Omit<ExtractionField, 'id'>) => {
    setFields(prev => [...prev, { ...field, id: `ef-${Date.now()}` }]);
  }, [setFields]);

  const removeField = useCallback((id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
  }, [setFields]);

  const updateField = useCallback((id: string, updates: Partial<ExtractionField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, [setFields]);

  return { fields, setFields, addField, removeField, updateField };
}

export function useStudioInstructions() {
  const [instructions, setInstructionsState] = useState<AIInstruction[]>(() =>
    loadFromStorage(STORAGE_KEYS.instructions, mockAIInstructions)
  );

  const setInstructions = useCallback((updater: AIInstruction[] | ((prev: AIInstruction[]) => AIInstruction[])) => {
    setInstructionsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEYS.instructions, next);
      return next;
    });
  }, []);

  const updateInstruction = useCallback((documentType: string, text: string) => {
    setInstructions(prev => {
      const existing = prev.find(i => i.documentType === documentType);
      if (existing) {
        return prev.map(i => i.documentType === documentType ? { ...i, instructions: text } : i);
      }
      return [...prev, { documentType: documentType as any, instructions: text }];
    });
  }, [setInstructions]);

  return { instructions, setInstructions, updateInstruction };
}

export function useStudioChecklist() {
  const [items, setItemsState] = useState<ChecklistDefinition[]>([]);

  useEffect(() => {
    import('@/lib/api').then(({ api }) => {
      api.studio.checklists.list().then((data: any[]) => {
        setItemsState(data.map(d => ({
          ...d,
          stageId: d.stage,
          linkedDocuments: d.linked_documents,
          autoCheckRule: d.auto_check_rule,
          manualOverrideAllowed: d.manual_override_allowed
        })));
      });
    });
  }, []);

  const setItems = useCallback((updater: ChecklistDefinition[] | ((prev: ChecklistDefinition[]) => ChecklistDefinition[])) => {
    setItemsState(updater);
  }, []);

  const addItem = useCallback((item: Omit<ChecklistDefinition, 'id'>) => {
    const tempId = `temp-${Date.now()}`;
    const newItem = { ...item, id: tempId };
    setItemsState(prev => [...prev, newItem as ChecklistDefinition]);

    import('@/lib/api').then(({ api }) => {
      api.studio.checklists.create({
        stage: item.stageId,
        name: item.name,
        required: item.required,
        linked_documents: item.linkedDocuments,
        auto_check_rule: item.autoCheckRule,
        manual_override_allowed: item.manualOverrideAllowed
      }).then(saved => {
        setItemsState(current => current.map(i => i.id === tempId ? {
          ...saved,
          stageId: saved.stage,
          linkedDocuments: saved.linked_documents,
          autoCheckRule: saved.auto_check_rule,
          manualOverrideAllowed: saved.manual_override_allowed
        } : i));
      });
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItemsState(prev => prev.filter(i => i.id !== id));
    if (!id.toString().startsWith('temp-')) {
      import('@/lib/api').then(({ api }) => api.studio.checklists.delete(id));
    }
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<ChecklistDefinition>) => {
    setItemsState(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    if (!id.toString().startsWith('temp-')) {
      const payload: any = { ...updates };
      if (updates.stageId !== undefined) payload.stage = updates.stageId;
      if (updates.linkedDocuments !== undefined) payload.linked_documents = updates.linkedDocuments;
      if (updates.autoCheckRule !== undefined) payload.auto_check_rule = updates.autoCheckRule;
      if (updates.manualOverrideAllowed !== undefined) payload.manual_override_allowed = updates.manualOverrideAllowed;

      import('@/lib/api').then(({ api }) => api.studio.checklists.update(id, payload));
    }
  }, []);

  return { items, setItems, addItem, removeItem, updateItem };
}

export function useStudioEmails() {
  const [templates, setTemplatesState] = useState<EmailTemplate[]>(() =>
    loadFromStorage(STORAGE_KEYS.emails, mockEmailTemplates)
  );

  const setTemplates = useCallback((updater: EmailTemplate[] | ((prev: EmailTemplate[]) => EmailTemplate[])) => {
    setTemplatesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEYS.emails, next);
      return next;
    });
  }, []);

  return { templates, setTemplates };
}
