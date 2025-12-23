'use client';

import React, { useEffect, useMemo, useState, useReducer, useTransition, memo, Suspense, lazy, useCallback } from 'react';
import { AdminLayout } from '@/components/features';
import { centralMetricsService } from '@/lib/services/centralMetricsService';
import preferencesService from '@/lib/services/preferencesService';
import { ChartSkeleton, BarChartSkeleton } from '@/components/ui/ChartSkeleton';
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

const formatLoad = (value?: number | string | null) => {
  if (value === undefined || value === null) return 'N/A';
  // Convertir en nombre si c'est une chaîne
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numValue) || !Number.isFinite(numValue)) return 'N/A';
  return numValue.toFixed(3);
};

const formatTimestamp = (timestamp: string, timeRange: string = '24h') => {
  // ✅ CORRECTION : Convertir le timestamp PostgreSQL (UTC) en format ISO avec 'Z' si nécessaire
  let timestampForDate = timestamp;
  if (typeof timestampForDate === 'string') {
    // Si c'est une date PostgreSQL (format: "2025-12-23 16:37:58 UTC")
    if (timestampForDate.includes(' UTC')) {
      timestampForDate = timestampForDate.replace(' UTC', 'Z');
    } else if (!timestampForDate.includes('Z') && !timestampForDate.includes('+') && !timestampForDate.includes('-', 10)) {
      // Si c'est une date ISO sans timezone, ajouter 'Z' pour UTC
      timestampForDate = timestampForDate + 'Z';
    }
  }
  
  const date = new Date(timestampForDate);
  if (Number.isNaN(date.getTime())) {
    console.warn('[ANALYTICS] ⚠️ Timestamp invalide dans formatTimestamp:', timestamp, 'timestampForDate:', timestampForDate);
    return timestamp;
  }
  
  // ✅ CORRECTION : Utiliser le timezone de l'utilisateur pour l'affichage
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: userTimezone,
    hour12: false
  };
  
  if (timeRange === '1h') {
    // Pour 1h, afficher heure:minute:seconde pour éviter les doublons
    return date.toLocaleTimeString('fr-FR', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } else if (timeRange === '6h') {
    // Pour 6h, afficher heure:minute
    return date.toLocaleTimeString('fr-FR', { ...options, hour: '2-digit', minute: '2-digit' });
  } else if (timeRange === '24h') {
    // Pour 24h, afficher heure:minute
    return date.toLocaleTimeString('fr-FR', { ...options, hour: '2-digit', minute: '2-digit' });
  } else if (timeRange === '7d') {
    // Pour 7d, afficher jour mois heure
    return date.toLocaleDateString('fr-FR', { ...options, month: 'short', day: 'numeric', hour: '2-digit' });
  } else {
    // Pour 30d, afficher jour mois
    return date.toLocaleDateString('fr-FR', { ...options, month: 'short', day: 'numeric' });
  }
};

// ✅ NOUVEAU : Fonctions utilitaires pour les couleurs (accessibles partout)
const getAvailabilityColor = (percent: number | null) => {
  if (percent === null || percent === undefined) {
    return {
      bg: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-600 dark:text-gray-400'
    }
  }
  if (percent >= 95) {
    return {
      bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-600 dark:text-green-400'
    }
  }
  if (percent >= 75) {
    return {
      bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-600 dark:text-yellow-400'
    }
  }
  if (percent >= 50) {
    return {
      bg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-600 dark:text-orange-400'
    }
  }
  return {
    bg: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400'
  }
}

const getCpuMemoryColor = (percent: number | null, isCpu: boolean = true) => {
  if (percent === null || percent === undefined) {
    return {
      bg: 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-600 dark:text-gray-400'
    }
  }
  if (percent <= 50) {
    return isCpu ? {
      bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-600 dark:text-blue-400'
    } : {
      bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-600 dark:text-green-400'
    }
  }
  if (percent <= 75) {
    return {
      bg: 'from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-600 dark:text-yellow-400'
    }
  }
  if (percent <= 90) {
    return {
      bg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-600 dark:text-orange-400'
    }
  }
  return {
    bg: 'from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-600 dark:text-red-400'
  }
}

// ✅ NOUVEAU : Variantes de formatage de l'axe X
const formatXAxisLabel = (tickItem: string, index: number, data: any[], timeRange: string, variant: 'compact' | 'detailed' | 'time-only' = 'detailed') => {
  if (!data || data.length === 0) return tickItem;
  
  // Obtenir le timestamp réel depuis les données
  const item = data[index];
  if (!item) {
    // ✅ DEBUG : Logger pour diagnostiquer
    console.warn('[ANALYTICS] ⚠️ Item non trouvé à l\'index', index, 'dans chartData de longueur', data.length);
    return tickItem;
  }
  
  // ✅ CORRECTION : Essayer plusieurs formats de timestamp
  // Priorité 1 : timestamp (nombre ou ISO string)
  // Priorité 2 : uniqueTime (ISO string)
  // Priorité 3 : time (string formatée)
  let timestamp: string | number | Date | null = null;
  
  if (item.timestamp !== undefined && item.timestamp !== null) {
    timestamp = item.timestamp;
  } else if (item.uniqueTime) {
    timestamp = item.uniqueTime;
  } else if (item.time) {
    // Si on a seulement item.time, essayer de le parser
    timestamp = item.time;
  } else {
    // ✅ DEBUG : Logger pour diagnostiquer
    console.warn('[ANALYTICS] ⚠️ Aucun timestamp trouvé dans item:', item);
    return tickItem;
  }
  
  // Convertir en Date
  let date: Date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'string') {
    // Si c'est une chaîne ISO, l'utiliser directement
    if (timestamp.includes('T') || timestamp.includes('Z') || timestamp.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(timestamp);
    } else {
      // Sinon, essayer de parser comme date locale
      date = new Date(timestamp);
    }
  } else {
    console.warn('[ANALYTICS] ⚠️ Format de timestamp inattendu:', typeof timestamp, timestamp);
    return tickItem;
  }
  
  if (Number.isNaN(date.getTime())) {
    // ✅ DEBUG : Logger l'erreur pour diagnostiquer
    console.warn('[ANALYTICS] ⚠️ Timestamp invalide après conversion:', timestamp, 'item:', item);
    return tickItem;
  }
  
  // ✅ CORRECTION : Utiliser le timezone de l'utilisateur
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options: Intl.DateTimeFormatOptions = {
    timeZone: userTimezone,
    hour12: false
  };
  
  // ✅ CORRECTION : Toujours afficher le premier et dernier point
  const isFirst = index === 0;
  const isLast = index === data.length - 1;
  
  // Calculer l'intervalle optimal pour afficher un nombre raisonnable de labels
  const totalPoints = data.length;
  let targetLabels = 8; // Nombre cible de labels à afficher
  
  // Ajuster selon la variante
  if (variant === 'compact') {
    targetLabels = Math.floor(targetLabels / 2); // Moins de labels pour version compacte
  } else if (variant === 'time-only') {
    targetLabels = targetLabels * 2; // Plus de labels pour version time-only
  }
  
  if (timeRange === '1h') targetLabels = variant === 'compact' ? 4 : variant === 'time-only' ? 12 : 6;
  else if (timeRange === '6h') targetLabels = variant === 'compact' ? 4 : variant === 'time-only' ? 12 : 6;
  else if (timeRange === '24h') targetLabels = variant === 'compact' ? 6 : variant === 'time-only' ? 24 : 12;
  else if (timeRange === '7d') targetLabels = variant === 'compact' ? 7 : variant === 'time-only' ? 28 : 14;
  else if (timeRange === '30d') targetLabels = variant === 'compact' ? 8 : variant === 'time-only' ? 30 : 15;
  
  const interval = Math.max(1, Math.floor(totalPoints / targetLabels));
  
  // ✅ CORRECTION : Toujours afficher le premier et dernier point
  // Afficher aussi les points à intervalles réguliers
  // Note: Cette logique est maintenant gérée dans renderXAxis, mais on garde cette vérification pour sécurité
  const shouldShow = isFirst || isLast || (interval > 0 && index % interval === 0);
  
  // ✅ CORRECTION : Ne jamais retourner une chaîne vide ici, car cela peut causer des problèmes avec Recharts
  // Si on ne doit pas afficher, on retourne quand même un label minimal pour éviter les bugs
  if (!shouldShow && !isFirst && !isLast) {
    // Pour les points intermédiaires non affichés, retourner une chaîne vide
    // (mais cette logique devrait être gérée dans renderXAxis)
    return '';
  }
  
  // Formater selon la variante et la période
  if (variant === 'time-only') {
    // Version simple : seulement l'heure
    if (timeRange === '1h' || timeRange === '6h' || timeRange === '24h') {
      return date.toLocaleTimeString('fr-FR', { 
        ...options,
        hour: '2-digit', 
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('fr-FR', { 
        ...options, 
        day: 'numeric', 
        month: 'short'
      });
    }
  } else if (variant === 'compact') {
    // Version compacte : format court
    if (timeRange === '1h' || timeRange === '6h') {
      return date.toLocaleTimeString('fr-FR', { 
        ...options,
        hour: '2-digit', 
        minute: '2-digit'
      });
    } else if (timeRange === '24h') {
      return date.toLocaleTimeString('fr-FR', { 
        ...options, 
        hour: '2-digit'
      });
    } else {
      return date.toLocaleDateString('fr-FR', { 
        ...options, 
        day: 'numeric', 
        month: 'short'
      });
    }
  } else {
    // Version détaillée : format complet
    if (timeRange === '1h') {
      return date.toLocaleTimeString('fr-FR', { 
        ...options,
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
    
    if (timeRange === '6h') {
      return date.toLocaleTimeString('fr-FR', { 
        ...options, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    if (timeRange === '24h') {
      return date.toLocaleTimeString('fr-FR', { 
        ...options, 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    if (timeRange === '7d') {
      return date.toLocaleDateString('fr-FR', { 
        ...options, 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit' 
      });
    }
    
    if (timeRange === '30d') {
      return date.toLocaleDateString('fr-FR', { 
        ...options, 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }
  
  return date.toLocaleTimeString('fr-FR', { ...options, hour: '2-digit', minute: '2-digit' });
};

const formatLogTimestamp = (nanoString: string) => {
  const milliseconds = Number(nanoString) / 1_000_000;
  if (!Number.isFinite(milliseconds)) return nanoString;
  return new Date(milliseconds).toLocaleString('fr-FR', { hour12: false });
};

// ✅ SYSTÈME DE COULEURS COHÉRENT pour tous les graphiques et cartes
const COLORS = {
  // Couleurs système
  primary: '#3B82F6',        // Bleu - CPU Système
  secondary: '#10B981',      // Vert - Mémoire Système
  warning: '#F59E0B',        // Orange - Mémoire Projet
  danger: '#EF4444',         // Rouge - Erreurs
  info: '#8B5CF6',           // Violet - Info
  success: '#22C55E',        // Vert clair - Disponibilité
  purple: '#A855F7',         // Violet - Charge système, Temps de réponse
  cyan: '#06B6D4',           // Cyan - Réseau
  pink: '#EC4899',           // Rose - CPU Projet
  indigo: '#6366F1',         // Indigo - Autres
  orange: '#FB923C',         // Orange clair - Autres
  
  // ✅ COULEURS SPÉCIFIQUES pour cohérence
  cpuSystem: '#3B82F6',      // Bleu - CPU Système
  cpuProject: '#EC4899',     // Rose - CPU Projet
  memorySystem: '#10B981',   // Vert - Mémoire Système
  memoryProject: '#F59E0B',  // Orange - Mémoire Projet
  availability: '#22C55E',   // Vert clair - Disponibilité
  systemLoad: '#A855F7',    // Violet - Charge système
  responseTime: '#A855F7',  // Violet - Temps de réponse
  network: '#06B6D4',        // Cyan - Réseau
  errors: '#EF4444'          // Rouge - Erreurs
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
  // ✅ OPTIMISATION : Augmenter les intervalles pour réduire CPU et mémoire
  const [analyticsRefreshInterval, setAnalyticsRefreshInterval] = useState(30000); // 30s au lieu de 15s
  const [metricsRefreshInterval, setMetricsRefreshInterval] = useState(15000); // 15s pour rafraîchissement plus fréquent
  
  // ✅ OPTIMISATION : État pour savoir si les métriques initiales sont chargées
  const [initialMetricsLoaded, setInitialMetricsLoaded] = useState(false);

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
      // ✅ CORRECTION : Charger les données immédiatement pour affichage instantané
      // 1. Charger les données fraîches depuis monitoring-c (uniquement les données essentielles au démarrage)
      try {
        // ✅ OPTIMISATION : Charger en parallèle les métriques et l'historique minimal pour affichage immédiat
        const [data, minimalHistory] = await Promise.all([
          centralMetricsService.fetchMetrics(),
          // Charger seulement les 10 derniers points pour affichage immédiat
          centralMetricsService.getMetricsHistory({ limit: 10 }).catch(() => [])
        ]);
        
        if (mounted && data) {
          setMetrics((prev: any) => {
            if (!prev) {
            // ✅ OPTIMISATION : Ne pas inclure services si pas nécessaire, mais garder servicesList (utilisé dans aggregatedStats)
            const result = { ...data };
            if (!needsServices) {
              delete result.services;
              // ✅ CORRECTION : Ne PAS supprimer servicesList car il est utilisé dans aggregatedStats même si needsServices est false
              // servicesList est nécessaire pour calculer servicesTotal et servicesHealthy
            }
            setInitialMetricsLoaded(true);
            // ✅ CORRECTION : Précharger l'historique minimal pour affichage immédiat des graphiques
            if (minimalHistory && Array.isArray(minimalHistory) && minimalHistory.length > 0) {
              setMetricsHistory(minimalHistory);
              setInitialHistoryLoaded(true);
            }
            return result;
            }
            
            // ✅ CORRECTION : Fusion intelligente qui préserve les valeurs précédentes si les nouvelles sont null/undefined/0
            const mergeMetrics = (prevValue: any, newValue: any) => {
              // Si la nouvelle valeur est valide (non-null, non-undefined), l'utiliser
              if (newValue !== null && newValue !== undefined) {
                if (typeof newValue === 'number') {
                  // Pour les nombres, accepter 0 comme valeur valide seulement si prevValue est aussi 0 ou null/undefined
                  // Sinon, préférer la nouvelle valeur si elle est > 0, ou garder l'ancienne si la nouvelle est 0
                  if (newValue === 0 && prevValue !== null && prevValue !== undefined && prevValue > 0) {
                    // Si la nouvelle valeur est 0 mais que l'ancienne était > 0, garder l'ancienne (éviter les 0.0% temporaires)
                    return prevValue;
                  }
                  return newValue;
                }
                if (typeof newValue === 'object' && !Array.isArray(newValue)) {
                  // Pour les objets, fusionner récursivement
                  if (!prevValue) return newValue;
                  const merged: any = { ...prevValue };
                  for (const key in newValue) {
                    merged[key] = mergeMetrics(prevValue[key], newValue[key]);
                  }
                  return merged;
                }
                return newValue;
              }
              // Sinon, garder la valeur précédente
              return prevValue;
            };
            
            return {
              ...prev,
              // Fusion intelligente pour chaque propriété
              system: data.system ? mergeMetrics(prev.system, data.system, 'system') : prev.system,
              containers: data.containers ? mergeMetrics(prev.containers, data.containers, 'containers') : prev.containers,
              network: data.network ? mergeMetrics(prev.network, data.network, 'network') : prev.network,
              responseTime: data.responseTime ? mergeMetrics(prev.responseTime, data.responseTime, 'responseTime') : prev.responseTime,
              errors: data.errors ? mergeMetrics(prev.errors, data.errors, 'errors') : prev.errors,
              health: data.health ? mergeMetrics(prev.health, data.health, 'health') : prev.health,
              monitoringC: data.monitoringC ? mergeMetrics(prev.monitoringC, data.monitoringC, 'monitoringC') : prev.monitoringC,
              // ✅ OPTIMISATION : Ne mettre à jour services que si nécessaire, mais toujours mettre à jour servicesList
              services: needsServices && data.services ? mergeMetrics(prev.services, data.services, 'services') : prev.services,
              // ✅ CORRECTION : Toujours mettre à jour servicesList si disponible (nécessaire pour aggregatedStats)
              servicesList: data.servicesList && Array.isArray(data.servicesList) && data.servicesList.length > 0 
                ? data.servicesList 
                : prev.servicesList
            };
          });
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur chargement métriques:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialMetricsLoaded(true);
        }
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
          // ✅ NOUVEAU : Mise à jour progressive avec merge intelligente pour éviter les "..." temporaires
          setMetrics((prev: any) => {
            if (!prev) {
            // ✅ OPTIMISATION : Ne pas inclure services si pas nécessaire, mais garder servicesList (utilisé dans aggregatedStats)
            const result = { ...data };
            if (!needsServices) {
              delete result.services;
              // ✅ CORRECTION : Ne PAS supprimer servicesList car il est utilisé dans aggregatedStats même si needsServices est false
              // servicesList est nécessaire pour calculer servicesTotal et servicesHealthy
            }
            return result;
            }
            
            // ✅ CORRECTION : Utiliser mergeMetrics pour éviter les "..." temporaires
            const mergeMetrics = (prevValue: any, newValue: any, key?: string) => {
              if (newValue !== null && newValue !== undefined) {
                if (typeof newValue === 'number') {
                  // ✅ CORRECTION : Pour project_cpu_avg et project_memory_mb, ne pas accepter 0 comme valeur valide
                  if ((key === 'project_cpu_avg' || key === 'project_memory_mb') && newValue === 0) {
                    if (prevValue !== null && prevValue !== undefined && prevValue > 0) {
                      return prevValue;
                    }
                    return null;
                  }
                  // Pour les autres nombres, accepter 0 comme valeur valide seulement si prevValue est aussi 0 ou null/undefined
                  if (newValue === 0 && prevValue !== null && prevValue !== undefined && prevValue > 0) {
                    return prevValue;
                  }
                  return newValue;
                }
                if (typeof newValue === 'object' && !Array.isArray(newValue)) {
                  if (!prevValue) return newValue;
                  const merged: any = { ...prevValue };
                  for (const objKey in newValue) {
                    merged[objKey] = mergeMetrics(prevValue[objKey], newValue[objKey], objKey);
                  }
                  return merged;
                }
                return newValue;
              }
              return prevValue;
            };
            
            return {
              ...prev,
              // Fusion intelligente pour chaque propriété
              system: data.system ? mergeMetrics(prev.system, data.system, 'system') : prev.system,
              containers: data.containers ? mergeMetrics(prev.containers, data.containers, 'containers') : prev.containers,
              network: data.network ? mergeMetrics(prev.network, data.network, 'network') : prev.network,
              responseTime: data.responseTime ? mergeMetrics(prev.responseTime, data.responseTime, 'responseTime') : prev.responseTime,
              errors: data.errors ? mergeMetrics(prev.errors, data.errors, 'errors') : prev.errors,
              health: data.health ? mergeMetrics(prev.health, data.health, 'health') : prev.health,
              monitoringC: data.monitoringC ? mergeMetrics(prev.monitoringC, data.monitoringC, 'monitoringC') : prev.monitoringC,
              // ✅ OPTIMISATION : Ne mettre à jour services que si nécessaire, mais toujours mettre à jour servicesList
              services: needsServices && data.services ? mergeMetrics(prev.services, data.services, 'services') : prev.services,
              // ✅ CORRECTION : Toujours mettre à jour servicesList si disponible (nécessaire pour aggregatedStats)
              servicesList: data.servicesList && Array.isArray(data.servicesList) && data.servicesList.length > 0 
                ? data.servicesList 
                : prev.servicesList
            };
          });
          
          // ✅ NOUVEAU : Ajouter le nouveau point à l'historique pour rafraîchir les graphiques en temps réel
          if (data && data.monitoringC) {
            const newPoint = {
              timestamp: new Date().toISOString(),
              cpu: data.monitoringC.avg_cpu_percent || data.system?.cpu?.usage_percent || 0,
              memoryPercent: data.system?.memory?.usage_percent || 0,
              memoryMb: data.system?.memory?.used_mb || 0,
              project_cpu_avg: data.monitoringC.project_cpu_avg || null,
              project_memory_mb: data.monitoringC.project_memory_mb || null,
              project_memory_percent: data.monitoringC.project_memory_mb && data.system?.memory?.total_mb
                ? (data.monitoringC.project_memory_mb / data.system.memory.total_mb) * 100
                : null,
              responseTime: data.monitoringC.avg_response_time_ms || 0,
              availability: data.monitoringC.availability_percent || data.health?.availability_percent || null,
              loadScore: data.monitoringC.load_score || 0,
              load_1: data.monitoringC.load_1 || data.system?.cpu?.load_1 || 0,
              networkRx: data.network?.total_rx_mb || 0,
              networkTx: data.network?.total_tx_mb || 0,
              errorRate: data.monitoringC.error_rate_per_min || 0
            };
            
            setMetricsHistory((prev: any[]) => {
              // ✅ CORRECTION : Ajouter seulement si le timestamp est nouveau (éviter doublons)
              // ✅ CORRECTION : Vérifier aussi par uniqueTime pour éviter les doublons
              const lastTimestamp = prev.length > 0 ? new Date(prev[prev.length - 1].timestamp).getTime() : 0
              const newTimestamp = new Date(newPoint.timestamp).getTime()
              const newUniqueTime = newPoint.uniqueTime || newPoint.timestamp
              
              // ✅ CORRECTION : Vérifier si le point existe déjà par uniqueTime (tolérance de 1 seconde)
              const exists = prev.some((p: any) => {
                const pTimestamp = new Date(p.timestamp || p.uniqueTime).getTime();
                return Math.abs(pTimestamp - newTimestamp) < 1000 || (p.uniqueTime || p.timestamp) === newUniqueTime;
              });
              
              // ✅ AMÉLIORATION : Toujours ajouter si c'est un nouveau point (même si timestamp légèrement antérieur)
              // Cela permet d'intégrer les dernières données même si elles arrivent avec un léger retard
              if (!exists) {
                const updated = [...prev, newPoint]
                // ✅ OPTIMISATION : Garder seulement les points nécessaires selon timeRange
                const maxHistoryPoints = timeRange === '1h' ? 120 : 
                                      timeRange === '6h' ? 360 : 
                                      timeRange === '24h' ? 720 : 
                                      timeRange === '7d' ? 1008 : 2100;
                // ✅ AMÉLIORATION : Trier par timestamp avant de limiter
                const sorted = updated.sort((a, b) => {
                  const aTs = new Date(a.timestamp || a.uniqueTime).getTime();
                  const bTs = new Date(b.timestamp || b.uniqueTime).getTime();
                  return aTs - bTs;
                });
                return sorted.slice(-maxHistoryPoints);
              }
              // ✅ CORRECTION : Si le point existe déjà mais avec des données différentes, le mettre à jour
              if (exists) {
                const updated = prev.map((p: any) => {
                  const pTimestamp = new Date(p.timestamp || p.uniqueTime).getTime();
                  if (Math.abs(pTimestamp - newTimestamp) < 1000 || (p.uniqueTime || p.timestamp) === newUniqueTime) {
                    return { ...p, ...newPoint }; // Mettre à jour le point existant avec les nouvelles données
                  }
                  return p;
                });
                return updated;
              }
              return prev
            });
          }
        }
      } catch (error) {
        console.error('[ANALYTICS] ⚠️ Erreur actualisation métriques:', error);
      } finally {
        setRefreshing(false);
      }
    }, analyticsRefreshInterval || 45000); // ⚡ Rafraîchir selon les préférences utilisateur (défaut 45s)

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
          // ✅ CORRECTION : Vérifier si on a déjà des données en cache (sessionStorage) pour éviter de tout recharger
          const cachedHistoryKey = `analytics_history_${timeRange}`;
          // ✅ DEBUG : Vérifier si on doit forcer le nettoyage du cache (vérifier un flag)
          const forceClearCache = typeof window !== 'undefined' ? sessionStorage.getItem('force_clear_analytics_cache') : null;
          if (forceClearCache === 'true') {
            console.log('[ANALYTICS] 🧹 Nettoyage forcé du cache analytics');
            if (typeof window !== 'undefined') {
              // Nettoyer tous les caches analytics
              Object.keys(sessionStorage).forEach(key => {
                if (key.startsWith('analytics_history_') || 
                    key.startsWith('backoffice_services_metrics') || 
                    key.startsWith('aggregated_logs_')) {
                  sessionStorage.removeItem(key);
                }
              });
              sessionStorage.removeItem('force_clear_analytics_cache');
            }
          }
          const cachedHistory = typeof window !== 'undefined' && !forceClearCache ? sessionStorage.getItem(cachedHistoryKey) : null;
          let existingHistory: any[] = [];
          
          if (cachedHistory && !forceClearCache) {
            try {
              existingHistory = JSON.parse(cachedHistory);
              // Vérifier que les données en cache sont valides (timestamps valides)
              existingHistory = existingHistory.filter((item: any) => {
                const date = new Date(item.timestamp);
                return !Number.isNaN(date.getTime());
              });
              
              if (existingHistory.length > 0) {
                console.log(`[ANALYTICS] 📦 ${existingHistory.length} points récupérés du cache`);
                // Utiliser les données en cache immédiatement
                setMetricsHistory(existingHistory);
                const lastTimestamp = new Date(existingHistory[existingHistory.length - 1].timestamp).getTime();
                setLastHistoryTimestamp(lastTimestamp);
                setInitialHistoryLoaded(true);
              }
            } catch (e) {
              console.warn('[ANALYTICS] ⚠️ Erreur parsing cache:', e);
            }
          }
          
          // ✅ CORRECTION : Augmenter la limite pour récupérer plus de points selon timeRange
          const limit = timeRange === '1h' ? 120 : 
                       timeRange === '6h' ? 360 : 
                       timeRange === '24h' ? 720 : 
                       timeRange === '7d' ? 1008 : 2100;
          const history = await centralMetricsService.getMetricsHistory({
            limit,
            startTime,
            endTime
          });

          if (mounted) {
            // ✅ CORRECTION : Préserver les points existants jusqu'à ce que les nouveaux arrivent
            // Si history est vide, garder existingHistory
            if (!history || !Array.isArray(history) || history.length === 0) {
              if (existingHistory.length > 0) {
                console.log(`[ANALYTICS] ⚠️ Aucune nouvelle donnée, conservation de ${existingHistory.length} points du cache`);
                setMetricsHistory(existingHistory);
                setInitialHistoryLoaded(true);
              }
              return;
            }
            
            // ✅ CORRECTION : Fusionner avec les données en cache au lieu de les remplacer
            const allHistory = existingHistory.length > 0 
              ? [...existingHistory, ...history]
              : history;
            
            // ✅ OPTIMISATION : Trier par timestamp et limiter immédiatement à 500 points
            const sortedHistory = [...allHistory].sort((a, b) => {
              const dateA = new Date(a.timestamp);
              const dateB = new Date(b.timestamp);
              if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) return 0;
              return dateA.getTime() - dateB.getTime();
            });
            
            // ✅ CORRECTION : Supprimer les doublons basés sur le timestamp
            const uniqueHistory = sortedHistory.reduce((acc: any[], item: any) => {
              const timestamp = new Date(item.timestamp).getTime();
              if (!Number.isNaN(timestamp)) {
                const exists = acc.find((existing: any) => 
                  new Date(existing.timestamp).getTime() === timestamp
                );
                if (!exists) {
                  acc.push(item);
                }
              }
              return acc;
            }, []);
            
            // ✅ CORRECTION : Limiter selon timeRange pour garder plus de points
            const maxHistoryPoints = timeRange === '1h' ? 120 : 
                                    timeRange === '6h' ? 360 : 
                                    timeRange === '24h' ? 720 : 
                                    timeRange === '7d' ? 1008 : 2100;
            const limitedHistory = uniqueHistory.slice(-maxHistoryPoints);
            
            console.log(`[ANALYTICS] ✅ ${limitedHistory.length} points d'historique chargés (${existingHistory.length} du cache + ${history.length} nouveaux)`);
            setMetricsHistory(limitedHistory);
            
            // ✅ CORRECTION : Sauvegarder dans le cache pour le prochain rechargement
            if (typeof window !== 'undefined') {
              try {
                sessionStorage.setItem(cachedHistoryKey, JSON.stringify(limitedHistory));
              } catch (e) {
                console.warn('[ANALYTICS] ⚠️ Erreur sauvegarde cache:', e);
              }
            }
            
            // Stocker le dernier timestamp pour les chargements incrémentaux
            const lastTimestamp = new Date(limitedHistory[limitedHistory.length - 1].timestamp).getTime();
            setLastHistoryTimestamp(lastTimestamp);
            setInitialHistoryLoaded(true);
            console.log('[ANALYTICS] ✅ initialHistoryLoaded mis à true');
          } else if (mounted) {
            // ✅ CORRECTION : Même si l'historique est vide, marquer comme chargé pour éviter le skeleton infini
            // Mais garder les données en cache si elles existent
            if (existingHistory.length > 0) {
              console.log(`[ANALYTICS] ⚠️ Aucune nouvelle donnée, utilisation du cache (${existingHistory.length} points)`);
            } else {
              console.warn('[ANALYTICS] ⚠️ Aucune donnée historique disponible (history:', history, ')');
            }
            setInitialHistoryLoaded(true);
            console.log('[ANALYTICS] ✅ initialHistoryLoaded mis à true (historique vide)');
          }
        } else {
          // ✅ CORRECTION : Chargement incrémental avec plus de points selon timeRange
          const incrementalLimit = timeRange === '1h' ? 60 : 
                                   timeRange === '6h' ? 120 : 
                                   timeRange === '24h' ? 180 : 
                                   timeRange === '7d' ? 252 : 420;
          const incrementalHistory = await centralMetricsService.getMetricsHistory({
            limit: incrementalLimit,
            startTime: lastHistoryTimestamp! + 1, // +1 pour éviter les doublons
            endTime
          });

          if (mounted && incrementalHistory && Array.isArray(incrementalHistory) && incrementalHistory.length > 0) {
            // ✅ OPTIMISATION : Fusionner avec l'historique existant avec vérifications intelligentes
            // ✅ CORRECTION : Préserver les points existants jusqu'à ce que les nouveaux arrivent
            setMetricsHistory(prev => {
              // ✅ CORRECTION : Ne jamais vider prev, toujours fusionner
              if (!prev || prev.length === 0) {
                return incrementalHistory;
              }
              
              // ✅ CORRECTION : Fusionner intelligemment les nouvelles données avec les anciennes
              // Créer un Map pour dédupliquer par timestamp (tolérance de 1 seconde)
              const mergedMap = new Map<number, any>();
              
              // Ajouter tous les points existants
              prev.forEach((point: any) => {
                const ts = new Date(point.timestamp).getTime();
                if (!isNaN(ts) && ts > 0) {
                  // Arrondir à la seconde pour dédupliquer
                  const roundedTs = Math.floor(ts / 1000) * 1000;
                  mergedMap.set(roundedTs, point);
                }
              });
              
              // Ajouter les nouveaux points (remplacer les anciens si timestamp identique)
              incrementalHistory.forEach((point: any) => {
                const ts = new Date(point.timestamp).getTime();
                if (!isNaN(ts) && ts > 0) {
                  const roundedTs = Math.floor(ts / 1000) * 1000;
                  // Si le point existe déjà, garder le plus récent ou celui avec le meilleur timestamp ISO
                  const existing = mergedMap.get(roundedTs);
                  if (!existing || new Date(point.timestamp).getTime() >= new Date(existing.timestamp).getTime()) {
                    mergedMap.set(roundedTs, point);
                  }
                }
              });
              
              // Convertir le Map en array et trier
              const merged = Array.from(mergedMap.values()).sort((a, b) => {
                const tsA = new Date(a.timestamp).getTime();
                const tsB = new Date(b.timestamp).getTime();
                return tsA - tsB;
              });
              
              // ✅ CORRECTION : Limiter selon timeRange, mais garder tous les points récents
              const maxHistoryPoints = timeRange === '1h' ? 120 : 
                                      timeRange === '6h' ? 360 : 
                                      timeRange === '24h' ? 720 : 
                                      timeRange === '7d' ? 1008 : 2100;
              
              // Garder les N derniers points (les plus récents)
              const limited = merged.slice(-maxHistoryPoints);
              
              // ✅ CORRECTION : Sauvegarder dans le cache pour le prochain rechargement
              if (typeof window !== 'undefined') {
                try {
                  const cachedHistoryKey = `analytics_history_${timeRange}`;
                  sessionStorage.setItem(cachedHistoryKey, JSON.stringify(limited));
                } catch (e) {
                  console.warn('[ANALYTICS] ⚠️ Erreur sauvegarde cache:', e);
                }
              }
              
              // Mettre à jour le dernier timestamp
              const lastTimestamp = new Date(limited[limited.length - 1].timestamp).getTime();
              setLastHistoryTimestamp(lastTimestamp);
              
              console.log(`[ANALYTICS] 🔄 Fusion incrémentale: ${prev.length} anciens + ${incrementalHistory.length} nouveaux = ${merged.length} totaux → ${limited.length} après limite`);
              
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

    // ✅ CORRECTION : Charger l'historique initial seulement si pas déjà chargé
    if (!initialHistoryLoaded || metricsHistory.length === 0) {
      loadHistory(true);
    }
    
    // Ensuite, chargement incrémental périodique (optimisé pour économiser CPU/mémoire)
    const interval = setInterval(() => {
      // ✅ OPTIMISATION : Ne charger l'historique que si la page est visible et si on a besoin de plus de données
      if (document.visibilityState === 'visible' && !document.hidden && initialHistoryLoaded) {
        // ✅ OPTIMISATION : Charger seulement si on n'a pas assez de points pour le timeRange actuel
        const minPointsNeeded = timeRange === '1h' ? 60 : 
                              timeRange === '6h' ? 180 : 
                              timeRange === '24h' ? 360 : 
                              timeRange === '7d' ? 504 : 1050;
        if (metricsHistory.length < minPointsNeeded) {
          loadHistory(false);
        }
      }
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
        
          // ✅ CORRECTION : Utiliser log-collector-c au lieu de metrics-aggregator
          const LOG_COLLECTOR_URL = process.env.NEXT_PUBLIC_LOG_COLLECTOR_URL || 'http://localhost:5099';
          // ✅ OPTIMISATION : Rafraîchir en arrière-plan avec limite réduite
        fetch(`${LOG_COLLECTOR_URL}/api/v1/logs?limit=50&level=ERROR`, {
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
        // ✅ CORRECTION : Utiliser log-collector-c au lieu de metrics-aggregator
        const LOG_COLLECTOR_URL = process.env.NEXT_PUBLIC_LOG_COLLECTOR_URL || 'http://localhost:5099';
        // ✅ OPTIMISATION : Réduire la limite de logs de 100 à 50 pour économiser la mémoire
        const response = await fetch(`${LOG_COLLECTOR_URL}/api/v1/logs?limit=50&level=ERROR`, {
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
  // ✅ CORRECTION : Utiliser metrics.system.memory.total_mb pour calculer project_memory_percent
  const chartData = useMemo(() => {
    if (!metricsHistory || metricsHistory.length === 0) {
      console.log('[ANALYTICS] ⚠️ metricsHistory est vide, chartData sera vide');
      return [];
    }
    
    console.log(`[ANALYTICS] 📊 Préparation de chartData depuis ${metricsHistory.length} points d'historique`);
    
    // ✅ DEBUG : Afficher les premières valeurs de metricsHistory pour diagnostiquer
    if (metricsHistory.length > 0) {
      const firstHistoryItem = metricsHistory[0];
      console.log('[ANALYTICS] 🔍 Premier point de metricsHistory:', {
        timestamp: firstHistoryItem.timestamp,
        project_cpu_avg: firstHistoryItem.project_cpu_avg,
        project_memory_mb: firstHistoryItem.project_memory_mb,
        cpu: firstHistoryItem.cpu,
        cpu_percent: firstHistoryItem.cpu_percent,
        memory_percent: firstHistoryItem.memory_percent
      });
    }
    
    // ✅ NOUVEAU : Récupérer total_memory_mb depuis metrics pour calculer project_memory_percent
    const systemTotalMemoryMb = metrics?.system?.memory?.total_mb 
      ? Number(metrics.system.memory.total_mb) 
      : null;
    
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
    
    // ✅ CORRECTION : Ne plus créer de points vides artificiels - utiliser directement les données
    // Seulement limiter si vraiment trop de points (> 2000)
    const maxPoints = 2000;
    let dataToUse = sortedHistory;
    if (sortedHistory.length > maxPoints) {
      const step = Math.ceil(sortedHistory.length / maxPoints);
      const indices: number[] = [];
      for (let i = 0; i < sortedHistory.length; i += step) {
        indices.push(i);
      }
      if (indices[indices.length - 1] !== sortedHistory.length - 1) {
        indices.push(sortedHistory.length - 1);
      }
      dataToUse = indices.map(i => sortedHistory[i]);
    }
    
    const filledData = dataToUse;
    
    // ✅ OPTIMISATION : Utiliser map avec réutilisation des valeurs calculées, puis filtrer les null
    return filledData.map((item: any) => {
      // ✅ CORRECTION : Convertir le timestamp en Date valide
      let timestamp: Date;
      // Si c'est un point vide créé, item.timestamp est déjà un nombre
      if (typeof item.timestamp === 'number') {
        timestamp = new Date(item.timestamp);
      } else if (item.timestamp) {
        timestamp = new Date(item.timestamp);
        // Si le timestamp est invalide, utiliser la date actuelle
        if (Number.isNaN(timestamp.getTime())) {
          console.warn('[ANALYTICS] ⚠️ Timestamp invalide:', item.timestamp, 'utilisation de la date actuelle');
          timestamp = new Date();
        }
      } else {
        timestamp = new Date();
      }
      
      // ✅ CORRECTION : Ne pas créer de points vides, filtrer les points invalides
      // Si c'est un point vide (créé artificiellement), ne pas l'inclure
      if (item.cpu === null && item.memoryPercent === null && item.memoryMb === null && 
          item.project_cpu_avg === null && item.project_memory_mb === null) {
        return null; // Filtrer au lieu de retourner
      }
      
      // ✅ CORRECTION : Calculer le trafic réseau global en sommant tous les services
      // Si network_rx_mb et network_tx_mb ne sont pas disponibles, les calculer depuis les services
      let networkRx = toNumber(item.network_rx_mb, 0);
      let networkTx = toNumber(item.network_tx_mb, 0);
      
      // ✅ CORRECTION : Si les valeurs globales sont à 0 ou absentes, essayer de les calculer depuis les services
      // Vérifier d'abord si on a des données de conteneurs dans l'historique
      if ((networkRx === 0 && networkTx === 0)) {
        // Essayer depuis item.services (format depuis metrics-aggregator)
        if (item.services && Array.isArray(item.services)) {
          networkRx = item.services.reduce((sum: number, s: any) => {
            return sum + toNumber(s.network_rx_mb || s.network?.rx_mb || (s.network?.rx_bytes ? s.network.rx_bytes / 1024 / 1024 : 0) || (s.network_rx_bytes ? Number(s.network_rx_bytes) / 1024 / 1024 : 0), 0);
          }, 0);
          networkTx = item.services.reduce((sum: number, s: any) => {
            return sum + toNumber(s.network_tx_mb || s.network?.tx_mb || (s.network?.tx_bytes ? s.network.tx_bytes / 1024 / 1024 : 0) || (s.network_tx_bytes ? Number(s.network_tx_bytes) / 1024 / 1024 : 0), 0);
          }, 0);
        }
        // Essayer depuis item.containers (format depuis monitoring-c)
        else if (item.containers && Array.isArray(item.containers)) {
          networkRx = item.containers.reduce((sum: number, c: any) => {
            return sum + toNumber(c.network_rx_mb || (c.network_rx_bytes ? Number(c.network_rx_bytes) / 1024 / 1024 : 0), 0);
          }, 0);
          networkTx = item.containers.reduce((sum: number, c: any) => {
            return sum + toNumber(c.network_tx_mb || (c.network_tx_bytes ? Number(c.network_tx_bytes) / 1024 / 1024 : 0), 0);
          }, 0);
        }
      }
      
      // Créer un timestamp unique pour éviter les doublons
      // Utiliser timestamp ISO complet pour garantir l'unicité
      const uniqueTime = timestamp.toISOString();
      
      // S'assurer que toutes les valeurs sont des nombres valides (pas NaN, pas Infinity)
      // ✅ CORRECTION : CPU Système (utiliser item.cpu ou item.cpu_percent, PAS project_cpu_avg)
      const cpu = item.cpu !== undefined && item.cpu !== null
        ? toNumber(item.cpu, null)
        : item.cpu_percent !== undefined && item.cpu_percent !== null
        ? toNumber(item.cpu_percent, null)
        : null;
      
      // ✅ CORRECTION : Séparer mémoire en pourcentage et MB
      // Pour le graphique CPU & Mémoire, on utilise le pourcentage
      const memoryPercent = toNumber(item.memory_percent, 0);
      // Pour un graphique séparé de mémoire en MB, on utilise project_memory_mb
      const memoryMb = item.project_memory_mb !== undefined && item.project_memory_mb !== null
        ? toNumber(item.project_memory_mb, 0)
        : null; // Si pas disponible, null pour ne pas afficher
      
      const responseTime = toNumber(item.response_time_avg || item.avg_response_time_ms, 0)
      const errorRate = toNumber(item.error_rate, 0)
      // ✅ CORRECTION : Ne pas utiliser 100 comme valeur par défaut pour availability
      // Utiliser null si pas disponible pour détecter les problèmes de calcul
      const availability = item.availability_percent !== undefined && item.availability_percent !== null
        ? toNumber(item.availability_percent, null)
        : null
      const loadScore = toNumber(item.load_score || item.overallLoadScore, 0)
      
      // ✅ CORRECTION : Utiliser le timestamp directement (déjà en UTC depuis PostgreSQL)
      // Le timestamp est stocké en UTC dans PostgreSQL (format: 2025-12-23 16:37:58 UTC)
      // On doit le convertir en ISO string avec 'Z' pour garantir l'interprétation UTC
      let timestampForDisplay = item.timestamp;
      if (typeof timestampForDisplay === 'string') {
        // Si c'est une date PostgreSQL (format: "2025-12-23 16:37:58 UTC" ou "2025-12-23T16:37:58.000Z")
        if (timestampForDisplay.includes(' UTC')) {
          timestampForDisplay = timestampForDisplay.replace(' UTC', 'Z');
        } else if (!timestampForDisplay.includes('Z') && !timestampForDisplay.includes('+') && !timestampForDisplay.includes('-', 10)) {
          // Si c'est une date ISO sans timezone, ajouter 'Z' pour UTC
          timestampForDisplay = timestampForDisplay + 'Z';
        }
      }
      
      const timestampDate = new Date(timestampForDisplay);
      
      return {
        time: formatTimestamp(timestampForDisplay, timeRange),
        timestamp: timestampDate.getTime(), // Timestamp numérique pour tri (UTC)
        uniqueTime: uniqueTime, // Timestamp ISO unique pour éviter doublons
        cpu: Number.isFinite(cpu) ? cpu : null,
        memoryPercent: Number.isFinite(memoryPercent) ? memoryPercent : null,
        memoryMb: memoryMb !== null && Number.isFinite(memoryMb) ? memoryMb : null,
        networkRx: Number.isFinite(networkRx) && networkRx > 0 ? networkRx : null,
        networkTx: Number.isFinite(networkTx) && networkTx > 0 ? networkTx : null,
        responseTime: Number.isFinite(responseTime) ? responseTime : null,
        errorRate: Number.isFinite(errorRate) ? errorRate : null,
        availability: Number.isFinite(availability) ? availability : null,
        loadScore: Number.isFinite(loadScore) ? loadScore : null,
        // ✅ NOUVEAU : Inclure les valeurs brutes pour référence
        // ✅ NOUVEAU : Inclure les valeurs brutes pour référence et affichage dans les graphiques
        // ✅ DEBUG : Vérifier plusieurs formats possibles et accepter 0 comme valeur valide
        project_cpu_avg: (() => {
          const value = item.project_cpu_avg !== undefined && item.project_cpu_avg !== null
            ? item.project_cpu_avg
            : (item.projectCpuAvg !== undefined && item.projectCpuAvg !== null
              ? item.projectCpuAvg
              : null);
          return value !== null && value !== undefined ? Number(value) : null;
        })(),
        project_memory_mb: (() => {
          const value = item.project_memory_mb !== undefined && item.project_memory_mb !== null
            ? item.project_memory_mb
            : (item.projectMemoryMb !== undefined && item.projectMemoryMb !== null
              ? item.projectMemoryMb
              : null);
          return value !== null && value !== undefined ? Number(value) : null;
        })(),
        // ✅ NOUVEAU : Calculer le pourcentage de mémoire projet si disponible
        project_memory_percent: (() => {
          // Priorité 1 : project_memory_percent directement disponible
          if (item.project_memory_percent !== undefined && item.project_memory_percent !== null) {
            return Number(item.project_memory_percent);
          }
          // Priorité 2 : Calculer depuis project_memory_mb et total_memory_mb (depuis item ou metrics)
          // ✅ CORRECTION : Essayer plusieurs sources pour totalMemory (memory_total_mb, total_memory_mb, systemTotalMemoryMb)
          const totalMemory = (item.memory_total_mb !== undefined && item.memory_total_mb !== null && Number(item.memory_total_mb) > 0)
            ? Number(item.memory_total_mb)
            : (item.total_memory_mb !== undefined && item.total_memory_mb !== null && Number(item.total_memory_mb) > 0)
            ? Number(item.total_memory_mb)
            : (systemTotalMemoryMb !== null && systemTotalMemoryMb !== undefined && systemTotalMemoryMb > 0)
            ? systemTotalMemoryMb
            : null;
          
          if (item.project_memory_mb !== undefined && item.project_memory_mb !== null && totalMemory !== null && totalMemory > 0) {
            const projectMemoryMb = Number(item.project_memory_mb);
            if (Number.isFinite(projectMemoryMb) && projectMemoryMb >= 0) {
              const percent = (projectMemoryMb / totalMemory) * 100;
              return Number.isFinite(percent) && percent >= 0 ? percent : null;
            }
          }
          return null;
        })()
      };
    }).filter((item: any) => item !== null); // Filtrer les points vides
  }, [metricsHistory, timeRange, metrics?.system?.memory?.total_mb]);
  
  // ✅ DEBUG : Logger chartData pour diagnostiquer
  useEffect(() => {
    if (chartData.length > 0) {
      console.log(`[ANALYTICS] ✅ chartData préparé: ${chartData.length} points`, {
        first: {
          ...chartData[0],
          timestampType: typeof chartData[0].timestamp,
          timestampValue: chartData[0].timestamp,
          uniqueTime: chartData[0].uniqueTime,
          time: chartData[0].time
        },
        last: {
          ...chartData[chartData.length - 1],
          timestampType: typeof chartData[chartData.length - 1].timestamp,
          timestampValue: chartData[chartData.length - 1].timestamp,
          uniqueTime: chartData[chartData.length - 1].uniqueTime,
          time: chartData[chartData.length - 1].time
        },
        sample: chartData.slice(0, 3).map((d: any) => ({ 
          timestamp: d.timestamp, 
          timestampType: typeof d.timestamp,
          uniqueTime: d.uniqueTime,
          time: d.time,
          cpu: d.cpu,
          project_cpu_avg: d.project_cpu_avg,
          memoryPercent: d.memoryPercent,
          project_memory_mb: d.project_memory_mb,
          project_memory_percent: d.project_memory_percent, 
          cpu: d.cpu, 
          memory: d.memoryPercent, 
          networkRx: d.networkRx 
        }))
      });
    } else {
      console.warn('[ANALYTICS] ⚠️ chartData est vide');
    }
  }, [chartData.length]);

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

    // ✅ CORRECTION : S'assurer que servicesList est toujours un tableau valide
    const servicesList = Array.isArray(metrics.servicesList) && metrics.servicesList.length > 0
      ? metrics.servicesList
      : (metrics.services && typeof metrics.services === 'object' && !Array.isArray(metrics.services))
      ? Object.values(metrics.services)
      : [];

    // ✅ Utiliser les données des conteneurs (source fiable)
    let avgCpuUsage = null;
    let totalMemoryMb = null;
    
    // ✅ CORRECTION : Priorité 1: Données du monitoring C (avg_cpu_percent, avg_memory_percent directement)
    // Vérifier aussi dans monitoringC si disponible
    if (metrics.monitoringC?.avg_cpu_percent !== undefined) {
      avgCpuUsage = Number(metrics.monitoringC.avg_cpu_percent);
    } else if (metrics.avg_cpu_percent !== undefined) {
      avgCpuUsage = Number(metrics.avg_cpu_percent);
    }
    // ✅ CORRECTION : Vérifier aussi dans monitoringC si disponible
    if (metrics.monitoringC?.avg_memory_percent !== undefined) {
      // avg_memory_percent est un pourcentage, on doit calculer la mémoire totale
      if (metrics.memory?.total_mb) {
        totalMemoryMb = Number(metrics.memory.total_mb) * (Number(metrics.monitoringC.avg_memory_percent) / 100);
      } else if (metrics.memory?.used_mb) {
        totalMemoryMb = Number(metrics.memory.used_mb);
      }
    } else if (metrics.avg_memory_percent !== undefined) {
      // avg_memory_percent est un pourcentage, on doit calculer la mémoire totale
      // Utiliser memory.total_mb et memory.usage_percent si disponibles
      if (metrics.memory?.total_mb) {
        totalMemoryMb = Number(metrics.memory.total_mb) * (Number(metrics.avg_memory_percent) / 100);
      } else if (metrics.memory?.used_mb) {
        totalMemoryMb = Number(metrics.memory.used_mb);
      }
    }
    
    // Priorité 1b: Données conteneurs (si disponibles dans containers)
    // Note: metrics.containers peut être un objet ou un tableau selon l'interface
    if (avgCpuUsage === null && metrics.containers && typeof metrics.containers === 'object' && !Array.isArray(metrics.containers)) {
      const containers = metrics.containers as any;
      // Chercher des données agrégées dans les conteneurs
      if (containers.cpu?.averagePercent !== undefined) {
        avgCpuUsage = Number(containers.cpu.averagePercent);
      }
      if (totalMemoryMb === null && containers.memory?.used !== undefined) {
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

    // ✅ CORRECTION : Récupérer le trafic réseau depuis monitoring C ou network
    const totalNetworkRxMb = metrics.network?.total_rx_mb !== undefined && metrics.network.total_rx_mb > 0
      ? toNumber(metrics.network.total_rx_mb, 0)
      : servicesList.length > 0
      ? servicesList.reduce((sum, s: any) => sum + toNumber(s.metrics?.network?.rx_mb || s.networkMb?.rx || s.network?.rx_mb, 0), 0)
      : 0;
      
    const totalNetworkTxMb = metrics.network?.total_tx_mb !== undefined && metrics.network.total_tx_mb > 0
      ? toNumber(metrics.network.total_tx_mb, 0)
      : servicesList.length > 0
      ? servicesList.reduce((sum, s: any) => sum + toNumber(s.metrics?.network?.tx_mb || s.networkMb?.tx || s.network?.tx_mb, 0), 0)
      : 0;
      
    const totalNetworkMb = totalNetworkRxMb + totalNetworkTxMb;

    // ✅ CORRECTION : Compter les services sains (healthy, running, online)
    // Utiliser d'abord les données de monitoringC si disponibles
    let servicesTotal = 0;
    let servicesHealthy = 0;
    
    if (metrics.monitoringC?.services_total !== undefined && metrics.monitoringC.services_total > 0) {
      servicesTotal = metrics.monitoringC.services_total;
      servicesHealthy = metrics.monitoringC.services_healthy || 0;
    } else if (servicesList.length > 0) {
      servicesTotal = servicesList.length;
      // Un service est sain s'il a un status running/healthy/online OU un healthStatus online/healthy
      // OU s'il a un http_status === 200 OU s'il a des métriques CPU/mémoire > 0
      // OU s'il a un responseTimeMs valide (> 0 et < 10000ms)
      servicesHealthy = servicesList.filter((s: any) => {
        // Priorité 1 : Status explicite
        if (s.status === 'healthy' || s.status === 'running' || s.status === 'online' || s.status === 'active') {
          return true;
        }
        // Priorité 2 : HealthStatus
        if (s.healthStatus === 'online' || s.healthStatus === 'healthy' || s.healthStatus === 'active') {
          return true;
        }
        // Priorité 3 : HTTP status 200
        if (s.http_status === 200 || s.httpStatus === 200 || s.statusCode === 200) {
          return true;
        }
        // Priorité 4 : Temps de réponse valide (service répond)
        if (s.responseTimeMs && typeof s.responseTimeMs === 'number' && s.responseTimeMs > 0 && s.responseTimeMs < 10000) {
          return true;
        }
        // Priorité 5 : Métriques disponibles (CPU ou mémoire > 0)
        if ((s.metrics?.cpu?.percentage && s.metrics.cpu.percentage > 0) ||
            (s.metrics?.memory?.usageMb && s.metrics.memory.usageMb > 0) ||
            (s.cpu_percent && s.cpu_percent > 0) ||
            (s.memory_mb && s.memory_mb > 0)) {
          return true;
        }
        return false;
      }).length;
    }
    
    const healthyCount = servicesHealthy;
    const degradedCount = servicesList.filter((s: any) => 
      s.status === 'degraded' || 
      s.healthStatus === 'degraded'
    ).length;
    const offlineCount = servicesList.filter((s: any) => 
      s.status === 'offline' || 
      s.status === 'unknown' ||
      s.status === 'stopped' ||
      s.healthStatus === 'offline'
    ).length;

    // ✅ CORRECTION : Récupérer le temps de réponse depuis monitoring C en priorité
    let avgResponseTime = metrics.monitoringC?.avg_response_time_ms !== undefined
      ? toNumber(metrics.monitoringC.avg_response_time_ms, 0)
      : (metrics.responseTime?.average_ms !== undefined 
        ? toNumber(metrics.responseTime.average_ms, 0)
        : null);
    
    // Fallback : calculer depuis les services si pas disponible
    if (avgResponseTime === null) {
      const responseTimes = servicesList
        .map((s: any) => s.responseTimeMs || s.response_time_ms)
        .filter((rt): rt is number => typeof rt === 'number' && rt > 0);
      
      if (responseTimes.length > 0) {
        avgResponseTime = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length;
      }
    }

    // ✅ CORRECTION : Utiliser error_rate_per_min depuis monitoring-c si disponible
    const totalErrors = metrics?.monitoringC?.error_rate_per_min !== undefined
      ? Math.round(metrics.monitoringC.error_rate_per_min * 5) // Approximation sur 5 min
      : servicesList.reduce((sum, s: any) => 
          sum + toNumber(s.errorCount5m, 0), 0);
    const avgErrorRate = metrics?.monitoringC?.error_rate_per_min !== undefined
      ? metrics.monitoringC.error_rate_per_min
      : (metrics?.errors?.rate_per_min !== undefined
        ? toNumber(metrics.errors.rate_per_min, 0)
        : servicesList.reduce((sum, s: any) => sum + toNumber(s.errorRatePerMin, 0), 0));

    return {
      servicesTotal: servicesTotal || servicesList.length,
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
  
  // ✅ CORRECTION : Calculer les tendances en pourcentage pour éviter NaN
  const cpuTrend = last30Points.length > 0 && aggregatedStats.avgCpuUsage !== null
    ? aggregatedStats.avgCpuUsage - (last30Points.reduce((sum: number, d: any) => sum + (d.cpu || 0), 0) / last30Points.length)
    : 0
  
  // ✅ CORRECTION : Comparer les pourcentages de mémoire, pas les MB
  const currentMemoryPercent = metrics?.system?.memory?.usage_percent !== undefined
    ? metrics.system.memory.usage_percent
    : (aggregatedStats.totalMemoryMb !== null && metrics?.system?.memory?.total_mb
      ? (aggregatedStats.totalMemoryMb / metrics.system.memory.total_mb) * 100
      : null)
  const avgMemoryPercent = last30Points.length > 0
    ? last30Points.reduce((sum: number, d: any) => sum + (d.memoryPercent || d.memory || 0), 0) / last30Points.length
    : 0
  const memoryTrend = currentMemoryPercent !== null && avgMemoryPercent > 0
    ? currentMemoryPercent - avgMemoryPercent
    : 0
  
  // ✅ CORRECTION : Calculer la tendance du temps de réponse
  const avgResponseTimeHistory = last30Points.length > 0
    ? last30Points.reduce((sum: number, d: any) => sum + (d.responseTime || 0), 0) / last30Points.length
    : 0
  const responseTimeTrend = aggregatedStats.avgResponseTime !== null && avgResponseTimeHistory > 0
    ? aggregatedStats.avgResponseTime - avgResponseTimeHistory
    : 0
  
  // ✅ NOUVEAU : Calculer les tendances pour les cartes projet
  const projectCpuAvg = metrics?.monitoringC?.project_cpu_avg !== undefined
    ? metrics.monitoringC.project_cpu_avg
    : metrics?.system?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined
    ? metrics.system.jobbingtrack.containers.cpu.averagePercent
    : null
  const avgProjectCpu = last30Points.length > 0
    ? last30Points.reduce((sum: number, d: any) => sum + (d.project_cpu_avg || 0), 0) / last30Points.length
    : 0
  const projectCpuTrend = projectCpuAvg !== null && avgProjectCpu > 0
    ? projectCpuAvg - avgProjectCpu
    : 0
  
  const projectMemoryPercent = metrics?.monitoringC?.project_memory_mb !== undefined && metrics?.system?.memory?.total_mb
    ? (metrics.monitoringC.project_memory_mb / metrics.system.memory.total_mb) * 100
    : metrics?.system?.jobbingtrack?.containers?.memory?.percent_of_system !== undefined
    ? metrics.system.jobbingtrack.containers.memory.percent_of_system
    : metrics?.system?.jobbingtrack?.containers?.memory?.percent !== undefined
    ? metrics.system.jobbingtrack.containers.memory.percent
    : null
  const avgProjectMemory = last30Points.length > 0
    ? last30Points.reduce((sum: number, d: any) => {
        const mem = d.project_memory_percent || (d.project_memory_mb && metrics?.system?.memory?.total_mb ? (d.project_memory_mb / metrics.system.memory.total_mb) * 100 : 0)
        return sum + (mem || 0)
      }, 0) / last30Points.length
    : 0
  const projectMemoryTrend = projectMemoryPercent !== null && avgProjectMemory > 0
    ? projectMemoryPercent - avgProjectMemory
    : 0
  
  // ✅ NOUVEAU : Calculer la tendance de disponibilité
  const currentAvailability = metrics?.monitoringC?.availability_percent !== undefined
    ? metrics.monitoringC.availability_percent
    : metrics?.health?.availability_percent !== undefined
    ? metrics.health.availability_percent
    : (aggregatedStats.servicesTotal > 0
      ? (aggregatedStats.servicesHealthy / aggregatedStats.servicesTotal) * 100
      : null)
  const avgAvailability = last30Points.length > 0
    ? last30Points.reduce((sum: number, d: any) => sum + (d.availability || 0), 0) / last30Points.length
    : 0
  const availabilityTrend = currentAvailability !== null && avgAvailability > 0
    ? currentAvailability - avgAvailability
    : 0
  
  // ✅ NOUVEAU : Calculer la tendance de charge système (utiliser load_1, pas loadScore)
  const currentLoad = metrics?.system?.cpu?.load_1 !== undefined && metrics.system.cpu.load_1 > 0
    ? metrics.system.cpu.load_1
    : metrics?.system?.load?.load_1 !== undefined && metrics.system.load.load_1 > 0
    ? metrics.system.load.load_1
    : metrics?.monitoringC?.load_1 !== undefined && metrics.monitoringC.load_1 > 0
    ? metrics.monitoringC.load_1
    : null
  // ✅ CORRECTION : Utiliser load_1 historique, pas loadScore
  const avgLoad = last30Points.length > 0
    ? last30Points.reduce((sum: number, d: any) => {
        // Chercher load_1 dans les données historiques
        const load1 = d.load_1 || d.system?.cpu?.load_1 || d.system?.load?.load_1 || 0
        return sum + load1
      }, 0) / last30Points.length
    : 0
  const loadTrend = currentLoad !== null && avgLoad > 0
    ? currentLoad - avgLoad
    : 0
  
  return (
    <div className="space-y-6">
      {/* ✅ TEMPORAIRE : Cartes désactivées pour se concentrer sur le graphique DEBUG */}
      {/* ✅ CORRECTION : Réorganisation des cartes en colonnes (2 cartes par colonne) */}
      {false && metrics?.system?.jobbingtrack && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Colonne 1 : CPU Projet, puis CPU Système en dessous */}
          <div className="flex flex-col gap-4">
            {(() => {
              const cpuValue = metrics?.monitoringC?.project_cpu_avg !== undefined && metrics.monitoringC.project_cpu_avg > 0
                ? metrics.monitoringC.project_cpu_avg
                : metrics.system.jobbingtrack.containers?.cpu?.averagePercent !== undefined && metrics.system.jobbingtrack.containers.cpu.averagePercent > 0
                ? metrics.system.jobbingtrack.containers.cpu.averagePercent
                : null
              const colors = getCpuMemoryColor(cpuValue, true)
              
              return (
                <div className={`bg-gradient-to-br ${colors.bg} rounded-lg p-4 ${colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Projet</span>
                    <div className="flex items-center gap-2">
                      {projectCpuTrend !== 0 && (
                        <span className={`text-xs font-medium ${projectCpuTrend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {projectCpuTrend > 0 ? '↗' : '↘'} {Math.abs(projectCpuTrend).toFixed(1)}%
                        </span>
                      )}
                      <Cpu className={`w-5 h-5 ${colors.text}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${colors.text}`}>
                    {cpuValue !== null && cpuValue !== undefined 
                      ? `${cpuValue.toFixed(1)}%` 
                      : (metrics?.monitoringC?.project_cpu_avg !== undefined
                        ? `${metrics.monitoringC.project_cpu_avg.toFixed(1)}%`
                        : projectCpuAvg !== null && projectCpuAvg !== undefined
                        ? `${projectCpuAvg.toFixed(1)}%`
                        : '...')}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {(() => {
                      const jobbingtrackCount = metrics.system.jobbingtrack.containers?.count;
                      if (jobbingtrackCount && jobbingtrackCount > 30) {
                        const servicesCount = aggregatedStats.servicesTotal || 0;
                        return servicesCount > 0 ? `${servicesCount} services` : `${jobbingtrackCount} conteneurs`;
                      }
                      return jobbingtrackCount ? `${jobbingtrackCount} conteneurs JobbingTrack` : '...';
                    })()}
                  </div>
                </div>
              )
            })()}
            
            {(() => {
              const cpuSystemValue = metrics?.system?.cpu?.usage_percent !== undefined && metrics.system.cpu.usage_percent > 0
                ? metrics.system.cpu.usage_percent
                : metrics?.monitoringC?.avg_cpu_percent !== undefined && metrics.monitoringC.avg_cpu_percent > 0
                ? metrics.monitoringC.avg_cpu_percent
                : aggregatedStats.avgCpuUsage !== null && aggregatedStats.avgCpuUsage > 0
                ? aggregatedStats.avgCpuUsage
                : null
              const cpuSystemColors = getCpuMemoryColor(cpuSystemValue, true)
              
              return (
                <div className={`bg-gradient-to-br ${cpuSystemColors.bg} rounded-lg p-4 ${cpuSystemColors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Système</span>
                    <div className="flex items-center gap-2">
                      {cpuTrend !== 0 && (
                        <span className={`text-xs font-medium ${cpuTrend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {cpuTrend > 0 ? '↗' : '↘'} {Math.abs(cpuTrend).toFixed(1)}%
                        </span>
                      )}
                      <Cpu className={`w-5 h-5 ${cpuSystemColors.text}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${cpuSystemColors.text}`}>
                    {cpuSystemValue !== null && cpuSystemValue > 0 ? `${cpuSystemValue.toFixed(1)}%` : '...'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {metrics?.system?.cpu?.cores && metrics.system.cpu.cores !== 'N/A'
                      ? `${metrics.system.cpu.cores} cores`
                      : 'Système global'}
                  </div>
                </div>
              )
            })()}
          </div>
          
          {/* Colonne 2 : Mémoire Projet, puis Mémoire Système en dessous */}
          <div className="flex flex-col gap-4">
            {(() => {
              const memoryValue = (metrics?.monitoringC?.project_memory_mb !== undefined && metrics?.system?.memory?.total_mb && metrics.monitoringC.project_memory_mb > 0)
                ? (metrics.monitoringC.project_memory_mb / metrics.system.memory.total_mb) * 100
                : metrics.system.jobbingtrack.containers?.memory?.percent_of_system !== undefined && metrics.system.jobbingtrack.containers.memory.percent_of_system > 0
                ? metrics.system.jobbingtrack.containers.memory.percent_of_system
                : metrics.system.jobbingtrack.containers?.memory?.percent !== undefined && metrics.system.jobbingtrack.containers.memory.percent > 0
                ? metrics.system.jobbingtrack.containers.memory.percent
                : null
              const colors = getCpuMemoryColor(memoryValue, false)
              const projectMemoryMb = metrics?.monitoringC?.project_memory_mb || metrics.system.jobbingtrack.containers?.memory?.used || 0
              const totalMb = metrics?.system?.memory?.total_mb || 0
              const freeMb = totalMb > 0 ? totalMb - projectMemoryMb : 0
              
              return (
                <div className={`bg-gradient-to-br ${colors.bg} rounded-lg p-4 ${colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mémoire Projet</span>
                    <div className="flex items-center gap-2">
                      {projectMemoryTrend !== 0 && (
                        <span className={`text-xs font-medium ${projectMemoryTrend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {projectMemoryTrend > 0 ? '↗' : '↘'} {Math.abs(projectMemoryTrend).toFixed(1)}%
                        </span>
                      )}
                      <MemoryStick className={`w-5 h-5 ${colors.text}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${colors.text}`}>
                    {memoryValue !== null && memoryValue !== undefined 
                      ? `${memoryValue.toFixed(1)}%` 
                      : (metrics?.monitoringC?.project_memory_mb !== undefined && metrics?.system?.memory?.total_mb
                        ? `${((metrics.monitoringC.project_memory_mb / metrics.system.memory.total_mb) * 100).toFixed(1)}%`
                        : projectMemoryPercent !== null && projectMemoryPercent !== undefined
                        ? `${projectMemoryPercent.toFixed(1)}%`
                        : '...')}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex justify-between">
                    <span>
                      {projectMemoryMb > 0 && totalMb > 0 ? `${formatMb(projectMemoryMb)} / ${formatMb(totalMb)}` : ''}
                    </span>
                    {freeMb > 0 && totalMb > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {formatMb(freeMb)} disponible
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}
            
            {(() => {
              const memorySystemValue = metrics?.system?.memory?.usage_percent !== undefined && metrics.system.memory.usage_percent > 0
                ? metrics.system.memory.usage_percent
                : (aggregatedStats.totalMemoryMb !== null && aggregatedStats.totalMemoryMb > 0 && metrics?.system?.memory?.total_mb
                  ? (aggregatedStats.totalMemoryMb / metrics.system.memory.total_mb) * 100
                  : null)
              const memorySystemColors = getCpuMemoryColor(memorySystemValue, false)
              const usedMb = metrics?.system?.memory?.used_mb || aggregatedStats.totalMemoryMb || 0
              const totalMb = metrics?.system?.memory?.total_mb || 0
              const freeMb = totalMb > 0 ? totalMb - usedMb : 0
              
              return (
                <div className={`bg-gradient-to-br ${memorySystemColors.bg} rounded-lg p-4 ${memorySystemColors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mémoire Système</span>
                    <div className="flex items-center gap-2">
                      {memoryTrend !== 0 && (
                        <span className={`text-xs font-medium ${memoryTrend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {memoryTrend > 0 ? '↗' : '↘'} {Math.abs(memoryTrend).toFixed(1)}%
                        </span>
                      )}
                      <MemoryStick className={`w-5 h-5 ${memorySystemColors.text}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${memorySystemColors.text}`}>
                    {memorySystemValue !== null && memorySystemValue > 0 ? `${memorySystemValue.toFixed(1)}%` : '...'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex justify-between">
                    <span>
                      {usedMb > 0 && totalMb > 0 ? `${formatMb(usedMb)} / ${formatMb(totalMb)}` : ''}
                    </span>
                    {freeMb > 0 && totalMb > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        {formatMb(freeMb)} disponible
                      </span>
                    )}
                  </div>
                </div>
              )
            })()}
          </div>
          
          {/* Colonne 3 : Disponibilité, puis Temps Réponse Moy. en dessous */}
          <div className="flex flex-col gap-4">
            {(() => {
              const availability = metrics?.monitoringC?.availability_percent !== undefined && metrics.monitoringC.availability_percent > 0
                ? metrics.monitoringC.availability_percent
                : metrics?.health?.availability_percent !== undefined && metrics.health.availability_percent > 0
                ? metrics.health.availability_percent
                : (aggregatedStats.servicesTotal > 0
                  ? (aggregatedStats.servicesHealthy / aggregatedStats.servicesTotal) * 100
                  : null)
              const colors = getAvailabilityColor(availability)
              
              return (
                <div className={`bg-gradient-to-br ${colors.bg} rounded-lg p-4 ${colors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponibilité</span>
                    <div className="flex items-center gap-2">
                      {availabilityTrend !== 0 && (
                        <span className={`text-xs font-medium ${availabilityTrend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {availabilityTrend > 0 ? '↗' : '↘'} {Math.abs(availabilityTrend).toFixed(1)}%
                        </span>
                      )}
                      <Activity className={`w-5 h-5 ${colors.text}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${colors.text}`}>
                    {availability !== null && availability > 0 ? `${availability.toFixed(1)}%` : '...'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {aggregatedStats.servicesHealthy || 0} / {aggregatedStats.servicesTotal || 0} services sains
                  </div>
                </div>
              )
            })()}
            
            {(() => {
              const responseTime = metrics?.monitoringC?.avg_response_time_ms !== undefined && metrics.monitoringC.avg_response_time_ms > 0
                ? metrics.monitoringC.avg_response_time_ms
                : aggregatedStats.avgResponseTime !== null && aggregatedStats.avgResponseTime > 0
                ? aggregatedStats.avgResponseTime
                : null
              const responseTimeColors = responseTime !== null && responseTime > 0
                ? getCpuMemoryColor(responseTime / 10, false)
                : getCpuMemoryColor(null, false)
              
              return (
                <div className={`bg-gradient-to-br ${responseTimeColors.bg} rounded-lg p-4 ${responseTimeColors.border}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Temps Réponse Moy.</span>
                    <div className="flex items-center gap-2">
                      {responseTimeTrend !== 0 && (
                        <span className={`text-xs font-medium ${responseTimeTrend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {responseTimeTrend > 0 ? '↗' : '↘'} {Math.abs(responseTimeTrend).toFixed(1)}ms
                        </span>
                      )}
                      <Clock className={`w-5 h-5 ${responseTimeColors.text}`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${responseTimeColors.text}`}>
                    {responseTime !== null && responseTime > 0 ? formatMs(responseTime) : '...'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {aggregatedStats.servicesTotal > 0
                      ? `${aggregatedStats.servicesHealthy} / ${aggregatedStats.servicesTotal} services`
                      : ''}
                  </div>
                </div>
              )
            })()}
          </div>
          
          {/* Colonne 4 : Charge Système, puis Services en dessous */}
          <div className="flex flex-col gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Charge Système</span>
                <div className="flex items-center gap-2">
                  {loadTrend !== 0 && (
                    <span className={`text-xs font-medium ${loadTrend > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {loadTrend > 0 ? '↗' : '↘'} {Math.abs(loadTrend).toFixed(2)}
                    </span>
                  )}
                  <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {metrics?.system?.cpu?.load_1 !== undefined && metrics.system.cpu.load_1 > 0
                  ? metrics.system.cpu.load_1.toFixed(2)
                  : metrics?.system?.load?.load_1 !== undefined && metrics.system.load.load_1 > 0
                  ? metrics.system.load.load_1.toFixed(2)
                  : metrics?.monitoringC?.load_1 !== undefined && metrics.monitoringC.load_1 > 0
                  ? metrics.monitoringC.load_1.toFixed(2)
                  : '0.00'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {metrics?.system?.cpu?.cores && metrics.system.cpu.cores !== 'N/A' && parseInt(metrics.system.cpu.cores) > 0
                  ? `Sur ${metrics.system.cpu.cores} cores`
                  : ''}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Services</span>
                <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {aggregatedStats.servicesTotal || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {aggregatedStats.servicesHealthy || 0} sains
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graphiques principaux avec chargement progressif */}
      {/* Afficher les graphiques une fois qu'ils sont chargés, même pendant le rafraîchissement */}
      {(() => {
        // ✅ DEBUG : Logger les conditions de rendu
        console.log('[OVERVIEW TAB] Conditions de rendu:', {
          chartDataLength: chartData?.length || 0,
          initialHistoryLoaded,
          loadingHistory,
          hasChartData: chartData && chartData.length > 0,
          shouldShowCharts: chartData && chartData.length > 0 && initialHistoryLoaded
        });
        
        if (chartData && chartData.length > 0 && initialHistoryLoaded) {
          return <OverviewCharts chartData={chartData} refreshing={refreshing} timeRange={timeRange} />;
        } else {
          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">💻 CPU & Mémoire</h3>
                <ChartSkeleton height={300} />
                <div className="text-xs text-gray-500 mt-2">
                  {!initialHistoryLoaded ? 'Chargement de l\'historique...' : chartData?.length === 0 ? 'Aucune donnée disponible' : 'Préparation des données...'}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🌐 Trafic Réseau</h3>
                <ChartSkeleton height={300} />
                <div className="text-xs text-gray-500 mt-2">
                  {!initialHistoryLoaded ? 'Chargement de l\'historique...' : chartData?.length === 0 ? 'Aucune donnée disponible' : 'Préparation des données...'}
                </div>
              </div>
            </div>
          );
        }
      })()}

      {loadingHistory && !initialHistoryLoaded && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Chargement de l'historique...</p>
        </div>
      )}
    </div>
  );
});

// ✅ NOUVEAU : Variantes d'affichage pour les graphiques
type ChartLayoutVariant = 'vertical' | 'grid-2cols' | 'grid-1col-wide' | 'tabs';

// ✅ OPTIMISATION : Composant séparé pour les graphiques Overview avec chargement progressif
const OverviewCharts = memo(function OverviewCharts({ chartData, refreshing, timeRange }: any) {
  const [chart1Loaded, setChart1Loaded] = useState(false);
  const [chart2Loaded, setChart2Loaded] = useState(false);
  const [chart3Loaded, setChart3Loaded] = useState(false);
  const [chart4Loaded, setChart4Loaded] = useState(false);
  const [chart5Loaded, setChart5Loaded] = useState(false); // Pour le graphique de compression DEBUG
  const [layoutVariant, setLayoutVariant] = useState<ChartLayoutVariant>('vertical');
  const [xAxisVariant, setXAxisVariant] = useState<'compact' | 'detailed' | 'time-only'>('detailed');
  const [compressionInterval, setCompressionInterval] = useState<number>(5); // 5 minutes par défaut
  
  // ✅ CORRECTION : Calculer uniqueChartDataForCompression avec validation de timestamp (comme pour le graphique de test timestamps)
  const uniqueChartDataForCompression = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    
    // ✅ CORRECTION : Valider et convertir les timestamps correctement (même logique que graphique de test timestamps)
    const validData = chartData
      .map((item) => {
        let timestamp: number | null = null;
        const tsValue = item.timestamp || item.uniqueTime;
        
        if (!tsValue) return null;
        
        // Convertir en timestamp numérique
        if (typeof tsValue === 'string') {
          let normalizedTs = tsValue;
          if (normalizedTs.includes(' UTC')) {
            normalizedTs = normalizedTs.replace(' UTC', 'Z');
          } else if (!normalizedTs.includes('Z') && !normalizedTs.includes('+') && !normalizedTs.includes('-', 10)) {
            normalizedTs = normalizedTs + 'Z';
          }
          timestamp = new Date(normalizedTs).getTime();
        } else if (typeof tsValue === 'number') {
          timestamp = tsValue;
        }
        
        if (!timestamp || Number.isNaN(timestamp) || timestamp <= 0) return null;
        
        return { ...item, _parsedTimestamp: timestamp };
      })
      .filter((p): p is any => p !== null);
    
    if (validData.length === 0) return [];
    
    // ✅ CORRECTION : Trier par timestamp validé
    const sorted = [...validData].sort((a, b) => a._parsedTimestamp - b._parsedTimestamp);
    
    // ✅ CORRECTION : Supprimer les doublons basés sur timestamp (tolérance de 1 seconde)
    return sorted.reduce((acc: any[], item: any) => {
      const timestamp = item._parsedTimestamp;
      if (!timestamp) return acc;
      
      const exists = acc.find((existing: any) => 
        Math.abs((existing._parsedTimestamp || 0) - timestamp) < 1000
      );
      if (!exists) {
        acc.push(item);
      }
      return acc;
    }, []);
  }, [chartData]);
  
  // ✅ CORRECTION : Fonction de compression/agrégation des points par intervalle
  const compressDataPoints = useCallback((data: any[], intervalMinutes: number) => {
    if (!data || data.length === 0) return [];
    
    // ✅ CORRECTION : Convertir et valider les timestamps correctement
    const validData = data
      .map((point) => {
        let timestamp: number | null = null;
        const tsValue = point.timestamp || point.uniqueTime;
        
        if (!tsValue) return null;
        
        // Convertir en timestamp numérique
        if (typeof tsValue === 'string') {
          // Gérer le format PostgreSQL UTC
          let normalizedTs = tsValue;
          if (normalizedTs.includes(' UTC')) {
            normalizedTs = normalizedTs.replace(' UTC', 'Z');
          } else if (!normalizedTs.includes('Z') && !normalizedTs.includes('+') && !normalizedTs.includes('-', 10)) {
            normalizedTs = normalizedTs + 'Z';
          }
          timestamp = new Date(normalizedTs).getTime();
        } else if (typeof tsValue === 'number') {
          timestamp = tsValue;
        }
        
        if (!timestamp || Number.isNaN(timestamp) || timestamp <= 0) return null;
        
        return { ...point, _parsedTimestamp: timestamp };
      })
      .filter((p): p is any => p !== null);
    
    if (validData.length === 0) return [];
    
    // ✅ CORRECTION : Trier par timestamp validé
    const sorted = [...validData].sort((a, b) => a._parsedTimestamp - b._parsedTimestamp);
    
    // ✅ CORRECTION : Ne plus filtrer les points trop éloignés pour éviter les trous
    // Les nouvelles données qui arrivent avec des timestamps récents doivent être affichées
    const filtered = sorted;
    
    const intervalMs = intervalMinutes * 60 * 1000;
    const buckets = new Map<number, any[]>();
    
    // Grouper les points par intervalle
    filtered.forEach((point) => {
      const bucketKey = Math.floor(point._parsedTimestamp / intervalMs) * intervalMs;
      
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(point);
    });
    
    // ✅ AMÉLIORATION : Agréger les points en préservant les pics (min/max) au lieu de moyenne
    const compressed: any[] = [];
    buckets.forEach((points, bucketKey) => {
      if (points.length === 0) return;
      
      // ✅ CORRECTION : Filtrer les points valides
      const validPoints = points.filter((p: any) => 
        p.cpu !== null && p.cpu !== undefined && 
        p.project_cpu_avg !== null && p.project_cpu_avg !== undefined &&
        p.memoryPercent !== null && p.memoryPercent !== undefined &&
        p.project_memory_percent !== null && p.project_memory_percent !== undefined
      );
      
      if (validPoints.length === 0) return;
      
      // ✅ AMÉLIORATION : Calculer la moyenne des timestamps
      const avgTimestamp = validPoints.reduce((sum, p) => sum + p._parsedTimestamp, 0) / validPoints.length;
      
      // ✅ AMÉLIORATION : Pour chaque métrique, préserver les pics (min/max) ET la moyenne
      // CPU Système : min, max, avg
      const cpuValues = validPoints.map(p => p.cpu || 0).filter(v => v > 0);
      const cpuMin = cpuValues.length > 0 ? Math.min(...cpuValues) : 0;
      const cpuMax = cpuValues.length > 0 ? Math.max(...cpuValues) : 0;
      const cpuAvg = cpuValues.length > 0 ? cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length : 0;
      
      // CPU Projet : min, max, avg
      const projectCpuValues = validPoints.map(p => p.project_cpu_avg || 0).filter(v => v > 0);
      const projectCpuMin = projectCpuValues.length > 0 ? Math.min(...projectCpuValues) : 0;
      const projectCpuMax = projectCpuValues.length > 0 ? Math.max(...projectCpuValues) : 0;
      const projectCpuAvg = projectCpuValues.length > 0 ? projectCpuValues.reduce((sum, v) => sum + v, 0) / projectCpuValues.length : 0;
      
      // Mémoire Système : min, max, avg
      const memoryValues = validPoints.map(p => p.memoryPercent || 0).filter(v => v > 0);
      const memoryMin = memoryValues.length > 0 ? Math.min(...memoryValues) : 0;
      const memoryMax = memoryValues.length > 0 ? Math.max(...memoryValues) : 0;
      const memoryAvg = memoryValues.length > 0 ? memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length : 0;
      
      // Mémoire Projet : min, max, avg
      const projectMemoryValues = validPoints.map(p => p.project_memory_percent || 0).filter(v => v > 0);
      const projectMemoryMin = projectMemoryValues.length > 0 ? Math.min(...projectMemoryValues) : 0;
      const projectMemoryMax = projectMemoryValues.length > 0 ? Math.max(...projectMemoryValues) : 0;
      const projectMemoryAvg = projectMemoryValues.length > 0 ? projectMemoryValues.reduce((sum, v) => sum + v, 0) / projectMemoryValues.length : 0;
      
      // ✅ AMÉLIORATION : Créer 2 points par bucket : max (pic) et avg (tendance)
      // Point MAX (pour préserver les pics)
      compressed.push({
        timestamp: Math.round(avgTimestamp),
        uniqueTime: new Date(Math.round(avgTimestamp)).toISOString(),
        time: formatTimestamp(new Date(Math.round(avgTimestamp)).toISOString(), timeRange),
        cpu: cpuMax,
        project_cpu_avg: projectCpuMax,
        memoryPercent: memoryMax,
        project_memory_percent: projectMemoryMax,
        pointType: 'max',
        pointCount: points.length
      });
      
      // Point AVG (pour la tendance générale)
      compressed.push({
        timestamp: Math.round(avgTimestamp),
        uniqueTime: new Date(Math.round(avgTimestamp)).toISOString(),
        time: formatTimestamp(new Date(Math.round(avgTimestamp)).toISOString(), timeRange),
        cpu: cpuAvg,
        project_cpu_avg: projectCpuAvg,
        memoryPercent: memoryAvg,
        project_memory_percent: projectMemoryAvg,
        pointType: 'avg',
        pointCount: points.length
      });
    });
    
    // ✅ CORRECTION : Trier par timestamp et supprimer les doublons
    const sortedCompressed = compressed.sort((a, b) => a.timestamp - b.timestamp);
    
    // Supprimer les points avec des timestamps trop proches (moins de 1 minute d'écart)
    const deduplicated: any[] = [];
    sortedCompressed.forEach((point, index) => {
      if (index === 0) {
        deduplicated.push(point);
        return;
      }
      
      const prevPoint = deduplicated[deduplicated.length - 1];
      const timeDiff = Math.abs(point.timestamp - prevPoint.timestamp);
      
      // Garder seulement si l'écart est d'au moins 1 minute
      if (timeDiff >= 60 * 1000) {
        deduplicated.push(point);
      }
    });
    
    return deduplicated;
  }, [timeRange]);
  
  // ✅ CORRECTION : Calculer compressedData avec useMemo
  const compressedData = useMemo(() => {
    if (!uniqueChartDataForCompression || uniqueChartDataForCompression.length === 0) return [];
    try {
      return compressDataPoints(uniqueChartDataForCompression, compressionInterval);
    } catch (error) {
      console.error('[DEBUG COMPRESSION] Erreur lors de la compression:', error);
      return [];
    }
  }, [uniqueChartDataForCompression, compressionInterval, compressDataPoints]);
  
  // ✅ CORRECTION : Calculer displayData pour le graphique DEBUG - Test Timestamps avec useMemo
  const debugDisplayData = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      console.log('[DEBUG] ⚠️ chartData est vide ou null');
      return [];
    }
    
    console.log(`[DEBUG] 📊 chartData contient ${chartData.length} points`);
    
    // ✅ DEBUG : Afficher les premières valeurs pour diagnostiquer
    if (chartData.length > 0) {
      const firstPoint = chartData[0];
      const lastPoint = chartData[chartData.length - 1];
      console.log('[DEBUG] 🔍 Premier point de chartData:', {
        cpu: firstPoint.cpu,
        project_cpu_avg: firstPoint.project_cpu_avg,
        memoryPercent: firstPoint.memoryPercent,
        project_memory_percent: firstPoint.project_memory_percent,
        timestamp: firstPoint.timestamp,
        uniqueTime: firstPoint.uniqueTime
      });
      console.log('[DEBUG] 🔍 Dernier point de chartData:', {
        cpu: lastPoint.cpu,
        project_cpu_avg: lastPoint.project_cpu_avg,
        memoryPercent: lastPoint.memoryPercent,
        project_memory_percent: lastPoint.project_memory_percent,
        timestamp: lastPoint.timestamp,
        uniqueTime: lastPoint.uniqueTime
      });
    }
    
    const maxPointsForTimeRange = timeRange === '1h' ? 60 : 
                                 timeRange === '6h' ? 180 : 
                                 timeRange === '24h' ? 288 :
                                 timeRange === '7d' ? 336 : 1008;
    
    // ✅ AMÉLIORATION : Calculer le timestamp de début (24h avant maintenant pour timeRange 24h)
    const now = Date.now();
    const startTimestamp = timeRange === '1h' ? now - (1 * 60 * 60 * 1000) :
                          timeRange === '6h' ? now - (6 * 60 * 60 * 1000) :
                          timeRange === '24h' ? now - (24 * 60 * 60 * 1000) :
                          timeRange === '7d' ? now - (7 * 24 * 60 * 60 * 1000) :
                          now - (30 * 24 * 60 * 60 * 1000);
    
    // Valider et convertir les timestamps + filtrer ceux qui sont trop anciens
    const validData = chartData
      .map((item) => {
        let timestamp: number | null = null;
        const tsValue = item.timestamp || item.uniqueTime;
        
        if (!tsValue) return null;
        
        if (typeof tsValue === 'string') {
          let normalizedTs = tsValue;
          if (normalizedTs.includes(' UTC')) {
            normalizedTs = normalizedTs.replace(' UTC', 'Z');
          } else if (!normalizedTs.includes('Z') && !normalizedTs.includes('+') && !normalizedTs.includes('-', 10)) {
            normalizedTs = normalizedTs + 'Z';
          }
          timestamp = new Date(normalizedTs).getTime();
        } else if (typeof tsValue === 'number') {
          timestamp = tsValue;
        }
        
        if (!timestamp || Number.isNaN(timestamp) || timestamp <= 0) return null;
        
        // ✅ AMÉLIORATION : Filtrer les points trop anciens (avant la période sélectionnée)
        // ✅ CORRECTION : Ne pas filtrer si le timestamp est dans la période (avec une marge de 1h pour éviter les problèmes de timezone)
        const margin = 60 * 60 * 1000; // 1 heure de marge
        if (timestamp < (startTimestamp - margin)) return null;
        
        // ✅ DEBUG : Préserver toutes les valeurs, même si elles sont null
        return { ...item, _parsedTimestamp: timestamp };
      })
      .filter((p): p is any => p !== null);
    
    console.log(`[DEBUG] ✅ ${validData.length} points valides après filtrage`);
    
    if (validData.length === 0) return [];
    
    // Trier par timestamp
    const sorted = [...validData].sort((a, b) => a._parsedTimestamp - b._parsedTimestamp);
    
    // Supprimer les doublons (tolérance de 1 seconde)
    // ✅ CORRECTION : Conserver le point le plus récent avec les meilleures valeurs (pas de null)
    const uniqueChartData = sorted.reduce((acc: any[], item: any) => {
      const timestamp = item._parsedTimestamp;
      if (!timestamp) return acc;
      
      const existingIndex = acc.findIndex((existing: any) => 
        Math.abs((existing._parsedTimestamp || 0) - timestamp) < 1000
      );
      
      if (existingIndex === -1) {
        // Nouveau point, l'ajouter
        acc.push(item);
      } else {
        // Point existant, conserver celui avec le meilleur timestamp ET les meilleures valeurs (non-null)
        const existing = acc[existingIndex];
        // Si le nouveau point a un timestamp plus récent OU a des valeurs non-null alors que l'existant a null
        if (timestamp > existing._parsedTimestamp || 
            (item.project_cpu_avg !== null && existing.project_cpu_avg === null) ||
            (item.project_memory_percent !== null && existing.project_memory_percent === null)) {
          // Merger les valeurs (préférer les non-null)
          acc[existingIndex] = {
            ...existing,
            ...item,
            // Préserver les valeurs non-null de l'existant si le nouveau est null
            project_cpu_avg: item.project_cpu_avg !== null && item.project_cpu_avg !== undefined ? item.project_cpu_avg : existing.project_cpu_avg,
            project_memory_percent: item.project_memory_percent !== null && item.project_memory_percent !== undefined ? item.project_memory_percent : existing.project_memory_percent,
            cpu: item.cpu !== null && item.cpu !== undefined ? item.cpu : existing.cpu,
            memoryPercent: item.memoryPercent !== null && item.memoryPercent !== undefined ? item.memoryPercent : existing.memoryPercent,
          };
        }
      }
      return acc;
    }, []);
    
    // ✅ DEBUG : Logger les valeurs de project_cpu_avg et project_memory_percent dans uniqueChartData
    if (uniqueChartData.length > 0) {
      const pointsWithNullProject = uniqueChartData.filter(p => p.project_cpu_avg === null || p.project_memory_percent === null);
      if (pointsWithNullProject.length > 0) {
        console.log('[DEBUG] ⚠️ Points avec valeurs projet null dans uniqueChartData:', {
          total: uniqueChartData.length,
          withNull: pointsWithNullProject.length,
          sample: pointsWithNullProject.slice(0, 3).map((p: any) => ({
            timestamp: p._parsedTimestamp,
            project_cpu_avg: p.project_cpu_avg,
            project_memory_percent: p.project_memory_percent,
            cpu: p.cpu,
            memoryPercent: p.memoryPercent
          }))
        });
      }
    }
    
    // ✅ AMÉLIORATION : Regrouper les points proches (dans un intervalle de 2-10 minutes) et similaires
    const grouped: any[] = [];
    const timeWindow = timeRange === '1h' ? 2 * 60 * 1000 : // 2 minutes pour 1h
                       timeRange === '6h' ? 5 * 60 * 1000 : // 5 minutes pour 6h
                       timeRange === '24h' ? 10 * 60 * 1000 : // 10 minutes pour 24h
                       15 * 60 * 1000; // 15 minutes pour 7d+
    
    // ✅ AMÉLIORATION : Seuil de similarité pour regrouper (5% de variation)
    const similarityThreshold = 0.05;
    
    // ✅ AMÉLIORATION : Limiter le nombre max de points pour lisibilité
    const maxDisplayPoints = timeRange === '1h' ? 30 : 
                             timeRange === '6h' ? 60 : 
                             timeRange === '24h' ? 100 :
                             timeRange === '7d' ? 150 : 200;
    
    for (let i = 0; i < uniqueChartData.length; i++) {
      const currentPoint = uniqueChartData[i];
      
      // ✅ DEBUG : Logger si currentPoint a des valeurs projet null
      if (i < 5 || (currentPoint.project_cpu_avg === null || currentPoint.project_memory_percent === null)) {
        console.log('[DEBUG GROUPING] currentPoint:', {
          index: i,
          timestamp: currentPoint._parsedTimestamp,
          project_cpu_avg: currentPoint.project_cpu_avg,
          project_memory_percent: currentPoint.project_memory_percent,
          cpu: currentPoint.cpu,
          memoryPercent: currentPoint.memoryPercent,
          hasProjectCpu: currentPoint.hasOwnProperty('project_cpu_avg'),
          hasProjectMemory: currentPoint.hasOwnProperty('project_memory_percent')
        });
      }
      
      const group: any[] = [currentPoint];
      
      // Chercher les points proches dans le temps (max 5-10 points par groupe)
      let j = i + 1;
      while (j < uniqueChartData.length && 
             group.length < 10 && // Max 10 points par groupe
             uniqueChartData[j]._parsedTimestamp - currentPoint._parsedTimestamp <= timeWindow) {
        // ✅ CORRECTION : Vérifier si les valeurs sont similaires (variation < 5%)
        // ✅ AMÉLIORATION : Utiliser une valeur de référence valide pour éviter division par 0
        const currentCpu = currentPoint.cpu ?? 0;
        const currentMem = currentPoint.memoryPercent ?? 0;
        const currentProjectCpu = currentPoint.project_cpu_avg ?? 0;
        
        const nextCpu = uniqueChartData[j].cpu ?? 0;
        const nextMem = uniqueChartData[j].memoryPercent ?? 0;
        const nextProjectCpu = uniqueChartData[j].project_cpu_avg ?? 0;
        
        // ✅ CORRECTION : Calculer la différence relative seulement si les valeurs de référence sont > 0
        const cpuDiff = Math.abs(nextCpu - currentCpu) / Math.max(Math.abs(currentCpu), 1);
        const memDiff = Math.abs(nextMem - currentMem) / Math.max(Math.abs(currentMem), 1);
        const projectCpuDiff = Math.abs(nextProjectCpu - currentProjectCpu) / Math.max(Math.abs(currentProjectCpu), 1);
        
        // ✅ AMÉLIORATION : Pour les valeurs proches de 0, utiliser une différence absolue (< 1%)
        const cpuDiffAbsolute = Math.abs(nextCpu - currentCpu) < 1;
        const memDiffAbsolute = Math.abs(nextMem - currentMem) < 1;
        const projectCpuDiffAbsolute = Math.abs(nextProjectCpu - currentProjectCpu) < 1;
        
        // Si similaire (relatif < 5% OU absolu < 1%), ajouter au groupe
        if ((cpuDiff < similarityThreshold || cpuDiffAbsolute) && 
            (memDiff < similarityThreshold || memDiffAbsolute) && 
            (projectCpuDiff < similarityThreshold || projectCpuDiffAbsolute)) {
          group.push(uniqueChartData[j]);
          j++;
        } else {
          break; // Arrêter si on trouve un point différent
        }
      }
      
      // ✅ AMÉLIORATION : Créer un point agrégé (moyenne des valeurs, timestamp moyen)
      // ✅ CORRECTION : Filtrer les valeurs null/undefined avant de calculer la moyenne
      if (group.length > 0) {
        const avgTimestamp = group.reduce((sum, p) => sum + p._parsedTimestamp, 0) / group.length;
        
        // ✅ CORRECTION : Filtrer les valeurs valides avant de calculer les moyennes
        // ✅ AMÉLIORATION : Accepter les valeurs >= 0 (pas seulement > 0) pour CPU et mémoire
        const validCpuValues = group.map(p => p.cpu).filter(v => v !== null && v !== undefined && !Number.isNaN(v) && Number.isFinite(v));
        const validProjectCpuValues = group.map(p => p.project_cpu_avg).filter(v => v !== null && v !== undefined && !Number.isNaN(v) && Number.isFinite(v));
        const validMemoryValues = group.map(p => p.memoryPercent).filter(v => v !== null && v !== undefined && !Number.isNaN(v) && Number.isFinite(v));
        const validProjectMemoryValues = group.map(p => p.project_memory_percent).filter(v => v !== null && v !== undefined && !Number.isNaN(v) && Number.isFinite(v));
        
        // ✅ CORRECTION : Calculer la moyenne seulement si on a des valeurs valides, sinon utiliser la valeur du point courant
        // ✅ AMÉLIORATION : Ne pas remplacer par 0 si la valeur est null, utiliser null à la place
        const avgCpu = validCpuValues.length > 0 
          ? validCpuValues.reduce((sum, v) => sum + v, 0) / validCpuValues.length 
          : (currentPoint.cpu !== null && currentPoint.cpu !== undefined ? currentPoint.cpu : null);
        const avgProjectCpu = validProjectCpuValues.length > 0 
          ? validProjectCpuValues.reduce((sum, v) => sum + v, 0) / validProjectCpuValues.length 
          : (currentPoint.project_cpu_avg !== null && currentPoint.project_cpu_avg !== undefined ? currentPoint.project_cpu_avg : null);
        const avgMemory = validMemoryValues.length > 0 
          ? validMemoryValues.reduce((sum, v) => sum + v, 0) / validMemoryValues.length 
          : (currentPoint.memoryPercent !== null && currentPoint.memoryPercent !== undefined ? currentPoint.memoryPercent : null);
        const avgProjectMemory = validProjectMemoryValues.length > 0 
          ? validProjectMemoryValues.reduce((sum, v) => sum + v, 0) / validProjectMemoryValues.length 
          : (currentPoint.project_memory_percent !== null && currentPoint.project_memory_percent !== undefined ? currentPoint.project_memory_percent : null);
        
        // ✅ DEBUG : Logger si les valeurs projet sont null après regroupement
        if (avgProjectCpu === null || avgProjectMemory === null) {
          console.log('[DEBUG GROUPING] ⚠️ Valeurs projet null après regroupement:', {
            groupSize: group.length,
            validProjectCpuValues: validProjectCpuValues.length,
            validProjectMemoryValues: validProjectMemoryValues.length,
            currentPointProjectCpu: currentPoint.project_cpu_avg,
            currentPointProjectMemory: currentPoint.project_memory_percent,
            avgProjectCpu,
            avgProjectMemory,
            groupValues: group.map((p: any) => ({
              project_cpu_avg: p.project_cpu_avg,
              project_memory_percent: p.project_memory_percent
            }))
          });
        }
        
        grouped.push({
          ...currentPoint,
          _parsedTimestamp: Math.round(avgTimestamp),
          cpu: avgCpu,
          project_cpu_avg: avgProjectCpu,
          memoryPercent: avgMemory,
          project_memory_percent: avgProjectMemory,
          _groupSize: group.length
        });
      }
      
      // Avancer l'index pour sauter les points déjà regroupés
      i = j - 1;
    }
    
    // ✅ AMÉLIORATION : Si on a encore trop de points, sous-échantillonner uniformément
    let result = grouped;
    if (grouped.length > maxDisplayPoints) {
      const step = Math.ceil(grouped.length / maxDisplayPoints);
      result = [];
      
      // Toujours inclure le premier point
      result.push(grouped[0]);
      
      // Échantillonner uniformément
      for (let i = step; i < grouped.length - 1; i += step) {
        result.push(grouped[i]);
      }
      
      // Toujours inclure le dernier point (le plus récent)
      if (grouped.length > 1) {
        result.push(grouped[grouped.length - 1]);
      }
    }
    
    // Trier par timestamp pour l'affichage
    result.sort((a, b) => a._parsedTimestamp - b._parsedTimestamp);
    
    const finalResult = result.map(item => ({
      ...item,
      _isoTime: new Date(item._parsedTimestamp).toISOString()
    }));
    
    // ✅ DEBUG : Afficher les premières valeurs finales pour diagnostiquer
    if (finalResult.length > 0) {
      const firstFinal = finalResult[0];
      console.log('[DEBUG] 🔍 Premier point final de debugDisplayData:', {
        cpu: firstFinal.cpu,
        project_cpu_avg: firstFinal.project_cpu_avg,
        memoryPercent: firstFinal.memoryPercent,
        project_memory_percent: firstFinal.project_memory_percent,
        _parsedTimestamp: firstFinal._parsedTimestamp
      });
    }
    
    return finalResult;
  }, [chartData, timeRange]);
  
  // ✅ CORRECTION : formatXAxisLabel est défini en dehors du composant, donc accessible

  useEffect(() => {
    // ✅ CORRECTION : Réinitialiser les états si chartData est vide
    if (!chartData || chartData.length === 0) {
      if (chart1Loaded) {
        // Seulement réinitialiser si les graphiques étaient chargés
        setChart1Loaded(false);
        setChart2Loaded(false);
        setChart3Loaded(false);
        setChart4Loaded(false);
        setChart5Loaded(false);
      }
      return;
    }

    // ✅ NOUVEAU : Charger les graphiques seulement lors du premier chargement
    // Les mises à jour suivantes (ajout de points) ne réinitialisent pas les graphiques
    if (!chart1Loaded && chartData.length > 0) {
      console.log(`[OVERVIEW CHARTS] 📊 Chargement initial de ${chartData.length} points de données`);
      
      const timer1 = setTimeout(() => {
        setChart1Loaded(true);
        console.log('[OVERVIEW CHARTS] ✅ Graphique 1 (CPU & Mémoire) chargé');
      }, 50);
      const timer2 = setTimeout(() => {
        setChart2Loaded(true);
        console.log('[OVERVIEW CHARTS] ✅ Graphique 2 (Trafic Réseau) chargé');
      }, 150);
      const timer3 = setTimeout(() => {
        setChart3Loaded(true);
        console.log('[OVERVIEW CHARTS] ✅ Graphique 3 (Performance) chargé');
      }, 250);
      const timer4 = setTimeout(() => {
        setChart4Loaded(true);
        console.log('[OVERVIEW CHARTS] ✅ Graphique 4 (Disponibilité) chargé');
      }, 350);
      const timer5 = setTimeout(() => {
        setChart5Loaded(true);
        console.log('[OVERVIEW CHARTS] ✅ Graphique 5 (Compression DEBUG) chargé');
      }, 450);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
        clearTimeout(timer5);
      };
    } else if (chart1Loaded && chartData.length > 0) {
      // ✅ NOUVEAU : Log discret pour les mises à jour incrémentales
      console.log(`[OVERVIEW CHARTS] 🔄 Mise à jour incrémentale: ${chartData.length} points (ajout de nouveaux points)`);
    }
  }, [chartData.length, chart1Loaded]);

  // ✅ NOUVEAU : Sélecteur de variante d'affichage
  const renderVariantSelector = () => (
    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Layout:</span>
          <select
            value={layoutVariant}
            onChange={(e) => setLayoutVariant(e.target.value as ChartLayoutVariant)}
            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="vertical">Vertical (1 colonne)</option>
            <option value="grid-2cols">Grille 2 colonnes</option>
            <option value="grid-1col-wide">Large (pleine largeur)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Axe X:</span>
          <select
            value={xAxisVariant}
            onChange={(e) => setXAxisVariant(e.target.value as 'compact' | 'detailed' | 'time-only')}
            className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="detailed">Détaillé</option>
            <option value="compact">Compact</option>
            <option value="time-only">Heure seulement</option>
          </select>
        </div>
      </div>
    </div>
  );

  // ✅ NOUVEAU : Rendu conditionnel selon la variante de layout
  const renderChart = (chartNumber: number, title: string, icon: string, content: React.ReactNode) => {
    const isLoaded = chartNumber === 1 ? chart1Loaded 
                    : chartNumber === 2 ? chart2Loaded 
                    : chartNumber === 3 ? chart3Loaded 
                    : chartNumber === 4 ? chart4Loaded
                    : chartNumber === 5 ? chart5Loaded
                    : false;
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {icon} {title}
        </h3>
        {isLoaded ? content : <ChartSkeleton height={300} />}
      </div>
    );
  };

  // ✅ NOUVEAU : Composant XAxis réutilisable avec variante
  const renderXAxis = (chartData: any[]) => {
    // ✅ CORRECTION : Calculer l'intervalle optimal pour afficher les labels
    const totalPoints = chartData.length;
    let targetLabels = 8;
    
    if (xAxisVariant === 'compact') {
      targetLabels = Math.floor(targetLabels / 2);
    } else if (xAxisVariant === 'time-only') {
      targetLabels = targetLabels * 2;
    }
    
    if (timeRange === '1h') targetLabels = xAxisVariant === 'compact' ? 4 : xAxisVariant === 'time-only' ? 12 : 6;
    else if (timeRange === '6h') targetLabels = xAxisVariant === 'compact' ? 4 : xAxisVariant === 'time-only' ? 12 : 6;
    else if (timeRange === '24h') targetLabels = xAxisVariant === 'compact' ? 6 : xAxisVariant === 'time-only' ? 24 : 12;
    else if (timeRange === '7d') targetLabels = xAxisVariant === 'compact' ? 7 : xAxisVariant === 'time-only' ? 28 : 14;
    else if (timeRange === '30d') targetLabels = xAxisVariant === 'compact' ? 8 : xAxisVariant === 'time-only' ? 30 : 15;
    
    const calculatedInterval = Math.max(0, Math.floor(totalPoints / targetLabels));
    
    return (
      <XAxis 
        dataKey="uniqueTime" 
        stroke="#9CA3AF"
        style={{ fontSize: xAxisVariant === 'compact' ? '10px' : '12px' }}
        tickFormatter={(value, index) => {
          // ✅ CORRECTION : Utiliser l'index pour trouver l'item dans chartData
          const item = chartData[index];
          if (!item) {
            // Si l'item n'est pas trouvé par index, chercher par uniqueTime
            const foundItem = chartData.find((d: any) => d.uniqueTime === value || d.time === value);
            if (!foundItem) return '';
            return formatXAxisLabel(foundItem.time || foundItem.uniqueTime || value, index, chartData, timeRange, xAxisVariant);
          }
          // ✅ CORRECTION : Toujours afficher le premier et dernier point
          const isFirst = index === 0;
          const isLast = index === chartData.length - 1;
          const shouldShow = isFirst || isLast || (calculatedInterval > 0 && index % calculatedInterval === 0);
          
          if (!shouldShow) return '';
          
          return formatXAxisLabel(item.time || item.uniqueTime || value, index, chartData, timeRange, xAxisVariant);
        }}
        interval={0}
        angle={xAxisVariant === 'compact' ? -30 : -45}
        textAnchor="end"
        height={xAxisVariant === 'compact' ? 60 : 80}
        allowDuplicatedCategory={false}
        domain={['dataMin', 'dataMax']}
      />
    );
  };

  return (
    <div className="relative">
      {/* Indicateur de rafraîchissement discret en haut à droite */}
      {refreshing && (
        <div className="absolute top-0 right-0 z-10 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1">
          <Activity className="w-3 h-3 animate-spin" />
          <span>Actualisation...</span>
        </div>
      )}
      
      {/* Layout vertical simplifié */}
      <div className="grid grid-cols-1 gap-6">
          {/* CPU & Mémoire - Système et Projet */}
          {renderChart(1, 'CPU & Mémoire', '💻', (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ bottom: xAxisVariant === 'compact' ? 60 : 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                {renderXAxis(chartData)}
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={(() => {
                  // ✅ CORRECTION : Calculer le domaine Y dynamiquement avec 5% de marge
                  const allValues = chartData.flatMap((d: any) => [
                    d.cpu || 0,
                    d.project_cpu_avg || 0,
                    d.memoryPercent || 0,
                    d.project_memory_percent || 0
                  ]).filter((v: any) => v !== null && v !== undefined && Number.isFinite(v));
                  
                  if (allValues.length === 0) return [0, 100];
                  
                  const maxValue = Math.max(...allValues);
                  const minValue = Math.min(...allValues);
                  const margin = Math.max(5, maxValue * 0.05); // 5% de marge ou minimum 5
                  
                  return [Math.max(0, minValue - margin), Math.min(100, maxValue + margin)];
                })()}
                label={{ value: 'Pourcentage (%)', angle: -90, position: 'insideLeft' }}
                tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                labelFormatter={(label: any) => {
                  // ✅ CORRECTION : Convertir le timestamp en heure locale utilisateur
                  if (!label) return '';
                  const item = chartData.find((d: any) => d.uniqueTime === label || d.time === label);
                  if (item && item.timestamp) {
                    const date = new Date(item.timestamp);
                    if (!Number.isNaN(date.getTime())) {
                      return date.toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                      });
                    }
                  }
                  return label;
                }}
                formatter={(value: any, name: string) => {
                  if (name.includes('CPU')) return [`${Number(value).toFixed(1)}%`, name];
                  if (name.includes('Mémoire')) return [`${Number(value).toFixed(1)}%`, name];
                  return [value, name];
                }}
              />
              <Legend />
              {/* CPU Système - Bleu */}
              <Line 
                type="monotone" 
                dataKey="cpu" 
                stroke={COLORS.cpuSystem} 
                strokeWidth={2}
                name="CPU Système (%)"
                dot={false}
                connectNulls={false}
              />
              {/* CPU Projet - Rose */}
              <Line 
                type="monotone" 
                dataKey="project_cpu_avg" 
                stroke={COLORS.cpuProject} 
                strokeWidth={2}
                name="CPU Projet (%)"
                dot={false}
                connectNulls={false}
              />
              {/* Mémoire Système - Vert */}
              <Line 
                type="monotone" 
                dataKey="memoryPercent" 
                stroke={COLORS.memorySystem} 
                strokeWidth={2}
                name="Mémoire Système (%)"
                dot={false}
                connectNulls={false}
              />
              {/* Mémoire Projet - Orange */}
              <Line 
                type="monotone" 
                dataKey="project_memory_percent" 
                stroke={COLORS.memoryProject} 
                strokeWidth={2}
                name="Mémoire Projet (%)"
                dot={false}
                connectNulls={false}
              />
              </LineChart>
            </ResponsiveContainer>
          ))}
          
          {/* ✅ DEBUG : Graphique de test manuel pour diagnostiquer les timestamps */}
          {debugDisplayData.length > 0 && renderChart(1, '🔍 DEBUG - Test Timestamps', '🔍', 
            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Nombre de points totaux: {chartData.length}</p>
                <p>Nombre de points affichés: {debugDisplayData.length}</p>
                <p>Premier point: {debugDisplayData[0] ? new Date(debugDisplayData[0]._parsedTimestamp).toLocaleString('fr-FR') : 'N/A'}</p>
                <p>Dernier point: {debugDisplayData[debugDisplayData.length - 1] ? new Date(debugDisplayData[debugDisplayData.length - 1]._parsedTimestamp).toLocaleString('fr-FR') : 'N/A'}</p>
              </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart 
                    data={debugDisplayData} 
                    margin={{ bottom: 100, right: 20, left: 20, top: 20 }}
                  >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="_isoTime"
                    stroke="#9CA3AF"
                    style={{ fontSize: '10px' }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tickFormatter={(value) => {
                      // ✅ CORRECTION : value est maintenant _isoTime (ISO string)
                      if (!value) return '';
                      const date = new Date(value);
                      if (Number.isNaN(date.getTime())) return '';
                      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                      return date.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: userTimezone
                      });
                    }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    domain={(() => {
                      // ✅ CORRECTION : Calculer le domaine Y dynamiquement avec 5% de marge sur les points affichés
                      const allValues = debugDisplayData.flatMap((d: any) => [
                        d.cpu || 0,
                        d.project_cpu_avg || 0,
                        d.memoryPercent || 0,
                        d.project_memory_percent || 0
                      ]).filter((v: any) => v !== null && v !== undefined && Number.isFinite(v));
                      
                      if (allValues.length === 0) return [0, 100];
                      
                      const maxValue = Math.max(...allValues);
                      const minValue = Math.min(...allValues);
                      const margin = Math.max(5, maxValue * 0.05); // 5% de marge ou minimum 5
                      
                      return [Math.max(0, minValue - margin), maxValue + margin];
                    })()}
                    tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: 'none',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                    labelFormatter={(label: any) => {
                      // ✅ CORRECTION : label est maintenant _isoTime (ISO string)
                      const date = new Date(label);
                      if (!Number.isNaN(date.getTime())) {
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        return date.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: userTimezone
                        });
                      }
                      return label;
                    }}
                    formatter={(value: any, name: string) => {
                      if (name.includes('CPU')) return [`${Number(value).toFixed(1)}%`, name];
                      if (name.includes('Mémoire')) return [`${Number(value).toFixed(1)}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  {/* ✅ CORRECTION : Ajouter CPU Système */}
                  <Line 
                    type="monotone" 
                    dataKey="cpu" 
                    stroke={COLORS.cpuSystem} 
                    strokeWidth={2}
                    name="CPU Système (%)"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="project_cpu_avg" 
                    stroke={COLORS.cpuProject} 
                    strokeWidth={2}
                    name="CPU Projet (%)"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  {/* ✅ NOUVEAU : Ajouter aussi Mémoire Système et Projet pour debug complet */}
                  <Line 
                    type="monotone" 
                    dataKey="memoryPercent" 
                    stroke={COLORS.memorySystem} 
                    strokeWidth={2}
                    name="Mémoire Système (%)"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="project_memory_percent" 
                    stroke={COLORS.memoryProject} 
                    strokeWidth={2}
                    name="Mémoire Projet (%)"
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <p>⚠️ Graphique de test - Affiche {debugDisplayData.length} points (sur {chartData.length} totaux) avec timestamps validés</p>
                <p>Plage de temps: {timeRange}</p>
              </div>
            </div>
          )}
          
          {/* ✅ NOUVEAU : Graphique de test pour compression/agrégation des points - TEMPORAIREMENT DÉSACTIVÉ */}
          {false && compressedData.length > 0 && renderChart(5, '🔍 🔍 DEBUG - Test Compression Points', '🔍',
            <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                  <label className="text-gray-600 dark:text-gray-400">
                    Intervalle de compression:
                  </label>
                  <select
                    value={compressionInterval}
                    onChange={(e) => setCompressionInterval(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={20}>20 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                  <span className="text-gray-500 dark:text-gray-400">
                    {uniqueChartDataForCompression.length} points uniques → {compressedData.length} points compressés ({compressionInterval} min)
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p>Premier point compressé: {compressedData[0] ? JSON.stringify({
                    timestamp: compressedData[0].timestamp,
                    uniqueTime: compressedData[0].uniqueTime,
                    time: compressedData[0].time,
                    cpu: compressedData[0].cpu,
                    pointCount: compressedData[0].pointCount
                  }, null, 2) : 'N/A'}</p>
                  <p>Dernier point compressé: {compressedData[compressedData.length - 1] ? JSON.stringify({
                    timestamp: compressedData[compressedData.length - 1].timestamp,
                    uniqueTime: compressedData[compressedData.length - 1].uniqueTime,
                    time: compressedData[compressedData.length - 1].time,
                    cpu: compressedData[compressedData.length - 1].cpu,
                    pointCount: compressedData[compressedData.length - 1].pointCount
                  }, null, 2) : 'N/A'}</p>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart 
                    data={compressedData} 
                    margin={{ bottom: 100, right: 20, left: 20, top: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="uniqueTime"
                      stroke="#9CA3AF"
                      style={{ fontSize: '10px' }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tickFormatter={(value) => {
                        if (!value) return '';
                        let date: Date;
                        if (typeof value === 'string') {
                          if (value.includes(' UTC')) {
                            value = value.replace(' UTC', 'Z');
                          } else if (!value.includes('Z') && !value.includes('+') && !value.includes('-', 10)) {
                            value = value + 'Z';
                          }
                          date = new Date(value);
                        } else if (typeof value === 'number') {
                          date = new Date(value);
                        } else {
                          return '';
                        }
                        if (Number.isNaN(date.getTime())) return '';
                        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        return date.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: userTimezone
                        });
                      }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                      domain={(() => {
                        const allValues = compressedData.flatMap((d: any) => [
                          d.cpu || 0,
                          d.project_cpu_avg || 0,
                          d.memoryPercent || 0,
                          d.project_memory_percent || 0
                        ]).filter((v: any) => v !== null && v !== undefined && Number.isFinite(v));
                        if (allValues.length === 0) return [0, 100];
                        const maxValue = Math.max(...allValues);
                        const minValue = Math.min(...allValues);
                        const margin = Math.max(5, maxValue * 0.05);
                        return [Math.max(0, minValue - margin), maxValue + margin];
                      })()}
                      tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#F3F4F6'
                      }}
                      labelFormatter={(label: any) => {
                        // ✅ CORRECTION : label est uniqueTime, chercher l'item correspondant
                        const item = compressedData.find((d: any) => (d.uniqueTime || d.timestamp) === label);
                        if (item) {
                          // Utiliser timestamp si disponible (c'est un nombre dans compressedData)
                          const date = item.timestamp ? new Date(item.timestamp) : new Date(item.uniqueTime || label);
                          if (!Number.isNaN(date.getTime())) {
                            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                            return date.toLocaleString('fr-FR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: userTimezone
                            }) + (item.pointCount ? ` (${item.pointCount} points agrégés)` : '');
                          }
                        }
                        return label;
                      }}
                      formatter={(value: any, name: string) => {
                        if (name.includes('CPU')) return [`${Number(value).toFixed(1)}%`, name];
                        if (name.includes('Mémoire')) return [`${Number(value).toFixed(1)}%`, name];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke={COLORS.cpuSystem} 
                      strokeWidth={2}
                      name="CPU Système (%)"
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="project_cpu_avg" 
                      stroke={COLORS.cpuProject} 
                      strokeWidth={2}
                      name="CPU Projet (%)"
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memoryPercent" 
                      stroke={COLORS.memorySystem} 
                      strokeWidth={2}
                      name="Mémoire Système (%)"
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="project_memory_percent" 
                      stroke={COLORS.memoryProject} 
                      strokeWidth={2}
                      name="Mémoire Projet (%)"
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  <p>⚠️ Graphique de test compression - {compressedData.length} points compressés depuis {uniqueChartDataForCompression.length} points uniques ({chartData.length} totaux)</p>
                  <p>Compression: moyenne sur {compressionInterval} minutes</p>
                </div>
              </div>
          )}
          
          {/* Trafic Réseau - TEMPORAIREMENT DÉSACTIVÉ */}
          {false && renderChart(2, 'Trafic Réseau', '🌐', (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData} margin={{ bottom: xAxisVariant === 'compact' ? 60 : 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                {renderXAxis(chartData)}
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={[0, 'auto']}
                tickFormatter={(value) => `${Number(value).toFixed(0)} MB`}
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
          ))}
          
          {/* Temps de Réponse & Erreurs - TEMPORAIREMENT DÉSACTIVÉ */}
          {false && renderChart(3, 'Temps de Réponse & Erreurs', '⚡', (
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ bottom: xAxisVariant === 'compact' ? 60 : 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                {renderXAxis(chartData)}
              <YAxis 
                yAxisId="left"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={[0, 'auto']}
                tickFormatter={(value) => `${value} ms`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={[0, 'auto']}
                tickFormatter={(value) => `${value}%`}
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
          ))}
          
          {/* Disponibilité - TEMPORAIREMENT DÉSACTIVÉ */}
          {false && renderChart(4, 'Disponibilité', '📊', (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ bottom: xAxisVariant === 'compact' ? 60 : 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                {renderXAxis(chartData)}
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                label={{ value: 'Disponibilité (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
                labelFormatter={(label: any) => {
                  if (!label) return '';
                  const item = chartData.find((d: any) => d.uniqueTime === label || d.time === label);
                  if (item && item.timestamp) {
                    const date = new Date(item.timestamp);
                    if (!Number.isNaN(date.getTime())) {
                      return date.toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                      });
                    }
                  }
                  return label;
                }}
                formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Disponibilité']}
              />
              <Line 
                type="monotone" 
                dataKey="availability" 
                stroke={COLORS.success} 
                strokeWidth={2}
                name="Disponibilité (%)"
                dot={false}
                connectNulls={false}
              />
              </LineChart>
            </ResponsiveContainer>
          ))}
        </div>
      {/* Fin du layout simplifié */}
    </div>
  );
});

// Composant Performance Tab avec chargement progressif
const PerformanceTab = memo(function PerformanceTab({ metrics, chartData, aggregatedStats, servicesList, loadingHistory, refreshing = false, initialHistoryLoaded = false, timeRange = '24h' }: any) {
  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'responseTime' | 'errorRate'>('cpu');
  // ✅ OPTIMISATION : États pour le chargement progressif des graphiques
  const [chart1Loaded, setChart1Loaded] = useState(false);
  const [chart2Loaded, setChart2Loaded] = useState(false);
  const [chart3Loaded, setChart3Loaded] = useState(false);

  // ✅ OPTIMISATION : Charger les graphiques progressivement
  useEffect(() => {
    if (chartData.length > 0 && initialHistoryLoaded) {
      // Charger le premier graphique immédiatement
      setChart1Loaded(true);
      
      // Charger le deuxième graphique après 300ms
      const timer2 = setTimeout(() => {
        setChart2Loaded(true);
      }, 300);
      
      // Charger le troisième graphique après 600ms
      const timer3 = setTimeout(() => {
        setChart3Loaded(true);
      }, 600);
      
      return () => {
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else {
      // Réinitialiser si les données changent
      setChart1Loaded(false);
      setChart2Loaded(false);
      setChart3Loaded(false);
    }
  }, [chartData.length, initialHistoryLoaded]);

  return (
    <div className="space-y-6">
      {/* Métriques de performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          title="Temps Réponse Moy."
          value={(() => {
            // ✅ CORRECTION : Utiliser monitoringC.avg_response_time_ms en priorité
            const responseTime = metrics?.monitoringC?.avg_response_time_ms !== undefined && metrics.monitoringC.avg_response_time_ms > 0
              ? metrics.monitoringC.avg_response_time_ms
              : aggregatedStats.avgResponseTime !== null && aggregatedStats.avgResponseTime > 0
              ? aggregatedStats.avgResponseTime
              : null
            return responseTime !== null ? formatMs(responseTime) : '...'
          })()}
          color="purple"
          loading={aggregatedStats.avgResponseTime === null && metrics?.monitoringC?.avg_response_time_ms === undefined}
        />

        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="Erreurs (5 min)"
          value={metrics?.monitoringC?.services_errors !== undefined
            ? metrics.monitoringC.services_errors
            : aggregatedStats.totalErrors || 0}
          color="orange"
        />

        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="Taux Erreur"
          value={(() => {
            // ✅ CORRECTION : Utiliser monitoringC.error_rate_per_min en priorité
            const errorRate = metrics?.monitoringC?.error_rate_per_min !== undefined && metrics.monitoringC.error_rate_per_min !== null
              ? metrics.monitoringC.error_rate_per_min
              : aggregatedStats.avgErrorRate !== null
              ? aggregatedStats.avgErrorRate
              : null
            return errorRate !== null ? `${errorRate.toFixed(2)}/min` : '...'
          })()}
          color="orange"
          loading={aggregatedStats.avgErrorRate === null && metrics?.monitoringC?.error_rate_per_min === undefined}
        />

        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          title="CPU Moyen Total"
          value={(() => {
            // ✅ CORRECTION : Utiliser monitoringC.avg_cpu_percent en priorité
            const cpuUsage = metrics?.monitoringC?.avg_cpu_percent !== undefined
              ? metrics.monitoringC.avg_cpu_percent
              : aggregatedStats.avgCpuUsage !== null
              ? aggregatedStats.avgCpuUsage
              : null
            return cpuUsage !== null ? `${Math.min(cpuUsage, 100).toFixed(1)}%` : '...'
          })()}
          color="blue"
          loading={aggregatedStats.avgCpuUsage === null && metrics?.monitoringC?.avg_cpu_percent === undefined}
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
          {/* Note: Les graphiques "CPU Moyen Total - Évolution temporelle" et "Évolution des Performances" ont été déplacés vers l'onglet Système > Projet */}
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
            {chart3Loaded && servicesList && servicesList.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                  data={servicesList
                    .map((s: any) => {
                      // ✅ CORRECTION : Essayer plusieurs sources pour le CPU
                      const cpu = toNumber(
                        s.metrics?.cpu?.percentage,
                        s.metrics?.cpu?.usage,
                        s.cpu_percent,
                        s.metrics?.cpu?.system,
                        0
                      )
                      return {
                        name: (s.displayName || s.name || s.rawName || 'Service inconnu').substring(0, 30),
                        cpu: Math.min(cpu, 100) // Limiter à 100%
                      }
                    })
                    .filter((item: any) => item.cpu > 0) // Filtrer après le map
                    .sort((a: any, b: any) => b.cpu - a.cpu) // ✅ NOUVEAU : Trier par CPU décroissant
                    .slice(0, 20)} // ✅ NOUVEAU : Limiter aux 20 services avec le plus de CPU
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
            ) : chart3Loaded ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Cpu className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucune donnée CPU disponible pour les services</p>
                {servicesList && <p className="text-xs mt-2">Services détectés: {servicesList.length}</p>}
              </div>
            ) : (
              <BarChartSkeleton height={400} />
            )}
          </div>

          {/* Temps de réponse - Évolution temporelle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              ⚡ Temps de Réponse Moyen - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="uniqueTime" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => {
                    const item = chartData[index];
                    if (!item) return '';
                    return formatXAxisLabel(item.time || value, index, chartData, timeRange);
                  }}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                  .map((s: any) => {
                    // ✅ CORRECTION : Essayer plusieurs sources pour temps de réponse
                    const responseTime = toNumber(
                      s.responseTimeMs || 
                      s.response_time_ms || 
                      s.metrics?.response_time_ms || 
                      0
                    )
                    return {
                      name: (s.displayName || s.name || s.rawName || 'Service inconnu').substring(0, 20),
                      responseTime: responseTime
                    }
                  })
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
                    .map((s: any) => {
                      // ✅ CORRECTION : Essayer plusieurs sources pour mémoire
                      const memory = toNumber(
                        s.memory_mb || 
                        s.memory_usage_mb || 
                        s.metrics?.memory?.usageMb || 
                        s.metrics?.memory_usage_mb || 
                        0
                      )
                      return {
                        name: (s.displayName || s.name || s.rawName || 'Service inconnu').substring(0, 20),
                        memory: memory
                      }
                    })
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
              <AreaChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="uniqueTime" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => {
                    const item = chartData[index];
                    if (!item) return '';
                    return formatXAxisLabel(item.time || value, index, chartData, timeRange);
                  }}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
            {(() => {
              // ✅ CORRECTION : Calculer la disponibilité depuis monitoringC en priorité
              const availability = metrics?.monitoringC?.availability_percent !== undefined
                ? metrics.monitoringC.availability_percent
                : metrics?.health?.availability_percent !== undefined
                ? metrics.health.availability_percent
                : (aggregatedStats.servicesTotal > 0
                  ? (aggregatedStats.servicesHealthy / aggregatedStats.servicesTotal) * 100
                  : null)
              return availability !== null && Number.isFinite(availability) ? availability.toFixed(1) : 'N/A'
            })()}%
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
              <AreaChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="uniqueTime" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => {
                    const item = chartData[index];
                    if (!item) return '';
                    return formatXAxisLabel(item.time || value, index, chartData, timeRange);
                  }}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                    // ✅ AMÉLIORATION : Essayer plusieurs sources pour les données réseau (monitoring-c en priorité)
                    const rx = toNumber(
                      s.network_rx_mb ||
                      s.networkMb?.rx || 
                      s.networkMb?.rx_mb || 
                      s.metrics?.network?.rx_mb || 
                      (s.metrics?.network?.rx_bytes ? (s.metrics.network.rx_bytes / 1024 / 1024) : 0) ||
                      (s.network_rx_bytes ? (s.network_rx_bytes / 1024 / 1024) : 0),
                      0
                    )
                    const tx = toNumber(
                      s.network_tx_mb ||
                      s.networkMb?.tx || 
                      s.networkMb?.tx_mb || 
                      s.metrics?.network?.tx_mb || 
                      (s.metrics?.network?.tx_bytes ? (s.metrics.network.tx_bytes / 1024 / 1024) : 0) ||
                      (s.network_tx_bytes ? (s.network_tx_bytes / 1024 / 1024) : 0),
                      0
                    )
                    return {
                      name: (s.displayName || s.name || s.rawName || 'Service inconnu').substring(0, 20),
                      rx: Math.max(0, rx),
                      tx: Math.max(0, tx),
                      total: rx + tx
                    }
                  })
                  .filter((item: any) => item.total > 0) // ✅ AMÉLIORATION : Filtrer les services sans trafic
                  .sort((a: any, b: any) => (b.total || 0) - (a.total || 0))
                  .slice(0, 20)} // ✅ AMÉLIORATION : Limiter aux 20 services avec le plus de trafic
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

// Composant System Tab avec sous-onglets Système/Projet
const SystemTab = memo(function SystemTab({ metrics, chartData, aggregatedStats, loadingHistory, initialHistoryLoaded = false, refreshing = false, timeRange = '24h' }: any) {
  const [systemSubTab, setSystemSubTab] = useState<'system' | 'project'>('system');
  
  return (
    <div className="space-y-6">
      {/* ✅ NOUVEAU : Sous-onglets Système / Projet */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setSystemSubTab('system')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            systemSubTab === 'system'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Système
        </button>
        <button
          onClick={() => setSystemSubTab('project')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            systemSubTab === 'project'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Projet
        </button>
      </div>
      
      {systemSubTab === 'system' ? (
        <SystemMetricsView metrics={metrics} chartData={chartData} aggregatedStats={aggregatedStats} loadingHistory={loadingHistory} initialHistoryLoaded={initialHistoryLoaded} refreshing={refreshing} timeRange={timeRange} />
      ) : (
        <ProjectMetricsView metrics={metrics} chartData={chartData} aggregatedStats={aggregatedStats} loadingHistory={loadingHistory} initialHistoryLoaded={initialHistoryLoaded} refreshing={refreshing} timeRange={timeRange} />
      )}
    </div>
  );
});

// Composant pour les métriques Système
const SystemMetricsView = memo(function SystemMetricsView({ metrics, chartData, aggregatedStats, loadingHistory, initialHistoryLoaded = false, refreshing = false, timeRange = '24h' }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques système principales - Style gradient comme Synthèse */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {(() => {
          const cpuUsage = metrics?.monitoringC?.avg_cpu_percent !== undefined && metrics.monitoringC.avg_cpu_percent !== null
            ? metrics.monitoringC.avg_cpu_percent
            : aggregatedStats.avgCpuUsage !== null
            ? aggregatedStats.avgCpuUsage
            : null
          const cpuColors = getCpuMemoryColor(cpuUsage, true)
          
          return (
            <div className={`bg-gradient-to-br ${cpuColors.bg} rounded-lg p-4 ${cpuColors.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CPU Moyen</span>
                <Cpu className={`w-5 h-5 ${cpuColors.text}`} />
              </div>
              <div className={`text-2xl font-bold ${cpuColors.text}`}>
                {cpuUsage !== null ? `${Math.min(cpuUsage, 100).toFixed(1)}%` : '...'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {metrics?.system?.cpu?.cores && metrics.system.cpu.cores !== 'N/A'
                  ? `${metrics.system.cpu.cores} cores`
                  : 'Système global'}
              </div>
            </div>
          )
        })()}
        
        {(() => {
          const memoryPercent = metrics?.system?.memory?.usage_percent !== undefined
            ? metrics.system.memory.usage_percent
            : (aggregatedStats.totalMemoryMb !== null && metrics?.system?.memory?.total_mb
              ? (aggregatedStats.totalMemoryMb / metrics.system.memory.total_mb) * 100
              : null)
          const memoryColors = getCpuMemoryColor(memoryPercent, false)
          const usedMb = metrics?.system?.memory?.used_mb || aggregatedStats.totalMemoryMb || 0
          const totalMb = metrics?.system?.memory?.total_mb || 0
          const freeMb = totalMb > 0 ? totalMb - usedMb : 0
          
          return (
            <div className={`bg-gradient-to-br ${memoryColors.bg} rounded-lg p-4 ${memoryColors.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mémoire Moyenne</span>
                <MemoryStick className={`w-5 h-5 ${memoryColors.text}`} />
              </div>
              <div className={`text-2xl font-bold ${memoryColors.text}`}>
                {memoryPercent !== null ? `${memoryPercent.toFixed(1)}%` : '...'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex justify-between">
                <span>
                  {usedMb > 0 && totalMb > 0 ? `${formatMb(usedMb)} / ${formatMb(totalMb)}` : ''}
                </span>
                {freeMb > 0 && totalMb > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    {formatMb(freeMb)} disponible
                  </span>
                )}
              </div>
            </div>
          )
        })()}
        
        {(() => {
          const responseTime = aggregatedStats.avgResponseTime !== null ? aggregatedStats.avgResponseTime : null
          const responseTimeColors = responseTime !== null && responseTime > 0
            ? getCpuMemoryColor(responseTime / 10, false)
            : getCpuMemoryColor(null, false)
          
          return (
            <div className={`bg-gradient-to-br ${responseTimeColors.bg} rounded-lg p-4 ${responseTimeColors.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Temps Réponse Moy.</span>
                <Clock className={`w-5 h-5 ${responseTimeColors.text}`} />
              </div>
              <div className={`text-2xl font-bold ${responseTimeColors.text}`}>
                {responseTime !== null ? formatMs(responseTime) : '...'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {aggregatedStats.servicesTotal > 0
                  ? `${aggregatedStats.servicesHealthy} / ${aggregatedStats.servicesTotal} services`
                  : ''}
              </div>
            </div>
          )
        })()}
        
        {(() => {
          const availability = aggregatedStats.servicesTotal > 0 
            ? ((aggregatedStats.servicesHealthy / aggregatedStats.servicesTotal) * 100)
            : null
          const availabilityColors = getAvailabilityColor(availability)
          
          return (
            <div className={`bg-gradient-to-br ${availabilityColors.bg} rounded-lg p-4 ${availabilityColors.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Disponibilité</span>
                <Activity className={`w-5 h-5 ${availabilityColors.text}`} />
              </div>
              <div className={`text-2xl font-bold ${availabilityColors.text}`}>
                {availability !== null ? `${availability.toFixed(1)}%` : '...'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {aggregatedStats.servicesHealthy || 0} / {aggregatedStats.servicesTotal || 0} services sains
              </div>
            </div>
          )
        })()}
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
              <AreaChart data={chartData} margin={{ bottom: 80, right: 20 }}>
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
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
              <AreaChart data={chartData} margin={{ bottom: 80, right: 20 }}>
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
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
              <ComposedChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="cpu"
                  stroke={COLORS.cpuSystem} 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'CPU (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]}
                />
                <YAxis 
                  yAxisId="load"
                  orientation="right"
                  stroke={COLORS.systemLoad} 
                  style={{ fontSize: '12px' }}
                  label={{ value: 'Charge', angle: 90, position: 'insideRight' }}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelFormatter={(label: any) => {
                    if (!label) return '';
                    const item = chartData.find((d: any) => d.time === label);
                    if (item && item.timestamp) {
                      return formatTimestamp(new Date(item.timestamp).toISOString(), timeRange);
                    }
                    return label;
                  }}
                />
                <Legend />
                {/* ✅ CORRECTION : Utiliser des lignes au lieu de barres pour meilleure lisibilité */}
                <Line 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={COLORS.cpuSystem}
                  strokeWidth={2}
                  name="CPU Système (%)"
                  yAxisId="cpu"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="memoryPercent" 
                  stroke={COLORS.memorySystem}
                  strokeWidth={2}
                  name="Mémoire Système (%)"
                  yAxisId="cpu"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="project_cpu_avg" 
                  stroke={COLORS.cpuProject}
                  strokeWidth={2}
                  name="CPU Projet (%)"
                  yAxisId="cpu"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="project_memory_percent" 
                  stroke={COLORS.memoryProject}
                  strokeWidth={2}
                  name="Mémoire Projet (%)"
                  yAxisId="cpu"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="load_1" 
                  stroke={COLORS.systemLoad}
                  strokeWidth={3}
                  name="Charge Système (load_1)"
                  yAxisId="load"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={false}
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

// Composant pour les métriques Projet
const ProjectMetricsView = memo(function ProjectMetricsView({ metrics, chartData, aggregatedStats, loadingHistory, initialHistoryLoaded = false, refreshing = false, timeRange = '24h' }: any) {
  return (
    <div className="space-y-6">
      {/* Métriques projet principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          title="CPU Projet"
          value={metrics?.system?.jobbingtrack?.containers?.cpu?.averagePercent !== undefined
            ? `${metrics.system.jobbingtrack.containers.cpu.averagePercent.toFixed(1)}%`
            : metrics?.monitoringC?.project_cpu_avg !== undefined
            ? `${metrics.monitoringC.project_cpu_avg.toFixed(1)}%`
            : (chartData.length > 0 && chartData[chartData.length - 1]?.project_cpu_avg !== undefined
              ? `${chartData[chartData.length - 1].project_cpu_avg.toFixed(1)}%`
              : '...')}
          color="pink"
          loading={metrics?.system?.jobbingtrack?.containers?.cpu?.averagePercent === undefined && metrics?.monitoringC?.project_cpu_avg === undefined}
        />
        <StatCard
          icon={<MemoryStick className="w-5 h-5" />}
          title="Mémoire Projet"
          value={(() => {
            const memoryPercent = metrics?.system?.jobbingtrack?.containers?.memory?.percent_of_system !== undefined
              ? metrics.system.jobbingtrack.containers.memory.percent_of_system
              : (chartData.length > 0 && chartData[chartData.length - 1]?.project_memory_mb !== undefined && metrics?.system?.memory?.total_mb
                ? (chartData[chartData.length - 1].project_memory_mb / metrics.system.memory.total_mb) * 100
                : null)
            return memoryPercent !== null ? `${memoryPercent.toFixed(1)}%` : '...'
          })()}
          subtitle={metrics?.system?.jobbingtrack?.containers?.memory?.used && metrics?.system?.memory?.total_mb
            ? `${formatMb(metrics.system.jobbingtrack.containers.memory.used)} / ${formatMb(metrics.system.memory.total_mb)} système`
            : ''}
          color="green"
          loading={metrics?.system?.jobbingtrack?.containers?.memory?.percent_of_system === undefined}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          title="Conteneurs Projet"
          value={metrics?.system?.jobbingtrack?.containers?.count || 0}
          subtitle="JobbingTrack"
          color="purple"
        />
        <StatCard
          icon={<Network className="w-5 h-5" />}
          title="Réseau Projet"
          value={(() => {
            const projectNetwork = metrics?.system?.jobbingtrack?.containers?.network
            if (projectNetwork?.total_mb !== undefined) {
              return formatMb(projectNetwork.total_mb)
            }
            return '...'
          })()}
          subtitle={metrics?.system?.jobbingtrack?.containers?.network
            ? `RX: ${formatMb(metrics.system.jobbingtrack.containers.network.rx_mb || 0)} / TX: ${formatMb(metrics.system.jobbingtrack.containers.network.tx_mb || 0)}`
            : ''}
          color="orange"
        />
      </div>

      {/* Graphiques projet */}
      {chartData.length > 0 && initialHistoryLoaded && (
        <div className="space-y-6 relative">
          {refreshing && (
            <div className="absolute top-0 right-0 z-10 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-bl-lg flex items-center gap-1">
              <Activity className="w-3 h-3 animate-spin" />
              <span>Actualisation...</span>
            </div>
          )}
          {/* CPU Moyen Total - Évolution temporelle */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU Moyen Total - Évolution temporelle
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="uniqueTime" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => {
                    const item = chartData[index];
                    if (!item) return '';
                    return formatXAxisLabel(item.time || value, index, chartData, timeRange);
                  }}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                  labelFormatter={(label: any) => {
                    if (!label) return '';
                    const item = chartData.find((d: any) => d.time === label || d.uniqueTime === label);
                    if (item && item.timestamp) {
                      const date = new Date(item.timestamp);
                      if (!Number.isNaN(date.getTime())) {
                        return date.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        });
                      }
                    }
                    return label;
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

          {/* Évolution des Performances */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              📈 Évolution des Performances
            </h3>
            {chartData.length > 0 && chartData.some((d: any) => d.responseTime > 0 || d.cpu > 0 || d.memory > 0) ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                    interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
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
                    labelFormatter={(label: any) => {
                      if (!label) return '';
                      const item = chartData.find((d: any) => d.time === label || d.uniqueTime === label);
                      if (item && item.timestamp) {
                        const date = new Date(item.timestamp);
                        if (!Number.isNaN(date.getTime())) {
                          return date.toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                          });
                        }
                      }
                      return label;
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

          {/* CPU Projet */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              💻 CPU Projet
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 'auto']} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelFormatter={(label: any) => {
                    if (!label) return '';
                    const item = chartData.find((d: any) => d.time === label || d.uniqueTime === label);
                    if (item && item.timestamp) {
                      const date = new Date(item.timestamp);
                      if (!Number.isNaN(date.getTime())) {
                        return date.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        });
                      }
                    }
                    return label;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="project_cpu_avg" 
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="CPU Projet (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Mémoire Projet */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              🧠 Mémoire Projet
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData} margin={{ bottom: 80, right: 20 }}>
                <defs>
                  <linearGradient id="colorMemoryProject" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value, index) => formatXAxisLabel(value, index, chartData, timeRange)}
                  interval={(() => {
                    // ✅ CORRECTION : Calculer l'intervalle pour afficher un nombre raisonnable de labels
                    let targetLabels = 8;
                    if (timeRange === '1h') targetLabels = 6;
                    else if (timeRange === '6h') targetLabels = 6;
                    else if (timeRange === '24h') targetLabels = 12;
                    else if (timeRange === '7d') targetLabels = 14;
                    else if (timeRange === '30d') targetLabels = 15;
                    
                    const calculatedInterval = Math.max(0, Math.floor(chartData.length / targetLabels));
                    return calculatedInterval;
                  })()}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} domain={[0, 'auto']} tickFormatter={(value) => `${Number(value).toFixed(0)} MB`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  labelFormatter={(label: any) => {
                    if (!label) return '';
                    const item = chartData.find((d: any) => d.time === label || d.uniqueTime === label);
                    if (item && item.timestamp) {
                      const date = new Date(item.timestamp);
                      if (!Number.isNaN(date.getTime())) {
                        return date.toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                        });
                      }
                    }
                    return label;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="project_memory_mb" 
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorMemoryProject)"
                  name="Mémoire Projet (MB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
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
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
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
    if (Math.abs(trendValue) < 0.1) return '0.0%'
    if (Math.abs(trendValue) < 1) return `${trendValue.toFixed(1)}%`
    return `${trendValue.toFixed(0)}%`
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
