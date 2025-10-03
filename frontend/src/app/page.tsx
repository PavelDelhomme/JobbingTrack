'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { testService } from '@/lib/api'

export default function Dashboard() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkServices = async () => {
      try {
        const response = await testService.healthCheck()
        setServices(response.data.services || [])
      } catch (error) {
        console.error('Erreur lors du test des services:', error)
      } finally {
        setLoading(false)
      }
    }

    checkServices()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🎯 JobbingTrack - Dashboard Admin
      </h1>
      
      {/* Status des microservices */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                service.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <h3 className="font-semibold">{service.name}</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Port: {service.port}
            </p>
          </div>
        ))}
      </div>

      {/* Navigation principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/applications" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">📝 Candidatures</h2>
          <p className="text-gray-600">Gérer les candidatures et leur suivi</p>
        </Link>

        <Link href="/dashboard/companies" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🏢 Entreprises</h2>
          <p className="text-gray-600">Base de données des entreprises</p>
        </Link>

        <Link href="/dashboard/contacts" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">👥 Contacts</h2>
          <p className="text-gray-600">Carnet de contacts professionnels</p>
        </Link>

        <Link href="/dashboard/interviews" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">📅 Entretiens</h2>
          <p className="text-gray-600">Planning et suivi des entretiens</p>
        </Link>

        <Link href="/dashboard/users" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">👤 Utilisateurs</h2>
          <p className="text-gray-600">Gestion des utilisateurs</p>
        </Link>

        <Link href="/dashboard/tests" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🧪 Tests</h2>
          <p className="text-gray-600">Tests des microservices</p>
        </Link>
      </div>
    </div>
  )
}