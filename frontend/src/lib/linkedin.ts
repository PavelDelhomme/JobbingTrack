// Service LinkedIn pour JobbingTrack
import axios from 'axios';

const LINKEDIN_CLIENT_ID = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID || 'your-linkedin-client-id';
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || 'your-linkedin-client-secret';
const LINKEDIN_REDIRECT_URI = process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback';

// Configuration de l'API LinkedIn
const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  profilePicture?: string;
  location?: {
    countryCode: string;
    name: string;
  };
  publicProfileUrl?: string;
}

interface LinkedInCompany {
  id: string;
  name: string;
  description?: string;
  websiteUrl?: string;
  industry?: string;
  employeeCountRange?: {
    start: number;
    end: number;
  };
  logoUrl?: string;
}

interface LinkedInJob {
  id: string;
  title: string;
  companyName: string;
  location?: string;
  description?: string;
  employmentStatus?: string;
  dateRange?: {
    start: {
      month: number;
      year: number;
    };
    end?: {
      month: number;
      year: number;
    };
  };
}

export class LinkedInService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  // Initialiser le service avec les tokens stockés
  initialize(tokens?: { accessToken?: string; refreshToken?: string }) {
    if (tokens?.accessToken) {
      this.accessToken = tokens.accessToken;
    }
    if (tokens?.refreshToken) {
      this.refreshToken = tokens.refreshToken;
    }

    // Charger depuis localStorage si disponible
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('linkedin-tokens');
      if (stored) {
        try {
          const tokens = JSON.parse(stored);
          this.accessToken = tokens.accessToken;
          this.refreshToken = tokens.refreshToken;
        } catch (error) {
          console.error('Erreur lors du chargement des tokens LinkedIn:', error);
        }
      }
    }
  }

  // Générer l'URL d'autorisation OAuth
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: LINKEDIN_CLIENT_ID,
      redirect_uri: LINKEDIN_REDIRECT_URI,
      scope: 'r_liteprofile r_emailaddress w_member_social r_organization_social w_organization_social rw_organization_admin',
      state: state || 'linkedin_auth'
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  // Échanger le code d'autorisation contre des tokens
  async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET,
        redirect_uri: LINKEDIN_REDIRECT_URI
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token } = response.data;

      this.accessToken = access_token;
      if (refresh_token) {
        this.refreshToken = refresh_token;
      }

      // Sauvegarder les tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('linkedin-tokens', JSON.stringify({
          accessToken: access_token,
          refreshToken: refresh_token
        }));
      }

      return { accessToken: access_token, refreshToken: refresh_token };
    } catch (error) {
      console.error('Erreur lors de l\'échange LinkedIn:', error);
      throw new Error('Impossible d\'échanger le code LinkedIn');
    }
  }

  // Rafraîchir le token d'accès
  async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('Refresh token non disponible');
    }

    try {
      const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: LINKEDIN_CLIENT_ID,
        client_secret: LINKEDIN_CLIENT_SECRET
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const { access_token, refresh_token } = response.data;

      this.accessToken = access_token;
      if (refresh_token) {
        this.refreshToken = refresh_token;
      }

      // Mettre à jour le stockage
      if (typeof window !== 'undefined') {
        localStorage.setItem('linkedin-tokens', JSON.stringify({
          accessToken: access_token,
          refreshToken: refresh_token || this.refreshToken
        }));
      }

      return access_token;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement LinkedIn:', error);
      throw new Error('Impossible de rafraîchir le token LinkedIn');
    }
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Déconnexion
  logout(): void {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem('linkedin-tokens');
    }
  }

  // Effectuer une requête API LinkedIn avec gestion automatique du token
  private async apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Non authentifié sur LinkedIn');
    }

    try {
      const response = await axios({
        url: `${LINKEDIN_API_BASE}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Token expiré, essayer de le rafraîchir
        try {
          await this.refreshAccessToken();
          // Réessayer la requête avec le nouveau token
          return this.apiRequest(endpoint, options);
        } catch (refreshError) {
          this.logout();
          throw new Error('Session LinkedIn expirée');
        }
      }
      throw error;
    }
  }

  // Récupérer le profil utilisateur
  async getProfile(): Promise<LinkedInProfile> {
    const profile = await this.apiRequest('/people/~:(id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams),location,publicProfileUrl)');

    return {
      id: profile.id,
      firstName: profile.firstName?.localized?.fr_FR || profile.firstName?.localized?.en_US || profile.firstName,
      lastName: profile.lastName?.localized?.fr_FR || profile.lastName?.localized?.en_US || profile.lastName,
      headline: profile.headline?.localized?.fr_FR || profile.headline?.localized?.en_US || profile.headline,
      profilePicture: profile.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier,
      location: profile.location ? {
        countryCode: profile.location.countryCode,
        name: profile.location.name
      } : undefined,
      publicProfileUrl: profile.publicProfileUrl
    };
  }

  // Rechercher des entreprises
  async searchCompanies(query: string, limit = 10): Promise<LinkedInCompany[]> {
    const response = await this.apiRequest(`/organizationalEntityAcf?keywords=${encodeURIComponent(query)}&count=${limit}`);

    return response.elements?.map((company: any) => ({
      id: company.id,
      name: company.name,
      description: company.description,
      websiteUrl: company.websiteUrl,
      industry: company.industry,
      employeeCountRange: company.employeeCountRange,
      logoUrl: company.logoUrl
    })) || [];
  }

  // Récupérer les détails d'une entreprise
  async getCompany(companyId: string): Promise<LinkedInCompany> {
    const company = await this.apiRequest(`/organizations/${companyId}`);

    return {
      id: company.id,
      name: company.localizedName || company.name,
      description: company.description,
      websiteUrl: company.websiteUrl,
      industry: company.industry,
      employeeCountRange: company.employeeCountRange,
      logoUrl: company.logoUrl
    };
  }

  // Récupérer l'expérience professionnelle
  async getExperience(): Promise<LinkedInJob[]> {
    const experience = await this.apiRequest('/people/~/positions');

    return experience.values?.map((job: any) => ({
      id: job.id,
      title: job.title,
      companyName: job.company?.name || job.companyName,
      location: job.location?.name,
      description: job.summary,
      employmentStatus: job.isCurrent ? 'current' : 'past',
      dateRange: {
        start: {
          month: job.startDate?.month,
          year: job.startDate?.year
        },
        end: job.endDate ? {
          month: job.endDate.month,
          year: job.endDate.year
        } : undefined
      }
    })) || [];
  }

  // Partager une mise à jour (post)
  async shareUpdate(text: string, options?: {
    visibility?: 'PUBLIC' | 'CONNECTIONS';
    shareMediaCategory?: string;
    shareUrl?: string;
  }): Promise<any> {
    const payload = {
      author: `urn:li:person:${await this.getPersonId()}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text
          },
          shareMediaCategory: options?.shareMediaCategory || 'NONE',
          media: options?.shareUrl ? [{
            status: 'READY',
            description: {
              text: 'Partage depuis JobbingTrack'
            },
            originalUrl: options.shareUrl,
            title: {
              text: 'Lien partagé'
            }
          }] : []
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': options?.visibility || 'CONNECTIONS'
      }
    };

    return this.apiRequest('/ugcPosts', {
      method: 'POST',
      data: payload
    });
  }

  // Récupérer l'ID de la personne connectée
  private async getPersonId(): Promise<string> {
    const profile = await this.getProfile();
    return profile.id;
  }

  // Rechercher des personnes (pour le networking)
  async searchPeople(query: string, limit = 10): Promise<any[]> {
    const response = await this.apiRequest(`/people?q=${encodeURIComponent(query)}&count=${limit}`);

    return response.elements?.map((person: any) => ({
      id: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      headline: person.headline,
      location: person.location,
      profilePicture: person.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier
    })) || [];
  }

  // Envoyer une invitation de connexion
  async sendConnectionInvite(personId: string, message?: string): Promise<any> {
    const payload = {
      invitee: `urn:li:person:${personId}`,
      inviter: `urn:li:person:${await this.getPersonId()}`,
      message: message || 'Bonjour, je suis intéressé par une opportunité professionnelle.',
      subject: 'Invitation à se connecter'
    };

    return this.apiRequest('/people/invites', {
      method: 'POST',
      data: payload
    });
  }

  // Récupérer les invitations reçues
  async getReceivedInvites(): Promise<any[]> {
    const invites = await this.apiRequest('/people/invites?q=received');

    return invites.elements?.map((invite: any) => ({
      id: invite.id,
      from: {
        id: invite.inviter.id,
        firstName: invite.inviter.firstName,
        lastName: invite.inviter.lastName
      },
      message: invite.message,
      sentAt: invite.sentAt
    })) || [];
  }

  // Accepter une invitation
  async acceptInvite(inviteId: string): Promise<any> {
    return this.apiRequest(`/people/invites/${inviteId}`, {
      method: 'PATCH',
      data: { status: 'ACCEPTED' }
    });
  }

  // Refuser une invitation
  async declineInvite(inviteId: string): Promise<any> {
    return this.apiRequest(`/people/invites/${inviteId}`, {
      method: 'PATCH',
      data: { status: 'DECLINED' }
    });
  }
}

// Instance singleton du service LinkedIn
export const linkedinService = new LinkedInService();
