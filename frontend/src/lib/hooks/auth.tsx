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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ✅ Charger le token et profil au démarrage avec cache optimisé
  useEffect(() => {
    const initializeAuth = async () => {
      // Attendre que localStorage et les cookies soient disponibles
      await new Promise(resolve => setTimeout(resolve, 100))

      // Fonction pour extraire la valeur d'un cookie
      const getCookieValue = (name: string) => {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return null
      }

      // Vérifier d'abord les cookies (plus fiable)
      let storedToken = null
      if (typeof window !== 'undefined') {
        storedToken = getCookieValue('token')

        // Si trouvé dans les cookies, synchroniser avec localStorage
        if (storedToken) {
          localStorage.setItem('token', storedToken);
        } else {
          // Sinon vérifier localStorage
          storedToken = localStorage.getItem('token');
        }
      }

      if (storedToken) {
        setToken(storedToken)
        // Ajouter un petit délai pour éviter les requêtes simultanées
        setTimeout(() => loadUserProfile(storedToken), 500)
      } else {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const loadUserProfile = async (authToken: string) => {
    try {
      // Vérifier si le token existe et n'est pas vide
      if (!authToken || authToken.trim() === '') {
        throw new Error('Token manquant')
      }

      // En mode développement, accepter les tokens mock
      if (process.env.NODE_ENV === 'development' && authToken.startsWith('mock-jwt-token')) {
        console.log('🔐 Mode développement: Token mock accepté')
      } else {
        // Pour les vrais tokens, vérifier le format JWT
        if (authToken.split('.').length !== 3) {
          throw new Error('Format de token invalide')
        }

        // Vérifier la date d'expiration du token (si c'est un JWT)
        try {
          const payload = JSON.parse(atob(authToken.split('.')[1]))
          if (payload.exp && payload.exp < Date.now() / 1000) {
            throw new Error('Token expiré')
          }
        } catch (tokenError) {
          // Si on ne peut pas parser le token, continuer quand même
          console.warn('Impossible de parser le token JWT:', tokenError)
        }
      }

      const response = await authService.getProfile()
      setUser(response.data.user)
    } catch (error: any) {
      console.error('Erreur chargement profil:', error)

      // Ne pas se déconnecter immédiatement en cas d'erreur réseau temporaire
      if (error.message?.includes('fetch') || error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
        console.warn('Erreur réseau temporaire, tentative de reconnexion automatique...')
        // Réessayer après un délai
        setTimeout(() => {
          if (token && !user) {
            loadUserProfile(authToken)
          }
        }, 3000)
        return
      }

      // Se déconnecter seulement pour les erreurs d'authentification
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout()
      } else {
        // Pour les autres erreurs, marquer comme chargé mais sans utilisateur
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login(email, password)
      
      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data
        
        setToken(newToken)
        setUser(newUser)
        
        // ✅ Sauvegarder dans localStorage ET cookies
        localStorage.setItem('token', newToken)
        
        // ✅ Sauvegarder aussi dans les cookies pour le middleware Next.js
        if (typeof window !== 'undefined') {
          document.cookie = `token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; secure=false`
        }
        
        router.push('/backoffice')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de connexion')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    
    // ✅ Supprimer du localStorage ET des cookies
    localStorage.removeItem('token')
    
    // ✅ Supprimer aussi des cookies
    if (typeof window !== 'undefined') {
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }
    
    router.push('/login')
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

