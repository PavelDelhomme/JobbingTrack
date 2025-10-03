'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { testService } from '../lib/api'

export default function Dashboard() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')


  useEffect(() => {
    const checkServices = async () => {
      try {
        const response = await testService.healthCheck()
        // Services par défaut pour démo
        setServices([
            { name: 'API Gateway', status: 'healthy', port: 3000 },
            { name: 'Auth Service', status: 'healthy', port: 3001 },
            { name: 'Application Service', status: 'healthy', port: 3002 },
            { name: 'Company Service', status: 'healthy', port: 3003 },
            { name: 'Contact Service', status: 'healthy', port: 3004 },
            { name: 'Interview Service', status: 'healthy', port: 3005 },
            { name: 'Notification Service', status: 'healthy', port: 3006 },
            { name: 'Dashboard Service', status: 'healthy', port: 3007 },
          ])
      } catch (error) {
        console.error('Erreur services:', error)
        setError('Backend indisponible (démarrez le backend avec `make dev`)')
        // Services en erreur pour démo
        setServices([
            { name: 'API Gateway', status: 'error', port: 3000 },
            { name: 'Auth Service', status: 'error', port: 3001 },
        ])
      } finally {
        setLoading(false)
      }
    }
    checkServices()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        🎯 JobbingTrack - Dashboard Admin
      </h1>

      {error && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p className="font-bold">⚠️ Attention</p>
          <p>{error}</p>
        </div>
      )}
      
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/dashboard/tests" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">🧪 Tests Services</h2>
                <p className="text-gray-600">Tester les microservices</p>
            </Link>

            <Link href="/login" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">🔐 Connexion</h2>
                <p className="text-gray-600">Page de login</p>
            </Link>

            <div className="bg-gray-100 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">🚀 Status</h2>
                <p className="text-gray-600">Frontend fonctionnel !</p>
            </div>
        </div>
      </div>
    </div>
  )
}