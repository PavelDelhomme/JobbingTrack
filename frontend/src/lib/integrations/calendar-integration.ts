// Service d'intégration calendrier pour JobbingTrack
import axios from 'axios';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const MICROSOFT_CLIENT_ID = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || 'your-microsoft-client-id';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || 'your-microsoft-client-secret';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  source: 'google' | 'outlook' | 'local';
  externalId?: string;
  externalUrl?: string;
}

interface CalendarProvider {
  id: string;
  name: string;
  type: 'google' | 'outlook' | 'local';
  isConnected: boolean;
  color?: string;
  isDefault?: boolean;
}

class CalendarIntegrationService {
  private googleAccessToken: string | null = null;
  private microsoftAccessToken: string | null = null;
  private microsoftRefreshToken: string | null = null;

  // Initialisation avec les tokens existants
  initialize(tokens?: {
    googleAccessToken?: string;
    microsoftAccessToken?: string;
    microsoftRefreshToken?: string;
  }) {
    if (tokens?.googleAccessToken) {
      this.googleAccessToken = tokens.googleAccessToken;
    }
    if (tokens?.microsoftAccessToken) {
      this.microsoftAccessToken = tokens.microsoftAccessToken;
    }
    if (tokens?.microsoftRefreshToken) {
      this.microsoftRefreshToken = tokens.microsoftRefreshToken;
    }

    // Charger depuis localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('calendar-tokens');
      if (stored) {
        try {
          const tokens = JSON.parse(stored);
          this.googleAccessToken = tokens.googleAccessToken;
          this.microsoftAccessToken = tokens.microsoftAccessToken;
          this.microsoftRefreshToken = tokens.microsoftRefreshToken;
        } catch (error) {
          console.error('Erreur lors du chargement des tokens calendrier:', error);
        }
      }
    }
  }

  // Obtenir l'URL d'autorisation Google Calendar
  getGoogleAuthUrl(): string {
    const scope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events';
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${window.location.origin}/api/auth/google/callback`,
      scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
  }

  // Obtenir l'URL d'autorisation Microsoft Outlook
  getMicrosoftAuthUrl(): string {
    const scope = 'openid profile offline_access https://graph.microsoft.com/Calendars.ReadWrite';
    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: `${window.location.origin}/api/auth/microsoft/callback`,
      scope,
      response_mode: 'query'
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  // Échanger le code Google contre des tokens
  async exchangeGoogleCode(code: string): Promise<{ accessToken: string }> {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${window.location.origin}/api/auth/google/callback`
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.googleAccessToken = response.data.access_token;

      // Sauvegarder les tokens
      if (typeof window !== 'undefined') {
        const tokens = {
          googleAccessToken: this.googleAccessToken,
          microsoftAccessToken: this.microsoftAccessToken,
          microsoftRefreshToken: this.microsoftRefreshToken
        };
        localStorage.setItem('calendar-tokens', JSON.stringify(tokens));
      }

      return { accessToken: this.googleAccessToken };
    } catch (error) {
      console.error('Erreur échange Google:', error);
      throw new Error('Impossible d\'échanger le code Google');
    }
  }

  // Échanger le code Microsoft contre des tokens
  async exchangeMicrosoftCode(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${window.location.origin}/api/auth/microsoft/callback`
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.microsoftAccessToken = response.data.access_token;
      this.microsoftRefreshToken = response.data.refresh_token;

      // Sauvegarder les tokens
      if (typeof window !== 'undefined') {
        const tokens = {
          googleAccessToken: this.googleAccessToken,
          microsoftAccessToken: this.microsoftAccessToken,
          microsoftRefreshToken: this.microsoftRefreshToken
        };
        localStorage.setItem('calendar-tokens', JSON.stringify(tokens));
      }

      return {
        accessToken: this.microsoftAccessToken,
        refreshToken: this.microsoftRefreshToken
      };
    } catch (error) {
      console.error('Erreur échange Microsoft:', error);
      throw new Error('Impossible d\'échanger le code Microsoft');
    }
  }

  // Rafraîchir le token Microsoft
  async refreshMicrosoftToken(): Promise<string> {
    if (!this.microsoftRefreshToken) {
      throw new Error('Refresh token Microsoft non disponible');
    }

    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: this.microsoftRefreshToken,
        grant_type: 'refresh_token'
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      this.microsoftAccessToken = response.data.access_token;
      if (response.data.refresh_token) {
        this.microsoftRefreshToken = response.data.refresh_token;
      }

      // Mettre à jour le stockage
      if (typeof window !== 'undefined') {
        const tokens = {
          googleAccessToken: this.googleAccessToken,
          microsoftAccessToken: this.microsoftAccessToken,
          microsoftRefreshToken: this.microsoftRefreshToken
        };
        localStorage.setItem('calendar-tokens', JSON.stringify(tokens));
      }

      return this.microsoftAccessToken;
    } catch (error) {
      console.error('Erreur rafraîchissement Microsoft:', error);
      throw new Error('Impossible de rafraîchir le token Microsoft');
    }
  }

  // Récupérer les calendriers Google
  async getGoogleCalendars(): Promise<any[]> {
    if (!this.googleAccessToken) {
      throw new Error('Non authentifié sur Google');
    }

    try {
      const response = await axios.get('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { Authorization: `Bearer ${this.googleAccessToken}` }
      });

      return response.data.items || [];
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Token Google expiré');
      }
      throw error;
    }
  }

  // Récupérer les événements Google Calendar
  async getGoogleEvents(calendarId: string = 'primary', startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    if (!this.googleAccessToken) {
      throw new Error('Non authentifié sur Google');
    }

    try {
      const params: any = {
        singleEvents: true,
        orderBy: 'startTime'
      };

      if (startDate) {
        params.timeMin = startDate.toISOString();
      }
      if (endDate) {
        params.timeMax = endDate.toISOString();
      }

      const response = await axios.get(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
        headers: { Authorization: `Bearer ${this.googleAccessToken}` },
        params
      });

      return (response.data.items || []).map((event: any) => ({
        id: event.id,
        title: event.summary || 'Sans titre',
        description: event.description,
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        location: event.location,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        status: event.status || 'confirmed',
        source: 'google' as const,
        externalId: event.id,
        externalUrl: event.htmlLink
      }));
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Token Google expiré');
      }
      throw error;
    }
  }

  // Récupérer les calendriers Microsoft
  async getMicrosoftCalendars(): Promise<any[]> {
    if (!this.microsoftAccessToken) {
      throw new Error('Non authentifié sur Microsoft');
    }

    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me/calendars', {
        headers: { Authorization: `Bearer ${this.microsoftAccessToken}` }
      });

      return response.data.value || [];
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Essayer de rafraîchir le token
        try {
          await this.refreshMicrosoftToken();
          // Réessayer la requête
          return this.getMicrosoftCalendars();
        } catch (refreshError) {
          throw new Error('Token Microsoft expiré');
        }
      }
      throw error;
    }
  }

  // Récupérer les événements Microsoft Calendar
  async getMicrosoftEvents(calendarId: string, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    if (!this.microsoftAccessToken) {
      throw new Error('Non authentifié sur Microsoft');
    }

    try {
      const params: any = {};
      if (startDate) {
        params.startDateTime = startDate.toISOString();
      }
      if (endDate) {
        params.endDateTime = endDate.toISOString();
      }

      const response = await axios.get(`https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`, {
        headers: { Authorization: `Bearer ${this.microsoftAccessToken}` },
        params
      });

      return (response.data.value || []).map((event: any) => ({
        id: event.id,
        title: event.subject || 'Sans titre',
        description: event.body?.content,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        location: event.location?.displayName,
        attendees: event.attendees?.map((a: any) => a.emailAddress?.address) || [],
        status: event.showAs || 'confirmed',
        source: 'outlook' as const,
        externalId: event.id,
        externalUrl: event.webLink
      }));
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Essayer de rafraîchir le token
        try {
          await this.refreshMicrosoftToken();
          // Réessayer la requête
          return this.getMicrosoftEvents(calendarId, startDate, endDate);
        } catch (refreshError) {
          throw new Error('Token Microsoft expiré');
        }
      }
      throw error;
    }
  }

  // Synchroniser les événements d'entretiens avec un calendrier externe
  async syncInterviewToCalendar(
    interviewId: string,
    interviewData: {
      title: string;
      companyName: string;
      date: Date;
      duration?: number; // en minutes
      location?: string;
      description?: string;
    },
    targetCalendar: { provider: 'google' | 'outlook'; calendarId: string }
  ): Promise<string> {
    const eventData = {
      summary: `[Entretien] ${interviewData.title} - ${interviewData.companyName}`,
      description: interviewData.description || `Entretien programmé via JobbingTrack`,
      start: {
        dateTime: interviewData.date.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(interviewData.date.getTime() + (interviewData.duration || 60) * 60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      location: interviewData.location || 'À définir'
    };

    try {
      if (targetCalendar.provider === 'google') {
        const response = await axios.post(
          `https://www.googleapis.com/calendar/v3/calendars/${targetCalendar.calendarId}/events`,
          eventData,
          { headers: { Authorization: `Bearer ${this.googleAccessToken}` } }
        );

        return response.data.id;
      } else {
        const response = await axios.post(
          `https://graph.microsoft.com/v1.0/me/calendars/${targetCalendar.calendarId}/events`,
          eventData,
          { headers: { Authorization: `Bearer ${this.microsoftAccessToken}` } }
        );

        return response.data.id;
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      throw new Error('Impossible de synchroniser l\'événement');
    }
  }

  // Supprimer un événement synchronisé
  async deleteSyncedEvent(
    eventId: string,
    provider: 'google' | 'outlook',
    calendarId: string
  ): Promise<void> {
    try {
      if (provider === 'google') {
        await axios.delete(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          { headers: { Authorization: `Bearer ${this.googleAccessToken}` } }
        );
      } else {
        await axios.delete(
          `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events/${eventId}`,
          { headers: { Authorization: `Bearer ${this.microsoftAccessToken}` } }
        );
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      throw new Error('Impossible de supprimer l\'événement');
    }
  }

  // Vérifier l'état d'authentification
  isGoogleAuthenticated(): boolean {
    return !!this.googleAccessToken;
  }

  isMicrosoftAuthenticated(): boolean {
    return !!this.microsoftAccessToken;
  }

  // Déconnexion
  logout(provider?: 'google' | 'outlook'): void {
    if (provider === 'google' || !provider) {
      this.googleAccessToken = null;
    }
    if (provider === 'outlook' || !provider) {
      this.microsoftAccessToken = null;
      this.microsoftRefreshToken = null;
    }

    if (typeof window !== 'undefined') {
      const tokens = {
        googleAccessToken: this.googleAccessToken,
        microsoftAccessToken: this.microsoftAccessToken,
        microsoftRefreshToken: this.microsoftRefreshToken
      };
      localStorage.setItem('calendar-tokens', JSON.stringify(tokens));
    }
  }

  // Obtenir la liste des fournisseurs de calendrier disponibles
  getAvailableProviders(): CalendarProvider[] {
    return [
      {
        id: 'google',
        name: 'Google Calendar',
        type: 'google',
        isConnected: this.isGoogleAuthenticated(),
        color: '#4285F4'
      },
      {
        id: 'outlook',
        name: 'Outlook Calendar',
        type: 'outlook',
        isConnected: this.isMicrosoftAuthenticated(),
        color: '#0078D4'
      },
      {
        id: 'local',
        name: 'Calendrier local',
        type: 'local',
        isConnected: true,
        isDefault: true,
        color: '#10B981'
      }
    ];
  }

  // Créer un événement dans le calendrier local (pour les entretiens)
  async createLocalEvent(eventData: {
    title: string;
    description?: string;
    start: Date;
    end: Date;
    location?: string;
    attendees?: string[];
  }): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: eventData.title,
      description: eventData.description,
      start: eventData.start,
      end: eventData.end,
      location: eventData.location,
      attendees: eventData.attendees,
      status: 'confirmed',
      source: 'local'
    };

    // Sauvegarder l'événement localement
    if (typeof window !== 'undefined') {
      const localEvents = JSON.parse(localStorage.getItem('local-calendar-events') || '[]');
      localEvents.push(event);
      localStorage.setItem('local-calendar-events', JSON.stringify(localEvents));
    }

    return event;
  }

  // Récupérer les événements locaux
  async getLocalEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    if (typeof window === 'undefined') return [];

    const localEvents = JSON.parse(localStorage.getItem('local-calendar-events') || '[]');

    let filteredEvents = localEvents;

    if (startDate) {
      filteredEvents = filteredEvents.filter((event: CalendarEvent) => event.start >= startDate);
    }

    if (endDate) {
      filteredEvents = filteredEvents.filter((event: CalendarEvent) => event.end <= endDate);
    }

    return filteredEvents;
  }

  // Supprimer un événement local
  async deleteLocalEvent(eventId: string): Promise<void> {
    if (typeof window === 'undefined') return;

    const localEvents = JSON.parse(localStorage.getItem('local-calendar-events') || '[]');
    const filteredEvents = localEvents.filter((event: CalendarEvent) => event.id !== eventId);
    localStorage.setItem('local-calendar-events', JSON.stringify(filteredEvents));
  }
}

// Instance singleton du service de calendrier
export const calendarIntegration = new CalendarIntegrationService();
