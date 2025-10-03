'use client'

import { useState, useEffect } from 'react'
import { testService } from '@/lib/api'

export default function TestsPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const testAllServices = async () => {
    setLoading(true)
    try {
      const response = await testService.testAllServices()
      setServices(response.data.results || [])
    } catch (error) {
      console.error('Erreur lors des tests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testAllServices()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">🧪 Tests Microservices</h1>
        <button
          onClick={testAllServices}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Test en cours...' : 'Relancer les tests'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{service.name}</h3>
              <div className={`w-3 h-3 rounded-full ${
                service.status === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
            </div>
            <p className="text-sm text-gray-600">Port: {service.port}</p>
            <p className="text-sm text-gray-600">Response: {service.responseTime}ms</p>
            {service.error && (
              <p className="text-sm text-red-600 mt-2">{service.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}