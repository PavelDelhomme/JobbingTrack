import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Client principal (API Gateway)
export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token JWT automatiquement
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Intercepteur pour gérer les erreurs d'authentification
apiClient.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
    }
    return Promise.reject(error);
});

// Services pour les microservices
export const authService = {
    login: (email: string, password: string) =>
        apiClient.post('/auth/login', { email, password }),

    register: (data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }) => apiClient.post('/auth/register', data),

    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/profile'),
    updateProfile: (data: any) => apiClient.put('/auth/profile', data),
};

export const applicationService = {
    getAll: () => apiClient.get('/applications'),
    getById: (id: string) => apiClient.get(`/applications/${id}`),
    create: (data: any) => apiClient.post('/applications', data),
    update: (id: string, data: any) => apiClient.put(`/applications/${id}`, data),
    delete: (id: string) => apiClient.delete(`/applications/${id}`),
    getStats: () => apiClient.get('/applications/stats'),
};

export const companyService = {
    getAll: () => apiClient.get('/companies'),
    getById: (id: string) => apiClient.get(`/companies/${id}`),
    create: (data: any) => apiClient.post('/companies', data),
    update: (id: string, data: any) => apiClient.put(`/companies/${id}`, data),
    delete: (id: string) => apiClient.delete(`/companies/${id}`),
};

export const contactService = {
    getAll: () => apiClient.get('/contacts'),
    getById: (id: string) => apiClient.get(`/contacts/${id}`),
    create: (data: any) => apiClient.post('/contacts', data),
    update: (id: string, data: any) => apiClient.put(`/contacts/${id}`, data),
    delete: (id: string) => apiClient.delete(`/contacts/${id}`),
};

export const interviewService = {
    getAll: () => apiClient.get('/interviews'),
    getById: (id: string) => apiClient.get(`/interviews/${id}`),
    create: (data: any) => apiClient.post('/interviews', data),
    update: (id: string, data: any) => apiClient.put(`/interviews/${id}`, data),
    delete: (id: string) => apiClient.delete(`/interviews/${id}`),
};

export const followUpService = {
    getAll: () => apiClient.get('/follow-ups'),
    getById: (id: string) => apiClient.get(`/follow-ups/${id}`),
    create: (data: any) => apiClient.post('/follow-ups', data),
    update: (id: string, data: any) => apiClient.put(`/follow-ups/${id}`, data),
    delete: (id: string) => apiClient.delete(`/follow-ups/${id}`),
};

export const callService = {
    getAll: () => apiClient.get('/calls'),
    getById: (id: string) => apiClient.get(`/calls/${id}`),
    create: (data: any) => apiClient.post('/calls', data),
    update: (id: string, data: any) => apiClient.put(`/calls/${id}`, data),
    delete: (id: string) => apiClient.delete(`/calls/${id}`),
};

export const calendarService = {
    getAll: () => apiClient.get('/calendars'),
    getById: (id: string) => apiClient.get(`/calendars/${id}`),
    create: (data: any) => apiClient.post('/calendars', data),
    update: (id: string, data: any) => apiClient.put(`/calendars/${id}`, data),
    delete: (id: string) => apiClient.delete(`/calendars/${id}`),
};

export const eventService = {
    getAll: () => apiClient.get('/events'),
    getById: (id: string) => apiClient.get(`/events/${id}`),
    create: (data: any) => apiClient.post('/events', data),
    update: (id: string, data: any) => apiClient.put(`/events/${id}`, data),
    delete: (id: string) => apiClient.delete(`/events/${id}`),
};

export const testService = {
    healthCheck: (service?: string) => {
        const url = service ? `${API_BASE_URL}/${service}/health` : `${API_BASE_URL}/health`;
        return apiClient.get(url);
    },
    testAllServices: () => apiClient.get(`/test/all-services`),
    getServiceLogs: (service: string, lines = 100) => apiClient.get(`/logs/${service}?lines=${lines}`),
    getMetrics: () => apiClient.get(`/metrics`),
};

export const notificationService = {
    getAll: () => apiClient.get('/notifications'),
    getById: (id: string) => apiClient.get(`/notifications/${id}`),
    create: (data: any) => apiClient.post('/notifications', data),
    update: (id: string, data: any) => apiClient.put(`/notifications/${id}`, data),
    delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};

export const dashboardService = {
    getKPIs: () => apiClient.get('/dashboard/kpis'),
    getStats: () => apiClient.get('/dashboard/stats'),
};

export default apiClient;