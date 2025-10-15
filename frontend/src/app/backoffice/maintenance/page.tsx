'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { useAuth } from '@/lib/hooks/auth'
import axios from 'axios'

interface Service {
  name: string
  displayName: string
  description: string
}

interface Maintenance {
  id: string
  serviceName: string
  isActive: boolean
  message: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  activatedBy: {
    id: string
    name: string
    email: string
  } | null
  activatedAt: string
  deactivatedAt: string | null
  createdAt: string
  updatedAt: string
}

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function MaintenancePage() {
  const { token, user } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [maintenances, setMaintenances] = useState<Maintenance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null)

  // Vérification d'authentification
  if (!token || !user) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">Accès refusé</p>
            <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Charger les services disponibles
  const loadServices = async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance/services`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.data.success) {
        setServices(response.data.services)
      }
    } catch (error) {
      console.error('Erreur chargement services:', error)
    }
  }

  // Charger les maintenances
  const loadMaintenances = async () => {
    try {
      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.data.success) {
        setMaintenances(response.data.maintenances)
      }
    } catch (error) {
      console.error('Erreur chargement maintenances:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([loadServices(), loadMaintenances()])
      setLoading(false)
    }
    loadData()
  }, [token])

  // Activer la maintenance pour un service
  const activateMaintenance = async (serviceName: string) => {
    setIsActivating(true)
    try {
      const response = await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceName}/activate`, {
        message: maintenanceMessage || null,
        scheduledStart: scheduledStart || null,
        scheduledEnd: scheduledEnd || null
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.data.success) {
        await loadMaintenances()
        setSelectedService(null)
        setMaintenanceMessage('')
        setScheduledStart('')
        setScheduledEnd('')
      }
    } catch (error) {
      console.error('Erreur activation maintenance:', error)
    }
    setIsActivating(false)
  }

  // Désactiver la maintenance pour un service
  const deactivateMaintenance = async (serviceName: string) => {
    setIsDeactivating(serviceName)
    try {
      const response = await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceName}/deactivate`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.data.success) {
        await loadMaintenances()
      }
    } catch (error) {
      console.error('Erreur désactivation maintenance:', error)
    }
    setIsDeactivating(null)
  }

  // Mettre à jour le message de maintenance
  const updateMaintenanceMessage = async (serviceName: string) => {
    try {
      const response = await axios.put(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceName}/message`, {
        message: maintenanceMessage
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.data.success) {
        await loadMaintenances()
      }
    } catch (error) {
      console.error('Erreur mise à jour message:', error)
    }
  }

  const getServiceMaintenance = (serviceName: string) => {
    return maintenances.find(m => m.serviceName === serviceName)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('fr-FR')
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            🔧 Gestion de la Maintenance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Activez ou désactivez le mode maintenance pour les différents services de l'application
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Chargement...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Liste des services */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Services Disponibles
              </h2>

              <div className="space-y-3">
                {services.map((service) => {
                  const maintenance = getServiceMaintenance(service.name)

                  return (
                    <div key={service.name} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {service.displayName}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {service.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {maintenance?.isActive ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs font-medium rounded-full">
                              🔧 Maintenance
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium rounded-full">
                              ✅ Actif
                            </span>
                          )}
                        </div>
                      </div>

                      {maintenance?.isActive && (
                        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <p className="text-sm text-red-800 dark:text-red-400">
                            <strong>Message:</strong> {maintenance.message || 'Maintenance en cours'}
                          </p>
                          {maintenance.scheduledEnd && (
                            <p className="text-sm text-red-800 dark:text-red-400 mt-1">
                              <strong>Fin prévue:</strong> {formatDate(maintenance.scheduledEnd)}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {maintenance?.isActive ? (
                          <button
                            onClick={() => deactivateMaintenance(service.name)}
                            disabled={isDeactivating === service.name}
                            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            {isDeactivating === service.name ? 'Désactivation...' : 'Désactiver Maintenance'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedService(service)}
                            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Activer Maintenance
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Historique des maintenances */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Historique des Maintenances
              </h2>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {maintenances.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Aucun historique de maintenance
                  </p>
                ) : (
                  maintenances.map((maintenance) => (
                    <div key={maintenance.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">
                          {services.find(s => s.name === maintenance.serviceName)?.displayName || maintenance.serviceName}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          maintenance.isActive
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {maintenance.isActive ? '🔧 Actif' : '✅ Terminé'}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p><strong>Activé par:</strong> {maintenance.activatedBy?.name || 'Système'}</p>
                        <p><strong>Début:</strong> {formatDate(maintenance.activatedAt)}</p>
                        {maintenance.deactivatedAt && (
                          <p><strong>Fin:</strong> {formatDate(maintenance.deactivatedAt)}</p>
                        )}
                        {maintenance.message && (
                          <p><strong>Message:</strong> {maintenance.message}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal d'activation de maintenance */}
        {selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Activer la Maintenance - {selectedService.displayName}
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Message de maintenance (optionnel)
                    </label>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="Ce service est temporairement indisponible pour maintenance..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Début programmé (optionnel)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledStart}
                        onChange={(e) => setScheduledStart(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fin programmée (optionnel)
                      </label>
                      <input
                        type="datetime-local"
                        value={scheduledEnd}
                        onChange={(e) => setScheduledEnd(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedService(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => activateMaintenance(selectedService.name)}
                    disabled={isActivating}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {isActivating ? 'Activation...' : 'Activer Maintenance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
