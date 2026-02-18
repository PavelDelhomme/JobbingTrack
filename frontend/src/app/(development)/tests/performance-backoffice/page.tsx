'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import {
  Play,
  Square,
  Download,
  Settings,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  Target,
  Layers,
  Search,
  Filter,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Eye,
  Maximize2,
  ExternalLink,
  Camera,
  Clock as ClockIcon,
  BarChart3,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Database,
  Server,
  Monitor,
  Smartphone,
  Chrome,
  Globe,
  BookOpen,
  Lightbulb,
  Users,
  Building,
  Briefcase,
  Shield,
  // Lightning,
  AlertCircle,
  Check,
  X,
  MoreHorizontal,
  Split,
  Maximize,
  Minimize,
  Sidebar,
  PanelRight,
  PanelLeft,
  GitBranch,
  History,
  Tag,
  Filter as FilterIcon,
  SortAsc,
  SortDesc,
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCcw as RotateCcwIcon,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  FolderPlus,
  FilePlus,
  Upload,
  Download as DownloadIcon,
  Share,
  Copy as CopyIcon,
  Scissors,
  Search as SearchIcon,
  Replace,
  Undo,
  Redo,
  Save as SaveIcon,
  X as XIcon,
  Check as CheckIcon,
  Info,
  AlertTriangle as Warning,
  AlertCircle as ErrorIcon,
  CheckCircle as Success,
  Timer,
  Gauge,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info as InfoIcon,
  Loader2,
  Calendar,
  FileText,
  Zap as ZapIcon
} from '@/lib/icons';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Textarea } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { Switch } from '@/components/ui';
import { Separator } from '@/components/ui';
import { Progress } from '@/components/ui';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002';

// Types pour l'interface des tests de performance
interface PerformanceTest {
  id: string;
  name: string;
  type: 'api' | 'load' | 'database' | 'frontend' | 'memory' | 'stress' | 'full';
  description: string;
  duration: number;
  concurrentUsers: number;
  services: string[];
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  results?: any;
  timestamp: string;
}

interface PerformanceHistory {
  executionId: string;
  timestamp: string;
  summary: any;
  availableServices: string[];
  duration: string;
}

interface ServiceStatus {
  name: string;
  status: 'available' | 'unavailable' | 'starting';
  url: string;
  responseTime?: number;
}

export default function PerformanceTestsPage() {
  const { user, token } = useAuth();

  // État principal de l'interface
  const [activeTab, setActiveTab] = useState<'run' | 'history' | 'settings'>('run');
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  // État des tests
  const [currentTest, setCurrentTest] = useState<PerformanceTest | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Configuration des tests
  const [testConfig, setTestConfig] = useState({
    type: 'full',
    duration: 60,
    concurrentUsers: 10,
    services: [] as string[],
    customOptions: {} as any
  });

  // Services disponibles
  const [availableServices, setAvailableServices] = useState<ServiceStatus[]>([]);

  // Historique des tests
  const [testHistory, setTestHistory] = useState<PerformanceHistory[]>([]);

  // Réf pour le terminal
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll du terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Charger les services disponibles au démarrage
  useEffect(() => {
    loadAvailableServices();
  }, []);

  // Charger l'historique des tests
  useEffect(() => {
    loadTestHistory();
  }, []);

  // Charger les services disponibles
  const loadAvailableServices = async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/v1/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Test-Mode': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.services) {
          const services: ServiceStatus[] = data.services.map((service: any) => ({
            name: service.name,
            status: service.status === 'running' || service.health?.status === 'online' ? 'available' : 'unavailable',
            url: service.url || `http://localhost:${service.port}`,
            responseTime: service.health?.responseTime
          }));
          setAvailableServices(services);
        }
      }
    } catch (error) {
      console.error('Erreur chargement services:', error);
    }
  };

  // Charger l'historique des tests
  const loadTestHistory = async () => {
    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/performance/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Test-Mode': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTestHistory(data.history);
        }
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // Ajouter un log
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Démarrer les tests de performance
  const startPerformanceTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setTestResults(null);

    addLog(`🚀 Démarrage des tests de performance: ${testConfig.type}`);
    addLog(`📋 Services: ${testConfig.services.length > 0 ? testConfig.services.join(', ') : 'Tous disponibles'}`);
    addLog(`⏱️ Durée: ${testConfig.duration} secondes`);
    addLog(`👥 Utilisateurs concurrents: ${testConfig.concurrentUsers}`);

    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/performance/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Test-Mode': 'true'
        },
        body: JSON.stringify({
          testType: testConfig.type,
          services: testConfig.services,
          duration: testConfig.duration,
          concurrentUsers: testConfig.concurrentUsers,
          customOptions: testConfig.customOptions
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      const executionId = data.executionId;

      addLog(`✅ Tests démarrés avec ID: ${executionId}`);

      // Suivre la progression
      const progressInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${API_GATEWAY_URL}/api/v1/admin/performance/status/${executionId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Test-Mode': 'true'
            }
          });

          if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
              clearInterval(progressInterval);
              setProgress(100);
              setTestResults(statusData.report);
              setIsRunning(false);

              addLog(`✅ Tests terminés avec succès`);
              addLog(`📊 Score global: ${statusData.report?.summary?.averageResponseTime ? Math.round(100 - (statusData.report.summary.averageResponseTime / 10)) : 'N/A'}/100`);

              // Recharger l'historique
              loadTestHistory();
            } else if (statusData.status === 'failed') {
              clearInterval(progressInterval);
              setProgress(0);
              setIsRunning(false);
              addLog(`❌ Tests échoués: ${statusData.report?.error || 'Erreur inconnue'}`);
            } else {
              // Simuler la progression
              setProgress(prev => Math.min(prev + 5, 95));
            }
          }
        } catch (error) {
          console.error('Erreur suivi progression:', error);
        }
      }, 2000);

    } catch (error) {
      addLog(`❌ Erreur démarrage tests: ${error}`);
      setIsRunning(false);
    }
  };

  // Arrêter les tests
  const stopPerformanceTests = async () => {
    setIsRunning(false);
    setProgress(0);
    addLog('🛑 Tests arrêtés par l\'utilisateur');
  };

  // Télécharger le rapport
  const downloadReport = async () => {
    if (!testResults) return;

    try {
      const response = await fetch(`${API_GATEWAY_URL}/api/v1/admin/performance/report`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Test-Mode': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);

        addLog('📥 Rapport téléchargé');
      }
    } catch (error) {
      addLog(`❌ Erreur téléchargement: ${error}`);
    }
  };

  // Templates de configuration prédéfinis
  const testTemplates = [
    {
      name: 'Tests Complets',
      type: 'full',
      duration: 120,
      concurrentUsers: 20,
      services: [],
      description: 'Tests complets de performance sur tous les services'
    },
    {
      name: 'Tests API Seulement',
      type: 'api',
      duration: 60,
      concurrentUsers: 15,
      services: ['apiGateway', 'auth', 'companies', 'applications'],
      description: 'Tests des performances API uniquement'
    },
    {
      name: 'Tests Frontend',
      type: 'frontend',
      duration: 30,
      concurrentUsers: 5,
      services: ['frontend'],
      description: 'Tests des performances frontend'
    },
    {
      name: 'Tests de Charge',
      type: 'load',
      duration: 180,
      concurrentUsers: 50,
      services: ['apiGateway', 'auth'],
      description: 'Tests de charge intensive'
    },
    {
      name: 'Tests Mémoire',
      type: 'memory',
      duration: 30,
      concurrentUsers: 1,
      services: [],
      description: 'Tests d\'utilisation mémoire'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Tests de Performance ⚡
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Tests de performance adaptatifs et personnalisables
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => loadTestHistory()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button
              onClick={() => setTerminalVisible(!terminalVisible)}
              variant="outline"
              className="flex items-center gap-2"
            >
              {/* Terminal icon non importé ici; remplacé par un fallback */}
              <span className="h-4 w-4">🖥️</span>
              {terminalVisible ? 'Masquer' : 'Terminal'}
            </Button>
          </div>
        </div>

        {/* Onglets principaux */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="run" className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Exécuter
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          {/* Onglet Exécuter */}
          <TabsContent value="run" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration des tests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    Configuration des Tests
                  </CardTitle>
                  <CardDescription>
                    Personnalisez les paramètres des tests de performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Type de test */}
                  <div className="space-y-2">
                    <Label htmlFor="testType">Type de Test</Label>
                    <Select
                      value={testConfig.type}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, type: e.target.value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Tests Complets</SelectItem>
                        <SelectItem value="api">Tests API</SelectItem>
                        <SelectItem value="load">Tests de Charge</SelectItem>
                        <SelectItem value="frontend">Tests Frontend</SelectItem>
                        <SelectItem value="database">Tests Base de Données</SelectItem>
                        <SelectItem value="memory">Tests Mémoire</SelectItem>
                        <SelectItem value="stress">Tests de Stress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Services à tester */}
                  <div className="space-y-2">
                    <Label>Services à Tester</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableServices.map(service => (
                        <div key={service.name} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`service-${service.name}`}
                            checked={testConfig.services.includes(service.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTestConfig(prev => ({
                                  ...prev,
                                  services: [...prev.services, service.name]
                                }));
                              } else {
                                setTestConfig(prev => ({
                                  ...prev,
                                  services: prev.services.filter(s => s !== service.name)
                                }));
                              }
                            }}
                            className="rounded"
                          />
                          <Label
                            htmlFor={`service-${service.name}`}
                            className="text-sm font-normal flex items-center gap-2"
                          >
                            <div className={`w-2 h-2 rounded-full ${
                              service.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                            }`} />
                            {service.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {testConfig.services.length === 0 && (
                      <p className="text-xs text-gray-500">Aucun service sélectionné - tous les services disponibles seront testés</p>
                    )}
                  </div>

                  {/* Durée */}
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durée des Tests (secondes)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="duration"
                        type="number"
                        min="10"
                        max="300"
                        value={testConfig.duration}
                        onChange={(e) => setTestConfig(prev => ({
                          ...prev,
                          duration: parseInt(e.target.value) || 60
                        }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">
                        {testConfig.duration}s
                      </span>
                    </div>
                  </div>

                  {/* Utilisateurs concurrents */}
                  <div className="space-y-2">
                    <Label htmlFor="concurrentUsers">Utilisateurs Concurrents</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="concurrentUsers"
                        type="number"
                        min="1"
                        max="100"
                        value={testConfig.concurrentUsers}
                        onChange={(e) => setTestConfig(prev => ({
                          ...prev,
                          concurrentUsers: parseInt(e.target.value) || 10
                        }))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-500">
                        {testConfig.concurrentUsers} utilisateurs
                      </span>
                    </div>
                  </div>

                  {/* Templates prédéfinis */}
                  <div className="space-y-2">
                    <Label>Templates Prédéfinis</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {testTemplates.map(template => (
                        <Button
                          key={template.name}
                          variant="outline"
                          size="sm"
                          onClick={() => setTestConfig({
                            type: template.type,
                            duration: template.duration,
                            concurrentUsers: template.concurrentUsers,
                            services: template.services,
                            customOptions: {}
                          })}
                          className="justify-start text-left h-auto p-3"
                        >
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-gray-500">{template.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Contrôles d'exécution */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={startPerformanceTests}
                      disabled={isRunning}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Tests en cours...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Lancer les Tests
                        </>
                      )}
                    </Button>
                    {isRunning && (
                      <Button
                        onClick={stopPerformanceTests}
                        variant="destructive"
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Progression et résultats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                    {isRunning ? 'Tests en Cours' : testResults ? 'Résultats' : 'État des Tests'}
                  </CardTitle>
                  <CardDescription>
                    {isRunning ? 'Exécution des tests de performance' : 'Résultats des derniers tests'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isRunning && (
                    <div className="space-y-4">
                      <Progress value={progress} className="w-full" />
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                          {progress}%
                        </div>
                        <div className="text-sm text-gray-500">
                          Progression des tests
                        </div>
                      </div>
                    </div>
                  )}

                  {testResults && (
                    <div className="space-y-4">
                      {/* Score global */}
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {testResults.summary?.averageResponseTime ?
                            Math.max(0, Math.round(100 - (testResults.summary.averageResponseTime / 10))) : 'N/A'
                          }/100
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Score de Performance Global
                        </div>
                      </div>

                      {/* Métriques détaillées */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {testResults.summary?.successfulTests || 0}
                          </div>
                          <div className="text-xs text-gray-500">Tests Réussis</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-red-600">
                            {testResults.summary?.totalTests ? testResults.summary.totalTests - testResults.summary.successfulTests : 0}
                          </div>
                          <div className="text-xs text-gray-500">Tests Échoués</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-blue-600">
                            {Math.round(testResults.summary?.averageResponseTime || 0)}ms
                          </div>
                          <div className="text-xs text-gray-500">Temps Moyen</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-purple-600">
                            {testResults.summary?.totalRequests || 0}
                          </div>
                          <div className="text-xs text-gray-500">Requêtes Totales</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={downloadReport}
                          className="flex-1"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Télécharger Rapport
                        </Button>
                        <Button
                          onClick={() => {
                            setTestResults(null);
                            setProgress(0);
                          }}
                          variant="outline"
                        >
                          <RotateCcwIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isRunning && !testResults && (
                    <div className="text-center py-8">
                      <Gauge className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Aucun test en cours</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Configurez et lancez des tests de performance
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Services disponibles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-purple-600" />
                  Services Disponibles
                </CardTitle>
                <CardDescription>
                  Services détectés automatiquement pour les tests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableServices.map(service => (
                    <div
                      key={service.name}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        service.status === 'available'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          service.status === 'available' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium text-sm">{service.name}</span>
                      </div>
                      {service.responseTime && (
                        <span className="text-xs text-gray-500">
                          {service.responseTime}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Historique */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-blue-600" />
                  Historique des Tests
                </CardTitle>
                <CardDescription>
                  Historique des exécutions de tests de performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-500">Aucun test dans l'historique</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Lancez des tests pour voir l'historique
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {testHistory.map(test => (
                      <div
                        key={test.executionId}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{test.executionId}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(test.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>Score: {Math.round(100 - ((test.summary?.averageResponseTime || 0) / 10))}/100</span>
                            <span>Tests: {test.summary?.successfulTests}/{test.summary?.totalTests}</span>
                            <span>Services: {test.availableServices.length}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Configuration */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Configuration Avancée
                </CardTitle>
                <CardDescription>
                  Options avancées pour les tests de performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Timeout des Requêtes (ms)</Label>
                    <Input
                      type="number"
                      value={testConfig.customOptions.timeout || 10000}
                      onChange={(e) => setTestConfig(prev => ({
                        ...prev,
                        customOptions: {
                          ...prev.customOptions,
                          timeout: parseInt(e.target.value) || 10000
                        }
                      }))}
                      placeholder="10000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Intervalle entre Tests (ms)</Label>
                    <Input
                      type="number"
                      value={testConfig.customOptions.interval || 1000}
                      onChange={(e) => setTestConfig(prev => ({
                        ...prev,
                        customOptions: {
                          ...prev.customOptions,
                          interval: parseInt(e.target.value) || 1000
                        }
                      }))}
                      placeholder="1000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Options Personnalisées (JSON)</Label>
                  <Textarea
                    value={JSON.stringify(testConfig.customOptions, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setTestConfig(prev => ({
                          ...prev,
                          customOptions: parsed
                        }));
                      } catch (error) {
                        // JSON invalide, ignorer
                      }
                    }}
                    placeholder='{"customOption": "value"}'
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoStartServices"
                    checked={testConfig.customOptions.autoStartServices !== false}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      customOptions: {
                        ...prev.customOptions,
                        autoStartServices: e.target.checked
                      }
                    }))}
                  />
                  <Label htmlFor="autoStartServices">Démarrage automatique des services</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoStopServices"
                    checked={testConfig.customOptions.autoStopServices !== false}
                    onChange={(e) => setTestConfig(prev => ({
                      ...prev,
                      customOptions: {
                        ...prev.customOptions,
                        autoStopServices: e.target.checked
                      }
                    }))}
                  />
                  <Label htmlFor="autoStopServices">Arrêt automatique des services temporaires</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Terminal */}
        {terminalVisible && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-green-600" />
                Terminal des Tests
                {isRunning && (
                  <Badge className="ml-2 bg-green-600">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    En cours
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Logs en temps réel des tests de performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={terminalRef}
                className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto"
              >
                {logs.length === 0 ? (
                  <div className="text-gray-500 italic">
                    Prêt à exécuter les tests de performance...
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}