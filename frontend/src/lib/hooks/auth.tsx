'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../api'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  isActive: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fonction utilitaire pour valider le format du token JWT
const validateJwtToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false
  
  // En mode développement, accepter les tokens mock SANS validation
  if (process.env.NODE_ENV === 'development' && token.startsWith('mock-jwt-token')) {
    return true
  }
  
  // Vérifier le format de base du JWT (3 parties séparées par des points)
  const parts = token.split('.')
  if (parts.length !== 3) {
    console.error('Format de token invalide: Le token ne contient pas 3 parties')
    return false
  }

  try {
    // Essayer de décoder le payload
    const payload = JSON.parse(atob(parts[1]))
    
    // Vérifier les champs requis
    if (!payload.sub && !payload.userId) {
      console.error('Token invalide: Pas de sub ou userId dans le payload')
      return false
    }

    // Vérifier la date d'expiration si elle existe
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('Token expiré')
      return false
    }

    return true
  } catch (error) {
    console.error('Error validating token:', error)
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ✅ Charger le token et profil au démarrage avec cache optimisé
  useEffect(() => {
    const initializeAuth = async () => {
      // Vérifier que nous sommes côté client
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Initializing authentication...');
        
        // Vérifier d'abord localStorage, puis cookies
        let storedToken = localStorage.getItem('token');
        
        // Si pas dans localStorage, vérifier les cookies
        if (!storedToken) {
          console.log('🔍 Aucun token trouvé dans localStorage, vérification des cookies...');
          
          const getCookieValue = (name: string): string | null => {
            try {
              const value = `; ${document.cookie}`;
              const parts = value.split(`; ${name}=`);
              if (parts.length === 2) {
                const value = parts.pop();
                return value ? value.split(';').shift() || null : null;
              }
              return null;
            } catch (error) {
              console.error('Error reading cookies:', error);
              return null;
            }
          };
          
          storedToken = getCookieValue('token');

          // Si trouvé dans les cookies, synchroniser avec localStorage
          if (storedToken) {
            console.log('🔑 Token trouvé dans les cookies, synchronisation avec localStorage...');
            try {
              localStorage.setItem('token', storedToken);
            } catch (error) {
              console.error('Error saving token to localStorage:', error);
              // Continue even if localStorage error
            }
          }
        }

        // Si on a un token, on charge le profil
        if (storedToken) {
          console.log('🔑 Token trouvé, chargement du profil...');
          
          // Vérifier rapidement la validité du token avant de charger le profil
          if (!validateJwtToken(storedToken) && !storedToken.startsWith('mock-jwt-token')) {
            console.warn('⚠️ Token expiré ou invalide, nettoyage...');
            // Nettoyer le token invalide mais ne pas bloquer l'application
            localStorage.removeItem('token');
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
            setToken(null);
            setUser(null);
            setLoading(false);
            return;
          }
          
          // Token valide, continuer
          setToken(storedToken);
          
          // Charger le profil de manière asynchrone (ne pas bloquer si ça échoue)
          loadUserProfile(storedToken).catch((error) => {
            console.warn('⚠️ Error loading profile, continuing without authentication:', error.message);
            // Ne pas bloquer l'application si le chargement du profil échoue
            setLoading(false);
          });
        } else {
          console.log('ℹ️ Aucun token d\'authentification trouvé');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing authentication:', error);
        setLoading(false);
      }
    };

    // Démarrer l'initialisation
    initializeAuth();
    
    // Nettoyage en cas de démontage du composant
    return () => {
      // Annuler les requêtes en cours si nécessaire
    };
  }, [])

  const loadUserProfile = async (authToken: string) => {
    let retryCount = 0;
    const maxRetries = 3;

    // Fonction pour nettoyer les tokens invalides
    const clearAuthData = () => {
      localStorage.removeItem('token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      setUser(null);
      setToken(null);
      setLoading(false);
    };
    
    // Ne pas bloquer l'application si le token est invalide
    if (!authToken || (!validateJwtToken(authToken) && !authToken.startsWith('mock-jwt-token'))) {
      console.warn('⚠️ Token invalide dans loadUserProfile, nettoyage sans bloquer l\'application');
      clearAuthData();
      return;
    }
    
    // Function to detect network errors
    const isNetworkError = (error: any) => {
      return error.message?.includes('fetch') || 
             error.message?.includes('network') ||
             error.message?.includes('ECONNREFUSED') || 
             error.message?.includes('timeout') ||
             error.code === 'NETWORK_ERROR' ||
             !error.response; // No response = network error
    };

    // Vérifier que l'URL de l'API est définie
    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.error('API URL not defined');
      clearAuthData();
      return;
    }

    while (retryCount < maxRetries) {
      try {
        console.log(`🔄 Chargement du profil (tentative ${retryCount + 1}/${maxRetries})`);
        
        // Vérifier si le token existe et n'est pas vide
        if (!authToken || authToken.trim() === '') {
          console.warn('Aucun token fourni pour le chargement du profil');
          clearAuthData();
          return;
        }

        // En mode développement, accepter les tokens mock
        if (process.env.NODE_ENV === 'development' && authToken.startsWith('mock-jwt-token')) {
          console.log('🔐 Mode développement: Token mock accepté');
        } else if (!validateJwtToken(authToken)) {
          console.error('Token invalide détecté lors du chargement du profil');
          clearAuthData();
          return;
        }

        // Si on arrive ici, le token est valide, on peut récupérer le profil
        const response = await authService.getProfile();
        
        if (response?.data?.user) {
          console.log('✅ Profil utilisateur chargé avec succès');
          setUser(response.data.user);
          setLoading(false);
          return; // Succès, on sort de la boucle
        } else {
          throw new Error('Invalid server response');
        }

      } catch (error: any) {
        console.error(`Error loading profile (attempt ${retryCount + 1}/${maxRetries}):`, error);

        // Authentication errors - only if it's really a 401/403 error
        // AND it's not a network error
        if ((error.response?.status === 401 || error.response?.status === 403) && !isNetworkError(error)) {
          console.warn('Session expired or unauthorized (server error confirmed)');
          // Clear only after all attempts
          if (retryCount >= maxRetries - 1) {
            clearAuthData();
            return;
          }
        }

        // Validation errors - only if it's not a network error
        if (error.response?.status === 400 && !isNetworkError(error)) {
          console.error('Profile data validation error');
          // Don't clear for a 400 error, might just be a temporary issue
          if (retryCount >= maxRetries - 1) {
            setLoading(false);
            return;
          }
        }

        // Network errors - retry with exponential backoff
        if (isNetworkError(error) && retryCount < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
          console.log(`⏳ Network error, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        // If we get here, all attempts have failed
        // If it's a network error, don't clear the token (might be temporary)
        if (isNetworkError(error)) {
          console.warn('⚠️ Persistent network error, but keeping token to retry later');
          setLoading(false);
          return;
        }

        // For other errors, clear only after all attempts
        if (retryCount >= maxRetries - 1) {
          console.error('Failed to load profile after multiple attempts');
          clearAuthData();
          return;
        }
        
        // Sinon, continuer les tentatives
        retryCount++;
        continue;
      }
    }
  };

  const login = async (email: string, password: string) => {
    let retryCount = 0;
    const maxRetries = 2;
    setLoading(true);

    // Fonction pour nettoyer les tokens invalides
    const clearInvalidTokens = () => {
      localStorage.removeItem('token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    };

    // Utilise l'API Gateway public côté client; ne bloque pas si variable manquante

    while (retryCount < maxRetries) {
      try {
        console.log(`🔐 Tentative de connexion (${retryCount + 1}/${maxRetries})...`);
        
        // Utiliser directement l'URL du service d'authentification
        const response = await authService.login(email, password);

        if (response.data?.success && response.data.token) {
          const { token: newToken, user: newUser } = response.data;
          
          // Valider le token avant de l'accepter (accepte le mock en dev)
          if (
            !(process.env.NODE_ENV === 'development' && newToken.startsWith('mock-jwt-token'))
            && !validateJwtToken(newToken)
          ) {
            console.error('Token reçu du serveur invalide');
            clearInvalidTokens();
            throw new Error('Connection error: Invalid token');
          }

          console.log('✅ Connexion réussie, mise à jour du state...');
          setToken(newToken);
          setUser(newUser);

          // Sauvegarder dans localStorage
          localStorage.setItem('token', newToken);

          // Sauvegarder dans les cookies pour le middleware Next.js
          if (typeof window !== 'undefined') {
            const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
            const domain = process.env.NODE_ENV === 'production' 
              ? `domain=${window.location.hostname}` 
              : '';
            
            // Définir le cookie avec les bonnes options
            const cookieValue = `token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; ${domain} SameSite=Lax${secureFlag}`;
            document.cookie = cookieValue;
            
            // Vérifier que le cookie a bien été défini
            const cookieSet = document.cookie.includes('token=');
            console.log('✅ Cookie défini:', cookieSet ? 'Oui' : 'Non');
            if (!cookieSet) {
              console.warn('⚠️ Le cookie n\'a pas pu être défini, tentative avec une méthode alternative...');
              // Méthode alternative : utiliser un cookie sans domain en développement
              document.cookie = `token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
            }
          }

          console.log('✅ Token enregistré, chargement du profil...');
          setLoading(false);
          return; // Succès
        } else {
          const errorMsg = response.data?.error || 'Réponse inattendue du serveur';
          console.error('Réponse de connexion invalide:', errorMsg);
          clearInvalidTokens();
          throw new Error(errorMsg);
        }

      } catch (error: any) {
        console.error(`❌ Connection error (attempt ${retryCount + 1}/${maxRetries}):`, error);
        
        // Clear potentially corrupted tokens
        clearInvalidTokens();

        // Extract error message
        let errorMessage = 'Connection error';
        
        if (error.response) {
          // API error
          errorMessage = error.response.data?.error || error.response.statusText || 'Server error';
          
          // Authentication errors - no retry
          if (error.response.status === 401 || error.response.status === 403) {
            setLoading(false);
            throw new Error('Invalid credentials');
          }
          
          // Validation errors
          if (error.response.status === 400) {
            setLoading(false);
            throw new Error(errorMessage || 'Invalid connection data');
          }
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = 'Server not responding. Check your Internet connection.';
        } else {
          // Error configuring the request
          errorMessage = error.message || 'Connection error';
        }

        // Network errors - retry with exponential backoff
        if (retryCount < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`🔄 Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          retryCount++;
          continue;
        }

        // If we get here, all attempts have failed
        setLoading(false);
        throw new Error(errorMessage || 'Unable to connect to server. Please try again later.');
      }
    }
  }

  const logout = async (redirectToLogin = true) => {
    console.log('🚪 Déconnexion en cours...')
    
    try {
      // Appel API de déconnexion si l'utilisateur est connecté
      if (token) {
        try {
          await authService.logout();
        } catch (error) {
          console.warn('Error during server-side logout:', error);
          // Continue even if error to clean up frontend
        }
      }
      
      // Réinitialiser l'état local
      setUser(null);
      setToken(null);
      setLoading(false);
      
      // Nettoyer tous les tokens
      localStorage.removeItem('token');
      
      // Nettoyer les cookies de manière agressive
      const domain = window.location.hostname;
      const cookieOptions = [
        'path=/',
        'expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'samesite=lax',
        domain !== 'localhost' ? `domain=${domain}` : ''
      ].filter(Boolean).join('; ');
      
      // Supprimer tous les cookies d'authentification possibles
      const authCookies = ['token', 'session', 'auth', 'jwt'];
      authCookies.forEach((name: string) => {
        document.cookie = `${name}=; ${cookieOptions}`;
      });
      
      // Effacer le cache du navigateur
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        });
      }
      
      console.log('✅ Déconnexion réussie');
      
      // Rediriger si demandé (éviter les boucles de redirection)
      if (redirectToLogin && !window.location.pathname.startsWith('/login')) {
        console.log('🔄 Redirection vers la page de connexion...');
        // Forcer un rechargement complet pour nettoyer l'état de l'application
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // In case of error, force redirect anyway
      if (redirectToLogin) {
        window.location.href = '/login';
      }
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

