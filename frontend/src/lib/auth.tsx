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
    const storedToken = localStorage.getItem('token')
    
    if (storedToken) {
      setToken(storedToken)
      loadUserProfile(storedToken)
    } else {
      setLoading(false)
    }
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
        localStorage.setItem('token', newToken)
        
        router.push('/dashboard')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erreur de connexion')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
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

