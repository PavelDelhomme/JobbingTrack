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
      // Vérifier d'abord localStorage, puis cookies
      let storedToken = null
      if (typeof window !== 'undefined') {
        storedToken = localStorage.getItem('token')

        // Si pas dans localStorage, vérifier les cookies
        if (!storedToken) {
          const getCookieValue = (name: string) => {
            const value = `; ${document.cookie}`
            const parts = value.split(`; ${name}=`)
            if (parts.length === 2) return parts.pop()?.split(';').shift()
            return null
          }
          storedToken = getCookieValue('token')

          // Si trouvé dans les cookies, synchroniser avec localStorage
          if (storedToken) {
            localStorage.setItem('token', storedToken);
          }
        }
      }

      if (storedToken) {
        setToken(storedToken)
        // Charger le profil immédiatement sans délai
        loadUserProfile(storedToken)
      } else {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const loadUserProfile = async (authToken: string) => {
    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
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
        return // Succès, on sort de la boucle

      } catch (error: any) {
        console.error(`Erreur chargement profil (tentative ${retryCount + 1}/${maxRetries}):`, error)

        // Erreurs d'authentification - pas de retry
        if (error.response?.status === 401 || error.response?.status === 403) {
          logout()
          return
        }

        // Erreurs temporaires - retry avec délai
        if (error.message?.includes('fetch') || error.message?.includes('network') ||
            error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout') ||
            error.code === 'NETWORK_ERROR') {

          if (retryCount < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Exponential backoff
            console.log(`🔄 Retry dans ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            retryCount++
            continue
          }
        }

        // Autres erreurs - marquer comme chargé mais sans utilisateur
        console.warn('Impossible de charger le profil après tous les retries')
        setUser(null)
        break
      }
    }

    setLoading(false)
  }

  const login = async (email: string, password: string) => {
    let retryCount = 0
    const maxRetries = 2

    while (retryCount < maxRetries) {
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

          // ✅ Ne pas rediriger ici - laisser le middleware gérer la redirection
          // La redirection se fera automatiquement via le middleware Next.js
          return // Succès, on sort de la boucle
        } else {
          throw new Error(response.data.error || 'Erreur de connexion')
        }

      } catch (error: any) {
        console.error(`Erreur login (tentative ${retryCount + 1}/${maxRetries}):`, error)

        // Erreurs d'authentification - pas de retry
        if (error.response?.status === 401 || error.response?.status === 403 ||
            error.message?.includes('Invalid credentials') || error.message?.includes('wrong')) {
          throw new Error(error.response?.data?.error || error.message || 'Erreur de connexion')
        }

        // Erreurs temporaires - retry
        if (error.message?.includes('fetch') || error.message?.includes('network') ||
            error.message?.includes('ECONNREFUSED') || error.message?.includes('timeout') ||
            error.code === 'NETWORK_ERROR') {

          if (retryCount < maxRetries - 1) {
            const delay = 1000 * (retryCount + 1) // Délai linéaire
            console.log(`🔄 Retry login dans ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
            retryCount++
            continue
          }
        }

        // Autres erreurs - throw
        throw new Error(error.response?.data?.error || error.message || 'Erreur de connexion')
      }
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

