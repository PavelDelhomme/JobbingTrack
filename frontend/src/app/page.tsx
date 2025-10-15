'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/auth'

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        // Utilisateur connecté : rediriger vers le backoffice
        router.push('/backoffice')
      } else {
        // Utilisateur non connecté : rediriger vers la page de login
        router.push('/login')
      }
    }
  }, [isAuthenticated, loading, router])

  // Afficher un écran de chargement pendant la vérification
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  )
}