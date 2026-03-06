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
    },
    documents: {
        list: () => fetchApi('/documents/files/'),
        get: (id: string) => fetchApi(`/documents/files/${id}/`),
        extractions: (docId?: string) =>
            fetchApi(`/documents/extractions/${docId ? `?document_id=${docId}` : ''}`),
        upload: (data: FormData) => fetchApi('/documents/files/', {
            method: 'POST',
            body: data,
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
    notifications: {
        list: () => fetchApi('/notifications/'),
    },
    settings: {
        get: () => fetchApi('/settings/'),
        update: (data: any) => fetchApi('/settings/', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
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
    }
};
