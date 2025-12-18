'use client';

import { useEffect, useMemo, useState, useReducer, useTransition, memo, Suspense, lazy, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import preferencesService from '@/lib/services/preferencesService';
import { cacheManager } from '@/lib/cache/cacheManager';
import type { MetricsData, ServiceMetrics } from '@/lib/interfaces';
import { formatBytes } from '@/lib/utils/metricsUtils';
import { VirtualizedList } from './components/VirtualizedList';
import { useAuth } from '@/lib/hooks/auth';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  FileText,
  Gauge,
  History,
  Server,
  TrendingUp,
  Wifi,
  Network,
  Cpu,
  MemoryStick,
  Activity,
  Download,
  Camera,
  FileDown,
  Trash2,
  CheckCircle
} from '@/lib/icons';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

  const TABS = [
    { id: 'overview', label: 'Synthèse' },
    { id: 'system', label: 'Système' },
    { id: 'performance', label: 'Performance' },
    { id: 'network', label: 'Réseau & Fiabilité' },
    { id: 'services', label: 'Services & Logs' },
    { id: 'logs', label: 'Erreurs Récentes' },
    { id: 'report', label: '📊 Rapport Complet' },
  ] as const;

type TabId = typeof TABS[number]['id'];

const toNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPercentage = (value?: number, decimals = 1) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)}%`;
};

const formatMs = (value?: number | null, decimals = 0) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(decimals)} ms`;
};

const formatMb = (value?: number | null, decimals = 2) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  
  // Conversion automatique selon la valeur
  // Si >= 1000, on passe à l'unité supérieure
  if (value >= 1000) {
    // Convertir en GB
    const gb = value / 1000;
    if (gb >= 1000) {
      // Convertir en TB
      const tb = gb / 1000;
      if (tb >= 1000) {
        // Convertir en PB
        const pb = tb / 1000;
        return `${pb.toFixed(decimals)} PB`;
      }
      return `${tb.toFixed(decimals)} TB`;
    }
    return `${gb.toFixed(decimals)} GB`;
  }
  
  return `${value.toFixed(decimals)} MB`;
};

const formatLoad = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return 'N/A';
  return value.toFixed(3);
};

const formatTimestamp = (timestamp: string, timeRange: string = '24h') => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  
  if (timeRange === '1h' || timeRange === '6h') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else if (timeRange === '24h') {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', hour: '2-digit' });
  }
};

// Fonction pour formater les labels de l'axe X en évitant les doublons
const formatXAxisLabel = (tickItem: string, index: number, data: any[], timeRange: string) => {
  if (!data || data.length === 0) return tickItem;
  
  // Pour les petites plages de temps, afficher toutes les heures
  if (timeRange === '1h') {
    // Afficher toutes les 10 minutes
    const date = new Date(data[index]?.timestamp || tickItem);
    const minutes = date.getMinutes();
    if (minutes % 10 === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }
  
  // Pour 6h, afficher toutes les heures
  if (timeRange === '6h') {
    const date = new Date(data[index]?.timestamp || tickItem);
    const minutes = date.getMinutes();
    if (minutes === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }
  
  // Pour 24h, afficher toutes les 2 heures
  if (timeRange === '24h') {
    const date = new Date(data[index]?.timestamp || tickItem);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours % 2 === 0 && minutes === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }
  
  // Pour 7d, afficher le jour et l'heure toutes les 12h
  if (timeRange === '7d') {
    const date = new Date(data[index]?.timestamp || tickItem);
    const hours = date.getHours();
    if (hours % 12 === 0) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit' });
    }
    return '';
  }
  
  // Pour 30d, afficher le jour toutes les 2 jours
  if (timeRange === '30d') {
    const date = new Date(data[index]?.timestamp || tickItem);
    const day = date.getDate();
    if (day % 2 === 0) {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    }
    return '';
  }
  
  return tickItem;
};

const formatLogTimestamp = (nanoString: string) => {
  const milliseconds = Number(nanoString) / 1_000_000;
  if (!Number.isFinite(milliseconds)) return nanoString;
  return new Date(milliseconds).toLocaleString('fr-FR', { hour12: false });
};

// Couleurs pour les graphiques
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  success: '#22C55E',
  purple: '#A855F7',
  cyan: '#06B6D4',
  pink: '#EC4899',
  indigo: '#6366F1',
  orange: '#FB923C'
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Indicateur de rafraîchissement discret
  const [lastHistoryTimestamp, setLastHistoryTimestamp] = useState<number | null>(null);
  const [initialHistoryLoaded, setInitialHistoryLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedService, setSelectedService] = useState<ServiceMetrics | null>(null);
  const [serviceLogs, setServiceLogs] = useState<Array<{ timestamp: string; level: string; message: string }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [aggregatedLogs, setAggregatedLogs] = useState<any[]>([]);
  const [loadingAggregatedLogs, setLoadingAggregatedLogs] = useState(false);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [analyticsRefreshInterval, setAnalyticsRefreshInterval] = useState(10000);
  const [metricsRefreshInterval, setMetricsRefreshInterval] = useState(15000);

  // Charger les préférences de rafraîchissement
  useEffect(() => {
    const loadRefreshIntervals = async () => {
      try {
        const analyticsInterval = await preferencesService.getRefreshInterval('analytics');
        const metricsInterval = await preferencesService.getRefreshInterval('metrics');
        setAnalyticsRefreshInterval(analyticsInterval);
        setMetricsRefreshInterval(metricsInterval);
      } catch (error) {
        console.error('Erreur chargement préférences:', error);
      }
    };
    loadRefreshIntervals();
  }, []);

  // ✅ OPTIMISATION : useCallback pour handleTimeRangeChange
  const handleTimeRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value as '1h' | '6h' | '24h' | '7d' | '30d');
  }, []);

  // ✅ OPTIMISATION : useMemo pour éviter les recalculs
  const timeRangeMs = useMemo(() => {
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    return ranges[timeRange];
  }, [timeRange]);

  // Charger les dernières données depuis l'historique pour affichage immédiat
  const loadLastKnownMetrics = async () => {
    try {
      const history = await centralMetricsService.getMetricsHistory({ limit: 1 });
      if (history && history.length > 0) {
        const lastMetric = history[0];
        
        // Convertir les données de l'historique en format MetricsData
        const historicalMetrics: MetricsData = {
          system: {
            cpu: { 
              usage: lastMetric.cpu_percent ? `${lastMetric.cpu_percent.toFixed(1)}%` : 'N/A',
              cores: 'N/A',
              model: 'N/A'
            },
            memory: { 
              total: 'N/A',
              used: 'N/A',
              free: 'N/A',
              usage: lastMetric.memory_percent ? `${lastMetric.memory_percent.toFixed(1)}%` : 'N/A'
            },
            load: { average: 'N/A', cores: 'N/A' },
            disk: []
          },
          containers: {},
          services: {},
          timestamp: lastMetric.timestamp || new Date().toISOString(),
          network: lastMetric.network_rx_mb || lastMetric.network_tx_mb ? {
            total_rx_mb: Number(lastMetric.network_rx_mb) || 0,
            total_tx_mb: Number(lastMetric.network_tx_mb) || 0
          } : undefined,
          responseTime: lastMetric.response_time_avg ? {
            average_ms: Number(lastMetric.response_time_avg)
          } : undefined,
          errors: lastMetric.error_rate ? {
            rate_per_min: Number(lastMetric.error_rate)
          } : undefined,
          health: lastMetric.availability_percent ? {
            availability_percent: Number(lastMetric.availability_percent)
          } : undefined
        };
        
        // ✅ CORRECTION : setState directement dans le useEffect, pas besoin de setTimeout
        setMetrics(historicalMetrics);
        console.log('[ANALYTICS] ✅ Dernières données connues chargées depuis l\'historique');
      }
    } catch (error) {
      console.error('[ANALYTICS] ⚠️ Erreur chargement dernières données:', error);
    }
  };

  // ✅ CORRECTION : Charger les dernières données dans un useEffect séparé pour éviter setState pendant le render
  useEffect(() => {
    if (!initialLoadDone) {
      loadLastKnownMetrics().then(() => {
        setInitialLoadDone(true);
      }).catch((error) => {
        console.error('[ANALYTICS] ⚠️ Erreur chargement dernières données:', error);
        setInitialLoadDone(true); // Marquer comme fait même en cas d'erreur
      });
    }
  }, [initialLoadDone]);

  // ✅ OPTIMISATION : Déterminer quelles données charger selon l'onglet actif
  const needsServices = ['services', 'performance', 'network', 'report'].includes(activeTab);
  
  useEffect(() => {
    let mounted = true;

    const initializeMetrics = async () => {
      // 1. Charger les données fraîches (uniquement les données essentielles au démarrage)
      try {
        const data = await centralMetricsService.fetchMetrics();
        if (mounted && data) {
          setMetrics((prev: any) => {
            if (!prev) {
              // ✅ OPTIMISATION : Ne pas inclure services/servicesList si pas nécessaire
              const result = { ...data };
              if (!needsServices) {
                delete result.services;
                delete result.servicesList;
              }
              return result;
            }
            
            // Ne mettre à jour que si on a de nouvelles données valides
            return {
              ...prev,
              ...data,
              system: data.system ? { ...prev.system, ...data.system } : prev.system,
              containers: data.containers ? { ...prev.containers, ...data.containers } : prev.containers,
              network: data.network ? { ...prev.network, ...data.network } : prev.network,
              responseTime: data.responseTime ? { ...prev.responseTime, ...data.responseTime } : prev.responseTime,
              errors: data.errors ? { ...prev.errors, ...data.errors } : prev.errors,
              health: data.health ? { ...prev.health, ...data.health } : prev.health,
              // ✅ OPTIMISATION : Ne mettre à jour services/servicesList que si nécessaire
              services: needsServices && data.services ? { ...prev.services, ...data.services } : prev.services,
              servicesList: needsServices && data.servicesList ? data.servicesList : prev.servicesList
            };
          });
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur chargement métriques:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeMetrics();
    const interval = setInterval(async () => {
      // Lors des actualisations suivantes, ne pas recharger l'historique
      // Utiliser un indicateur discret au lieu de loading pour éviter de fermer les graphiques
      setRefreshing(true);
      try {
        const data = await centralMetricsService.fetchMetrics();
        if (mounted && data) {
          // Mise à jour progressive sans réinitialiser l'état (les graphiques restent ouverts)
          setMetrics((prev: any) => {
            if (!prev) {
              // ✅ OPTIMISATION : Ne pas inclure services/servicesList si pas nécessaire
              const result = { ...data };
              if (!needsServices) {
                delete result.services;
                delete result.servicesList;
              }
              return result;
            }
            
            return {
              ...prev,
              ...data,
              system: data.system ? { ...prev.system, ...data.system } : prev.system,
              containers: data.containers ? { ...prev.containers, ...data.containers } : prev.containers,
              network: data.network ? { ...prev.network, ...data.network } : prev.network,
              responseTime: data.responseTime ? { ...prev.responseTime, ...data.responseTime } : prev.responseTime,
              errors: data.errors ? { ...prev.errors, ...data.errors } : prev.errors,
              health: data.health ? { ...prev.health, ...data.health } : prev.health,
              // ✅ OPTIMISATION : Ne mettre à jour services/servicesList que si nécessaire
              services: needsServices && data.services ? { ...prev.services, ...data.services } : prev.services,
              servicesList: needsServices && data.servicesList ? data.servicesList : prev.servicesList
            };
          });
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur actualisation métriques:', error);
      } finally {
        setRefreshing(false);
      }
    }, analyticsRefreshInterval); // ⚡ Rafraîchir selon les préférences utilisateur

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [analyticsRefreshInterval, needsServices]); // ✅ Ajouter needsServices comme dépendance
  
  // ✅ OPTIMISATION : Charger les services UNIQUEMENT si l'onglet qui en a besoin est actif
  useEffect(() => {
    if (!needsServices || !metrics) return;
    
    let mounted = true;
    
    const loadServices = async () => {
      try {
        const allServices = await centralMetricsService.getAllServices();
        if (mounted && allServices && allServices.length > 0) {
          setMetrics((prev: any) => ({
            ...prev,
            servicesList: allServices,
            services: allServices.reduce((acc: any, service: any) => {
              acc[service.name || service.id] = service;
              return acc;
            }, {})
          }));
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur chargement services:', error);
      }
    };
    
    // Charger les services si pas déjà chargés
    if (!metrics.servicesList || metrics.servicesList.length === 0) {
      loadServices();
    }
    
    return () => {
      mounted = false;
    };
  }, [needsServices, activeTab]); // Charger quand l'onglet change

  // ✅ OPTIMISATION : Charger l'historique UNIQUEMENT pour les onglets qui en ont besoin
  // Les onglets qui nécessitent l'historique : overview, system, performance, network, report
  const needsHistory = ['overview', 'system', 'performance', 'network', 'report'].includes(activeTab);
  
  useEffect(() => {
    // Ne charger l'historique que si nécessaire
    if (!needsHistory) {
      return;
    }
    
    let mounted = true;

    const loadHistory = async (isInitialLoad: boolean = false) => {
      // Déterminer si c'est un chargement initial
      const isInitial = isInitialLoad || !initialHistoryLoaded || !lastHistoryTimestamp;
      
      try {
        // Ne mettre loadingHistory à true que lors du chargement initial
        // Pour les rafraîchissements, utiliser refreshing pour ne pas fermer les graphiques
        if (isInitial) {
          setLoadingHistory(true);
        } else {
          setRefreshing(true);
        }
        
        const endTime = Date.now();
        const startTime = endTime - timeRangeMs;

        // Si c'est le chargement initial ou si le timeRange a changé, charger tout l'historique
        if (isInitial) {
          // ✅ OPTIMISATION : Réduire la limite de 1000 à 500 pour économiser la mémoire
          const history = await centralMetricsService.getMetricsHistory({
            limit: 500,
            startTime,
            endTime
          });

          if (mounted && history && Array.isArray(history) && history.length > 0) {
            // ✅ OPTIMISATION : Trier par timestamp et limiter immédiatement à 500 points
            const sortedHistory = [...history].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            // ✅ OPTIMISATION : Limiter dès le chargement initial pour économiser la mémoire
            const limitedHistory = sortedHistory.slice(-500);
            
            setMetricsHistory(limitedHistory);
            
            // Stocker le dernier timestamp pour les chargements incrémentaux
            const lastTimestamp = new Date(limitedHistory[limitedHistory.length - 1].timestamp).getTime();
            setLastHistoryTimestamp(lastTimestamp);
            setInitialHistoryLoaded(true);
          }
        } else {
          // ✅ OPTIMISATION : Chargement incrémental avec limite réduite
          const incrementalHistory = await centralMetricsService.getMetricsHistory({
            limit: 50, // ✅ OPTIMISATION : Réduit de 100 à 50 nouvelles entrées max
            startTime: lastHistoryTimestamp! + 1, // +1 pour éviter les doublons
            endTime
          });

          if (mounted && incrementalHistory && Array.isArray(incrementalHistory) && incrementalHistory.length > 0) {
            // ✅ OPTIMISATION : Fusionner avec l'historique existant avec vérifications intelligentes
            setMetricsHistory(prev => {
              // ✅ OPTIMISATION : Éviter la fusion si prev est déjà à la limite et les nouvelles données sont plus anciennes
              if (prev.length >= 500 && incrementalHistory.length > 0) {
                const newestIncremental = new Date(incrementalHistory[incrementalHistory.length - 1].timestamp).getTime();
                const oldestInPrev = new Date(prev[0].timestamp).getTime();
                
                // Si les nouvelles données sont plus anciennes que les plus anciennes en mémoire, ignorer
                if (newestIncremental <= oldestInPrev) {
                  return prev;
                }
              }
              
              const merged = [...prev, ...incrementalHistory];
              
              // ✅ OPTIMISATION : Trier seulement si nécessaire (vérifier si déjà trié)
              let sorted = merged;
              if (merged.length > 1) {
                const first = new Date(merged[0].timestamp).getTime();
                const last = new Date(merged[merged.length - 1].timestamp).getTime();
                if (first > last || prev.length === 0) {
                  // Besoin de trier
                  sorted = merged.sort((a, b) => 
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );
                }
              }
              
              // ✅ OPTIMISATION : Réduire de 1000 à 500 points max pour économiser la mémoire
              // Garder les points les plus récents
              const limited = sorted.slice(-500);
              
              // Mettre à jour le dernier timestamp
              const lastTimestamp = new Date(limited[limited.length - 1].timestamp).getTime();
              setLastHistoryTimestamp(lastTimestamp);
              
              return limited;
            });
          }
        }
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      } finally {
        if (mounted) {
          // Ne réinitialiser loadingHistory que si on l'a mis à true (chargement initial)
          // Pour les rafraîchissements, on n'a utilisé que refreshing
          if (isInitial) {
            setLoadingHistory(false);
          }
          setRefreshing(false);
        }
      }
    };

    // Chargement initial complet
    loadHistory(true);
    
    // Ensuite, chargement incrémental périodique
    const interval = setInterval(() => {
      loadHistory(false);
    }, metricsRefreshInterval);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [timeRange, metricsRefreshInterval, initialHistoryLoaded, lastHistoryTimestamp, needsHistory]); // ✅ Ajouter needsHistory comme dépendance

  // Charger les logs agrégés (erreurs récentes) avec cache et gestion d'erreurs améliorée
  const loadAggregatedLogs = async () => {
    setLoadingAggregatedLogs(true);
    try {
      const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      const cacheKey = `aggregated_logs_${METRICS_URL}`;
      
      // Essayer de récupérer depuis le cache d'abord
      const cached = await cacheManager.get<any[]>(cacheKey, { ttl: 30000 }); // Cache 30 secondes
      if (cached) {
        setAggregatedLogs(cached);
        setLoadingAggregatedLogs(false);
        
          // ✅ OPTIMISATION : Rafraîchir en arrière-plan avec limite réduite
        fetch(`${METRICS_URL}/api/v1/persistence/logs?limit=50&level=ERROR`, {
          signal: AbortSignal.timeout(5000)
        })
          .then(async (response) => {
            // Traiter uniquement les réponses OK
            if (response.ok) {
              try {
                const data = await response.json();
                if (data.success && data.data) {
                  await cacheManager.set(cacheKey, data.data, { ttl: 30000 });
                  setAggregatedLogs(data.data);
                }
              } catch (jsonError) {
                // Ignorer silencieusement les erreurs JSON
              }
            }
            // Ignorer silencieusement les erreurs 500, 404, etc.
          })
          .catch(() => {
            // Ignorer complètement toutes les erreurs en arrière-plan
          });
        return;
      }
      
      // Pas de cache, faire l'appel API avec gestion d'erreurs complète
      try {
        // ✅ OPTIMISATION : Réduire la limite de logs de 100 à 50 pour économiser la mémoire
        const response = await fetch(`${METRICS_URL}/api/v1/persistence/logs?limit=50&level=ERROR`, {
          signal: AbortSignal.timeout(5000) // Timeout de 5 secondes
        });
        
        // Traiter les réponses OK uniquement
        if (response.ok) {
          try {
            const data = await response.json();
            if (data.success && data.data) {
              await cacheManager.set(cacheKey, data.data, { ttl: 30000 });
              setAggregatedLogs(data.data);
            } else {
              // Si pas de données mais réponse OK, utiliser le cache ou tableau vide
              const cached = await cacheManager.get<any[]>(cacheKey);
              setAggregatedLogs(cached || []);
            }
          } catch (jsonError) {
            // Si le JSON est invalide, utiliser le cache ou tableau vide
            const cached = await cacheManager.get<any[]>(cacheKey);
            setAggregatedLogs(cached || []);
          }
        } else {
          // Pour les erreurs HTTP (500, 404, etc.), utiliser le cache ou tableau vide silencieusement
          const cached = await cacheManager.get<any[]>(cacheKey);
          setAggregatedLogs(cached || []);
          // Ne pas logger les erreurs pour éviter le spam dans la console
        }
      } catch (fetchError: any) {
        // Ignorer COMPLÈTEMENT toutes les erreurs (y compris 500, timeout, réseau)
        // Utiliser le cache si disponible, sinon tableau vide
        const cached = await cacheManager.get<any[]>(cacheKey);
        setAggregatedLogs(cached || []);
        // Ne pas logger pour éviter le spam dans la console
      }
    } catch (error: any) {
      // Gérer toutes les erreurs silencieusement avec fallback sur le cache
      const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      const cacheKey = `aggregated_logs_${METRICS_URL}`;
      const cached = await cacheManager.get<any[]>(cacheKey);
      if (cached) {
        setAggregatedLogs(cached);
      } else {
        setAggregatedLogs([]);
      }
      // Ne pas logger les erreurs pour éviter le spam dans la console
    } finally {
      setLoadingAggregatedLogs(false);
    }
  };

  // ✅ OPTIMISATION : Charger les logs agrégés UNIQUEMENT si l'onglet 'logs' est actif
  useEffect(() => {
    // Ne charger que si l'onglet logs est actif
    if (activeTab !== 'logs') {
      return;
    }
    
    // Charger une première fois (gestion d'erreurs silencieuse)
    loadAggregatedLogs().catch(() => {
      // Ignorer silencieusement toutes les erreurs
    });
    
    // Rafraîchir périodiquement (gestion d'erreurs silencieuse)
    const interval = setInterval(() => {
      loadAggregatedLogs().catch(() => {
        // Ignorer silencieusement toutes les erreurs
      });
    }, 10000); // Toutes les 10 secondes
    
    return () => clearInterval(interval);
  }, [activeTab]); // ✅ Dépendre de activeTab pour charger uniquement quand nécessaire

  // Charger les logs d'un service
  const loadServiceLogs = async (service: ServiceMetrics) => {
    setLoadingLogs(true);
    setLogsError(null);
    setSelectedService(service);
    
    try {
      // Extraire le nom du service (sans jobbingtrack-)
      // Gérer les différents formats de noms de services
      let serviceName = service.rawName?.replace('jobbingtrack-', '') || service.name?.replace('jobbingtrack-', '') || service.name;
      
      // Mapper les noms de services pour correspondre aux noms de conteneurs Docker
      // Ce mapping convertit les noms d'affichage et variantes vers les noms de conteneurs Docker
      const serviceNameMap: { [key: string]: string } = {
        // Services principaux
        'auth-service': 'auth-service',
        'service-d-authentification': 'auth-service',
        'authentification': 'auth-service',
        'auth': 'auth-service',
        
        'application-service': 'application-service',
        'service-des-candidatures': 'application-service',
        'candidatures': 'application-service',
        'application': 'application-service',
        
        'company-service': 'company-service',
        'service-des-entreprises': 'company-service',
        'entreprises': 'company-service',
        'company': 'company-service',
        
        'contact-service': 'contact-service',
        'service-des-contacts': 'contact-service',
        'contacts': 'contact-service',
        'contact': 'contact-service',
        
        'interview-service': 'interview-service',
        'service-des-entretiens': 'interview-service',
        'entretiens': 'interview-service',
        'interview': 'interview-service',
        
        'call-service': 'call-service',
        'service-des-appels': 'call-service',
        'appels': 'call-service',
        'call': 'call-service',
        
        'event-service': 'event-service',
        'service-des-événements': 'event-service',
        'événements': 'event-service',
        'events': 'event-service',
        'event': 'event-service',
        
        'followup-service': 'followup-service',
        'followup': 'followup-service',
        'service-de-gestion-des-relances': 'followup-service',
        'relance-service': 'followup-service',
        'relances': 'followup-service',
        'service-de-suivi': 'followup-service',
        
        'profile-service': 'profile-service',
        'service-des-profils': 'profile-service',
        'profils': 'profile-service',
        'profile': 'profile-service',
        
        'notification-service': 'notification-service',
        'service-de-notifications': 'notification-service',
        'notifications': 'notification-service',
        'notification': 'notification-service',
        'jobbingtrack-notification-service': 'notification-service',
        
        'dashboard-service': 'dashboard-service',
        'service-du-tableau-de-bord': 'dashboard-service',
        'tableau-de-bord': 'dashboard-service',
        'dashboard': 'dashboard-service',
        
        'workflow-service': 'workflow-service',
        'service-de-workflow': 'workflow-service',
        'workflow': 'workflow-service',
        
        'security-service': 'security-service',
        'service-de-sécurité': 'security-service',
        'sécurité': 'security-service',
        'security': 'security-service',
        
        'deployment-service': 'deployment-service',
        'service-de-déploiement': 'deployment-service',
        'déploiement': 'deployment-service',
        'deployment': 'deployment-service',
        
        // Infrastructure
        'api-gateway': 'api-gateway',
        'gateway': 'api-gateway',
        'api': 'api-gateway',
        
        'postgres': 'postgres',
        'base-de-données': 'postgres',
        'database': 'postgres',
        'postgresql': 'postgres',
        
        'redis': 'redis',
        'cache-redis': 'redis',
        'cache': 'redis',
        'jobbingtrack-redis': 'redis',
        
        'frontend': 'frontend',
        'jobbingtrack-frontend': 'frontend',
        
        'metrics-aggregator': 'metrics-aggregator',
        'jobbingtrack-metrics-aggregator': 'metrics-aggregator',
        'service-de-métriques': 'metrics-aggregator'
      };
      
      // Normaliser le nom du service (minuscules, sans accents, espaces remplacés par tirets)
      const normalizedName = serviceName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      // Utiliser le mapping ou le nom normalisé
      serviceName = serviceNameMap[normalizedName] || serviceNameMap[serviceName.toLowerCase()] || normalizedName;
      
      const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
      // Construire le nom du conteneur Docker
      const containerName = `jobbingtrack-${serviceName}`;
      // ✅ OPTIMISATION : Réduire la limite de logs de 100 à 50 pour économiser la mémoire
      const response = await fetch(`${METRICS_URL}/api/v1/logs/${serviceName}?limit=50`, {
        signal: AbortSignal.timeout(10000) // Timeout de 10 secondes
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.logs && data.logs.length > 0) {
          setServiceLogs(data.logs);
          setLogsError(null);
        } else if (data.success && data.logs && data.logs.length === 0) {
          setLogsError(data.message || 'Aucun log disponible pour ce service');
          setServiceLogs([]);
        } else if (!data.success && data.error) {
          // Service non disponible ou erreur
          setLogsError(data.error || data.message || `Le conteneur ${containerName} n'existe pas ou n'est pas démarré`);
          setServiceLogs([]);
        } else {
          setLogsError('Aucun log disponible pour ce service');
          setServiceLogs([]);
        }
      } else if (response.status === 404) {
        // En développement, ne pas afficher d'erreur pour les services qui n'existent pas
        if (process.env.NODE_ENV === 'development') {
          setLogsError(null);
          setServiceLogs([]);
        } else {
          setLogsError(`Service non trouvé : Le conteneur ${containerName} n'existe pas ou n'est pas démarré. Vérifiez que le service est bien démarré.`);
          setServiceLogs([]);
        }
      } else {
        const errorText = await response.text();
        let errorMessage = `Erreur ${response.status}: Impossible de récupérer les logs`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          // Si ce n'est pas du JSON, utiliser le texte brut
          if (errorText) errorMessage = errorText;
        }
        setLogsError(errorMessage);
        setServiceLogs([]);
      }
    } catch (error: any) {
      console.error('Erreur chargement logs:', error);
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        setLogsError('Timeout : Le service de monitoring ne répond pas. Vérifiez que le metrics-aggregator est démarré et accessible.');
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        setLogsError('Erreur de connexion : Impossible de joindre le service de monitoring. Vérifiez que le metrics-aggregator est démarré (port 8014).');
      } else {
        setLogsError(`Erreur : ${error.message || 'Impossible de récupérer les logs'}`);
      }
      setServiceLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  // ✅ OPTIMISATION : Préparer les données pour les graphiques avec cache et tri optimisé
  const chartData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length === 0) return [];
    
    // ✅ OPTIMISATION : Vérifier si metricsHistory est déjà trié (éviter le tri si inutile)
    // On suppose que l'historique est déjà trié après chargement, donc on évite le tri si possible
    let sortedHistory = metricsHistory;
    
    // Vérifier si le tri est nécessaire (vérifier seulement les 2 premiers et derniers éléments)
    if (metricsHistory.length > 1) {
      const first = new Date(metricsHistory[0].timestamp).getTime();
      const last = new Date(metricsHistory[metricsHistory.length - 1].timestamp).getTime();
      if (first > last) {
        // Besoin de trier
        sortedHistory = [...metricsHistory].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
    }
    
    // ✅ OPTIMISATION : Limiter plus agressivement selon la plage de temps
    const maxPoints = timeRange === '1h' ? 60 : 
                      timeRange === '6h' ? 120 : 
                      timeRange === '24h' ? 240 : 
                      timeRange === '7d' ? 280 : 500; // 30d - réduit de 720 à 500
    
    // ✅ OPTIMISATION : Sous-échantillonnage plus efficace avec slice au lieu de filter
    let dataToUse = sortedHistory;
    if (sortedHistory.length > maxPoints) {
      // Prendre un point tous les N points de manière plus efficace
      const step = Math.ceil(sortedHistory.length / maxPoints);
      const indices: number[] = [];
      for (let i = 0; i < sortedHistory.length; i += step) {
        indices.push(i);
      }
      // Toujours inclure le dernier point
      if (indices[indices.length - 1] !== sortedHistory.length - 1) {
        indices.push(sortedHistory.length - 1);
      }
      dataToUse = indices.map(i => sortedHistory[i]);
    }
    
    // ✅ OPTIMISATION : Utiliser map avec réutilisation des valeurs calculées
    return dataToUse.map((item: any) => {
      const timestamp = new Date(item.timestamp);
      
      // ✅ CORRECTION : Calculer le trafic réseau global en sommant tous les services
      // Si network_rx_mb et network_tx_mb ne sont pas disponibles, les calculer depuis les services
      let networkRx = toNumber(item.network_rx_mb, 0);
      let networkTx = toNumber(item.network_tx_mb, 0);
      
      // Si les valeurs globales sont à 0 ou absentes, essayer de les calculer depuis les services
      if ((networkRx === 0 && networkTx === 0) && item.services && Array.isArray(item.services)) {
        networkRx = item.services.reduce((sum: number, s: any) => {
          return sum + toNumber(s.network_rx_mb || s.network?.rx_mb || (s.network?.rx_bytes ? s.network.rx_bytes / 1024 / 1024 : 0), 0);
        }, 0);
        networkTx = item.services.reduce((sum: number, s: any) => {
          return sum + toNumber(s.network_tx_mb || s.network?.tx_mb || (s.network?.tx_bytes ? s.network.tx_bytes / 1024 / 1024 : 0), 0);
        }, 0);
      }
      
      return {
        time: formatTimestamp(item.timestamp, timeRange),
        timestamp: timestamp.getTime(), // Ajouter pour éviter de recalculer
        cpu: toNumber(item.cpu_percent, 0),
        memory: toNumber(item.memory_percent, 0),
        networkRx: networkRx, // ✅ CORRECTION : Utiliser la valeur calculée (globale ou somme des services)
        networkTx: networkTx, // ✅ CORRECTION : Utiliser la valeur calculée (globale ou somme des services)
        responseTime: toNumber(item.response_time_avg, 0),
        errorRate: toNumber(item.error_rate, 0),
        availability: toNumber(item.availability_percent, 100),
        loadScore: toNumber(item.load_score, 0)
      };
    });
  }, [metricsHistory, timeRange]);

  // Calculer les statistiques agrégées
  const aggregatedStats = useMemo(() => {
    // Retourner des valeurs par défaut (null) si pas de données, au lieu d'un objet vide
    if (!metrics) return {
      servicesTotal: 0,
      servicesHealthy: 0,
      servicesDegraded: 0,
      servicesOffline: 0,
      avgCpuUsage: null,
      totalMemoryMb: null,
      totalNetworkRxMb: null,
      totalNetworkTxMb: null,
      totalNetworkMb: null,
      avgResponseTime: null,
      totalErrors: 0,
      avgErrorRate: null
    };

    const servicesList = metrics.servicesList || Object.values(metrics.services || {});

    // ✅ Utiliser les données des conteneurs (source fiable)
    let avgCpuUsage = null;
    let totalMemoryMb = null;
    
    // Priorité 1: Données conteneurs (si disponibles dans containers)
    // Note: metrics.containers peut être un objet ou un tableau selon l'interface
    if (metrics.containers && typeof metrics.containers === 'object' && !Array.isArray(metrics.containers)) {
      const containers = metrics.containers as any;
      // Chercher des données agrégées dans les conteneurs
      if (containers.cpu?.averagePercent !== undefined) {
        avgCpuUsage = Number(containers.cpu.averagePercent);
      }
      if (containers.memory?.used !== undefined) {
        totalMemoryMb = Number(containers.memory.used);
      }
    }

    // Priorité 2: Données système globales (si conteneurs non disponibles)
    if (avgCpuUsage === null && metrics.system?.cpu?.usage && metrics.system.cpu.usage !== 'N/A') {
      const cpuStr = metrics.system.cpu.usage.toString().replace('%', '');
      const cpuNum = parseFloat(cpuStr);
      if (!isNaN(cpuNum)) {
        avgCpuUsage = cpuNum;
      }
    }
    
    if (totalMemoryMb === null && metrics.system?.memory?.used && metrics.system.memory.used !== 'N/A') {
      const memoryStr = metrics.system.memory.used.toString().replace(/[^0-9.]/g, '');
      const memoryNum = parseFloat(memoryStr);
      if (!isNaN(memoryNum)) {
        totalMemoryMb = memoryNum;
      }
    }

    // Priorité 3: Calculer depuis les services (dernier recours)
    if (avgCpuUsage === null && servicesList.length > 0) {
      const totalCpuUsage = servicesList.reduce((sum, s: any) => 
        sum + toNumber(s.metrics?.cpu?.percentage, 0), 0);
      avgCpuUsage = totalCpuUsage / servicesList.length;
    }

    if (totalMemoryMb === null && servicesList.length > 0) {
      totalMemoryMb = servicesList.reduce((sum, s: any) => 
        sum + toNumber(s.metrics?.memory?.usageMb, 0), 0);
    }

    const totalNetworkRxMb = metrics.network?.total_rx_mb !== undefined 
      ? toNumber(metrics.network.total_rx_mb, 0)
      : servicesList.reduce((sum, s: any) => sum + toNumber(s.metrics?.network?.rx_mb, 0), 0);
      
    const totalNetworkTxMb = metrics.network?.total_tx_mb !== undefined
      ? toNumber(metrics.network.total_tx_mb, 0)
      : servicesList.reduce((sum, s: any) => sum + toNumber(s.metrics?.network?.tx_mb, 0), 0);
      
    const totalNetworkMb = totalNetworkRxMb + totalNetworkTxMb;

    const healthyCount = servicesList.filter((s: any) => s.status === 'healthy').length;
    const degradedCount = servicesList.filter((s: any) => s.status === 'degraded').length;
    const offlineCount = servicesList.filter((s: any) => 
      s.status === 'offline' || s.status === 'unknown').length;

    const responseTimes = servicesList
      .map((s: any) => s.responseTimeMs)
      .filter((rt): rt is number => typeof rt === 'number' && rt > 0);
    let avgResponseTime = metrics.responseTime?.average_ms !== undefined 
      ? toNumber(metrics.responseTime.average_ms, 0)
      : null;
    
    if (avgResponseTime === null && responseTimes.length > 0) {
      avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
    }

    const totalErrors = servicesList.reduce((sum, s: any) => 
      sum + toNumber(s.errorCount5m, 0), 0);
    const avgErrorRate = metrics.errors?.rate_per_min !== undefined
      ? toNumber(metrics.errors.rate_per_min, 0)
      : servicesList.reduce((sum, s: any) => sum + toNumber(s.errorRatePerMin, 0), 0);

    return {
      servicesTotal: servicesList.length,
      servicesHealthy: healthyCount,
      servicesDegraded: degradedCount,
      servicesOffline: offlineCount,
      avgCpuUsage,
      totalMemoryMb,
      totalNetworkRxMb,
      totalNetworkTxMb,
      totalNetworkMb,
      avgResponseTime,
      totalErrors,
      avgErrorRate
    };
  }, [metrics]);

  if (loading && !metrics) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  const servicesList = metrics?.servicesList || Object.values(metrics?.services || {});

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                ⚡ Performances & Analytics
              </h1>
              {/* Indicateur de mise à jour en temps réel */}
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Live</span>
              </div>
            </div>
            <p className="mt-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
              Monitoring complet des performances système et services • Actualisation toutes les 10s
            </p>
          </div>
          <select
            value={timeRange}
            onChange={handleTimeRangeChange}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Dernière heure</option>
            <option value="6h">6 heures</option>
            <option value="24h">24 heures</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && (
          <OverviewTab 
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            loadingHistory={loadingHistory}
            initialHistoryLoaded={initialHistoryLoaded}
            refreshing={refreshing}
            timeRange={timeRange}
          />
        )}

        {activeTab === 'system' && (
          <SystemTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            loadingHistory={loadingHistory}
            initialHistoryLoaded={initialHistoryLoaded}
            refreshing={refreshing}
            timeRange={timeRange}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            servicesList={servicesList}
            loadingHistory={loadingHistory}
            refreshing={refreshing}
            initialHistoryLoaded={initialHistoryLoaded}
            timeRange={timeRange}
          />
        )}

        {activeTab === 'network' && (
          <NetworkTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            servicesList={servicesList}
            loadingHistory={loadingHistory}
            refreshing={refreshing}
            initialHistoryLoaded={initialHistoryLoaded}
            timeRange={timeRange}
          />
        )}

        {activeTab === 'services' && (
          <ServicesTab
            servicesList={servicesList}
            selectedService={selectedService}
            serviceLogs={serviceLogs}
            loadingLogs={loadingLogs}
            logsError={logsError}
            onSelectService={loadServiceLogs}
          />
        )}
        
        {/* ✅ OPTIMISATION : Afficher un loader pour les onglets non chargés */}
        {!needsHistory && activeTab !== 'services' && activeTab !== 'logs' && activeTab !== 'report' && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Chargement de l'onglet...</p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <LogsTab
            logs={aggregatedLogs}
            loading={loadingAggregatedLogs}
            onRefresh={loadAggregatedLogs}
          />
        )}

        {activeTab === 'report' && (
          <ReportTab
            metrics={metrics}
            chartData={chartData}
            aggregatedStats={aggregatedStats}
            servicesList={servicesList}
            aggregatedLogs={aggregatedLogs}
            metricsHistory={metricsHistory}
            timeRange={timeRange}
          />
        )}
      </div>
    </AdminLayout>
  );
}

// ✅ OPTIMISATION : Memoization des composants de graphiques pour éviter les re-renders inutiles
// Composant Overview Tab
const OverviewTab = memo(function OverviewTab({ metrics, chartData, aggregatedStats, loadingHistory, initialHistoryLoaded = false, refreshing = false, timeRange = '24h' }: any) {
  // Calculer les tendances depuis l'historique
  const last30Points = chartData.slice(-30)
  const cpuTrend = last30Points.length > 0 
    ? aggregatedStats.avgCpuUsage - (last30Points.reduce((sum: number, d: any) => sum + d.cpu, 0) / last30Points.length)
    : 0
  const memoryTrend = last30Points.length > 0
    ? aggregatedStats.totalMemoryMb - (last30Points.reduce((sum: number, d: any) => sum + d.memory, 0) / last30Points.length)
    : 0
  const responseTimeTrend = last30Points.length > 0
    ? aggregatedStats.avgResponseTime - (last30Points.reduce((sum: number, d: any) => sum + d.responseTime, 0) / last30Points.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Cartes de synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Server className="w-6 h-6" />}
          title="Services"
          value={aggregatedStats.servicesTotal || 0}
          subtitle={`${aggregatedStats.servicesHealthy || 0} sains`}
          color="blue"
        />
        <StatCard
          icon={<Cpu className="w-6 h-6" />}
          title="CPU Moyen"
          value={aggregatedStats.avgCpuUsage !== null ? `${aggregatedStats.avgCpuUsage.toFixed(1)}%` : '...'}
          trend={cpuTrend}
          trendType="positive-is-bad"
          color="purple"
          loading={aggregatedStats.avgCpuUsage === null}
        />
        <StatCard
          icon={<MemoryStick className="w-6 h-6" />}
          title="Mémoire Totale"
          value={aggregatedStats.totalMemoryMb !== null ? formatMb(aggregatedStats.totalMemoryMb) : '...'}
          trend={memoryTrend}
          trendType="positive-is-bad"
          color="green"
          loading={aggregatedStats.totalMemoryMb === null}
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
          trend={responseTimeTrend}
          trendType="positive-is-bad"
          color="orange"
          loading={aggregatedStats.avgResponseTime === null}
        />
      </div>

      {/* Graphiques principaux */}
      {/* Afficher les graphiques une fois qu'ils sont chargés, même pendant le rafraîchissement */}
      {chartData.length > 0 && initialHistoryLoaded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {/* Indicateur de rafraîchissement discret en haut à droite */}
          {refreshing && (
            <div className="absolute top-0 right-0 z-10 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <Activity className="w-3 h-3 animate-spin" />
              <span>Actualisation...</span>
            </div>
          )}
          {/* CPU & Mémoire */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU & Mémoire
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  name="CPU (%)"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="memory" 
                  stroke={COLORS.secondary} 
                  strokeWidth={2}
                  name="Mémoire (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Réseau */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🌐 Trafic Réseau
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="networkRx" 
                  stackId="1"
                  stroke={COLORS.info} 
                  fill={COLORS.info}
                  fillOpacity={0.6}
                  name="RX (MB)"
                />
                <Area 
                  type="monotone" 
                  dataKey="networkTx" 
                  stackId="1"
                  stroke={COLORS.warning} 
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="TX (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚡ Temps de Réponse & Erreurs
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={COLORS.purple} 
                  strokeWidth={2}
                  name="Temps réponse (ms)"
                  dot={false}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="errorRate" 
                  fill={COLORS.danger}
                  name="Taux d'erreur (%)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Disponibilité */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Disponibilité
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[90, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="availability" 
                  stroke={COLORS.success} 
                  strokeWidth={3}
                  name="Disponibilité (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loadingHistory && !initialHistoryLoaded && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chargement de l'historique...</p>
        </div>
      )}
    </div>
  );
});

// Composant Performance Tab
const PerformanceTab = memo(function PerformanceTab({ metrics, chartData, aggregatedStats, servicesList, loadingHistory, refreshing = false, initialHistoryLoaded = false, timeRange = '24h' }: any) {
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'responseTime' | 'errorRate'>('cpu');

  return (
    <div className="space-y-6">
      {/* Métriques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
          color="purple"
          loading={aggregatedStats.avgResponseTime === null}
        />

        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Erreurs (5 min)"
          value={aggregatedStats.totalErrors || 0}
          color="orange"
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Taux Erreur"
          value={aggregatedStats.avgErrorRate !== null ? `${aggregatedStats.avgErrorRate.toFixed(2)}/min` : '...'}
          color="orange"
          loading={aggregatedStats.avgErrorRate === null}
        />

        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          title="CPU Moyen Total"
          value={aggregatedStats.avgCpuUsage !== null ? `${Math.min(aggregatedStats.avgCpuUsage, 100).toFixed(1)}%` : '...'}
          color="blue"
          loading={aggregatedStats.avgCpuUsage === null}
        />
      </div>

      {/* Graphiques de performance avec navigation temporelle */}
      {/* Afficher les graphiques une fois qu'ils sont chargés, même pendant le rafraîchissement */}
      {chartData.length > 0 && initialHistoryLoaded && (
        <div className="space-y-6 relative">
          {/* Indicateur de rafraîchissement discret */}
          {refreshing && (
            <div className="absolute top-0 right-0 z-10 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <Activity className="w-3 h-3 animate-spin" />
              <span>Actualisation...</span>
            </div>
          )}
          {/* CPU Moyen Total dans le temps */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU Moyen Total - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  name="CPU Moyen (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Graphique temporel des performances */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📈 Évolution des Performances
            </h3>
            {chartData.length > 0 && chartData.some((d: any) => d.responseTime > 0 || d.cpu > 0 || d.memory > 0) ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Temps réponse (ms)') {
                        return [value > 0 ? `${value.toFixed(0)} ms` : 'N/A', name];
                      }
                      return [value > 0 ? `${value.toFixed(1)}%` : 'N/A', name];
                    }}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="cpu" 
                    stroke={COLORS.primary}
                    fill={COLORS.primary}
                    fillOpacity={0.3}
                    name="CPU (%)"
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="memory" 
                    stroke={COLORS.secondary}
                    fill={COLORS.secondary}
                    fillOpacity={0.3}
                    name="Mémoire (%)"
                  />
                  {chartData.some((d: any) => d.responseTime > 0) && (
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke={COLORS.purple}
                      strokeWidth={2}
                      name="Temps réponse (ms)"
                      dot={false}
                      connectNulls={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chargement des données de performance...</p>
                <p className="text-xs mt-2">Les données apparaîtront ici une fois collectées</p>
              </div>
            )}
          </div>
          {/* CPU par service - État actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                💻 CPU par Service (État actuel)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Données en temps réel
              </span>
            </div>
            {servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                  data={servicesList
                    .map((s: any) => ({ 
                      name: s.displayName || s.name,
                      cpu: Math.min(toNumber(s.metrics?.cpu?.percentage, 0), 100) // Limiter à 100%
                }))
                    .filter((item: any) => item.cpu > 0)} // Filtrer après le map
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                    domain={[0, 100]}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(1)}%`, 'CPU']}
                />
                <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée CPU disponible pour les services</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>

          {/* Temps de réponse - Évolution temporelle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚡ Temps de Réponse Moyen - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke={COLORS.purple} 
                  strokeWidth={3}
                  name="Temps Réponse (ms)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Temps de réponse par service - État actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⚡ Temps de Réponse par Service (État actuel)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Données en temps réel
              </span>
            </div>
            {servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={servicesList
                  .map((s: any) => ({ 
                      name: s.displayName || s.name,
                    responseTime: s.responseTimeMs || 0
                  }))
                  .filter((item: any) => item.responseTime > 0)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(0)} ms`, 'Temps Réponse']}
                />
                <Bar dataKey="responseTime" fill={COLORS.purple} name="Temps (ms)" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de temps de réponse disponible</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>

          {/* Mémoire par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Mémoire par Service
            </h3>
            {servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                  data={servicesList
                    .map((s: any) => ({ 
                      name: s.displayName || s.name,
                  memory: toNumber(s.metrics?.memory?.usageMb, 0)
                }))
                    .filter((item: any) => item.memory > 0)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(0)} MB`, 'Mémoire']}
                />
                <Bar dataKey="memory" fill={COLORS.secondary} name="Mémoire (MB)" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <MemoryStick className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée de mémoire disponible pour les services</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>

          {/* Taux d'erreur - Évolution temporelle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚠️ Taux d'Erreur - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="errorRate" 
                  stroke={COLORS.danger}
                  fill={COLORS.danger}
                  fillOpacity={0.3}
                  name="Taux d'Erreur (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Taux d'erreur par service - État actuel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⚠️ Taux d'Erreur par Service (État actuel)
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Données en temps réel
              </span>
            </div>
            {servicesList && servicesList.length > 0 && servicesList.some((s: any) => toNumber(s.errorRatePerMin, 0) > 0) ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={servicesList
                  .map((s: any) => ({ 
                      name: s.displayName || s.name,
                    errorRate: toNumber(s.errorRatePerMin, 0)
                  }))
                  .filter((item: any) => item.errorRate > 0)}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number"
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '11px' }}
                    width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any) => [`${value.toFixed(2)} erreurs/min`, 'Taux']}
                />
                <Bar dataKey="errorRate" fill={COLORS.danger} name="Erreurs/min" />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune erreur détectée ✅</p>
                <p className="text-sm mt-1 text-green-600 dark:text-green-400">Tous les services fonctionnent correctement</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Composant Network Tab
const NetworkTab = memo(function NetworkTab({ metrics, chartData, aggregatedStats, servicesList, loadingHistory, refreshing = false, initialHistoryLoaded = false, timeRange = '24h' }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques réseau */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total RX</span>
            <Network className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMb(aggregatedStats.totalNetworkRxMb)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total TX</span>
            <Network className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMb(aggregatedStats.totalNetworkTxMb)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
            <Wifi className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMb(aggregatedStats.totalNetworkMb)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Disponibilité</span>
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {metrics?.health?.availability_percent?.toFixed(1) || 'N/A'}%
          </div>
        </div>
      </div>

      {/* Graphiques réseau */}
      {/* Afficher les graphiques une fois qu'ils sont chargés, même pendant le rafraîchissement */}
      {chartData.length > 0 && initialHistoryLoaded && (
        <div className="space-y-6 relative">
          {/* Indicateur de rafraîchissement discret */}
          {refreshing && (
            <div className="absolute top-0 right-0 z-10 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <Activity className="w-3 h-3 animate-spin" />
              <span>Actualisation...</span>
            </div>
          )}
          {/* Trafic réseau global */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🌐 Trafic Réseau Global
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="networkRx" 
                  stackId="1"
                  stroke={COLORS.info} 
                  fill={COLORS.info}
                  fillOpacity={0.6}
                  name="Réception (MB)"
                />
                <Area 
                  type="monotone" 
                  dataKey="networkTx" 
                  stackId="1"
                  stroke={COLORS.warning} 
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="Émission (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trafic réseau par service */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Trafic Réseau par Service
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={servicesList
                  .map((s: any) => {
                    // Essayer plusieurs sources pour les données réseau
                    const rx = toNumber(
                      s.networkMb?.rx || 
                      s.networkMb?.rx_mb || 
                      s.metrics?.network?.rx_mb || 
                      (s.metrics?.network?.rx_bytes ? (s.metrics.network.rx_bytes / 1024 / 1024) : 0), 
                      0
                    )
                    const tx = toNumber(
                      s.networkMb?.tx || 
                      s.networkMb?.tx_mb || 
                      s.metrics?.network?.tx_mb || 
                      (s.metrics?.network?.tx_bytes ? (s.metrics.network.tx_bytes / 1024 / 1024) : 0), 
                      0
                    )
                    return {
                      name: (s.displayName || s.name || s.rawName || 'Service inconnu').substring(0, 20),
                      rx: Math.max(0, rx),
                      tx: Math.max(0, tx),
                      total: rx + tx
                    }
                  })
                  .sort((a: any, b: any) => (b.total || 0) - (a.total || 0))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name"
                  stroke="#9CA3AF"
                  style={{ fontSize: '9px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'RX (MB)' || name === 'TX (MB)') {
                      return [`${value.toFixed(2)} MB`, name]
                    }
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="rx" fill={COLORS.info} name="RX (MB)" />
                <Bar dataKey="tx" fill={COLORS.warning} name="TX (MB)" />
              </BarChart>
            </ResponsiveContainer>
            {servicesList.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun service avec données réseau disponible</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// Composant System Tab
const SystemTab = memo(function SystemTab({ metrics, chartData, aggregatedStats, loadingHistory, initialHistoryLoaded = false, refreshing = false, timeRange = '24h' }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques système principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          title="CPU Moyen"
          value={aggregatedStats.avgCpuUsage !== null ? `${Math.min(aggregatedStats.avgCpuUsage, 100).toFixed(1)}%` : '...'}
          color="blue"
          loading={aggregatedStats.avgCpuUsage === null}
        />
        <StatCard
          icon={<MemoryStick className="w-5 h-5" />}
          title="Mémoire Moyenne"
          value={aggregatedStats.totalMemoryMb !== null ? `${aggregatedStats.totalMemoryMb.toFixed(0)} MB` : '...'}
          color="green"
          loading={aggregatedStats.totalMemoryMb === null}
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Temps Réponse Moy."
          value={aggregatedStats.avgResponseTime !== null ? formatMs(aggregatedStats.avgResponseTime) : '...'}
          color="purple"
          loading={aggregatedStats.avgResponseTime === null}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          title="Disponibilité"
          value={aggregatedStats.servicesTotal > 0 
            ? `${((aggregatedStats.servicesHealthy / aggregatedStats.servicesTotal) * 100).toFixed(1)}%`
            : '...'}
          color="green"
          loading={aggregatedStats.servicesTotal === 0}
        />
      </div>

      {/* Graphiques système */}
      {/* Afficher les graphiques une fois qu'ils sont chargés, même pendant le rafraîchissement */}
      {chartData.length > 0 && initialHistoryLoaded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
          {/* Indicateur de rafraîchissement discret */}
          {refreshing && (
            <div className="absolute top-0 right-0 z-10 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <Activity className="w-3 h-3 animate-spin" />
              <span>Actualisation...</span>
            </div>
          )}
          {/* CPU détaillé */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 Utilisation CPU
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCpuSystem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCpuSystem)"
                  name="CPU (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Mémoire détaillée */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Utilisation Mémoire
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMemorySystem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  stroke={COLORS.secondary}
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMemorySystem)"
                  name="Mémoire (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Charge système combinée */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📊 Charge Système Globale
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval="preserveStartEnd"
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Legend />
                <Bar dataKey="cpu" fill={COLORS.primary} name="CPU (%)" />
                <Bar dataKey="memory" fill={COLORS.secondary} name="Mémoire (%)" />
                <Line 
                  type="monotone" 
                  dataKey="loadScore" 
                  stroke={COLORS.warning}
                  strokeWidth={3}
                  name="Score de charge"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loadingHistory && !initialHistoryLoaded && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement de l'historique...</p>
        </div>
      )}
    </div>
  );
});

// Composant Services Tab
const ServicesTab = memo(function ServicesTab({ servicesList, selectedService, serviceLogs, loadingLogs, logsError, onSelectService }: any) {
  return (
    <div className="space-y-6">
      {/* Liste des services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servicesList.map((service: any) => (
          <div
            key={service.id || service.name}
            onClick={() => onSelectService(service)}
            className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer transition-all ${
              selectedService?.name === service.name
                ? 'ring-2 ring-blue-600 dark:ring-blue-400'
                : 'hover:shadow-lg'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {service.displayName || service.name}
              </h3>
              <div className="flex items-center gap-2">
                {/* Indicateur de démarrage */}
                {service.status === 'healthy' || service.status === 'running' || service.status === 'degraded' ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Service démarré"></div>
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full" title="Service arrêté"></div>
                )}
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  service.status === 'healthy' || service.status === 'running'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : service.status === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : service.status === 'offline' || service.status === 'stopped'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                }`}>
                  {service.status === 'healthy' || service.status === 'running' 
                    ? '✅ Actif' 
                    : service.status === 'degraded'
                    ? '⚠️ Dégradé'
                    : service.status === 'offline' || service.status === 'stopped'
                    ? '❌ Arrêté'
                    : service.status || '❓ Inconnu'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">CPU</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {toNumber(service.metrics?.cpu?.percentage, 0).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Mémoire</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatMb(service.metrics?.memory?.usageMb)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 dark:text-gray-400">Temps réponse</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {formatMs(service.responseTimeMs)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Logs du service sélectionné */}
      {selectedService && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              📋 Logs: {selectedService.displayName || selectedService.name}
            </h3>
            <button
              onClick={() => onSelectService(selectedService)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              disabled={loadingLogs}
            >
              {loadingLogs ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>

          {loadingLogs && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}

          {logsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-300">{logsError}</p>
            </div>
          )}

          {!loadingLogs && !logsError && serviceLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Aucun log disponible
            </div>
          )}

          {!loadingLogs && serviceLogs.length > 0 && (
            <div className="bg-gray-900 rounded-lg p-4">
              {/* ✅ OPTIMISATION : Virtualisation des logs pour améliorer les performances */}
              <VirtualizedList
                items={serviceLogs}
                itemHeight={30}
                containerHeight={384}
                overscan={10}
                renderItem={(log: any, index: number) => (
                  <div 
                    className={`font-mono text-xs ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'debug' ? 'text-gray-500' :
                      'text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500">{log.timestamp}</span>
                    <span className="ml-2 font-semibold">[{log.level?.toUpperCase() || 'INFO'}]</span>
                    <span className="ml-2">{log.message}</span>
                  </div>
                )}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ✅ OPTIMISATION : Memoization du composant LogsTab
// Composant Logs Tab
const LogsTab = memo(function LogsTab({ logs, loading, onRefresh }: any) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
      case 'FATAL':
        return 'text-red-400 bg-red-900/20 border-red-800';
      case 'WARN':
        return 'text-yellow-400 bg-yellow-900/20 border-yellow-800';
      default:
        return 'text-gray-400 bg-gray-900/20 border-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            📋 Erreurs Récentes
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Logs critiques (ERROR, WARN, FATAL) enregistrés depuis tous les services
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Chargement...' : 'Actualiser'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement des logs...</p>
        </div>
      )}

      {!loading && logs.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            ✅ Aucune erreur récente enregistrée
          </p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Niveau
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {log.serviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded border ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="max-w-md truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.stackTrace && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            Stack trace
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-900 text-gray-300 p-2 rounded overflow-x-auto">
                            {log.stackTrace}
                          </pre>
                        </details>
                      )}
                      {log.metadata && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                            Métadonnées
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-900 text-gray-300 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
});

// Composant ReportTab - Rapport Complet avec Snapshots et Export
const ReportTab = memo(function ReportTab({ 
  metrics, 
  chartData, 
  aggregatedStats, 
  servicesList, 
  aggregatedLogs, 
  metricsHistory,
  timeRange 
}: any) {
  const { user } = useAuth();
  const [snapshots, setSnapshots] = useState<Array<{
    id: string;
    timestamp: string;
    data: any;
    name?: string;
  }>>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [metricsStats, setMetricsStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupMode, setCleanupMode] = useState<'days' | 'date' | 'all'>('days');
  const [daysToKeep, setDaysToKeep] = useState(30);
  const [beforeDate, setBeforeDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  // Charger les snapshots depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('analytics_snapshots');
      if (saved) {
        setSnapshots(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Erreur chargement snapshots:', error);
    }
  }, []);

  // Sauvegarder les snapshots dans localStorage
  const saveSnapshots = (newSnapshots: typeof snapshots) => {
    try {
      localStorage.setItem('analytics_snapshots', JSON.stringify(newSnapshots));
      setSnapshots(newSnapshots);
    } catch (error) {
      console.error('Erreur sauvegarde snapshots:', error);
    }
  };

  // Prendre un snapshot
  const takeSnapshot = () => {
    const snapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date().toISOString(),
      name: `Snapshot ${new Date().toLocaleString('fr-FR')}`,
      data: {
        metrics,
        chartData: chartData.slice(-100), // Limiter à 100 points pour économiser l'espace
        aggregatedStats,
        servicesList: servicesList.map((s: any) => ({
          name: s.name,
          status: s.status,
          responseTime: s.responseTimeMs,
          cpu: s.metrics?.cpu?.percentage,
          memory: s.metrics?.memory?.percentage
        })),
        aggregatedLogs: aggregatedLogs.slice(0, 50), // Limiter à 50 logs
        timeRange
      }
    };
    const newSnapshots = [...snapshots, snapshot];
    saveSnapshots(newSnapshots);
  };

  // Supprimer un snapshot
  const deleteSnapshot = (id: string) => {
    const newSnapshots = snapshots.filter(s => s.id !== id);
    saveSnapshots(newSnapshots);
  };

  // Préparer les données pour l'export
  const prepareExportData = () => {
    return {
      metadata: {
        generatedAt: new Date().toISOString(),
        timeRange,
        version: '1.0'
      },
      system: {
        cpu: metrics?.system?.cpu,
        memory: metrics?.system?.memory,
        load: metrics?.system?.load,
        disk: metrics?.system?.disk
      },
      performance: {
        responseTime: metrics?.responseTime,
        aggregatedStats
      },
      network: {
        network: metrics?.network,
        reliability: metrics?.health
      },
      services: servicesList.map((s: any) => ({
        name: s.name,
        status: s.status,
        responseTime: s.responseTimeMs,
        cpu: s.metrics?.cpu?.percentage,
        memory: s.metrics?.memory?.percentage,
        uptime: s.uptime
      })),
      logs: aggregatedLogs,
      history: metricsHistory.slice(-100), // Limiter l'historique
      snapshots: snapshots.map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        name: s.name
      }))
    };
  };

  // Sauvegarder le rapport dans les rapports de tests
  const saveReport = async () => {
    try {
      const data = prepareExportData();
      
      const response = await fetch('/api/analytics/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData: data })
      })

      const result = await response.json()
      if (result.success) {
        alert(`✅ Rapport analytics sauvegardé ! Accessible dans "Rapports de Tests"`)
      } else {
        alert(`❌ Erreur: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde rapport analytics:', error)
      alert('Erreur lors de la sauvegarde du rapport')
    }
  }

  // Export JSON
  const exportJSON = () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export JSON:', error);
      alert('❌ Erreur lors de l\'export JSON');
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    setIsExporting(true);
    try {
      const data = prepareExportData();
      
      // Créer plusieurs CSV pour différentes sections
      const csvSections: string[] = [];
      
      // Section Services
      csvSections.push('=== SERVICES ===');
      csvSections.push('Nom,Statut,Temps de réponse (ms),CPU (%),Mémoire (%)');
      data.services.forEach((s: any) => {
        csvSections.push([
          s.name || '',
          s.status || '',
          s.responseTime || '',
          s.cpu || '',
          s.memory || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      });
      
      csvSections.push('\n=== LOGS D\'ERREUR ===');
      csvSections.push('Date,Service,Niveau,Message');
      data.logs.forEach((log: any) => {
        csvSections.push([
          log.timestamp || '',
          log.serviceName || '',
          log.level || '',
          (log.message || '').replace(/"/g, '""')
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      });
      
      csvSections.push('\n=== SNAPSHOTS ===');
      csvSections.push('ID,Date,Nom');
      data.snapshots.forEach((s: any) => {
        csvSections.push([
          s.id || '',
          s.timestamp || '',
          s.name || ''
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      });
      
      const csvContent = csvSections.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur export CSV:', error);
      alert('❌ Erreur lors de l\'export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Export PDF (utilise window.print() pour l'instant)
  const exportPDF = () => {
    setIsExporting(true);
    try {
      // Créer une nouvelle fenêtre avec le contenu formaté pour l'impression
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('❌ Veuillez autoriser les popups pour l\'export PDF');
        setIsExporting(false);
        return;
      }
      
      const data = prepareExportData();
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rapport Analytics - ${new Date().toLocaleDateString('fr-FR')}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            h2 { color: #374151; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .section { margin: 20px 0; }
            .stat { display: inline-block; margin: 10px; padding: 10px; background: #f9fafb; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>📊 Rapport Complet Analytics</h1>
          <p><strong>Généré le:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <p><strong>Période:</strong> ${timeRange}</p>
          
          <div class="section">
            <h2>🖥️ Système</h2>
            <div class="stat"><strong>CPU:</strong> ${metrics?.system?.cpu?.usage || 'N/A'}</div>
            <div class="stat"><strong>Mémoire:</strong> ${metrics?.system?.memory?.usage || 'N/A'}</div>
            <div class="stat"><strong>Charge:</strong> ${metrics?.system?.load?.average || 'N/A'}</div>
          </div>
          
          <div class="section">
            <h2>⚡ Performances</h2>
            <div class="stat"><strong>Temps de réponse moyen:</strong> ${data.performance.responseTime?.average_ms || 'N/A'} ms</div>
            <div class="stat"><strong>Services actifs:</strong> ${data.performance.aggregatedStats?.servicesHealthy || 0} / ${data.performance.aggregatedStats?.servicesTotal || 0}</div>
          </div>
          
          <div class="section">
            <h2>🌐 Réseau & Fiabilité</h2>
            <div class="stat"><strong>Réseau RX:</strong> ${formatMb(data.network.network?.total_rx_mb)}</div>
            <div class="stat"><strong>Réseau TX:</strong> ${formatMb(data.network.network?.total_tx_mb)}</div>
            <div class="stat"><strong>Disponibilité:</strong> ${data.network.reliability?.availability_percent || 'N/A'}%</div>
          </div>
          
          <div class="section">
            <h2>🔧 Services & Logs</h2>
            <table>
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Statut</th>
                  <th>Temps de réponse</th>
                  <th>CPU</th>
                  <th>Mémoire</th>
                </tr>
              </thead>
              <tbody>
                ${data.services.map((s: any) => `
                  <tr>
                    <td>${s.name || ''}</td>
                    <td>${s.status || ''}</td>
                    <td>${s.responseTime || 'N/A'} ms</td>
                    <td>${s.cpu || 'N/A'}%</td>
                    <td>${s.memory || 'N/A'}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>❌ Erreurs Récentes</h2>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Service</th>
                  <th>Niveau</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                ${data.logs.slice(0, 20).map((log: any) => `
                  <tr>
                    <td>${log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : ''}</td>
                    <td>${log.serviceName || ''}</td>
                    <td>${log.level || ''}</td>
                    <td>${(log.message || '').substring(0, 100)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>📸 Snapshots</h2>
            <p>Nombre de snapshots: ${snapshots.length}</p>
            ${snapshots.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Nom</th>
                  </tr>
                </thead>
                <tbody>
                  ${snapshots.map((s: any) => `
                    <tr>
                      <td>${s.id}</td>
                      <td>${new Date(s.timestamp).toLocaleString('fr-FR')}</td>
                      <td>${s.name || ''}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<p>Aucun snapshot disponible</p>'}
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé avant d'imprimer
      setTimeout(() => {
        printWindow.print();
        setIsExporting(false);
      }, 500);
    } catch (error) {
      console.error('Erreur export PDF:', error);
      alert('❌ Erreur lors de l\'export PDF');
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Rapport Complet
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Rapport détaillé de toutes les métriques système, performances, réseau, services et erreurs
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={takeSnapshot}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
            >
              <Camera className="h-4 w-4" />
              Prendre un Snapshot
            </button>
            <button
              onClick={saveReport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              title="Sauvegarder le rapport dans 'Rapports de Tests'"
            >
              <FileDown className="h-4 w-4" />
              Sauvegarder Rapport
            </button>
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                disabled={isExporting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Exporter {isExporting && '...'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isExportMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 min-w-[150px]">
                    <button
                      onClick={() => {
                        exportJSON();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                      <FileDown className="h-4 w-4" />
                      JSON
                    </button>
                    <button
                      onClick={() => {
                        exportCSV();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                      <FileDown className="h-4 w-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => {
                        exportPDF();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
                    >
                      <FileDown className="h-4 w-4" />
                      PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nettoyage des métriques - SUPER_ADMIN uniquement */}
      {user?.role === 'SUPER_ADMIN' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                Nettoyage des Métriques
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Gérer le stockage des métriques en base de données (SUPER_ADMIN uniquement)
              </p>
            </div>
            <button
              onClick={async () => {
                setLoadingStats(true);
                try {
                  const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
                  const token = localStorage.getItem('token');
                  const response = await fetch(`${METRICS_URL}/api/admin/metrics/stats`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  if (response.ok) {
                    const data = await response.json();
                    setMetricsStats(data.stats);
                  }
                } catch (error) {
                  console.error('Erreur chargement stats:', error);
                } finally {
                  setLoadingStats(false);
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              {loadingStats ? 'Chargement...' : 'Actualiser Stats'}
            </button>
          </div>

          {metricsStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Système</div>
                <div className="text-lg font-bold">{metricsStats.system.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Conteneurs</div>
                <div className="text-lg font-bold">{metricsStats.containers.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Logs</div>
                <div className="text-lg font-bold">{metricsStats.logs.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
                <div className="text-lg font-bold">{metricsStats.total.toLocaleString()}</div>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowCleanupDialog(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Nettoyer les Métriques
          </button>

          {showCleanupDialog && (
            <>
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCleanupDialog(false)} />
              <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                  <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Nettoyer les Métriques</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Mode de nettoyage
                      </label>
                      <select
                        value={cleanupMode}
                        onChange={(e) => setCleanupMode(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="days">Garder les N derniers jours</option>
                        <option value="date">Supprimer avant une date</option>
                        <option value="all">Supprimer tout</option>
                      </select>
                    </div>

                    {cleanupMode === 'days' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Nombre de jours à garder
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={daysToKeep}
                          onChange={(e) => setDaysToKeep(parseInt(e.target.value) || 30)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    )}

                    {cleanupMode === 'date' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Supprimer avant cette date
                        </label>
                        <input
                          type="datetime-local"
                          value={beforeDate}
                          onChange={(e) => setBeforeDate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    )}

                    {cleanupMode === 'all' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Confirmer en tapant: <span className="font-mono text-red-600">DELETE_ALL_METRICS</span>
                        </label>
                        <input
                          type="text"
                          value={confirmDelete}
                          onChange={(e) => setConfirmDelete(e.target.value)}
                          placeholder="DELETE_ALL_METRICS"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={async () => {
                          setCleaning(true);
                          try {
                            const METRICS_URL = process.env.NEXT_PUBLIC_METRICS_URL || 'http://localhost:8014';
                            const token = localStorage.getItem('token');
                            const body: any = {};
                            
                            if (cleanupMode === 'days') {
                              body.daysToKeep = daysToKeep;
                            } else if (cleanupMode === 'date') {
                              body.beforeDate = new Date(beforeDate).toISOString();
                            } else if (cleanupMode === 'all') {
                              body.all = true;
                              body.confirm = confirmDelete;
                            }

                            const response = await fetch(`${METRICS_URL}/api/admin/metrics/cleanup`, {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify(body)
                            });

                            const data = await response.json();
                            if (response.ok) {
                              alert(`✅ ${data.message}`);
                              setShowCleanupDialog(false);
                              setMetricsStats(null);
                            } else {
                              alert(`❌ Erreur: ${data.error}`);
                            }
                          } catch (error: any) {
                            alert(`❌ Erreur: ${error.message}`);
                          } finally {
                            setCleaning(false);
                          }
                        }}
                        disabled={cleaning || (cleanupMode === 'all' && confirmDelete !== 'DELETE_ALL_METRICS')}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                      >
                        {cleaning ? 'Nettoyage...' : 'Confirmer'}
                      </button>
                      <button
                        onClick={() => {
                          setShowCleanupDialog(false);
                          setCleanupMode('days');
                          setDaysToKeep(30);
                          setBeforeDate('');
                          setConfirmDelete('');
                        }}
                        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Snapshots */}
      {snapshots.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            Snapshots ({snapshots.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                      {snapshot.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(snapshot.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSnapshot(snapshot.id)}
                    className="text-red-600 hover:text-red-700 p-1"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Services: {snapshot.data?.servicesList?.length || 0}</div>
                  <div>Logs: {snapshot.data?.aggregatedLogs?.length || 0}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Système */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Système
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">CPU</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics?.system?.cpu?.usage || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Mémoire</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics?.system?.memory?.usage || 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Charge</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatLoad(metrics?.system?.load?.average)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Disque</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics?.system?.disk?.[0]?.usage_percent ? `${metrics.system.disk[0].usage_percent}%` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Section Performances */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Gauge className="h-5 w-5" />
          Performances
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Temps de réponse moyen</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMs(metrics?.responseTime?.average_ms)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Services actifs</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {aggregatedStats?.servicesHealthy || 0} / {aggregatedStats?.servicesTotal || 0}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">CPU Moyen</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {aggregatedStats?.avgCpuUsage !== null ? `${aggregatedStats.avgCpuUsage.toFixed(1)}%` : 'N/A'}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Mémoire Totale</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMb(aggregatedStats?.totalMemoryMb)}
            </div>
          </div>
        </div>
      </div>

      {/* Section Réseau & Fiabilité */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Network className="h-5 w-5" />
          Réseau & Fiabilité
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Réseau RX</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMb(metrics?.network?.total_rx_mb)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Réseau TX</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatMb(metrics?.network?.total_tx_mb)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Disponibilité</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatPercentage(metrics?.health?.availability_percent)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Taux d'erreur</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {metrics?.errors?.rate_per_min ? `${metrics.errors.rate_per_min.toFixed(2)}/min` : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Section Services & Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Services & Logs
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Temps réponse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">CPU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Mémoire</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {servicesList.slice(0, 20).map((service: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {service.name || service.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      service.status === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      service.status === 'degraded' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {service.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatMs(service.responseTimeMs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatPercentage(service.metrics?.cpu?.percentage)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatPercentage(service.metrics?.memory?.percentage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Erreurs Récentes */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          Erreurs Récentes
        </h3>
        {aggregatedLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Niveau</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Message</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {aggregatedLogs.slice(0, 20).map((log: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString('fr-FR') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {log.serviceName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        log.level === 'ERROR' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                        log.level === 'WARN' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {log.level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="max-w-md truncate" title={log.message}>
                        {log.message || 'N/A'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p>Aucune erreur récente</p>
          </div>
        )}
      </div>
    </div>
  );
});

// Composant StatCard
const StatCard = memo(function StatCard({ icon, title, value, subtitle, color, loading, trend, trendType = 'negative-is-bad' }: any) {
  const colors: { [key: string]: string } = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  };

  // Déterminer la couleur de la tendance selon le type
  const getTrendColor = () => {
    if (trend === undefined || trend === null || trend === 0) return 'text-gray-500 dark:text-gray-400'
    
    if (trendType === 'positive-is-bad') {
      // Pour CPU, Mémoire, Temps de réponse : augmentation = mauvais (rouge), diminution = bon (vert)
      return trend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
    } else {
      // Pour Disponibilité : augmentation = bon (vert), diminution = mauvais (rouge)
      return trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    }
  }

  const formatTrend = (trendValue: number) => {
    if (Math.abs(trendValue) < 0.1) return '0.0'
    if (Math.abs(trendValue) < 1) return trendValue.toFixed(1)
    return trendValue.toFixed(0)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 relative">
      {loading && (
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colors[color] || colors.blue}`}>
          {icon}
        </div>
        {trend !== undefined && trend !== null && trend !== 0 && (
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {trend > 0 ? '↗' : '↘'} {formatTrend(Math.abs(trend))}
            {typeof trend === 'number' && Math.abs(trend) < 1 ? '%' : ''}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {title}
      </h3>
      <div className={`text-2xl font-bold text-gray-900 dark:text-gray-100 ${loading ? 'opacity-50' : ''}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
});
