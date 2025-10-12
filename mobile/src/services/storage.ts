import AsyncStorage from '@react-native-async-storage/async-storage';

// Types pour le stockage local
export interface StoredApplication {
  id: string;
  userId: string;
  companyId: string;
  platformId?: string;
  position: string;
  description?: string;
  location?: string;
  type: string;
  salary?: string;
  status: string;
  applicationDate: string;
  jobUrl?: string;
  notes?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  company?: any;
  platform?: any;
  interviews?: any[];
  followUps?: any[];
  calls?: any[];
  _isOffline?: boolean;
  _lastSync?: string;
}

export interface StoredInterview {
  id: string;
  applicationId: string;
  type: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingUrl?: string;
  interviewer?: string;
  notes?: string;
  status: string;
  feedback?: string;
  completedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  _isOffline?: boolean;
  _lastSync?: string;
}

export interface StoredFollowUp {
  id: string;
  applicationId: string;
  contactId?: string;
  type: string;
  scheduledDate: string;
  completed: boolean;
  completedDate?: string;
  sentDate?: string;
  subject: string;
  message?: string;
  response?: string;
  responseDate?: string;
  status: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  _isOffline?: boolean;
  _lastSync?: string;
}

export interface StoredCall {
  id: string;
  applicationId: string;
  contactId?: string;
  type: string;
  scheduledDate?: string;
  callDate?: string;
  duration?: number;
  status: string;
  notes?: string;
  outcome?: string;
  followUpNeeded: boolean;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  _isOffline?: boolean;
  _lastSync?: string;
}

export interface StoredContact {
  id: string;
  userId: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  position?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  notes?: string;
  lastContactDate?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  createdAt: string;
  updatedAt: string;
  _isOffline?: boolean;
  _lastSync?: string;
}

export interface StoredCompany {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  description?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  _isOffline?: boolean;
  _lastSync?: string;
}

// Classe de gestion du stockage local
class LocalStorageService {
  private static instance: LocalStorageService;

  static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  // STOCKAGE DES DONNÉES PRINCIPALES

  // Candidatures
  async saveApplications(applications: StoredApplication[]): Promise<void> {
    try {
      await AsyncStorage.setItem('applications', JSON.stringify(applications));
    } catch (error) {
      console.error('Erreur sauvegarde candidatures:', error);
      throw error;
    }
  }

  async getApplications(): Promise<StoredApplication[]> {
    try {
      const data = await AsyncStorage.getItem('applications');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur récupération candidatures:', error);
      return [];
    }
  }

  async saveApplication(application: StoredApplication): Promise<void> {
    try {
      const applications = await this.getApplications();
      const existingIndex = applications.findIndex(app => app.id === application.id);

      if (existingIndex >= 0) {
        applications[existingIndex] = { ...application, _lastSync: new Date().toISOString() };
      } else {
        applications.push({ ...application, _isOffline: true, _lastSync: new Date().toISOString() });
      }

      await this.saveApplications(applications);
    } catch (error) {
      console.error('Erreur sauvegarde candidature:', error);
      throw error;
    }
  }

  async deleteApplication(id: string): Promise<void> {
    try {
      const applications = await this.getApplications();
      const filtered = applications.filter(app => app.id !== id);
      await this.saveApplications(filtered);
    } catch (error) {
      console.error('Erreur suppression candidature:', error);
      throw error;
    }
  }

  // Entretiens
  async saveInterviews(interviews: StoredInterview[]): Promise<void> {
    try {
      await AsyncStorage.setItem('interviews', JSON.stringify(interviews));
    } catch (error) {
      console.error('Erreur sauvegarde entretiens:', error);
      throw error;
    }
  }

  async getInterviews(): Promise<StoredInterview[]> {
    try {
      const data = await AsyncStorage.getItem('interviews');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur récupération entretiens:', error);
      return [];
    }
  }

  async saveInterview(interview: StoredInterview): Promise<void> {
    try {
      const interviews = await this.getInterviews();
      const existingIndex = interviews.findIndex(int => int.id === interview.id);

      if (existingIndex >= 0) {
        interviews[existingIndex] = { ...interview, _lastSync: new Date().toISOString() };
      } else {
        interviews.push({ ...interview, _isOffline: true, _lastSync: new Date().toISOString() });
      }

      await this.saveInterviews(interviews);
    } catch (error) {
      console.error('Erreur sauvegarde entretien:', error);
      throw error;
    }
  }

  // Relances
  async saveFollowUps(followUps: StoredFollowUp[]): Promise<void> {
    try {
      await AsyncStorage.setItem('followups', JSON.stringify(followUps));
    } catch (error) {
      console.error('Erreur sauvegarde relances:', error);
      throw error;
    }
  }

  async getFollowUps(): Promise<StoredFollowUp[]> {
    try {
      const data = await AsyncStorage.getItem('followups');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur récupération relances:', error);
      return [];
    }
  }

  async saveFollowUp(followUp: StoredFollowUp): Promise<void> {
    try {
      const followUps = await this.getFollowUps();
      const existingIndex = followUps.findIndex(fu => fu.id === followUp.id);

      if (existingIndex >= 0) {
        followUps[existingIndex] = { ...followUp, _lastSync: new Date().toISOString() };
      } else {
        followUps.push({ ...followUp, _isOffline: true, _lastSync: new Date().toISOString() });
      }

      await this.saveFollowUps(followUps);
    } catch (error) {
      console.error('Erreur sauvegarde relance:', error);
      throw error;
    }
  }

  // Appels
  async saveCalls(calls: StoredCall[]): Promise<void> {
    try {
      await AsyncStorage.setItem('calls', JSON.stringify(calls));
    } catch (error) {
      console.error('Erreur sauvegarde appels:', error);
      throw error;
    }
  }

  async getCalls(): Promise<StoredCall[]> {
    try {
      const data = await AsyncStorage.getItem('calls');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur récupération appels:', error);
      return [];
    }
  }

  async saveCall(call: StoredCall): Promise<void> {
    try {
      const calls = await this.getCalls();
      const existingIndex = calls.findIndex(c => c.id === call.id);

      if (existingIndex >= 0) {
        calls[existingIndex] = { ...call, _lastSync: new Date().toISOString() };
      } else {
        calls.push({ ...call, _isOffline: true, _lastSync: new Date().toISOString() });
      }

      await this.saveCalls(calls);
    } catch (error) {
      console.error('Erreur sauvegarde appel:', error);
      throw error;
    }
  }

  // Contacts
  async saveContacts(contacts: StoredContact[]): Promise<void> {
    try {
      await AsyncStorage.setItem('contacts', JSON.stringify(contacts));
    } catch (error) {
      console.error('Erreur sauvegarde contacts:', error);
      throw error;
    }
  }

  async getContacts(): Promise<StoredContact[]> {
    try {
      const data = await AsyncStorage.getItem('contacts');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur récupération contacts:', error);
      return [];
    }
  }

  async saveContact(contact: StoredContact): Promise<void> {
    try {
      const contacts = await this.getContacts();
      const existingIndex = contacts.findIndex(c => c.id === contact.id);

      if (existingIndex >= 0) {
        contacts[existingIndex] = { ...contact, _lastSync: new Date().toISOString() };
      } else {
        contacts.push({ ...contact, _isOffline: true, _lastSync: new Date().toISOString() });
      }

      await this.saveContacts(contacts);
    } catch (error) {
      console.error('Erreur sauvegarde contact:', error);
      throw error;
    }
  }

  // Entreprises
  async saveCompanies(companies: StoredCompany[]): Promise<void> {
    try {
      await AsyncStorage.setItem('companies', JSON.stringify(companies));
    } catch (error) {
      console.error('Erreur sauvegarde entreprises:', error);
      throw error;
    }
  }

  async getCompanies(): Promise<StoredCompany[]> {
    try {
      const data = await AsyncStorage.getItem('companies');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erreur récupération entreprises:', error);
      return [];
    }
  }

  async saveCompany(company: StoredCompany): Promise<void> {
    try {
      const companies = await this.getCompanies();
      const existingIndex = companies.findIndex(c => c.id === company.id);

      if (existingIndex >= 0) {
        companies[existingIndex] = { ...company, _lastSync: new Date().toISOString() };
      } else {
        companies.push({ ...company, _isOffline: true, _lastSync: new Date().toISOString() });
      }

      await this.saveCompanies(companies);
    } catch (error) {
      console.error('Erreur sauvegarde entreprise:', error);
      throw error;
    }
  }

  // SYNCHRONISATION

  // Récupérer tous les éléments modifiés depuis la dernière synchronisation
  async getModifiedItems(): Promise<{
    applications: StoredApplication[];
    interviews: StoredInterview[];
    followups: StoredFollowUp[];
    calls: StoredCall[];
    contacts: StoredContact[];
    companies: StoredCompany[];
  }> {
    try {
      const lastSync = await this.getLastSyncTime();

      const applications = await this.getApplications();
      const interviews = await this.getInterviews();
      const followups = await this.getFollowUps();
      const calls = await this.getCalls();
      const contacts = await this.getContacts();
      const companies = await this.getCompanies();

      return {
        applications: applications.filter(app => !app._lastSync || new Date(app._lastSync) > lastSync),
        interviews: interviews.filter(int => !int._lastSync || new Date(int._lastSync) > lastSync),
        followups: followups.filter(fu => !fu._lastSync || new Date(fu._lastSync) > lastSync),
        calls: calls.filter(call => !call._lastSync || new Date(call._lastSync) > lastSync),
        contacts: contacts.filter(contact => !contact._lastSync || new Date(contact._lastSync) > lastSync),
        companies: companies.filter(company => !company._lastSync || new Date(company._lastSync) > lastSync),
      };
    } catch (error) {
      console.error('Erreur récupération éléments modifiés:', error);
      return {
        applications: [],
        interviews: [],
        followups: [],
        calls: [],
        contacts: [],
        companies: [],
      };
    }
  }

  // Marquer la dernière synchronisation
  async setLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem('lastSync', new Date().toISOString());
    } catch (error) {
      console.error('Erreur marquage dernière synchronisation:', error);
    }
  }

  async getLastSyncTime(): Promise<Date> {
    try {
      const lastSync = await AsyncStorage.getItem('lastSync');
      return lastSync ? new Date(lastSync) : new Date(0);
    } catch (error) {
      return new Date(0);
    }
  }

  // Vérifier si l'appareil est en ligne
  async isOnline(): Promise<boolean> {
    try {
      // Simple vérification de connectivité
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // SYNCHRONISER LES DONNÉES

  // Synchroniser une candidature
  async syncApplication(application: StoredApplication): Promise<boolean> {
    try {
      if (application._isOffline) {
        // Créer une nouvelle candidature
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/applications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            companyId: application.companyId,
            platformId: application.platformId,
            position: application.position,
            description: application.description,
            location: application.location,
            type: application.type,
            salary: application.salary,
            status: application.status,
            applicationDate: application.applicationDate,
            jobUrl: application.jobUrl,
            notes: application.notes,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          // Mettre à jour l'ID local avec l'ID serveur
          application.id = result.data.id;
          application._isOffline = false;
          await this.saveApplication(application);
          return true;
        }
      } else {
        // Mettre à jour une candidature existante
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/applications/${application.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            companyId: application.companyId,
            platformId: application.platformId,
            position: application.position,
            description: application.description,
            location: application.location,
            type: application.type,
            salary: application.salary,
            status: application.status,
            jobUrl: application.jobUrl,
            notes: application.notes,
            isArchived: application.isArchived,
            archivedReason: application.archivedReason,
          }),
        });

        if (response.ok) {
          application._lastSync = new Date().toISOString();
          await this.saveApplication(application);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erreur synchronisation candidature:', error);
      return false;
    }
  }

  // NETTOYAGE

  // Nettoyer les données locales (pour déconnexion)
  async clearAllData(): Promise<void> {
    try {
      const keys = [
        'applications',
        'interviews',
        'followups',
        'calls',
        'contacts',
        'companies',
        'lastSync',
        'offlineQueue'
      ];

      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Erreur nettoyage données locales:', error);
    }
  }

  // Exporter les données (pour backup)
  async exportData(): Promise<string> {
    try {
      const data = {
        applications: await this.getApplications(),
        interviews: await this.getInterviews(),
        followups: await this.getFollowUps(),
        calls: await this.getCalls(),
        contacts: await this.getContacts(),
        companies: await this.getCompanies(),
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Erreur export données:', error);
      throw error;
    }
  }

  // Importer des données (pour restauration)
  async importData(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);

      if (data.applications) await this.saveApplications(data.applications);
      if (data.interviews) await this.saveInterviews(data.interviews);
      if (data.followups) await this.saveFollowUps(data.followups);
      if (data.calls) await this.saveCalls(data.calls);
      if (data.contacts) await this.saveContacts(data.contacts);
      if (data.companies) await this.saveCompanies(data.companies);

      await this.setLastSyncTime();
    } catch (error) {
      console.error('Erreur import données:', error);
      throw error;
    }
  }
}

// Exporter le service
export const localStorageService = LocalStorageService.getInstance();
export default localStorageService;
