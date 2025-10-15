'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/auth';
import {
  Play,
  Square,
  RotateCcw,
  Download,
  Eye,
  Settings,
  Zap,
  Shield,
  Activity,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Terminal,
  Database,
  Monitor,
  Smartphone,
  TestTube,
  Bug,
  Target,
  Layers,
  GitBranch,
  Filter,
  Search,
  RefreshCw,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Camera,
  Image as ImageIcon,
  Code,
  Globe,
  Users,
  Timer,
  BarChart3,
  Trophy,
  Award,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// Interface pour les exécutions de tests
interface TestExecution {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'skipped' | 'timeout';
  startTime: string;
  endTime?: string;
  duration?: number;
  output: string[];
  error?: string;
  screenshots?: string[];
  browser?: string;
  viewport?: string;
  project?: string;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  tests: string[];
  tags: string[];
  enabled: boolean;
}

interface PlaywrightConfig {
  browsers: string[];
  viewports: string[];
  baseUrl: string;
  timeout: number;
  retries: number;
  workers: number;
  headed: boolean;
  video: boolean;
  screenshot: boolean;
  trace: boolean;
}

export default function PlaywrightTestsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testExecutions, setTestExecutions] = useState<TestExecution[]>([]);
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [config, setConfig] = useState<PlaywrightConfig>({
    browsers: ['chromium', 'firefox', 'webkit'],
    viewports: ['1920x1080', '1366x768', '375x667'],
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retries: 2,
    workers: 2,
    headed: false,
    video: true,
    screenshot: true,
    trace: false
  });

  // État pour les filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [browserFilter, setBrowserFilter] = useState<string>('all');

  // État pour le terminal/logs
  const [logs, setLogs] = useState<string[]>([]);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Charger les données initiales
  useEffect(() => {
    loadTestSuites();
    loadTestExecutions();
  }, []);

  // Auto-scroll du terminal
  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const loadTestSuites = async () => {
    try {
      // Simulation des suites de tests disponibles
      const suites: TestSuite[] = [
        {
          id: 'authentication',
          name: 'Tests d\'Authentification',
          description: 'Tests de connexion, inscription, déconnexion',
          tests: ['login.spec.ts', 'register.spec.ts', 'logout.spec.ts'],
          tags: ['auth', 'critical'],
          enabled: true
        },
        {
          id: 'applications',
          name: 'Tests des Candidatures',
          description: 'Tests CRUD des candidatures',
          tests: ['applications-crud.spec.ts', 'applications-filter.spec.ts'],
          tags: ['applications', 'crud'],
          enabled: true
        },
        {
          id: 'dashboard',
          name: 'Tests du Tableau de Bord',
          description: 'Tests des métriques et graphiques',
          tests: ['dashboard-metrics.spec.ts', 'dashboard-charts.spec.ts'],
          tags: ['dashboard', 'ui'],
          enabled: true
        },
        {
          id: 'search',
          name: 'Tests de Recherche',
          description: 'Tests de la fonctionnalité de recherche',
          tests: ['search-basic.spec.ts', 'search-advanced.spec.ts'],
          tags: ['search', 'performance'],
          enabled: true
        },
        {
          id: 'offline',
          name: 'Tests Hors Ligne',
          description: 'Tests du mode offline et synchronisation',
          tests: ['offline-mode.spec.ts', 'sync.spec.ts'],
          tags: ['offline', 'pwa'],
          enabled: true
        },
        {
          id: 'security',
          name: 'Tests de Sécurité',
          description: 'Tests de sécurité et autorisations',
          tests: ['security-headers.spec.ts', 'auth-middleware.spec.ts'],
          tags: ['security', 'critical'],
          enabled: true
        }
      ];
      setTestSuites(suites);
    } catch (error) {
      console.error('Erreur lors du chargement des suites de tests:', error);
    }
  };

  const loadTestExecutions = async () => {
    try {
      // Simulation des exécutions récentes
      const executions: TestExecution[] = [
        {
          id: 'exec_1',
          name: 'Tests d\'Authentification',
          status: 'passed',
          startTime: new Date(Date.now() - 3600000).toISOString(),
          endTime: new Date(Date.now() - 3500000).toISOString(),
          duration: 100000,
          output: [
            '✓ Login test passed',
            '✓ Registration test passed',
            '✓ Logout test passed'
          ],
          browser: 'chromium',
          viewport: '1920x1080'
        },
        {
          id: 'exec_2',
          name: 'Tests des Candidatures',
          status: 'failed',
          startTime: new Date(Date.now() - 7200000).toISOString(),
          endTime: new Date(Date.now() - 7100000).toISOString(),
          duration: 100000,
          output: [
            '✓ Create application test passed',
            '✗ Update application test failed',
            '✓ Delete application test passed'
          ],
          error: 'Assertion failed: Expected element to be visible',
          browser: 'firefox',
          viewport: '1366x768'
        }
      ];
      setTestExecutions(executions);
    } catch (error) {
      console.error('Erreur lors du chargement des exécutions:', error);
    }
  };

  const runTests = async () => {
    setIsRunning(true);
    setLogs([]);

    try {
      // Simulation de l'exécution des tests
      const execution: TestExecution = {
        id: `exec_${Date.now()}`,
        name: `Tests sélectionnés - ${new Date().toLocaleTimeString()}`,
        status: 'running',
        startTime: new Date().toISOString(),
        output: [],
        browser: config.browsers[0],
        viewport: config.viewports[0]
      };

      setTestExecutions(prev => [execution, ...prev]);

      // Simulation des logs en temps réel
      const logMessages = [
        '🚀 Démarrage de l\'exécution des tests...',
        '📦 Installation des dépendances...',
        '🌐 Démarrage du serveur de test...',
        '🔍 Recherche des fichiers de test...',
        '⚡ Exécution des tests en cours...',
        '✅ Test 1/5: Login - PASSÉ',
        '✅ Test 2/5: Navigation - PASSÉ',
        '❌ Test 3/5: Formulaire - ÉCHEC',
        '🔄 Retry 1/2 pour le test 3...',
        '✅ Test 3/5: Formulaire - PASSÉ (retry)',
        '✅ Test 4/5: Recherche - PASSÉ',
        '✅ Test 5/5: Déconnexion - PASSÉ',
        '📊 Génération du rapport...',
        '🎉 Tous les tests terminés avec succès!'
      ];

      for (const message of logMessages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);

        if (message.includes('Test') && message.includes('PASSÉ')) {
          execution.output.push(message);
        } else if (message.includes('ÉCHEC')) {
          execution.error = message;
          execution.status = 'failed';
        }
      }

      execution.status = 'passed';
      execution.endTime = new Date().toISOString();
      execution.duration = 15000;

      setTestExecutions(prev => prev.map(exec =>
        exec.id === execution.id ? execution : exec
      ));

    } catch (error) {
      console.error('Erreur lors de l\'exécution des tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const stopTests = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] 🛑 Exécution arrêtée par l'utilisateur`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      executions: testExecutions,
      config,
      logs
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playwright-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtrer les exécutions
  const filteredExecutions = testExecutions.filter(exec => {
    const matchesSearch = searchQuery === '' ||
      exec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exec.output.some(line => line.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;
    const matchesBrowser = browserFilter === 'all' || exec.browser === browserFilter;

    return matchesSearch && matchesStatus && matchesBrowser;
  });

  // Calculer les statistiques
  const stats = {
    total: testExecutions.length,
    passed: testExecutions.filter(e => e.status === 'passed').length,
    failed: testExecutions.filter(e => e.status === 'failed').length,
    running: testExecutions.filter(e => e.status === 'running').length,
    successRate: testExecutions.length > 0 ?
      Math.round((testExecutions.filter(e => e.status === 'passed').length / testExecutions.length) * 100) : 0
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="h-8 w-8 text-blue-600" />
            Tests Playwright E2E
          </h1>
          <p className="text-gray-600">Exécutez et gérez vos tests end-to-end</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('config')}>
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </Button>
          <Button variant="outline" onClick={exportReport} disabled={testExecutions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tableau de Bord
          </TabsTrigger>
          <TabsTrigger value="suites" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Suites de Tests
          </TabsTrigger>
          <TabsTrigger value="executions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Exécutions
          </TabsTrigger>
          <TabsTrigger value="terminal" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Terminal
          </TabsTrigger>
        </TabsList>

        {/* Onglet Tableau de Bord */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Taux de Réussite</p>
                    <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tests Réussis</p>
                    <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tests Échoués</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Exécutions</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contrôles d'exécution rapide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Exécution Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={runTests}
                  disabled={isRunning}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className={`h-4 w-4 mr-2 ${isRunning ? 'animate-pulse' : ''}`} />
                  {isRunning ? 'Exécution...' : 'Lancer Tous les Tests'}
                </Button>

                <Button
                  variant="outline"
                  onClick={stopTests}
                  disabled={!isRunning}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Arrêter
                </Button>

                <Button variant="outline" onClick={clearLogs}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Effacer Logs
                </Button>
              </div>

              {/* Sélection de suites de tests */}
              <div className="space-y-2">
                <Label>Suites de tests à exécuter</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {testSuites.map(suite => (
                    <div key={suite.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={suite.id}
                        checked={selectedTests.includes(suite.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTests(prev => [...prev, suite.id]);
                          } else {
                            setSelectedTests(prev => prev.filter(id => id !== suite.id));
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor={suite.id} className="text-sm">
                        {suite.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Suites de Tests */}
        <TabsContent value="suites" className="space-y-6">
          <div className="grid gap-4">
            {testSuites.map(suite => (
              <Card key={suite.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {suite.name}
                    </span>
                    <Badge variant={suite.enabled ? "default" : "secondary"}>
                      {suite.enabled ? 'Activé' : 'Désactivé'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>{suite.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {suite.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tests inclus:</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                      {suite.tests.map(test => (
                        <div key={test} className="flex items-center gap-2 text-sm">
                          <FileText className="h-3 w-3 text-gray-400" />
                          {test}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Eye className="h-3 w-3 mr-1" />
                      Voir le Code
                    </Button>
                    <Button size="sm" variant="outline">
                      <Play className="h-3 w-3 mr-1" />
                      Exécuter Cette Suite
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Onglet Exécutions */}
        <TabsContent value="executions" className="space-y-6">
          {/* Filtres */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-64">
                  <Label className="text-sm">Rechercher</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nom du test, navigateur, etc."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm">Statut</Label>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="passed">Réussis</SelectItem>
                      <SelectItem value="failed">Échoués</SelectItem>
                      <SelectItem value="running">En cours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Navigateur</Label>
                  <Select value={browserFilter} onChange={(e) => setBrowserFilter(e.target.value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="chromium">Chromium</SelectItem>
                      <SelectItem value="firefox">Firefox</SelectItem>
                      <SelectItem value="webkit">WebKit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des exécutions */}
          <div className="space-y-3">
            {filteredExecutions.map(execution => (
              <Card key={execution.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{execution.name}</h3>
                        <Badge variant={
                          execution.status === 'passed' ? 'default' :
                          execution.status === 'failed' ? 'destructive' :
                          execution.status === 'running' ? 'secondary' : 'outline'
                        }>
                          {execution.status === 'passed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {execution.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {execution.status === 'running' && <Clock className="h-3 w-3 mr-1" />}
                          {execution.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {execution.browser}
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize2 className="h-3 w-3" />
                          {execution.viewport}
                        </span>
                        {execution.duration && (
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {(execution.duration / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>

                      {execution.error && (
                        <Alert className="mt-3">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {execution.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-1" />
                        Détails
                      </Button>
                      {execution.screenshots && execution.screenshots.length > 0 && (
                        <Button size="sm" variant="outline">
                          <Camera className="h-3 w-3 mr-1" />
                          Captures
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredExecutions.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center">
                  <TestTube className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Aucune exécution trouvée</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Onglet Terminal */}
        <TabsContent value="terminal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Terminal de Test
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAutoScroll(!autoScroll)}
                  >
                    {autoScroll ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearLogs}>
                    Effacer
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                  >
                    {isTerminalVisible ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>

            {isTerminalVisible && (
              <CardContent>
                <div
                  ref={terminalRef}
                  className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-96 overflow-y-auto"
                >
                  {logs.length === 0 ? (
                    <div className="text-gray-500 italic">
                      En attente de l'exécution des tests...
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
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
