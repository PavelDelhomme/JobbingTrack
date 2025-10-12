import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosResponse } from 'axios';

// Configuration de l'API
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://your-production-api.com/api/v1';

// Créer une instance axios avec configuration par défaut
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter automatiquement le token d'authentification
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse pour gérer les erreurs d'authentification
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide, déconnecter l'utilisateur
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      // Émettre un événement pour déclencher la déconnexion
      // EventEmitter.emit('authExpired');
    }
    return Promise.reject(error);
  }
);

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Classe principale pour les appels API
class ApiService {
  private client = apiClient;

  // AUTHENTIFICATION
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await this.client.post<ApiResponse<{ token: string; user: any }>>('/auth/login', {
        email,
        password,
      });

      if (response.data.success && response.data.data?.token) {
        // Stocker le token et les données utilisateur
        await AsyncStorage.setItem('authToken', response.data.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur de connexion');
    }
  }

  async register(userData: { email: string; password: string; firstName: string; lastName: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    try {
      const response = await this.client.post<ApiResponse<{ token: string; user: any }>>('/auth/register', userData);

      if (response.data.success && response.data.data?.token) {
        await AsyncStorage.setItem('authToken', response.data.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur d\'inscription');
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      // Nettoyer le stockage local même si l'appel API échoue
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('offlineQueue');
    }
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>('/auth/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération utilisateur');
    }
  }

  // CANDIDATURES
  async getApplications(params?: PaginationParams & { status?: string; search?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/applications', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération candidatures');
    }
  }

  async getApplication(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>(`/applications/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération candidature');
    }
  }

  async createApplication(applicationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>('/applications', applicationData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur création candidature');
    }
  }

  async updateApplication(id: string, applicationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put<ApiResponse<any>>(`/applications/${id}`, applicationData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur mise à jour candidature');
    }
  }

  async deleteApplication(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.client.delete<ApiResponse<void>>(`/applications/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur suppression candidature');
    }
  }

  // RELANCES
  async getFollowUps(params?: PaginationParams & { applicationId?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/followups', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération relances');
    }
  }

  async createFollowUp(followUpData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>('/followups', followUpData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur création relance');
    }
  }

  async updateFollowUp(id: string, followUpData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put<ApiResponse<any>>(`/followups/${id}`, followUpData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur mise à jour relance');
    }
  }

  async completeFollowUp(id: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>(`/followups/${id}/complete`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur marquage relance terminée');
    }
  }

  // ENTRETIENS
  async getInterviews(params?: PaginationParams & { applicationId?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/interviews', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération entretiens');
    }
  }

  async createInterview(interviewData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>('/interviews', interviewData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur création entretien');
    }
  }

  async updateInterview(id: string, interviewData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put<ApiResponse<any>>(`/interviews/${id}`, interviewData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur mise à jour entretien');
    }
  }

  // APPELS
  async getCalls(params?: PaginationParams & { applicationId?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/calls', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération appels');
    }
  }

  async createCall(callData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>('/calls', callData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur création appel');
    }
  }

  async updateCall(id: string, callData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put<ApiResponse<any>>(`/calls/${id}`, callData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur mise à jour appel');
    }
  }

  // CONTACTS
  async getContacts(params?: PaginationParams & { companyId?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/contacts', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération contacts');
    }
  }

  async createContact(contactData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>('/contacts', contactData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur création contact');
    }
  }

  async updateContact(id: string, contactData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.put<ApiResponse<any>>(`/contacts/${id}`, contactData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur mise à jour contact');
    }
  }

  // ENTREPRISES
  async getCompanies(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/companies', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération entreprises');
    }
  }

  async createCompany(companyData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>('/companies', companyData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur création entreprise');
    }
  }

  // PLATEFORMES
  async getPlatforms(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.client.get<ApiResponse<any[]>>('/applications/platforms');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération plateformes');
    }
  }

  // ACTIVITÉS (pour l'historique)
  async getActivities(params?: PaginationParams & { applicationId?: string; contactId?: string }): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const response = await this.client.get<ApiResponse<PaginatedResponse<any>>>('/activities', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération activités');
    }
  }

  // STATISTIQUES
  async getDashboardStats(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>('/dashboard/stats');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur récupération statistiques');
    }
  }
}

// Service d'authentification mobile
export class AuthService {
  private api: ApiService;

  constructor() {
    this.api = new ApiService();
  }

  async login(email: string, password: string) {
    return await this.api.login(email, password);
  }

  async register(userData: { email: string; password: string; firstName: string; lastName: string }) {
    return await this.api.register(userData);
  }

  async logout() {
    return await this.api.logout();
  }

  async getCurrentUser() {
    return await this.api.getCurrentUser();
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return false;

      const user = await this.getCurrentUser();
      return user.success;
    } catch (error) {
      return false;
    }
  }

  async getStoredToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  async getStoredUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      return null;
    }
  }
}

// Service de synchronisation offline
export class OfflineSyncService {
  private api: ApiService;
  private static instance: OfflineSyncService;

  constructor() {
    this.api = new ApiService();
  }

  static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  // Ajouter une action à la queue offline
  async addToOfflineQueue(action: {
    type: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    data?: any;
    id?: string;
  }): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push({
        ...action,
        timestamp: Date.now(),
        id: action.id || `offline_${Date.now()}_${Math.random()}`
      });

      await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Erreur ajout à la queue offline:', error);
    }
  }

  // Récupérer la queue offline
  async getOfflineQueue(): Promise<any[]> {
    try {
      const queueData = await AsyncStorage.getItem('offlineQueue');
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      return [];
    }
  }

  // Synchroniser la queue offline quand la connexion revient
  async syncOfflineQueue(): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      if (queue.length === 0) return;

      console.log(`Synchronisation de ${queue.length} actions offline...`);

      for (const action of queue) {
        try {
          await this.executeOfflineAction(action);
          await this.removeFromOfflineQueue(action.id);
        } catch (error) {
          console.error(`Erreur synchronisation action ${action.id}:`, error);
        }
      }

      console.log('Synchronisation offline terminée');
    } catch (error) {
      console.error('Erreur synchronisation queue offline:', error);
    }
  }

  // Exécuter une action offline
  private async executeOfflineAction(action: any): Promise<void> {
    switch (action.method) {
      case 'POST':
        await this.api.client.post(action.endpoint, action.data);
        break;
      case 'PUT':
        await this.api.client.put(`${action.endpoint}/${action.id}`, action.data);
        break;
      case 'DELETE':
        await this.api.client.delete(`${action.endpoint}/${action.id}`);
        break;
    }
  }

  // Retirer une action de la queue
  private async removeFromOfflineQueue(actionId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const filteredQueue = queue.filter((action: any) => action.id !== actionId);
      await AsyncStorage.setItem('offlineQueue', JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Erreur suppression de la queue offline:', error);
    }
  }

  // Vider complètement la queue offline
  async clearOfflineQueue(): Promise<void> {
    await AsyncStorage.removeItem('offlineQueue');
  }
}

// Service de notifications push
export class PushNotificationService {
  private static instance: PushNotificationService;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Demander la permission de notifications push
  async requestPermission(): Promise<boolean> {
    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Erreur demande permission notifications:', error);
      return false;
    }
  }

  // Créer une notification locale
  async showNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          ...options,
        });

        // Fermer automatiquement après 5 secondes
        setTimeout(() => {
          notification.close();
        }, 5000);

        return;
      }

      // Fallback pour les navigateurs qui ne supportent pas les notifications
      console.log('Notification:', title, options.body);
    } catch (error) {
      console.error('Erreur création notification:', error);
    }
  }

  // Programmer une notification pour un entretien
  async scheduleInterviewReminder(interview: any): Promise<void> {
    const interviewTime = new Date(interview.scheduledAt);
    const now = new Date();
    const timeUntilInterview = interviewTime.getTime() - now.getTime();

    // Programmer un rappel 1 heure avant l'entretien
    const reminderTime = timeUntilInterview - (60 * 60 * 1000);

    if (reminderTime > 0) {
      setTimeout(() => {
        this.showNotification(
          `Rappel: Entretien dans 1 heure`,
          {
            body: `${interview.application.position} chez ${interview.application.company.name}`,
            tag: `interview-${interview.id}`,
            requireInteraction: true,
          }
        );
      }, reminderTime);
    }
  }

  // Programmer une notification pour une relance
  async scheduleFollowUpReminder(followUp: any): Promise<void> {
    const followUpTime = new Date(followUp.scheduledDate);
    const now = new Date();
    const timeUntilFollowUp = followUpTime.getTime() - now.getTime();

    // Programmer un rappel 30 minutes avant la relance
    const reminderTime = timeUntilFollowUp - (30 * 60 * 1000);

    if (reminderTime > 0) {
      setTimeout(() => {
        this.showNotification(
          `Rappel: Relance dans 30 minutes`,
          {
            body: `${followUp.subject} - ${followUp.application.position}`,
            tag: `followup-${followUp.id}`,
            requireInteraction: true,
          }
        );
      }, reminderTime);
    }
  }
}

// Exporter les services
export const apiService = new ApiService();
export const authService = new AuthService();
export const offlineSyncService = OfflineSyncService.getInstance();
export const pushNotificationService = PushNotificationService.getInstance();

export default apiService;
