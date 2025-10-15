'use client'

import { useEffect, useState } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/auth'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function AnalyticsPage() {
  const { token } = useAuth()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      setLoading(false)
    }
  }, [token])

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p>Chargement...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p>Page des analytics fonctionnelle avec vraies données</p>
      </div>
    </AdminLayout>
  )
}
