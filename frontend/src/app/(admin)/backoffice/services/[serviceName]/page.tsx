'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import { 
  Server, Activity, TrendingUp, Database, Clock, 
  AlertCircle, CheckCircle, XCircle, ArrowLeft,
  RefreshCw, Terminal, BarChart3, Zap
} from 'lucide-react';
import Link from 'next/link';
import { centralMetricsService } from '@/lib/services/centralMetricsService';

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceName = params.serviceName as string;
  const fullServiceName = serviceName.startsWith('jobbingtrack-') ? serviceName : `jobbingtrack-${serviceName}`;
  
  const [serviceMetrics, setServiceMetrics] = useState<any>(null);
  const [serviceLogs, setServiceLogs] = useState<any>(null);
  const [serviceHistory, setServiceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadServiceData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      
      // Récupérer les métriques du service
      const metricsUrl = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      const metricsResponse = await fetch(`${metricsUrl}/api/v1/docker/service/${fullServiceName}`);
      
      if (metricsResponse.ok) {
        const data = await metricsResponse.json();
        setServiceMetrics(data.service);
      }
      
      // Récupérer les logs
      const logs = await centralMetricsService.getServiceLogs(fullServiceName, { lines: 100 });
      setServiceLogs(logs);
      
      // Récupérer l'historique
      const historyResponse = await fetch(`${metricsUrl}/api/v1/docker/service/${fullServiceName}/history?limit=50`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setServiceHistory(historyData.data || []);
      }
    } catch (error) {
      console.error('Erreur chargement données service:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadServiceData();
    const interval = setInterval(() => loadServiceData(), 10000);
    return () => clearInterval(interval);
  }, [serviceName]);

  const handleRefresh = () => {
    loadServiceData(true);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const isHealthy = serviceMetrics?.health === 'healthy';
  const cpuPercent = serviceMetrics?.cpu_percent || 0;
  const memoryPercent = serviceMetrics?.memory_percent || 0;
  const memoryUsageMb = serviceMetrics?.memory_usage_mb || 0;
  const responseTime = serviceMetrics?.response_time_ms;
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/backoffice/analytics"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Server className="h-8 w-8 mr-3 text-blue-600" />
                {serviceName}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Monitoring détaillé du service
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-lg border-2 flex items-center justify-between ${
          isHealthy
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-center">
            {isHealthy ? (
              <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600 mr-3" />
            )}
            <div>
              <h3 className={`text-lg font-bold ${isHealthy ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                {isHealthy ? 'Service opérationnel' : 'Service non disponible'}
              </h3>
              <p className={`text-sm ${isHealthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isHealthy ? 'Tous les systèmes fonctionnent normalement' : 'Le service rencontre des problèmes'}
              </p>
            </div>
          </div>
          {responseTime && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{responseTime} ms</p>
            </div>
          )}
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className={`text-sm font-medium ${cpuPercent > 70 ? 'text-red-600' : 'text-blue-600'}`}>
                {cpuPercent > 70 ? 'Élevé' : 'Normal'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {cpuPercent.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisation CPU</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  cpuPercent > 70 ? 'bg-red-600' :
                  cpuPercent > 40 ? 'bg-yellow-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(cpuPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Database className="h-8 w-8 text-purple-600" />
              <span className={`text-sm font-medium ${memoryPercent > 80 ? 'text-red-600' : 'text-purple-600'}`}>
                {memoryPercent > 80 ? 'Élevé' : 'Normal'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {memoryUsageMb.toFixed(0)} MB
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Utilisation Mémoire</p>
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  memoryPercent > 80 ? 'bg-red-600' :
                  memoryPercent > 50 ? 'bg-yellow-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(memoryPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {serviceMetrics?.pids || 0}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Processus Actifs</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <Zap className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {((serviceMetrics?.network_rx_mb || 0) + (serviceMetrics?.network_tx_mb || 0)).toFixed(2)} MB
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Traffic Réseau</p>
          </div>
        </div>

        {/* Performance History */}
        {serviceHistory.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2" />
                Historique des Performances
              </h2>
              <span className="text-sm text-gray-500">{serviceHistory.length} points de données</span>
            </div>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>Graphique d'historique - Intégration en cours</p>
            </div>
          </div>
        )}

        {/* Logs */}
        {serviceLogs && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Terminal className="h-6 w-6 mr-2" />
                Logs du Service
              </h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {serviceLogs.total} lignes
                </span>
                {serviceLogs.errors > 0 && (
                  <span className="flex items-center text-sm font-medium text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {serviceLogs.errors} erreurs
                  </span>
                )}
              </div>
            </div>
            
            {/* Error Lines */}
            {serviceLogs.errorLines && serviceLogs.errorLines.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Erreurs Récentes ({serviceLogs.errorLines.length})
                </h3>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {serviceLogs.errorLines.slice(0, 10).map((line: string, index: number) => (
                    <div key={index} className="text-xs font-mono text-red-700 dark:text-red-400 break-all">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* All Logs */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
              {serviceLogs.lines && serviceLogs.lines.slice(-50).map((line: string, index: number) => (
                <div 
                  key={index} 
                  className={`py-0.5 ${
                    line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')
                      ? 'text-red-400'
                      : line.toLowerCase().includes('warn')
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

