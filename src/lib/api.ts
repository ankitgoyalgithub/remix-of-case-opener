import { getToken, logout } from './auth';

// Use environment variable if provided (e.g., in production), otherwise default to '/api' which uses local Vite proxy
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export async function fetchApi(path: string, options: RequestInit = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;
    const defaultHeaders: Record<string, string> = {};
    if (!isFormData) {
        defaultHeaders['Content-Type'] = 'application/json';
    }
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (response.status === 401 && !path.includes('/token/')) {
        logout();
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

export const api = {
    requests: {
        list: () => fetchApi('/requests/'),
        get: (id: string) => fetchApi(`/requests/${id}/`),
        update: (id: string, data: any) => fetchApi(`/requests/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => fetchApi(`/requests/${id}/`, {
            method: 'DELETE',
        }),
        create: (data: any) => fetchApi('/requests/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        readiness: (id: string) => fetchApi(`/requests/${id}/readiness/`),
        runChecklists: (id: string, docType?: string) => fetchApi(`/requests/${id}/run_checklists/`, {
            method: 'POST',
            body: JSON.stringify(docType ? { doc_type: docType } : {}),
        }),
        approve: (id: string, comment: string) => fetchApi(`/requests/${id}/approve/`, {
            method: 'POST',
            body: JSON.stringify({ comment }),
        }),
        reject: (id: string, comment: string) => fetchApi(`/requests/${id}/reject/`, {
            method: 'POST',
            body: JSON.stringify({ comment }),
        }),
        publish: (id: string) => fetchApi(`/requests/${id}/publish/`, {
            method: 'POST',
            body: JSON.stringify({}),
        }),
        nlFilter: (query: string) => fetchApi('/requests/nl_filter/', {
            method: 'POST',
            body: JSON.stringify({ query }),
        }),
    },
    workflow: {
        stages: () => fetchApi('/workflow/stages/'),
        requestStages: (requestId?: string) =>
            fetchApi(`/workflow/request-stages/${requestId ? `?request_id=${requestId}` : ''}`),
        requestStageUpdate: (id: string | number, data: any) => fetchApi(`/workflow/request-stages/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        requestChecklistUpdate: (id: string | number, data: any) => fetchApi(`/workflow/request-checklists/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        runChecklistValidation: (id: string | number) => fetchApi(`/workflow/request-checklists/${id}/run_validation/`, {
            method: 'POST',
        }),
        resolveRiskFlag: (id: number, resolutionNote: string) => fetchApi(`/workflow/risk-flags/${id}/resolve/`, {
            method: 'POST',
            body: JSON.stringify({ resolution_note: resolutionNote }),
        }),
    },
    documents: {
        list: (opts: { requestId?: string } = {}) => {
            const qs = opts.requestId ? `?request=${encodeURIComponent(opts.requestId)}` : '';
            return fetchApi(`/documents/files/${qs}`);
        },
        get: (id: string) => fetchApi(`/documents/files/${id}/`),
        update: (id: string, data: any) => fetchApi(`/documents/files/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),
        extractions: (docId?: string) =>
            fetchApi(`/documents/extractions/${docId ? `?document_id=${docId}` : ''}`),
        upload: (data: FormData) => fetchApi('/documents/files/', {
            method: 'POST',
            body: data,
        }),
        extract: (id: string, additionalPrompt?: string) => fetchApi(`/documents/files/${id}/extract/`, {
            method: 'POST',
            body: JSON.stringify({
                document_id: id,
                additional_prompt: additionalPrompt
            }),
        }),
    },
    auth: {
        login: (credentials: any) => fetchApi('/token/', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
    },
    user: {
        me: () => fetchApi('/user/me/'),
    },
    users: {
        list: () => fetchApi('/users/'),
        create: (data: any) => fetchApi('/users/', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: number | string, data: any) => fetchApi(`/users/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
        delete: (id: number | string) => fetchApi(`/users/${id}/`, { method: 'DELETE' }),
        resetPassword: (id: number | string, password: string) => fetchApi(`/users/${id}/reset-password/`, {
            method: 'POST',
            body: JSON.stringify({ password }),
        }),
    },
    notifications: {
        list: () => fetchApi('/notifications/'),
    },
    dashboard: {
        metrics: () => fetchApi('/dashboard/metrics/'),
    },
    settings: {
        get: () => fetchApi('/settings/'),
        update: (data: any) => fetchApi('/settings/', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    },
    inboundEmail: {
        accounts: {
            list: () => fetchApi('/inbound_email/accounts/'),
            update: (id: string, data: any) => fetchApi(`/inbound_email/accounts/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/inbound_email/accounts/${id}/`, { method: 'DELETE' }),
            poll: (id: string) => fetchApi(`/inbound_email/accounts/${id}/poll/`, { method: 'POST', body: JSON.stringify({}) }),
            pollAll: (opts: { triggered_by?: string } = {}) => fetchApi('/inbound_email/accounts/poll_all/', {
                method: 'POST',
                body: JSON.stringify({ triggered_by: opts.triggered_by || 'manual' }),
            }),
        },
        rules: {
            list: () => fetchApi('/inbound_email/rules/'),
            create: (data: any) => fetchApi('/inbound_email/rules/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/inbound_email/rules/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/inbound_email/rules/${id}/`, { method: 'DELETE' }),
        },
        emails: {
            list: () => fetchApi('/inbound_email/emails/'),
        },
        jobs: {
            list: () => fetchApi('/inbound_email/jobs/'),
            get: (id: string) => fetchApi(`/inbound_email/jobs/${id}/`),
        },
        startOAuth: () => {
            const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
            window.location.href = `${base}/inbound_email/oauth/start/`;
        },
    },
    integrations: {
        providers: {
            list: () => fetchApi('/integrations/providers/'),
            get: (id: string) => fetchApi(`/integrations/providers/${id}/`),
            create: (data: any) => fetchApi('/integrations/providers/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/integrations/providers/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/integrations/providers/${id}/`, { method: 'DELETE' }),
        },
        capabilities: {
            list: () => fetchApi('/integrations/capabilities/'),
            create: (data: any) => fetchApi('/integrations/capabilities/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/integrations/capabilities/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/integrations/capabilities/${id}/`, { method: 'DELETE' }),
        },
        credentials: {
            list: () => fetchApi('/integrations/credentials/'),
            create: (data: any) => fetchApi('/integrations/credentials/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/integrations/credentials/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/integrations/credentials/${id}/`, { method: 'DELETE' }),
        },
        logs: {
            list: () => fetchApi('/integrations/logs/'),
        },
    },
    studio: {
        stages: {
            list: () => fetchApi('/studio/stages/'),
            create: (data: any) => fetchApi('/studio/stages/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/studio/stages/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/studio/stages/${id}/`, { method: 'DELETE' }),
        },
        documents: {
            list: () => fetchApi('/studio/documents/'),
            create: (data: any) => fetchApi('/studio/documents/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/studio/documents/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/studio/documents/${id}/`, { method: 'DELETE' }),
        },
        checklists: {
            list: () => fetchApi('/studio/checklists/'),
            create: (data: any) => fetchApi('/studio/checklists/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string, data: any) => fetchApi(`/studio/checklists/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string) => fetchApi(`/studio/checklists/${id}/`, { method: 'DELETE' }),
        },
        cvRules: {
            list: () => fetchApi('/studio/cv-rules/'),
            create: (data: any) => fetchApi('/studio/cv-rules/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string | number, data: any) => fetchApi(`/studio/cv-rules/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string | number) => fetchApi(`/studio/cv-rules/${id}/`, { method: 'DELETE' }),
        },
        fieldMatchRules: {
            list: () => fetchApi('/studio/field-match-rules/'),
            create: (data: any) => fetchApi('/studio/field-match-rules/', { method: 'POST', body: JSON.stringify(data) }),
            update: (id: string | number, data: any) => fetchApi(`/studio/field-match-rules/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
            delete: (id: string | number) => fetchApi(`/studio/field-match-rules/${id}/`, { method: 'DELETE' }),
        },
        checkHandlers: {
            list: () => fetchApi('/studio/check-handlers/'),
        },
        outputTemplates: {
            list: () => fetchApi('/studio/output-templates/'),
            create: (data: FormData) => fetchApi('/studio/output-templates/', { method: 'POST', body: data }),
            update: (id: string | number, data: any) => fetchApi(`/studio/output-templates/${id}/`, {
                method: 'PATCH', body: JSON.stringify(data),
            }),
            delete: (id: string | number) => fetchApi(`/studio/output-templates/${id}/`, { method: 'DELETE' }),
            renderUrl: (templateId: string | number, requestId: string) => {
                const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
                return `${base}/studio/output-templates/${templateId}/render/${requestId}/`;
            },
        },
        bulkUpload: (data: FormData) => fetchApi('/studio/bulk-upload/', { method: 'POST', body: data }),
    }
};
