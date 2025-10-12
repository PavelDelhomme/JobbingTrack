import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

export type UseAuthReturn = AuthState & AuthActions;

export const useAuth = (): UseAuthReturn => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // Initialiser l'état d'authentification au montage du composant
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Récupérer le token et les données utilisateur du stockage local
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem('authToken'),
        AsyncStorage.getItem('userData'),
      ]);

      if (token && userData) {
        // Vérifier si le token est toujours valide
        try {
          const userResponse = await authService.getCurrentUser();

          if (userResponse.success) {
            setState({
              user: userResponse.data,
              token,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return;
          }
        } catch (error) {
          console.error('Token invalide:', error);
          // Token invalide, nettoyer le stockage
          await AsyncStorage.multiRemove(['authToken', 'userData']);
        }
      }

      // Pas de token valide ou token expiré
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Erreur initialisation auth:', error);
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: 'Erreur lors de l\'initialisation',
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await authService.login(email, password);

      if (response.success && response.data) {
        setState({
          user: response.data.user,
          token: response.data.token,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });

        // Les données sont automatiquement stockées par le service
      } else {
        throw new Error(response.message || 'Erreur de connexion');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erreur de connexion',
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: { email: string; password: string; firstName: string; lastName: string }) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const response = await authService.register(userData);

      if (response.success && response.data) {
        setState({
          user: response.data.user,
          token: response.data.token,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        throw new Error(response.message || 'Erreur d\'inscription');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erreur d\'inscription',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      await authService.logout();

      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      // Même si l'appel API échoue, nettoyer l'état local
      setState({
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      if (!state.token) return;

      const response = await authService.getCurrentUser();

      if (response.success) {
        setState(prev => ({
          ...prev,
          user: response.data,
        }));

        // Mettre à jour les données stockées
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Erreur rafraîchissement utilisateur:', error);
    }
  }, [state.token]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    clearError,
    refreshUser,
  };
};
