'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/features';
import { TrendingUp, Activity, Users, Database, ArrowUp, ArrowDown } from 'lucide-react';
import { centralMetricsService } from '@/lib/services/centralMetricsService';

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await centralMetricsService.fetchMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Erreur chargement métriques:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 10000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const systemMetrics = metrics?.system || {};
  const services = metrics?.services || [];
  
  // Calculer les statistiques globales
  const totalCpu = services.reduce((acc: number, s: any) => acc + (s.metrics?.cpu || 0), 0);
  const avgCpu = services.length > 0 ? totalCpu / services.length : 0;
  
  const totalMemory = services.reduce((acc: number, s: any) => acc + (s.metrics?.memory?.usage || 0), 0);
  const totalMemoryLimit = services.reduce((acc: number, s: any) => acc + (s.metrics?.memory?.limit || 0), 0);
  const memoryPercent = totalMemoryLimit > 0 ? (totalMemory / totalMemoryLimit) * 100 : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Analytics & Performance
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Vue d'ensemble des performances système
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Services Actifs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-green-600" />
              <span className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp className="h-4 w-4 mr-1" />
                {systemMetrics.containers?.running || 0}/{systemMetrics.containers?.total || 0}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {systemMetrics.containers?.running || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Services Actifs</p>
          </div>

          {/* CPU Moyen */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className={`flex items-center text-sm font-medium ${avgCpu > 50 ? 'text-red-600' : 'text-blue-600'}`}>
                {avgCpu > 50 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                {avgCpu.toFixed(1)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {avgCpu.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">CPU Moyen</p>
          </div>

          {/* Mémoire Totale */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <span className={`flex items-center text-sm font-medium ${memoryPercent > 80 ? 'text-red-600' : 'text-purple-600'}`}>
                {memoryPercent > 80 ? <ArrowUp className="h-4 w-4 mr-1" /> : <ArrowDown className="h-4 w-4 mr-1" />}
                {memoryPercent.toFixed(1)}%
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mémoire Utilisée</p>
          </div>

          {/* Coeurs CPU */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-orange-600" />
              <span className="text-orange-600 text-sm font-medium">
                Disponibles
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {systemMetrics.cpus || 'N/A'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Coeurs CPU</p>
          </div>
        </div>

        {/* Services Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Performance par Service
          </h2>
          <div className="space-y-4">
            {services.map((service: any, index: number) => (
              <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {service.name}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    service.status === 'running' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {service.status}
                  </span>
                </div>
                
                {/* CPU Progress Bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>CPU</span>
                    <span>{service.metrics?.cpu !== 'N/A' ? `${service.metrics?.cpu?.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        service.metrics?.cpu > 70 ? 'bg-red-600' :
                        service.metrics?.cpu > 40 ? 'bg-yellow-600' : 'bg-green-600'
                      }`}
                      style={{ width: service.metrics?.cpu !== 'N/A' ? `${Math.min(service.metrics?.cpu || 0, 100)}%` : '0%' }}
                    ></div>
                  </div>
                </div>

                {/* Memory Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Mémoire</span>
                    <span>{service.metrics?.memory?.percent !== 'N/A' ? `${service.metrics?.memory?.percent?.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        service.metrics?.memory?.percent > 80 ? 'bg-red-600' :
                        service.metrics?.memory?.percent > 50 ? 'bg-yellow-600' : 'bg-blue-600'
                      }`}
                      style={{ width: service.metrics?.memory?.percent !== 'N/A' ? `${Math.min(service.metrics?.memory?.percent || 0, 100)}%` : '0%' }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Informations Système
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Version Docker:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{systemMetrics.server_version || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">OS:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{systemMetrics.operating_system || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Architecture:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{systemMetrics.architecture || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Storage Driver:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{systemMetrics.storage_driver || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Mémoire Totale:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  {systemMetrics.memory_total ? `${(systemMetrics.memory_total / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Conteneurs Docker
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Total:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{systemMetrics.containers?.total || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Running:</dt>
                <dd className="font-medium text-green-600">{systemMetrics.containers?.running || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Paused:</dt>
                <dd className="font-medium text-yellow-600">{systemMetrics.containers?.paused || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Stopped:</dt>
                <dd className="font-medium text-red-600">{systemMetrics.containers?.stopped || 0}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600 dark:text-gray-400">Images:</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{systemMetrics.images || 0}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
