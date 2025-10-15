'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from './api'

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

  // ✅ Charger le token et profil au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      // Attendre que localStorage et les cookies soient disponibles
      await new Promise(resolve => setTimeout(resolve, 200))

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
        // Debug logs uniquement en développement strict
        if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
          console.log('🔐 Auth Debug - Token from cookie:', storedToken);
        }

        // Si trouvé dans les cookies, synchroniser avec localStorage
        if (storedToken) {
          localStorage.setItem('token', storedToken);
          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
            console.log('🔐 Auth Debug - Token synchronized to localStorage');
          }
        } else {
          // Sinon vérifier localStorage
          storedToken = localStorage.getItem('token');
          if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
            console.log('🔐 Auth Debug - Token from localStorage:', storedToken);
          }
        }
      }

      if (storedToken) {
        setToken(storedToken)
        await loadUserProfile(storedToken)
      } else {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const loadUserProfile = async (authToken: string) => {
    try {
      const response = await authService.getProfile()
      setUser(response.data.user)
    } catch (error) {
      console.error('Erreur chargement profil:', error)
      logout()
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

