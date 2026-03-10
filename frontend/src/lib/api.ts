import axios, { AxiosResponse } from 'axios';
import { FRONTEND_URLS } from '@/config/ports.config';
import { cacheManager } from '@/lib/cache/cacheManager';
import { isCriticalService, isOptionalService, getServiceErrorMessage, shouldLogServiceError } from './services/serviceStatus';

const API_BASE_URL = FRONTEND_URLS.api;

// Cache simple pour éviter les requêtes dupliquées en cours
const requestCache = new Map<string, Promise<any>>();
const cacheTimeout = 3000; // 3 secondes de cache

// Fonction utilitaire pour créer des requêtes avec cache optimisé
const cachedRequest = async <T>(key: string, requestFn: () => Promise<T>, ttl: number = 60000): Promise<T> => {
    // 1. Vérifier le cache persistant d'abord
    const cached = await cacheManager.get<T>(key, { ttl });
    if (cached !== null) {
        return cached;
    }

    // 2. Vérifier si une requête identique est déjà en cours
    if (requestCache.has(key)) {
        return requestCache.get(key)!;
    }

    // 3. Créer la requête et la mettre en cache
    const promise = requestFn()
        .then(async (data) => {
            // Mettre en cache persistant
            await cacheManager.set(key, data, { ttl });
            return data;
        })
        .finally(() => {
            // Nettoyer le cache de requêtes en cours après un délai
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
    timeout: 8000, // Timeout de 8 secondes pour éviter les blocages
    headers: {
        'Content-Type': 'application/json',
    },
});

// Configuration pour les requêtes critiques (auth, profil)
export const criticalApiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 5000, // Timeout plus court pour les requêtes critiques
    headers: {
        'Content-Type': 'application/json',
    },
});

// Intercepteur pour ajouter le token JWT automatiquement
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            // En développement, logger si le token est manquant pour les routes protégées
            if (process.env.NODE_ENV === 'development' && 
                config.url && 
                !config.url.includes('/health') && 
                !config.url.includes('/auth/login') &&
                !config.url.includes('/auth/register')) {
                console.warn(`[API] Requête sans token vers: ${config.url}`);
            }
        }
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Intercepteur pour criticalApiClient (même logique)
criticalApiClient.interceptors.request.use((config) => {
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

    // Gestion des timeouts et erreurs réseau avec distinction critique/optionnel
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') ||
        error.response?.status === 503) {
        // Extraire le nom du service depuis l'URL
        const serviceName = error.config?.url?.split('/')[1] || 'unknown';
        const fullServiceName = error.config?.url?.includes('/applications') ? 'application-service' :
                                error.config?.url?.includes('/companies') ? 'company-service' :
                                error.config?.url?.includes('/contacts') ? 'contact-service' :
                                error.config?.url?.includes('/interviews') ? 'interview-service' :
                                error.config?.url?.includes('/calls') ? 'call-service' :
                                error.config?.url?.includes('/events') ? 'event-service' :
                                error.config?.url?.includes('/followups') ? 'followup-service' :
                                error.config?.url?.includes('/profile') ? 'profile-service' :
                                error.config?.url?.includes('/notifications') ? 'notification-service' :
                                error.config?.url?.includes('/workflow') ? 'workflow-service' :
                                error.config?.url?.includes('/dashboard') ? 'dashboard-service' :
                                'unknown-service';
        
        if (shouldLogServiceError(fullServiceName)) {
            const errorMsg = getServiceErrorMessage(fullServiceName, error);
            if (isCriticalService(fullServiceName)) {
                console.error(errorMsg);
            } else {
                console.warn(errorMsg);
            }
        }
        
        return Promise.reject(new Error('Service temporarily unavailable'));
    }

    return Promise.reject(error);
});

// Intercepteur pour criticalApiClient (gestion plus stricte)
criticalApiClient.interceptors.response.use((response) => response, (error) => {
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

    // Handle timeouts and network errors (stricter)
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        console.warn('Critical service unavailable:', error.message);
        return Promise.reject(new Error('Service temporarily unavailable'));
    }

    return Promise.reject(error);
});

// Services pour les microservices
export const authService = {
    login: (email: string, password: string) =>
        cachedRequest(`auth-login-${email}`, () =>
            criticalApiClient.post('/auth/login', { email, password })
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
        return criticalApiClient.post('/auth/logout');
    },

    getProfile: () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        // En mode développement, normaliser la clé de cache pour les tokens mock
        const cacheKey = process.env.NODE_ENV === 'development' && token?.startsWith('mock-jwt-token')
            ? 'auth-profile-mock-dev'
            : `auth-profile-${token}`;

        // Utiliser le client critique pour getProfile (opération sensible)
        return cachedRequest(cacheKey, () =>
            criticalApiClient.get('/auth/profile')
        );
    },

    // Version avec timeout explicite pour les cas critiques
    getProfileWithTimeout: async () => {
        try {
            const response = await criticalApiClient.get('/auth/profile')
            return response
        } catch (error) {
            // Gestion d'erreur silencieuse pour éviter les erreurs runtime
            console.warn('getProfileWithTimeout failed:', error)
            return null
        }
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
    getAll: (params?: { limit?: number }) => apiClient.get('/applications', { params }),
    getById: (id: string) => apiClient.get(`/applications/${id}`),
    create: (data: any) => apiClient.post('/applications', data),
    update: (id: string, data: any) => apiClient.put(`/applications/${id}`, data),
    delete: (id: string) => apiClient.delete(`/applications/${id}`),
    getStats: () => apiClient.get('/applications/stats'),

    // NOUVELLES MÉTHODES - Historique des statuts
    updateStatus: (id: string, status: string, comment?: string) =>
        apiClient.put(`/applications/${id}/status`, { status, comment }),
    getStatusHistory: (id: string) =>
        apiClient.get(`/applications/${id}/status-history`),

    // NOUVELLES MÉTHODES - Contacts liés
    getContacts: (id: string) =>
        apiClient.get(`/applications/${id}/contacts`),
};

export const companyService = {
    getAll: (params?: { limit?: number; companyType?: 'EMPLOYER' | 'TEMP_AGENCY' }) => apiClient.get('/companies', { params }),
    getById: (id: string) => apiClient.get(`/companies/${id}`),
    create: (data: any) => apiClient.post('/companies', data),
    update: (id: string, data: any) => apiClient.put(`/companies/${id}`, data),
    delete: (id: string) => apiClient.delete(`/companies/${id}`),
};

export const contactService = {
    getAll: (params?: { limit?: number }) => apiClient.get('/contacts', { params }),
    getById: (id: string) => apiClient.get(`/contacts/${id}`),
    create: (data: any) => apiClient.post('/contacts', data),
    update: (id: string, data: any) => apiClient.put(`/contacts/${id}`, data),
    delete: (id: string) => apiClient.delete(`/contacts/${id}`),

    // NOUVELLES MÉTHODES - Relations many-to-many
    linkToCompany: (id: string, companyId: string) =>
        apiClient.post(`/contacts/${id}/link-company`, { companyId }),
    linkToApplication: (id: string, applicationId: string) =>
        apiClient.post(`/contacts/${id}/link-application`, { applicationId }),
    getByCompany: (companyId: string) =>
        apiClient.get(`/contacts/company/${companyId}`),
    getByApplication: (applicationId: string) =>
        apiClient.get(`/contacts/application/${applicationId}`),
};

export const interviewService = {
    getAll: (params?: { limit?: number }) => apiClient.get('/interviews', { params }),
    getById: (id: string) => apiClient.get(`/interviews/${id}`),
    create: (data: any) => apiClient.post('/interviews', data),
    update: (id: string, data: any) => apiClient.put(`/interviews/${id}`, data),
    delete: (id: string) => apiClient.delete(`/interviews/${id}`),
};

export const followUpService = {
    getAll: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get('/followups', { params }),
    getById: (id: string) => apiClient.get(`/followups/${id}`),
    create: (data: any) => apiClient.post('/followups', data),
    update: (id: string, data: any) => apiClient.put(`/followups/${id}`, data),
    delete: (id: string) => apiClient.delete(`/followups/${id}`),
};

export const callService = {
    getAll: (params?: { limit?: number }) => apiClient.get('/calls', { params }),
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
    getAll: (params?: { page?: number; limit?: number }) =>
      apiClient.get('/events', { params }),
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
    getAll: (params?: { page?: number; limit?: number; type?: string; isRead?: boolean }) =>
      apiClient.get('/notifications', { params }),
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