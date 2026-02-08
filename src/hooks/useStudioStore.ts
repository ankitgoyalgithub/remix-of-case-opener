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
  const [stages, setStagesState] = useState<WorkflowStage[]>(() =>
    loadFromStorage(STORAGE_KEYS.stages, mockWorkflowStages)
  );

  const setStages = useCallback((updater: WorkflowStage[] | ((prev: WorkflowStage[]) => WorkflowStage[])) => {
    setStagesState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEYS.stages, next);
      return next;
    });
  }, []);

  const addStage = useCallback((name: string, description: string) => {
    setStages(prev => {
      const maxOrder = prev.reduce((max, s) => Math.max(max, s.order), 0);
      const newStage: WorkflowStage = {
        id: `ws-${Date.now()}`,
        name,
        description,
        order: maxOrder + 1,
        mandatory: false,
      };
      return [...prev, newStage];
    });
  }, [setStages]);

  const removeStage = useCallback((id: string) => {
    setStages(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, [setStages]);

  const reorderStages = useCallback((fromIndex: number, toIndex: number) => {
    setStages(prev => {
      const items = [...prev];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return items.map((s, i) => ({ ...s, order: i + 1 }));
    });
  }, [setStages]);

  const updateStage = useCallback((id: string, updates: Partial<WorkflowStage>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [setStages]);

  return { stages, setStages, addStage, removeStage, reorderStages, updateStage };
}

export function useStudioDocuments() {
  const [documents, setDocumentsState] = useState<DocumentDefinition[]>(() =>
    loadFromStorage(STORAGE_KEYS.documents, mockDocumentDefinitions)
  );

  const setDocuments = useCallback((updater: DocumentDefinition[] | ((prev: DocumentDefinition[]) => DocumentDefinition[])) => {
    setDocumentsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEYS.documents, next);
      return next;
    });
  }, []);

  const addDocument = useCallback((doc: Omit<DocumentDefinition, 'id'>) => {
    setDocuments(prev => [...prev, { ...doc, id: `dd-${Date.now()}` }]);
  }, [setDocuments]);

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, [setDocuments]);

  const updateDocument = useCallback((id: string, updates: Partial<DocumentDefinition>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, [setDocuments]);

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
  const [items, setItemsState] = useState<ChecklistDefinition[]>(() =>
    loadFromStorage(STORAGE_KEYS.checklist, mockChecklistDefinitions)
  );

  const setItems = useCallback((updater: ChecklistDefinition[] | ((prev: ChecklistDefinition[]) => ChecklistDefinition[])) => {
    setItemsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveToStorage(STORAGE_KEYS.checklist, next);
      return next;
    });
  }, []);

  const addItem = useCallback((item: Omit<ChecklistDefinition, 'id'>) => {
    setItems(prev => [...prev, { ...item, id: `cd-${Date.now()}` }]);
  }, [setItems]);

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, [setItems]);

  const updateItem = useCallback((id: string, updates: Partial<ChecklistDefinition>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, [setItems]);

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
