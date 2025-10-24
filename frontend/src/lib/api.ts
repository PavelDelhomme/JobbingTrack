import axios, { AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Cache simple pour éviter les requêtes dupliquées
const requestCache = new Map<string, Promise<any>>();
const cacheTimeout = 5000; // 5 secondes de cache

// Fonction utilitaire pour créer des requêtes avec cache
const cachedRequest = <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
    // Vérifier si une requête identique est déjà en cours
    if (requestCache.has(key)) {
        return requestCache.get(key)!;
    }

    // Créer la requête et la mettre en cache
    const promise = requestFn().finally(() => {
        // Nettoyer le cache après un délai
        setTimeout(() => {
            requestCache.delete(key);
        }, cacheTimeout);
    });

    requestCache.set(key, promise);
    return promise;
};

// Client principal (API Gateway) avec configuration optimisée
export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 5000, // Réduire le timeout à 5 secondes pour éviter les requêtes qui s'accumulent
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

// Intercepteur pour gérer les erreurs d'authentification avec gestion des rate limits
apiClient.interceptors.response.use((response) => response, (error) => {
    // Gestion spécifique des erreurs de rate limiting (429)
    if (error.response?.status === 429) {
        console.warn('Rate limit atteint, temporisation automatique...');
        // Attendre un peu avant de rejeter l'erreur
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(error);
            }, 2000); // Attendre 2 secondes avant de réessayer
        });
    }

    // Gestion des erreurs d'authentification
    if (error.response?.status === 401) {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            // Éviter la redirection en boucle en vérifiant l'URL actuelle
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
    }

    // Gestion des timeouts
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn('Timeout de requête, service temporairement indisponible');
        return Promise.reject(new Error('Service temporairement indisponible'));
    }

    return Promise.reject(error);
});

// Services pour les microservices
export const authService = {
    login: (email: string, password: string) =>
        cachedRequest(`auth-login-${email}`, () =>
            apiClient.post('/auth/login', { email, password })
        ),

    register: (data: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }) => cachedRequest(`auth-register-${data.email}`, () =>
        apiClient.post('/auth/register', data)
    ),

    logout: () => {
        // Ne pas mettre en cache logout car c'est une action unique
        return apiClient.post('/auth/logout');
    },

    getProfile: () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        // En mode développement, normaliser la clé de cache pour les tokens mock
        const cacheKey = process.env.NODE_ENV === 'development' && token?.startsWith('mock-jwt-token')
            ? 'auth-profile-mock-dev'
            : `auth-profile-${token}`;
        return cachedRequest(cacheKey, () =>
            apiClient.get('/auth/profile')
        );
    },

    updateProfile: (data: any) => {
        // Ne pas mettre en cache les mises à jour
        return apiClient.put('/auth/profile', data);
    },

    // ✅ ADMIN - Gestion utilisateurs
    getAllUsers: () => cachedRequest('auth-users', () =>
        apiClient.get('/auth/users')
    ),

    updateUserRole: (userId: string, role: string) => {
        // Ne pas mettre en cache les mises à jour
        return apiClient.put(`/auth/users/${userId}/role`, { role });
    },

    toggleUserStatus: (userId: string, isActive: boolean) => {
        // Ne pas mettre en cache les mises à jour
        return apiClient.put(`/auth/users/${userId}/status`, { isActive });
    },

    deleteUser: (userId: string) => {
        // Ne pas mettre en cache les suppressions
        return apiClient.delete(`/auth/users/${userId}`);
    },
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
    getAll: () => apiClient.get('/followups'),
    getById: (id: string) => apiClient.get(`/followups/${id}`),
    create: (data: any) => apiClient.post('/followups', data),
    update: (id: string, data: any) => apiClient.put(`/followups/${id}`, data),
    delete: (id: string) => apiClient.delete(`/followups/${id}`),
};

export const callService = {
    getAll: () => apiClient.get('/calls'),
    getById: (id: string) => apiClient.get(`/calls/${id}`),
    create: (data: any) => apiClient.post('/calls', data),
    update: (id: string, data: any) => apiClient.put(`/calls/${id}`, data),
    delete: (id: string) => apiClient.delete(`/calls/${id}`),
    complete: (id: string, data: any) => apiClient.put(`/calls/${id}/complete`, data),
    getStats: () => apiClient.get('/calls/stats/overview'),
    getByApplication: (applicationId: string) => apiClient.get(`/calls/application/${applicationId}`),
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
    getKPIs: () => cachedRequest('dashboard-kpis', () =>
        apiClient.get('/dashboard/kpis')
    ),
    getStats: () => cachedRequest('dashboard-stats', () =>
        apiClient.get('/dashboard/stats')
    ),
};

export const searchService = {
    // Recherche globale
    globalSearch: (query: string, modules?: string[], limit?: number) => {
        const params = new URLSearchParams({ query });
        if (modules && modules.length > 0) {
            params.append('modules', modules.join(','));
        }
        if (limit) {
            params.append('limit', limit.toString());
        }
        return apiClient.get(`/search?${params.toString()}`);
    },

    // Recherche avancée
    advancedSearch: (data: {
        query: string;
        modules?: string[];
        filters?: any;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
        limit?: number;
        offset?: number;
    }) => apiClient.post('/search/advanced', data),

    // Recherche par similarité (suggestions)
    similaritySearch: (query: string, modules?: string[], limit?: number) => {
        const params = new URLSearchParams({ query });
        if (modules && modules.length > 0) {
            params.append('modules', modules.join(','));
        }
        if (limit) {
            params.append('limit', limit.toString());
        }
        return apiClient.get(`/search/similar?${params.toString()}`);
    },

    // Recherche par tags
    tagSearch: (tags: string | string[], modules?: string[], limit?: number) => {
        const tagString = Array.isArray(tags) ? tags.join(',') : tags;
        const params = new URLSearchParams({ tags: tagString });
        if (modules && modules.length > 0) {
            params.append('modules', modules.join(','));
        }
        if (limit) {
            params.append('limit', limit.toString());
        }
        return apiClient.get(`/search/tags?${params.toString()}`);
    }
};

// ✅ Admin Service - Gestion avancée
export const adminService = {
    // Gestion des services
    restartService: (serviceName: string) => 
        apiClient.post('/admin/services/restart', { serviceName }),
    stopService: (serviceName: string) => 
        apiClient.post('/admin/services/stop', { serviceName }),
    startService: (serviceName: string) => 
        apiClient.post('/admin/services/start', { serviceName }),
    
    // Logs
    getAvailableServices: () => apiClient.get('/admin/logs/services'),
    getServiceLogs: (serviceName: string, lines = 100) => 
        apiClient.get(`/admin/logs/${serviceName}`, { params: { lines } }),
    getAllLogs: (lines = 100) => 
        apiClient.get('/admin/logs/all', { params: { lines } }),
    streamServiceLogs: (serviceName: string) => 
        `${API_BASE_URL}/api/v1/admin/logs/${serviceName}/stream`,
    
    // Corbeille
    getTrash: (type?: string) => 
        apiClient.get('/admin/trash', { params: { type } }),
    restoreItem: (type: string, id: string) => 
        apiClient.post(`/admin/trash/${type}/${id}/restore`),
    permanentDelete: (type: string, id: string) => 
        apiClient.delete(`/admin/trash/${type}/${id}/permanent`),
    emptyTrash: () => 
        apiClient.post('/admin/trash/empty'),
    
    // Archive
    getArchived: (type?: string) => 
        apiClient.get('/admin/archive', { params: { type } }),
    archiveItem: (type: string, id: string) => 
        apiClient.post(`/admin/archive/${type}/${id}`),
    unarchiveItem: (type: string, id: string) => 
        apiClient.post(`/admin/archive/${type}/${id}/unarchive`),
    
    // Génération de données de test
    generateTestData: (config: any) => 
        apiClient.post('/admin/test-data/generate', config),
    clearTestData: () => 
        apiClient.post('/admin/test-data/clear'),
    getTestDataStatus: () => 
        apiClient.get('/admin/test-data/status'),
};

// Export nommé pour compatibilité
export const api = apiClient;

export default apiClient;