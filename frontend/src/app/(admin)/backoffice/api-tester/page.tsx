'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Play, Terminal, Copy, Check, Settings, History, Save, Download, Upload, X, Plus, Trash2, Clock, ChevronDown, ChevronUp, Info, RotateCcw } from '@/lib/icons';
import axios from 'axios';
import { useAuth } from '@/lib/hooks/auth';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:5002';

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

interface QuickEndpoint {
  label: string;
  value: string;
  category: string;
}

interface RequestHistory {
  id: string;
  method: string;
  endpoint: string;
  timestamp: Date;
  status?: number;
  duration?: number;
  headers?: string;
  body?: string;
  queryParams?: QueryParam[];
  originalEndpoint?: string; // Endpoint sans query params
}

export default function APITesterPage() {
  const { token } = useAuth();
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState(`${API_GATEWAY_URL}/health`);
  const [headers, setHeaders] = useState('{\n  "Authorization": "Bearer YOUR_TOKEN",\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState('{\n  \n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // ✅ Nouvelles fonctionnalités
  const [queryParams, setQueryParams] = useState<QueryParam[]>([
    { key: '', value: '', enabled: true }
  ]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeout, setTimeout] = useState(30000);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [validateSSL, setValidateSSL] = useState(true);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [requestDuration, setRequestDuration] = useState<number | null>(null);
  const [curlCommand, setCurlCommand] = useState('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<RequestHistory | null>(null);
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    health: true,
    system: false,
    auth: false,
    applications: false,
    interviews: false,
    events: false,
    profiles: false,
    dashboard: false,
    workflows: false,
    deployment: false,
  });

  // ✅ Charger l'historique depuis localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('api_tester_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Erreur chargement historique:', e);
      }
    }
  }, []);

  // ✅ Remplir automatiquement le token dans les headers au chargement
  useEffect(() => {
    if (token) {
      try {
        const parsedHeaders = JSON.parse(headers);
        // Remplacer seulement si c'est le token par défaut ou s'il n'y a pas de token
        if (parsedHeaders['Authorization'] === 'Bearer YOUR_TOKEN' || 
            !parsedHeaders['Authorization'] || 
            parsedHeaders['Authorization'].includes('YOUR_TOKEN')) {
          parsedHeaders['Authorization'] = `Bearer ${token}`;
          setHeaders(JSON.stringify(parsedHeaders, null, 2));
        }
      } catch (e) {
        // Si les headers ne sont pas un JSON valide, les remplacer
        setHeaders(JSON.stringify({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }, null, 2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Seulement quand le token change (pas headers pour éviter la boucle)

  // ✅ Générer la commande cURL
  useEffect(() => {
    generateCurlCommand();
  }, [method, endpoint, headers, body, queryParams]);

  const generateCurlCommand = () => {
    try {
      let curl = `curl -X ${method}`;
      
      // Headers
      const parsedHeaders = JSON.parse(headers);
      Object.entries(parsedHeaders).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
      
      // Body
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        curl += ` \\\n  -d '${body.replace(/\n/g, ' ')}'`;
      }
      
      // Query params
      const activeParams = queryParams.filter(p => p.enabled && p.key && p.value);
      if (activeParams.length > 0) {
        const params = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
        curl += ` \\\n  "${endpoint}?${params}"`;
      } else {
        curl += ` \\\n  "${endpoint}"`;
      }
      
      setCurlCommand(curl);
    } catch (e) {
      setCurlCommand('');
    }
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '', enabled: true }]);
  };

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index));
  };

  const updateQueryParam = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], [field]: value };
    setQueryParams(updated);
  };

  const handleTest = async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      setResponse(null);
      setRequestDuration(null);
      
      // Validation de l'endpoint
      if (!endpoint || endpoint.trim() === '') {
        setResponse({
          error: true,
          message: 'Veuillez saisir un endpoint valide',
          status: 400,
        });
        return;
      }
      
      // Vérifier que l'endpoint ne se termine pas par un slash seul (sauf si c'est la racine)
      let cleanEndpoint = endpoint.trim();
      if (cleanEndpoint.endsWith('/api/v1/') || cleanEndpoint.endsWith('/api/v1')) {
        setResponse({
          error: true,
          message: 'Endpoint incomplet. Veuillez spécifier une ressource (ex: /api/v1/health, /api/v1/users)',
          status: 400,
        });
        return;
      }
      
      // Ajouter les query parameters
      const activeParams = queryParams.filter(p => p.enabled && p.key && p.value);
      if (activeParams.length > 0) {
        const params = new URLSearchParams();
        activeParams.forEach(p => {
          params.append(p.key, p.value);
        });
        const separator = cleanEndpoint.includes('?') ? '&' : '?';
        cleanEndpoint += `${separator}${params.toString()}`;
      }
      
      let parsedHeaders: any = {};
      try {
        parsedHeaders = headers ? JSON.parse(headers) : {};
      } catch (e) {
        setResponse({
          error: true,
          message: 'Headers JSON invalide',
          status: 400,
        });
        return;
      }
      
      // ✅ Injecter automatiquement le token si disponible et pas déjà présent
      if (token && (!parsedHeaders['Authorization'] || parsedHeaders['Authorization'].includes('YOUR_TOKEN'))) {
        parsedHeaders['Authorization'] = `Bearer ${token}`;
      }
      
      // ✅ S'assurer que Content-Type est défini pour les requêtes avec body
      if (['POST', 'PUT', 'PATCH'].includes(method) && body && !parsedHeaders['Content-Type']) {
        parsedHeaders['Content-Type'] = 'application/json';
      }
      
      const config: any = {
        method,
        url: cleanEndpoint,
        headers: parsedHeaders,
        timeout: timeout,
        maxRedirects: followRedirects ? 5 : 0,
        validateStatus: () => true, // Ne pas rejeter sur les codes d'erreur
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        try {
          config.data = JSON.parse(body);
        } catch (e) {
          setResponse({
            error: true,
            message: 'Body JSON invalide',
            status: 400,
          });
          return;
        }
      }
      
      const result = await axios(config);
      const duration = Date.now() - startTime;
      setRequestDuration(duration);
      
      const responseData = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: result.data,
        duration,
      };
      
      setResponse(responseData);
      
      // ✅ Ajouter à l'historique avec tous les détails
      const historyItem: RequestHistory = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        method,
        endpoint: cleanEndpoint,
        originalEndpoint: endpoint.trim(), // Endpoint original sans query params
        timestamp: new Date(),
        status: result.status,
        duration,
        headers: headers,
        body: body,
        queryParams: queryParams.filter(p => p.enabled && p.key && p.value),
      };
      const newHistory = [historyItem, ...history].slice(0, 50); // Garder les 50 dernières
      setHistory(newHistory);
      localStorage.setItem('api_tester_history', JSON.stringify(newHistory));
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setRequestDuration(duration);

      // ✅ Améliorer les messages d'erreur pour l'authentification
      let errorMessage = error.message;
      let errorData = error.response?.data || null;
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        errorMessage = error.response?.data?.message || error.response?.data?.error || 'Authentification requise';
        if (!errorData) {
          errorData = { error: errorMessage, message: 'Vérifiez que votre token est valide et présent dans les headers' };
        }
      } else if (error.response?.status === 500) {
        errorMessage = error.response?.data?.message || error.response?.data?.error || 'Erreur serveur (500)';
        if (error.response?.data?.error?.includes('Token') || error.response?.data?.error?.includes('token')) {
          errorMessage = 'Erreur d\'authentification : Token invalide ou expiré';
          errorData = { 
            ...errorData, 
            hint: 'Vérifiez que le token est correctement injecté dans les headers (bouton "Injecter Token")' 
          };
        }
      }

      setResponse({
        error: true,
        message: errorMessage,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: errorData,
        duration,
      });
      
      // Ajouter à l'historique même en cas d'erreur avec tous les détails
      const historyItem: RequestHistory = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        method,
        endpoint: endpoint.trim(),
        originalEndpoint: endpoint.trim(),
        timestamp: new Date(),
        status: error.response?.status || 0,
        duration,
        headers: headers,
        body: body,
        queryParams: queryParams.filter(p => p.enabled && p.key && p.value),
      };
      const newHistory = [historyItem, ...history].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem('api_tester_history', JSON.stringify(newHistory));
    } finally {
      setLoading(false);
    }
  };

  const loadFromHistory = (item: RequestHistory) => {
    // Restaurer l'endpoint original (sans query params, ils seront ajoutés séparément)
    setEndpoint(item.originalEndpoint || item.endpoint.split('?')[0]);
    setMethod(item.method);
    
    // Restaurer les headers
    if (item.headers) {
      setHeaders(item.headers);
    }
    
    // Restaurer le body
    if (item.body) {
      setBody(item.body);
    }
    
    // Restaurer les query params
    if (item.queryParams && item.queryParams.length > 0) {
      setQueryParams(item.queryParams);
    } else {
      // Extraire les query params de l'endpoint si présents
      const url = new URL(item.endpoint);
      const params: QueryParam[] = [];
      url.searchParams.forEach((value, key) => {
        params.push({ key, value, enabled: true });
      });
      if (params.length > 0) {
        setQueryParams(params);
      } else {
        setQueryParams([{ key: '', value: '', enabled: true }]);
      }
    }
    
    setShowHistory(false);
  };

  const showHistoryDetailsModal = (item: RequestHistory) => {
    setSelectedHistoryItem(item);
    setShowHistoryDetails(true);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('api_tester_history');
  };

  const exportRequest = () => {
    const requestData = {
      method,
      endpoint,
      headers: JSON.parse(headers),
      body: body ? JSON.parse(body) : null,
      queryParams: queryParams.filter(p => p.enabled && p.key && p.value),
      timeout,
      followRedirects,
      validateSSL,
    };
    
    const blob = new Blob([JSON.stringify(requestData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-request-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importRequest = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.method) setMethod(data.method);
        if (data.endpoint) setEndpoint(data.endpoint);
        if (data.headers) setHeaders(JSON.stringify(data.headers, null, 2));
        if (data.body) setBody(JSON.stringify(data.body, null, 2));
        if (data.queryParams) setQueryParams(data.queryParams);
        if (data.timeout) setTimeout(data.timeout);
        if (data.followRedirects !== undefined) setFollowRedirects(data.followRedirects);
        if (data.validateSSL !== undefined) setValidateSSL(data.validateSSL);
      } catch (error) {
        alert('Erreur lors de l\'import du fichier');
      }
    };
    reader.readAsText(file);
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    window.setTimeout(() => { setCopied(false); }, 2000);
  };

  // ✅ Configuration des services avec leurs ports (API Gateway exclu car déjà dans quickEndpoints)
  const servicesConfig = [
    { name: 'Auth Service', port: 5005, healthPath: '/api/v1/auth/health', basePath: '/api/v1/auth' },
    { name: 'Application Service', port: 5006, healthPath: '/api/v1/applications/health', basePath: '/api/v1/applications' },
    { name: 'Company Service', port: 5007, healthPath: '/api/v1/companies/health', basePath: '/api/v1/companies' },
    { name: 'Contact Service', port: 5008, healthPath: '/api/v1/contacts/health', basePath: '/api/v1/contacts' },
    { name: 'Interview Service', port: 5009, healthPath: '/api/v1/interviews/health', basePath: '/api/v1/interviews' },
    { name: 'Call Service', port: 5010, healthPath: '/api/v1/calls/health', basePath: '/api/v1/calls' },
    { name: 'Event Service', port: 5011, healthPath: '/api/v1/events/health', basePath: '/api/v1/events' },
    { name: 'Followup Service', port: 5012, healthPath: '/api/v1/followups/health', basePath: '/api/v1/followups' },
    { name: 'Profile Service', port: 5013, healthPath: '/api/v1/profile/health', basePath: '/api/v1/profile' },
    { name: 'Notification Service', port: 5014, healthPath: '/api/v1/notifications/health', basePath: '/api/v1/notifications' },
    { name: 'Dashboard Service', port: 5015, healthPath: '/api/v1/dashboard/health', basePath: '/api/v1/dashboard' },
    { name: 'Workflow Service', port: 5016, healthPath: '/api/v1/workflow/health', basePath: '/api/v1/workflow' },
    { name: 'Security Service', port: 5017, healthPath: '/health', basePath: '/api/v1/security' },
    { name: 'Deployment Service', port: 5018, healthPath: '/health', basePath: '/api/v1/deployment' },
    { name: 'Metrics Aggregator', port: 5004, healthPath: '/api/v1/health', basePath: '/api/v1' },
  ];

  const quickEndpoints = [
    // ✅ Health Checks - API Gateway
    { label: 'Health Check (Gateway)', value: `${API_GATEWAY_URL}/health`, category: 'health' },
    
    // ✅ Health Checks - Tous les services (ports directs)
    ...servicesConfig.map(s => ({
      label: `Health: ${s.name}`,
      value: `http://localhost:${s.port}${s.healthPath}`,
      category: 'health'
    })),
    
    // Système
    { label: 'Services', value: `${API_GATEWAY_URL}/api/v1/services`, category: 'system' },
    { label: 'Métriques', value: `${API_GATEWAY_URL}/metrics`, category: 'system' },
    
    // Authentification & Utilisateurs
    { label: 'Utilisateurs', value: `${API_GATEWAY_URL}/api/v1/users`, category: 'auth' },
    { label: 'Profil', value: `${API_GATEWAY_URL}/api/v1/auth/profile`, category: 'auth' },
    { label: 'Vérifier Token', value: `${API_GATEWAY_URL}/api/v1/auth/verify`, category: 'auth' },
    { label: 'Login', value: `${API_GATEWAY_URL}/api/v1/auth/login`, category: 'auth' },
    { label: 'Register', value: `${API_GATEWAY_URL}/api/v1/auth/register`, category: 'auth' },
    
    // Applications & Entreprises
    { label: 'Applications', value: `${API_GATEWAY_URL}/api/v1/applications`, category: 'applications' },
    { label: 'Entreprises', value: `${API_GATEWAY_URL}/api/v1/companies`, category: 'applications' },
    { label: 'Contacts', value: `${API_GATEWAY_URL}/api/v1/contacts`, category: 'applications' },
    { label: 'Recherche Applications', value: `${API_GATEWAY_URL}/api/v1/applications/search`, category: 'applications' },
    { label: 'Recherche Entreprises', value: `${API_GATEWAY_URL}/api/v1/companies/search`, category: 'applications' },
    
    // Entretiens & Appels
    { label: 'Entretiens', value: `${API_GATEWAY_URL}/api/v1/interviews`, category: 'interviews' },
    { label: 'Entretiens Aujourd\'hui', value: `${API_GATEWAY_URL}/api/v1/interviews/today`, category: 'interviews' },
    { label: 'Entretiens À Venir', value: `${API_GATEWAY_URL}/api/v1/interviews/upcoming`, category: 'interviews' },
    { label: 'Appels', value: `${API_GATEWAY_URL}/api/v1/calls`, category: 'interviews' },
    { label: 'Historique Appels', value: `${API_GATEWAY_URL}/api/v1/calls/history`, category: 'interviews' },
    
    // Événements & Suivi
    { label: 'Événements', value: `${API_GATEWAY_URL}/api/v1/events`, category: 'events' },
    { label: 'Événements Aujourd\'hui', value: `${API_GATEWAY_URL}/api/v1/events/today`, category: 'events' },
    { label: 'Calendrier Événements', value: `${API_GATEWAY_URL}/api/v1/events/calendar`, category: 'events' },
    { label: 'Relances', value: `${API_GATEWAY_URL}/api/v1/followups`, category: 'events' },
    { label: 'Relances En Retard', value: `${API_GATEWAY_URL}/api/v1/followups/overdue`, category: 'events' },
    { label: 'Relances À Faire', value: `${API_GATEWAY_URL}/api/v1/followups/due`, category: 'events' },
    
    // Profils & Notifications
    { label: 'Mon Profil', value: `${API_GATEWAY_URL}/api/v1/profiles/me`, category: 'profiles' },
    { label: 'Préférences', value: `${API_GATEWAY_URL}/api/v1/profiles/preferences`, category: 'profiles' },
    { label: 'Paramètres', value: `${API_GATEWAY_URL}/api/v1/profiles/settings`, category: 'profiles' },
    { label: 'Notifications', value: `${API_GATEWAY_URL}/api/v1/notifications`, category: 'profiles' },
    { label: 'Paramètres Notifications', value: `${API_GATEWAY_URL}/api/v1/notifications/settings`, category: 'profiles' },
    
    // Dashboard & Analytics
    { label: 'Dashboard Overview', value: `${API_GATEWAY_URL}/api/v1/dashboard/overview`, category: 'dashboard' },
    { label: 'Dashboard Analytics', value: `${API_GATEWAY_URL}/api/v1/dashboard/analytics`, category: 'dashboard' },
    { label: 'Dashboard Métriques', value: `${API_GATEWAY_URL}/api/v1/dashboard/metrics`, category: 'dashboard' },
    { label: 'Statistiques', value: `${API_GATEWAY_URL}/api/v1/statistics`, category: 'dashboard' },
    { label: 'Analytics Sessions', value: `${API_GATEWAY_URL}/api/v1/analytics/sessions`, category: 'dashboard' },
    { label: 'Analytics Events', value: `${API_GATEWAY_URL}/api/v1/analytics/events`, category: 'dashboard' },
    
    // Workflows & Sécurité
    { label: 'Workflows', value: `${API_GATEWAY_URL}/api/v1/workflows`, category: 'workflows' },
    { label: 'Exécuter Workflow', value: `${API_GATEWAY_URL}/api/v1/workflows/{id}/execute`, category: 'workflows' },
    { label: 'Audit Sécurité', value: `${API_GATEWAY_URL}/api/v1/security/audit`, category: 'workflows' },
    { label: 'Alertes Sécurité', value: `${API_GATEWAY_URL}/api/v1/security/alerts`, category: 'workflows' },
    { label: 'Sessions Actives', value: `${API_GATEWAY_URL}/api/v1/security/sessions`, category: 'workflows' },
    
    // Déploiement & Monitoring
    { label: 'Status Déploiement', value: `${API_GATEWAY_URL}/api/v1/deployment/status`, category: 'deployment' },
    { label: 'Services Déploiement', value: `${API_GATEWAY_URL}/api/v1/deployment/services`, category: 'deployment' },
    { label: 'Health Déploiement', value: `${API_GATEWAY_URL}/api/v1/deployment/health`, category: 'deployment' },
    { label: 'Métriques Système', value: `${API_GATEWAY_URL}/api/v1/system-metrics`, category: 'deployment' },
    { label: 'Historique Déploiement', value: `${API_GATEWAY_URL}/api/v1/deployment/history`, category: 'deployment' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Terminal className="h-8 w-8" />
            Testeur d'API
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Testez vos endpoints API directement depuis le backoffice
          </p>
        </div>

        {/* Actions rapides */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            Historique ({history.length})
          </button>
          <button
            onClick={exportRequest}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
          <label className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 cursor-pointer">
            <Upload className="h-4 w-4" />
            Importer
            <input type="file" accept=".json" onChange={importRequest} className="hidden" />
          </label>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Options {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Historique */}
        {showHistory && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Historique des requêtes</h3>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Effacer
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun historique</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          item.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                          item.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          item.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          item.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {item.method}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                          {item.endpoint}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        {item.status && (
                          <span className={`px-2 py-1 rounded ${
                            item.status >= 200 && item.status < 300 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            item.status >= 400 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {item.status}
                          </span>
                        )}
                        {item.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.duration}ms
                          </span>
                        )}
                        <span>{new Date(item.timestamp).toLocaleTimeString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Endpoints - Organisés par catégorie */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Endpoints rapides :</p>
            
            {/* Health Checks */}
            <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, health: !prev.health }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  🏥 Health Checks
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({quickEndpoints.filter(ep => ep.category === 'health').length})
                  </span>
                </h3>
                {expandedCategories.health ? (
                  <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {expandedCategories.health && (
                <div className="p-3 flex flex-wrap gap-2">
                  {quickEndpoints.filter(ep => ep.category === 'health').map((ep, index) => (
                    <button
                      key={`health-${ep.label}-${index}`}
                      onClick={() => setEndpoint(ep.value)}
                      className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Système */}
            <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, system: !prev.system }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  ⚙️ Système
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({quickEndpoints.filter(ep => ep.category === 'system').length})
                  </span>
                </h3>
                {expandedCategories.system ? (
                  <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {expandedCategories.system && (
                <div className="p-3 flex flex-wrap gap-2">
                  {quickEndpoints.filter(ep => ep.category === 'system').map((ep, index) => (
                    <button
                      key={`system-${ep.label}-${index}`}
                      onClick={() => setEndpoint(ep.value)}
                      className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Services par catégorie */}
            <div className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, auth: !prev.auth }))}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
              >
                <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  🔐 Authentification & Utilisateurs
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({quickEndpoints.filter(ep => ep.category === 'auth').length})
                  </span>
                </h3>
                {expandedCategories.auth ? (
                  <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              {expandedCategories.auth && (
                <div className="p-3 flex flex-wrap gap-2">
                  {quickEndpoints.filter(ep => ep.category === 'auth').map((ep, index) => (
                    <button
                      key={`auth-${ep.label}-${index}`}
                      onClick={() => setEndpoint(ep.value)}
                      className="px-3 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    >
                      {ep.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Autres catégories */}
            {['applications', 'interviews', 'events', 'profiles', 'dashboard', 'workflows', 'deployment'].map(category => {
              const categoryEndpoints = quickEndpoints.filter(ep => ep.category === category);
              if (categoryEndpoints.length === 0) return null;
              
              const categoryLabels: Record<string, string> = {
                applications: '📋 Applications & Entreprises',
                interviews: '🎤 Entretiens & Appels',
                events: '📅 Événements & Suivi',
                profiles: '👤 Profils & Notifications',
                dashboard: '📊 Dashboard & Analytics',
                workflows: '⚡ Workflows & Sécurité',
                deployment: '🚀 Déploiement & Monitoring'
              };
              
              const categoryColors: Record<string, string> = {
                applications: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50',
                interviews: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 hover:bg-pink-200 dark:hover:bg-pink-900/50',
                events: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-900/50',
                profiles: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
                dashboard: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-900/50',
                workflows: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50',
                deployment: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              };
              
              return (
                <div key={category} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                      {categoryLabels[category]}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({categoryEndpoints.length})
                      </span>
                    </h3>
                    {expandedCategories[category] ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </button>
                  {expandedCategories[category] && (
                    <div className="p-3 flex flex-wrap gap-2">
                      {categoryEndpoints.map((ep, index) => (
                        <button
                          key={`${category}-${ep.label}-${index}`}
                          onClick={() => setEndpoint(ep.value)}
                          className={`px-3 py-1 text-xs rounded-lg transition-colors ${categoryColors[category]}`}
                        >
                          {ep.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            {/* Method + Endpoint */}
            <div className="flex gap-4">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
              
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={`${API_GATEWAY_URL}/api/v1/...`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
              
              <button
                onClick={handleTest}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Play className="h-5 w-5" />
                {loading ? 'Test...' : 'Tester'}
              </button>
              
              {requestDuration !== null && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>{requestDuration}ms</span>
                </div>
              )}
            </div>

            {/* Query Parameters */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paramètres de requête (Query Parameters)
                </label>
                {queryParams.filter(p => p.enabled && p.key && p.value).length > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    {queryParams.filter(p => p.enabled && p.key && p.value).length} actif(s)
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {queryParams.map((param, index) => {
                  const isActive = param.enabled && param.key && param.value;
                  return (
                    <div 
                      key={index} 
                      className={`flex gap-2 items-center p-2 rounded-lg border-2 transition-all ${
                        isActive 
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-700' 
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          onChange={(e) => updateQueryParam(index, 'enabled', e.target.checked)}
                          className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                          title={param.enabled ? 'Désactiver ce paramètre' : 'Activer ce paramètre'}
                        />
                      </div>
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                        placeholder="Clé (ex: page, limit, status)"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                          isActive 
                            ? 'border-green-300 dark:border-green-700 bg-white dark:bg-gray-800' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      <span className={`font-semibold ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>=</span>
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                        placeholder="Valeur"
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                          isActive 
                            ? 'border-green-300 dark:border-green-700 bg-white dark:bg-gray-800' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {queryParams.length > 1 && (
                        <button
                          onClick={() => removeQueryParam(index)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer ce paramètre"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
                <div className="flex gap-2">
                  <button
                    onClick={addQueryParam}
                    className="flex-1 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un paramètre
                  </button>
                  {queryParams.length > 1 && (
                    <button
                      onClick={() => {
                        const allEnabled = queryParams.every(p => p.enabled);
                        setQueryParams(queryParams.map(p => ({ ...p, enabled: !allEnabled })));
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                      title={queryParams.every(p => p.enabled) ? 'Désactiver tous' : 'Activer tous'}
                    >
                      {queryParams.every(p => p.enabled) ? 'Désactiver tous' : 'Activer tous'}
                    </button>
                  )}
                </div>
                {queryParams.filter(p => p.enabled && p.key && p.value).length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                      Paramètres qui seront utilisés :
                    </p>
                    <code className="text-xs text-blue-700 dark:text-blue-300">
                      ?{queryParams
                        .filter(p => p.enabled && p.key && p.value)
                        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                        .join('&')}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Headers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Headers (JSON)
                </label>
                {token && (
                  <button
                    onClick={() => {
                      try {
                        const parsedHeaders = JSON.parse(headers);
                        parsedHeaders['Authorization'] = `Bearer ${token}`;
                        if (!parsedHeaders['Content-Type']) {
                          parsedHeaders['Content-Type'] = 'application/json';
                        }
                        setHeaders(JSON.stringify(parsedHeaders, null, 2));
                      } catch (e) {
                        // Si les headers ne sont pas un JSON valide, les remplacer
                        setHeaders(JSON.stringify({
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                        }, null, 2));
                      }
                    }}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                    title="Injecter automatiquement le token d'authentification"
                  >
                    🔑 Injecter Token
                  </button>
                )}
              </div>
              <textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-48 min-h-[200px] font-mono text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-y"
                style={{ minHeight: '200px' }}
              />
              {!token && (
                <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Vous n'êtes pas connecté. Certaines requêtes nécessitent une authentification.
                </p>
              )}
            </div>

            {/* Body */}
            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Body (JSON)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-64 min-h-[250px] font-mono text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 resize-y"
                  style={{ minHeight: '250px' }}
                />
              </div>
            )}

            {/* Options avancées */}
            {showAdvanced && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Options avancées</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={timeout}
                      onChange={(e) => setTimeout(parseInt(e.target.value) || 30000)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      min="1000"
                      step="1000"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={followRedirects}
                        onChange={(e) => setFollowRedirects(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Suivre les redirections</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={validateSSL}
                        onChange={(e) => setValidateSSL(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Valider SSL</span>
                    </label>
                  </div>
                </div>

                {/* Commande cURL */}
                {curlCommand && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Commande cURL
                    </label>
                    <div className="relative">
                      <textarea
                        value={curlCommand}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg h-32 font-mono text-xs bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(curlCommand);
                          setCopied(true);
                          window.setTimeout(() => setCopied(false), 2000);
                        }}
                        className="absolute top-2 right-2 p-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {response && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold">Réponse</h3>
                {response.status && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    response.status >= 200 && response.status < 300 
                      ? 'bg-green-600 text-white'
                      : response.status >= 400 && response.status < 500
                      ? 'bg-orange-600 text-white'
                      : response.status >= 500
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-600 text-white'
                  }`}>
                    {response.status} {response.statusText}
                  </span>
                )}
              </div>
              <button
                onClick={copyResponse}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copier
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-auto text-sm">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {/* Modal Détails de la Requête */}
        {showHistoryDetails && selectedHistoryItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Détails de la Requête
                </h3>
                <button
                  onClick={() => {
                    setShowHistoryDetails(false);
                    setSelectedHistoryItem(null);
                  }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {/* Informations générales */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Informations Générales</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Méthode :</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                        selectedHistoryItem.method === 'GET' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        selectedHistoryItem.method === 'POST' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        selectedHistoryItem.method === 'PUT' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                        selectedHistoryItem.method === 'DELETE' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedHistoryItem.method}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Statut :</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                        selectedHistoryItem.status && selectedHistoryItem.status >= 200 && selectedHistoryItem.status < 300 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                        selectedHistoryItem.status && selectedHistoryItem.status >= 400 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {selectedHistoryItem.status || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Durée :</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {selectedHistoryItem.duration ? `${selectedHistoryItem.duration}ms` : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Date :</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">
                        {new Date(selectedHistoryItem.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Endpoint */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Endpoint</h4>
                  <code className="block p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-gray-100 break-all">
                    {selectedHistoryItem.endpoint}
                  </code>
                </div>

                {/* Query Parameters */}
                {selectedHistoryItem.queryParams && selectedHistoryItem.queryParams.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Paramètres de Requête</h4>
                    <div className="space-y-2">
                      {selectedHistoryItem.queryParams.map((param, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-900 dark:text-gray-100">
                            {param.key}
                          </code>
                          <span className="text-gray-600 dark:text-gray-400">=</span>
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-900 dark:text-gray-100">
                            {param.value}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Headers */}
                {selectedHistoryItem.headers && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Headers</h4>
                    <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-900 dark:text-gray-100 overflow-x-auto">
                      {selectedHistoryItem.headers}
                    </pre>
                  </div>
                )}

                {/* Body */}
                {selectedHistoryItem.body && selectedHistoryItem.body.trim() !== '' && selectedHistoryItem.body !== '{\n  \n}' && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Body</h4>
                    <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-900 dark:text-gray-100 overflow-x-auto max-h-64 overflow-y-auto">
                      {selectedHistoryItem.body}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setShowHistoryDetails(false);
                    setSelectedHistoryItem(null);
                  }}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    loadFromHistory(selectedHistoryItem);
                    setShowHistoryDetails(false);
                    setSelectedHistoryItem(null);
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Réutiliser cette requête
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

