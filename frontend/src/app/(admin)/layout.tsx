'use client'

import { useAuth } from '@/lib/hooks/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && user.role !== 'admin') {
      router.push('/access-denied')
    }
  }, [user, loading, router])

  if (loading) {
    return <div>Chargement...</div>
  }

  if (!user || user.role !== 'admin') {
    return null
  }

  return <>{children}</>
}
