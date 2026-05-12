'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/features';
import { Settings, Activity, AlertCircle } from 'lucide-react';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import axios from 'axios';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ServicesManagementPage() {
  const router = useRouter();
  const [servicesWithMetrics, setServicesWithMetrics] = useState<any[]>([]);
  const [maintenances, setMaintenances] = useState<{[key: string]: any}>({});
  const [loading, setLoading] = useState(true);

  // Liste des services disponibles
  const services = [
    {
      id: 'auth-service',
      name: 'Service d\'Authentification',
      description: 'Gestion des utilisateurs et authentification',
      icon: '🔐',
      route: '/b4ck0ff1ce/services/auth-service'
    },
    {
      id: 'application-service',
      name: 'Service des Candidatures',
      description: 'Gestion des candidatures et processus',
      icon: '📝',
      route: '/b4ck0ff1ce/services/application-service'
    },
    {
      id: 'company-service',
      name: 'Service des Entreprises',
      description: 'Gestion des entreprises et recrutement',
      icon: '🏢',
      route: '/b4ck0ff1ce/services/company-service'
    },
    {
      id: 'contact-service',
      name: 'Service des Contacts',
      description: 'Gestion des contacts et réseaux',
      icon: '👥',
      route: '/b4ck0ff1ce/services/contact-service'
    },
    {
      id: 'interview-service',
      name: 'Service des Entretiens',
      description: 'Gestion des entretiens et calendrier',
      icon: '📅',
      route: '/b4ck0ff1ce/services/interview-service'
    },
    {
      id: 'call-service',
      name: 'Service des Appels',
      description: 'Gestion des appels et communications',
      icon: '📞',
      route: '/b4ck0ff1ce/services/call-service'
    },
    {
      id: 'notification-service',
      name: 'Service de Notifications',
      description: 'Gestion des notifications et alertes',
      icon: '🔔',
      route: '/b4ck0ff1ce/services/notification-service'
    },
    {
      id: 'dashboard-service',
      name: 'Service du Tableau de Bord',
      description: 'Gestion des métriques et analytics',
      icon: '📊',
      route: '/b4ck0ff1ce/services/dashboard-service'
    },
    {
      id: 'workflow-service',
      name: 'Service de Workflow',
      description: 'Gestion des workflows automatisés',
      icon: '⚙️',
      route: '/b4ck0ff1ce/services/workflow-service'
    },
    {
      id: 'event-service',
      name: 'Service des Événements',
      description: 'Gestion des événements et rappels',
      icon: '🎯',
      route: '/b4ck0ff1ce/services/event-service'
    },
    {
      id: 'followup-service',
      name: 'Service de Relances',
      description: 'Gestion des relances automatiques',
      icon: '📧',
      route: '/b4ck0ff1ce/services/followup-service'
    },
    {
      id: 'profile-service',
      name: 'Service des Profils',
      description: 'Gestion des profils utilisateurs',
      icon: '👤',
      route: '/b4ck0ff1ce/services/profile-service'
    }
  ];

  // Charger les maintenances
  const loadMaintenances = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`${API_GATEWAY_URL}/api/v1/maintenance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        const maintenanceMap: {[key: string]: any} = {};
        response.data.maintenances.forEach((m: any) => {
          maintenanceMap[m.serviceName] = m;
        });
        setMaintenances(maintenanceMap);
      }
    } catch (error) {
      console.error('Erreur chargement maintenances:', error);
    }
  };

  // Activer la maintenance pour un service
  const activateMaintenance = async (serviceId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceId}/activate`, {
        message: `Maintenance activée depuis le dashboard`
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadMaintenances();
    } catch (error) {
      console.error('Erreur activation maintenance:', error);
    }
  };

  // Désactiver la maintenance pour un service
  const deactivateMaintenance = async (serviceId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.post(`${API_GATEWAY_URL}/api/v1/maintenance/${serviceId}/deactivate`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadMaintenances();
    } catch (error) {
      console.error('Erreur désactivation maintenance:', error);
    }
  };

  // Charger les services avec leurs métriques
  useEffect(() => {
    const loadServicesWithMetrics = async () => {
      try {
        const servicesData = await centralMetricsService.getAllServices();
        if (servicesData && servicesData.length > 0) {
          const updatedServices = services.map(service => {
            const metricsData = servicesData.find((s: any) => 
              s.name?.includes(service.id) || s.id === service.id
            );
            return {
              ...service,
              status: metricsData?.status === 'running' ? 'running' : 'stopped',
              metrics: metricsData,
              uptime: metricsData?.status === 'running' ? 'En ligne' : 'Hors ligne'
            };
          });
          setServicesWithMetrics(updatedServices);
        } else {
          setServicesWithMetrics(services);
        }
      } catch (error) {
        console.error('Erreur chargement services:', error);
        setServicesWithMetrics(services);
      } finally {
        setLoading(false);
      }
    };

    loadServicesWithMetrics();
    loadMaintenances();
    
    const interval = setInterval(() => {
      loadServicesWithMetrics();
      loadMaintenances();
    }, 10000); // Refresh every 10s
    
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Gestion des Services
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitoring et maintenance de tous les services backend
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${loading ? 'animate-pulse text-blue-500' : 'text-green-500'}`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {loading ? 'Chargement...' : 'En ligne'}
            </span>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(servicesWithMetrics.length > 0 ? servicesWithMetrics : services).map((service) => {
            const maintenance = maintenances[service.id];
            
            return (
              <div
                key={service.id}
                className={`rounded-lg p-4 transition-all duration-200 border ${
                  maintenance?.isActive
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 shadow-red-100'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-lg cursor-pointer'
                }`}
                onClick={() => !maintenance?.isActive && router.push(service.route)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{service.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${
                          service.status === 'running' ? 'bg-green-500' :
                          service.status === 'stopped' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}></span>
                        <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {service.status === 'running' ? 'En ligne' :
                           service.status === 'stopped' ? 'Hors ligne' : 'Test...'}
                        </span>
                        {maintenance?.isActive && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium rounded-full">
                            🔧 Maintenance
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contrôles de maintenance */}
                  <div className="flex items-center gap-1">
                    {maintenance?.isActive ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deactivateMaintenance(service.id);
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                        title="Désactiver la maintenance"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          activateMaintenance(service.id);
                        }}
                        className="p-1.5 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded transition-colors"
                        title="Activer la maintenance"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                  {service.description}
                </p>

                {/* Informations des métriques */}
                {service.metrics && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                    <div className="flex justify-between">
                      <span>CPU:</span>
                      <span className="font-medium">
                        {service.metrics.cpu !== 'N/A' && service.metrics.cpu !== undefined 
                          ? `${service.metrics.cpu.toFixed(1)}%` 
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mémoire:</span>
                      <span className="font-medium">
                        {service.metrics.memory?.percent !== 'N/A' && service.metrics.memory?.percent !== undefined
                          ? `${service.metrics.memory.percent.toFixed(1)}%` 
                          : 'N/A'}
                      </span>
                    </div>
                    {service.metrics.pids && service.metrics.pids !== 'N/A' && (
                      <div className="flex justify-between">
                        <span>PIDs:</span>
                        <span className="font-medium">{service.metrics.pids}</span>
                      </div>
                    )}
                  </div>
                )}

                {maintenance?.isActive && (
                  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-800 dark:text-orange-400">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    {maintenance.message || 'Service en maintenance'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-900 dark:text-blue-300 font-medium">
                {servicesWithMetrics.filter(s => s.status === 'running').length} services en ligne
              </span>
            </div>
            <span className="text-xs text-blue-700 dark:text-blue-400">
              Mise à jour toutes les 10 secondes
            </span>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
