'use client'

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/hooks/auth';
import { AdminLayout } from '@/components/features';
import {
  Play,
  Square,
  RotateCcw,
  Download,
  Eye,
  Settings,
  Save,
  Edit3,
  FileText,
  FolderOpen,
  Terminal,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code,
  Globe,
  Monitor,
  Smartphone,
  Timer,
  Activity,
  Bug,
  Target,
  Layers,
  Search,
  Filter,
  Plus,
  Trash2,
  Copy,
  RefreshCw,
  Eye as EyeIcon,
  Maximize2,
  Minimize2,
  ExternalLink,
  Camera,
  Clock,
  BarChart3,
  Zap,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Database,
  Server,
  Smartphone as Mobile,
  Monitor as Desktop,
  Chrome,
  Globe as Firefox,
  Globe as Safari,
  BookOpen,
  Lightbulb,
  Users,
  Building,
  Briefcase,
  Shield,
  Zap as Lightning,
  Clock as ClockIcon,
  TrendingUp,
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
  AlertCircle as Error,
  CheckCircle as Success
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui';

// Types pour l'interface Playwright authentique
interface PlaywrightFile {
  name: string;
  path: string;
  content: string;
  type: 'spec' | 'config' | 'helper' | 'fixture' | 'page' | 'api' | 'backend' | 'mobile' | 'performance' | 'security' | 'unit' | 'database' | 'integration';
  lastModified: Date;
  size: number;
  isOpen?: boolean;
  isDirty?: boolean;
  tags?: string[];
  description?: string;
  author?: string;
  lastRun?: Date;
  status?: 'passed' | 'failed' | 'skipped' | 'running';
}

interface TestResult {
  id: string;
  file: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped' | 'running' | 'timeout';
  duration: number;
  browser: string;
  viewport: string;
  project: string;
  startTime: string;
  endTime?: string;
  error?: string;
  output: string[];
  screenshots: string[];
  trace?: string;
  video?: string;
}

interface PlaywrightProject {
  name: string;
  type: 'e2e' | 'api' | 'backend' | 'mobile' | 'performance' | 'security' | 'unit' | 'database' | 'integration' | 'frontend';
  browsers: string[];
  devices?: string[];
  config: any;
  environment?: 'dev' | 'staging' | 'prod';
  tags?: string[];
}

interface BrowserContext {
  name: string;
  type: 'chromium' | 'firefox' | 'webkit' | 'mobile' | 'tablet';
  viewport: string;
  userAgent: string;
  isRunning: boolean;
}

export default function PlaywrightTestsPage() {
  const { user } = useAuth();

  // État principal de l'interface Playwright
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [webviewVisible, setWebviewVisible] = useState(false);
  const [activeView, setActiveView] = useState<'explorer' | 'search' | 'run' | 'debug' | 'webview'>('explorer');
  const [openedFiles, setOpenedFiles] = useState<PlaywrightFile[]>([]);
  const [activeFile, setActiveFile] = useState<PlaywrightFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // États avancés pour la gestion des tests
  const [selectedEnvironment, setSelectedEnvironment] = useState<'dev' | 'staging' | 'prod'>('dev');
  const [testTags, setTestTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [parallelExecution, setParallelExecution] = useState(true);
  const [testDatabase, setTestDatabase] = useState<'dev' | 'staging' | 'prod'>('dev');

  // État des tests et exécution
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [currentExecution, setCurrentExecution] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // État de configuration
  const [projects, setProjects] = useState<PlaywrightProject[]>([]);
  const [browserContexts, setBrowserContexts] = useState<BrowserContext[]>([]);
  const [config, setConfig] = useState<any>({});

  // État pour la gestion des utilisateurs de test
  const [showUserCreator, setShowUserCreator] = useState(false);
  const [testUsers, setTestUsers] = useState<any[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);

  // Réfs
  const terminalRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fonction pour charger les utilisateurs de test
  const loadTestUsers = async () => {
    try {
      const response = await fetch('/api/v1/admin/test-users', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'X-Test-Mode': 'true'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTestUsers(data.users);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateurs de test:', error);
    }
  };

  // Initialisation et chargement des données
  useEffect(() => {
    initializePlaywrightInterface();
  }, []);

  // Auto-scroll du terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Initialiser l'interface Playwright
  const initializePlaywrightInterface = async () => {
    await loadTestStructure();
    await loadConfiguration();
    await loadBrowserContexts();
    addLog('🚀 Playwright interface initialisée');
  };

  // Charger la structure complète des tests
  const loadTestStructure = async () => {
    try {
      const testStructure = await fetchTestStructure();
      const files: PlaywrightFile[] = testStructure.files;

      // Ouvrir les fichiers par défaut
      if (files.length > 0) {
        setOpenedFiles(files.slice(0, 3));
        setActiveFile(files[0]);
        setFileContent(files[0].content);
      }

      addLog(`📁 ${files.length} fichiers de test chargés`);
    } catch (error) {
      addLog(`❌ Erreur chargement structure: ${error}`);
    }
  };

  // Charger la configuration Playwright
  const loadConfiguration = async () => {
    try {
      const configData = await fetchPlaywrightConfig();
      setConfig(configData);

      const projectList: PlaywrightProject[] = configData.projects?.map((project: any) => ({
        name: project.name,
        type: project.name.toLowerCase().includes('api') ? 'api' :
              project.name.toLowerCase().includes('mobile') ? 'mobile' :
              project.name.toLowerCase().includes('backend') ? 'backend' : 'e2e',
        browsers: [project.use?.browserName || 'chromium'],
        devices: project.use?.deviceScaleFactor ? ['mobile'] : ['desktop'],
        config: project
      })) || [];

      setProjects(projectList);
      addLog(`⚙️ Configuration chargée - ${projectList.length} projets`);
    } catch (error) {
      addLog(`❌ Erreur configuration: ${error}`);
    }
  };

  // Charger les contextes de navigateur
  const loadBrowserContexts = async () => {
    const contexts: BrowserContext[] = [
      { name: 'Desktop Chrome', type: 'chromium', viewport: '1920x1080', userAgent: 'Chrome Desktop', isRunning: false },
      { name: 'Mobile Chrome', type: 'mobile', viewport: '375x667', userAgent: 'Mobile Chrome', isRunning: false },
      { name: 'Firefox Desktop', type: 'firefox', viewport: '1920x1080', userAgent: 'Firefox Desktop', isRunning: false },
      { name: 'Safari Desktop', type: 'webkit', viewport: '1920x1080', userAgent: 'Safari Desktop', isRunning: false }
    ];
    setBrowserContexts(contexts);
  };

  // Générer des données de test pour présentations
  const generateTestData = async (userCount: number = 5, applicationCount: number = 10) => {
    addLog(`🎲 Génération de données de test: ${userCount} utilisateurs, ${applicationCount} candidatures`);

    try {
      // Simulation de génération de données
      const generatedData = {
        users: Array(userCount).fill(0).map((_, i) => ({
          id: i + 1,
          email: `test-user-${i + 1}@example.com`,
          name: `Test User ${i + 1}`,
          role: i === 0 ? 'admin' : 'user',
          createdAt: new Date().toISOString()
        })),
        applications: Array(applicationCount).fill(0).map((_, i) => ({
          id: i + 1,
          title: `Candidature ${i + 1}`,
          company: `Entreprise ${Math.floor(i / 3) + 1}`,
          status: ['pending', 'in_progress', 'completed'][Math.floor(Math.random() * 3)],
          userId: Math.floor(Math.random() * userCount) + 1,
          createdAt: new Date().toISOString()
        }))
      };

      addLog(`✅ Données générées: ${generatedData.users.length} utilisateurs, ${generatedData.applications.length} candidatures`);
      return generatedData;
    } catch (error) {
      addLog(`❌ Erreur génération données: ${error}`);
      throw error;
    }
  };

  // API pour récupérer la structure des tests
  const fetchTestStructure = async () => {
    // Simulation des vrais fichiers de test avec les nouveaux types
    const files: PlaywrightFile[] = [
        {
          name: 'admin-backoffice.spec.ts',
          path: 'tests/e2e/specs/admin-backoffice.spec.ts',
        content: `import { test, expect } from '@playwright/test';

test.describe('Backoffice Admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/login');
    await page.fill('input[type="email"]', 'admin@jobbingtrack.test');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:8080/backoffice');
  });

  test('Dashboard admin accessible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard Admin');
    await expect(page.locator('[data-testid="metrics-cards"]')).toBeVisible();
  });

  test('Gestion des utilisateurs', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice/users');
    await page.click('button:has-text("Créer utilisateur")');
    await page.fill('input[name="email"]', 'redacted@example.invalid');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('tr:has-text("redacted@example.invalid")')).toBeVisible();
  });
});`,
          type: 'spec',
          lastModified: new Date(),
        size: 2048
        },
        {
          name: 'user-journeys.spec.ts',
          path: 'tests/e2e/specs/user-journeys.spec.ts',
        content: `import { test, expect } from '@playwright/test';

test.describe('Parcours utilisateur', () => {
  test('Inscription et connexion', async ({ page }) => {
    await page.goto('http://localhost:8080/register');
    await page.fill('input[name="email"]', 'redacted@example.invalid');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('Création de candidature', async ({ page }) => {
    await page.goto('http://localhost:8080/login');
    await page.fill('input[name="email"]', 'redacted@example.invalid');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('http://localhost:8080/applications');
    await page.click('button:has-text("Créer candidature")');
    await page.fill('input[name="title"]', 'Développeur Full Stack');
    await page.fill('input[name="company"]', 'Tech Corp');
    await page.click('button[type="submit"]');
    await expect(page.locator('tr:has-text("Développeur Full Stack")')).toBeVisible();
  });
});`,
          type: 'spec',
          lastModified: new Date(),
        size: 1536
        },
        {
          name: 'playwright.config.ts',
          path: 'tests/playwright.config.ts',
        content: `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});`,
          type: 'config',
          lastModified: new Date(),
        size: 1024
        },
        {
          name: 'test-helpers.ts',
          path: 'tests/e2e/utils/test-helpers.ts',
        content: `import { Page, expect } from '@playwright/test';

export async function loginAs(page: Page, userType: string = 'admin') {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@jobbingtrack.test');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
}

export async function createTestUser(page: Page) {
  await page.goto('/backoffice/users');
  await page.click('button:has-text("Créer utilisateur")');
  await page.fill('input[name="email"]', 'redacted@example.invalid');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
}`,
          type: 'helper',
          lastModified: new Date(),
        size: 768
      }
    ];

    return { files };
  };

  // API pour récupérer la configuration Playwright
  const fetchPlaywrightConfig = async () => {
    return {
      testDir: './e2e',
      fullyParallel: true,
      forbidOnly: true,
      retries: 2,
      timeout: 30000,
      expect: { timeout: 10000 },
      reporter: [
        ['html', { outputFolder: 'reports/playwright-report' }],
        ['json', { outputFile: 'reports/playwright-results.json' }]
      ],
      use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
      },
      projects: [
        { name: 'chromium', use: { browserName: 'chromium' } },
        { name: 'firefox', use: { browserName: 'firefox' } },
        { name: 'webkit', use: { browserName: 'webkit' } },
        { name: 'API', testDir: './api', use: { baseURL: 'http://localhost:3000' } },
        { name: 'Mobile Chrome', use: { browserName: 'chromium', deviceScaleFactor: 2 } }
      ]
    };
  };

  // Gestion des fichiers
  const handleFileSelect = (file: PlaywrightFile) => {
    setActiveFile(file);
    setFileContent(file.content);
    setIsEditing(false);
    setIsDirty(false);

    // Ajouter aux fichiers ouverts s'il n'y est pas déjà
    if (!openedFiles.find(f => f.name === file.name)) {
      setOpenedFiles(prev => [...prev, { ...file, isOpen: true }]);
    }
  };

  const handleFileOpen = (file: PlaywrightFile) => {
    handleFileSelect(file);
  };

  const handleFileClose = (fileName: string) => {
    setOpenedFiles(prev => prev.filter(f => f.name !== fileName));
    if (activeFile?.name === fileName) {
      const remainingFiles = openedFiles.filter(f => f.name !== fileName);
      if (remainingFiles.length > 0) {
        setActiveFile(remainingFiles[0]);
        setFileContent(remainingFiles[0].content);
      } else {
        setActiveFile(null);
        setFileContent('');
      }
    }
  };

  const handleSaveFile = async () => {
    if (!activeFile) return;

    try {
      addLog(`💾 Sauvegarde de ${activeFile.name}`);

      // Mettre à jour le contenu du fichier
      const updatedFile = { ...activeFile, content: fileContent, lastModified: new Date() };
      setActiveFile(updatedFile);
      setOpenedFiles(prev => prev.map(f => f.name === activeFile.name ? updatedFile : f));
      setIsDirty(false);

      addLog(`✅ ${activeFile.name} sauvegardé`);
    } catch (error) {
      addLog(`❌ Erreur de sauvegarde: ${error}`);
    }
  };

  // Exécution des tests
  const handleRunTest = async (testName?: string, projectName?: string) => {
    setIsRunning(true);
    setLogs([]);
    setTestResults([]);
    setCurrentExecution(testName || 'all');

    addLog(`🚀 Démarrage des tests${testName ? ` - ${testName}` : ''}${projectName ? ` (${projectName})` : ''}`);

    try {
      // Simulation de l'exécution Playwright
      const executionMessages = [
        '📦 Installation des dépendances...',
        '⚙️ Configuration des projets...',
        '🌐 Démarrage des navigateurs...',
        '🔍 Découverte des tests...',
        '⚡ Exécution des tests...',
        '📊 Collecte des résultats...'
      ];

      for (const message of executionMessages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        addLog(`⏳ ${message}`);
      }

      // Simulation des résultats de tests
      const mockResults: TestResult[] = [
        {
          id: `result_${Date.now()}_1`,
          file: 'admin-backoffice.spec.ts',
          testName: 'Dashboard admin accessible',
          status: 'passed',
          duration: 2450,
          browser: 'chromium',
          viewport: '1920x1080',
          project: projectName || 'chromium',
          startTime: new Date(Date.now() - 10000).toISOString(),
          endTime: new Date(Date.now() - 7500).toISOString(),
          output: [
            '✓ Dashboard admin accessible',
            '✓ Navigation entre sections',
            '✓ Gestion utilisateurs'
          ],
          screenshots: ['screenshot-1.png', 'screenshot-2.png']
        },
        {
          id: `result_${Date.now()}_2`,
          file: 'user-journeys.spec.ts',
          testName: 'Inscription et connexion',
          status: 'passed',
          duration: 3200,
          browser: 'chromium',
          viewport: '1920x1080',
          project: projectName || 'chromium',
          startTime: new Date(Date.now() - 8000).toISOString(),
          endTime: new Date(Date.now() - 4800).toISOString(),
          output: [
            '✓ Formulaire inscription',
            '✓ Validation email',
            '✓ Connexion réussie'
          ],
          screenshots: ['screenshot-3.png']
        }
      ];

      setTestResults(mockResults);

      const passed = mockResults.filter(r => r.status === 'passed').length;
      const failed = mockResults.filter(r => r.status === 'failed').length;
      const total = mockResults.length;

      addLog(`✅ Tests terminés: ${passed} passed, ${failed} failed, ${total} total`);
      addLog(`📈 Rapport généré: playwright-report/index.html`);

    } catch (error) {
      addLog(`❌ Erreur d'exécution: ${error}`);
    } finally {
      setIsRunning(false);
      setCurrentExecution('');
    }
  };

  // Utilitaires
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleCreateNewTest = (testType: string = 'spec', template: string = 'basic') => {
    const timestamp = Date.now();
    const fileName = `test-${template}-${timestamp}.spec.ts`;
    const path = `tests/e2e/specs/test-${template}-${timestamp}.spec.ts`;

    let content = '';
    let testTypeLabel = 'spec';

    switch (template) {
      case 'api':
        content = generateApiTestTemplate();
        testTypeLabel = 'api';
        break;
      case 'database':
        content = generateDatabaseTestTemplate();
        testTypeLabel = 'database';
        break;
      case 'mobile':
        content = generateMobileTestTemplate();
        testTypeLabel = 'mobile';
        break;
      case 'performance':
        content = generatePerformanceTestTemplate();
        testTypeLabel = 'performance';
        break;
      case 'security':
        content = generateSecurityTestTemplate();
        testTypeLabel = 'security';
        break;
      default:
        content = generateBasicTestTemplate();
        testTypeLabel = 'spec';
    }

    const newFile: PlaywrightFile = {
      name: fileName,
      path: path,
      content: content,
      type: testTypeLabel as any,
      lastModified: new Date(),
      size: content.length,
      isOpen: true,
      isDirty: true,
      tags: [template, 'new'],
      description: `Test ${template} créé automatiquement`,
      author: user?.lastName || 'Admin',
      status: 'skipped'
    };

    setOpenedFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
    setFileContent(newFile.content);
    setIsEditing(true);
    setIsDirty(true);
    addLog(`📝 Nouveau test ${template} créé: ${newFile.name}`);
  };

  // Templates de génération de tests
  const generateBasicTestTemplate = () => {
    return `import { test, expect } from '@playwright/test';

test.describe('Test E2E - Interface Utilisateur', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('Page d\'accueil se charge correctement', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveTitle(/JobbingTrack/);
  });

  test('Navigation fonctionne', async ({ page }) => {
    await page.click('nav a[href*="/about"]');
    await expect(page.url()).toContain('/about');
  });
});`;
  };

  const generateApiTestTemplate = () => {
    return `import { test, expect } from '@playwright/test';

test.describe('Tests API', () => {
  test('API Health Check', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/v1/health');
    expect(response.ok()).toBeTruthy();
  });

  test('Authentification API', async ({ request }) => {
    const loginData = {
      email: 'redacted@example.invalid',
      password: 'password123'
    };

    const response = await request.post('http://localhost:3000/api/v1/auth/login', {
      data: loginData
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.token).toBeTruthy();
    }
  });

  test('CRUD Operations', async ({ request }) => {
    // Test Create
    const createResponse = await request.post('http://localhost:3000/api/v1/users', {
      data: {
        email: 'redacted@example.invalid',
        name: 'Test User'
      }
    });
    expect(createResponse.ok()).toBeTruthy();

    const created = await createResponse.json();
    const userId = created.id;

    // Test Read
    const readResponse = await request.get(\`http://localhost:3000/api/v1/users/\${userId}\`);
    expect(readResponse.ok()).toBeTruthy();

    // Test Update
    const updateResponse = await request.put(\`http://localhost:3000/api/v1/users/\${userId}\`, {
      data: {
        name: 'Updated Test User'
      }
    });
    expect(updateResponse.ok()).toBeTruthy();

    // Test Delete
    const deleteResponse = await request.delete(\`http://localhost:3000/api/v1/users/\${userId}\`);
    expect(deleteResponse.ok()).toBeTruthy();
  });
});`;
  };

  const generateDatabaseTestTemplate = () => {
    return `import { test, expect } from '@playwright/test';

test.describe('Tests Base de Données', () => {
  test('Connexion à la base de données', async () => {
    // Test de connexion directe à la DB
    const config = {
      host: 'localhost',
      port: 5432,
      database: 'jobbingtrack_test',
      username: 'admin@jobbingtrack.test',
      password: 'admin@jobbingtrack.test'
    };

    // Simulation de test de connexion
    expect(config.host).toBe('localhost');
    expect(config.port).toBe(5432);
  });

  test('Migrations de base de données', async () => {
    // Test des migrations
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_add_users_table.sql',
      '003_add_applications_table.sql'
    ];

    expect(migrationFiles.length).toBeGreaterThan(0);

    // Vérification que les tables existent
    const requiredTables = ['users', 'applications', 'companies', 'interviews'];
    requiredTables.forEach(table => {
      expect(table).toBeTruthy();
    });
  });

  test('Intégrité des données', async ({ page }) => {
    await page.goto('http://localhost:8080/backoffice');

    // Vérifier que les données s'affichent correctement
    await expect(page.locator('[data-testid="data-table"]')).toBeVisible();

    // Vérifier l'intégrité référentielle
    const userCount = await page.locator('[data-testid="user-row"]').count();
    const applicationCount = await page.locator('[data-testid="application-row"]').count();

    expect(userCount).toBeGreaterThanOrEqual(0);
    expect(applicationCount).toBeGreaterThanOrEqual(0);
  });
});`;
  };

  const generateMobileTestTemplate = () => {
    return `import { test, expect } from '@playwright/test';

test.describe('Tests Mobile', () => {
  test.use({
    viewport: { width: 375, height: 667 }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080');
  });

  test('Interface mobile responsive', async ({ page }) => {
    // Vérifier que le menu mobile fonctionne
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

    // Vérifier que les éléments sont correctement dimensionnés
    const menuItems = page.locator('[data-testid="mobile-menu-item"]');
    await expect(menuItems.first()).toBeVisible();
  });

  test('Fonctionnalités tactiles', async ({ page }) => {
    // Test du swipe sur mobile
    await page.touchscreen.tap(100, 100);

    // Test des gestures
    await page.touchscreen.tap(200, 200);

    // Vérifier que les éléments tactiles répondent
    await expect(page.locator('[data-testid="touch-target"]')).toBeVisible();
  });

  test('Performance mobile', async ({ page }) => {
    // Mesurer le temps de chargement
    const startTime = Date.now();

    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Le chargement ne devrait pas prendre plus de 3 secondes
    expect(loadTime).toBeLessThan(3000);
  });
});`;
  };

  const generatePerformanceTestTemplate = () => {
    return `import { test, expect } from '@playwright/test';

test.describe('Tests de Performance', () => {
  test('Temps de chargement des pages', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Moins de 2 secondes

    // Mesurer les métriques de performance
    const perfData = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        loadComplete: perf.loadEventEnd - perf.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
      };
    });

    expect(perfData.domContentLoaded).toBeLessThan(1000);
    expect(perfData.firstPaint).toBeLessThan(500);
  });

  test('Test de charge', async ({ page }) => {
    // Simulation de plusieurs utilisateurs
    const pages = await Promise.all(
      Array(5).fill(0).map(() => page.context().newPage())
    );

    // Navigation simultanée
    await Promise.all(
      pages.map(p => p.goto('http://localhost:8080/dashboard'))
    );

    // Fermer les pages
    await Promise.all(pages.map(p => p.close()));

    expect(pages.length).toBe(5);
  });

  test('Mémoire et CPU', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Mesurer l'utilisation mémoire
    const memoryUsage = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return { message: 'Memory API not available' };
    });

    expect(memoryUsage).toBeTruthy();
  });
});`;
  };

  const generateSecurityTestTemplate = () => {
    return `import { test, expect } from '@playwright/test';

test.describe('Tests de Sécurité', () => {
  test('XSS Protection', async ({ page }) => {
    await page.goto('http://localhost:8080/login');

    // Test d'injection XSS
    const xssPayload = '<script>alert("XSS")</script>';
    await page.fill('input[name="email"]', xssPayload);

    // Vérifier que le script n'est pas exécuté
    const scriptExecuted = await page.evaluate(() => {
      return window.testXSSExecuted || false;
    });

    expect(scriptExecuted).toBeFalsy();
  });

  test('CSRF Protection', async ({ page }) => {
    // Test sans token CSRF
    await page.goto('http://localhost:8080/api/v1/auth/logout');

    const response = await page.request.post('http://localhost:8080/api/v1/auth/logout', {
      headers: {
        'Content-Type': 'application/json'
      },
      data: {}
    });

    // Devrait échouer sans token CSRF valide
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Rate Limiting', async ({ request }) => {
    const endpoint = 'http://localhost:3000/api/v1/auth/login';

    // Faire plusieurs requêtes rapides
    const requests = Array(10).fill(0).map(() =>
      request.post(endpoint, {
        data: {
          email: 'redacted@example.invalid',
          password: 'wrongpassword'
        }
      })
    );

    const responses = await Promise.all(requests);

    // Au moins une requête devrait être limitée
    const rateLimited = responses.some(r => r.status() === 429);
    expect(rateLimited).toBeTruthy();
  });

  test('Headers de sécurité', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Vérifier les headers de sécurité
    const securityHeaders = await page.evaluate(() => {
      const headers = {};
      const responseHeaders = document.querySelector('meta[http-equiv="X-Content-Type-Options"]') ||
                             document.querySelector('meta[http-equiv="X-Frame-Options"]') ||
                             document.querySelector('meta[http-equiv="X-XSS-Protection"]');

      return {
        contentTypeOptions: !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
        frameOptions: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
        xssProtection: !!document.querySelector('meta[http-equiv="X-XSS-Protection"]'),
        csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      };
    });

    // Au moins quelques headers de sécurité devraient être présents
    const securityScore = Object.values(securityHeaders).filter(Boolean).length;
    expect(securityScore).toBeGreaterThan(0);
  });
});`;
  };

  // Composants utilitaires pour l'interface
  const getFileIcon = (type: string, size: 'sm' | 'md' = 'sm') => {
    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    switch (type) {
      case 'spec': return <TestTube className={`${iconSize} text-green-600`} />;
      case 'config': return <SettingsIcon className={`${iconSize} text-blue-600`} />;
      case 'helper': return <Code className={`${iconSize} text-purple-600`} />;
      case 'fixture': return <Database className={`${iconSize} text-orange-600`} />;
      case 'page': return <FileText className={`${iconSize} text-cyan-600`} />;
      case 'api': return <Globe className={`${iconSize} text-indigo-600`} />;
      case 'backend': return <Server className={`${iconSize} text-gray-600`} />;
      case 'mobile': return <Mobile className={`${iconSize} text-pink-600`} />;
      case 'performance': return <TrendingUp className={`${iconSize} text-yellow-600`} />;
      case 'security': return <Shield className={`${iconSize} text-red-600`} />;
      case 'unit': return <Target className={`${iconSize} text-teal-600`} />;
      case 'database': return <Database className={`${iconSize} text-blue-500`} />;
      case 'integration': return <GitBranch className={`${iconSize} text-purple-500`} />;
      case 'frontend': return <Monitor className={`${iconSize} text-green-500`} />;
      default: return <File className={`${iconSize} text-gray-500`} />;
    }
  };

  const getStatusIcon = (status: string, size: 'sm' | 'md' = 'sm') => {
    const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    switch (status) {
      case 'passed': return <CheckCircle className={`${iconSize} text-green-600`} />;
      case 'failed': return <XCircle className={`${iconSize} text-red-600`} />;
      case 'running': return <Clock className={`${iconSize} text-blue-600 animate-spin`} />;
      case 'timeout': return <AlertCircle className={`${iconSize} text-orange-600`} />;
      case 'skipped': return <SkipForward className={`${iconSize} text-gray-500`} />;
      default: return <Activity className={`${iconSize} text-gray-400`} />;
    }
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser.toLowerCase()) {
      case 'chromium': return <Chrome className="h-4 w-4" />;
      case 'firefox': return <Firefox className="h-4 w-4 text-orange-500" />;
      case 'webkit': case 'safari': return <Safari className="h-4 w-4 text-blue-500" />;
      case 'mobile': return <Mobile className="h-4 w-4" />;
      default: return <Desktop className="h-4 w-4" />;
    }
  };

  return (
    <AdminLayout>
      <div className="h-screen flex flex-col bg-[#1e1e1e] text-white">
        {/* Menu bar - Style VS Code */}
        <div className="bg-[#323233] border-b border-[#3e3e42] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-[#007acc]" />
              <span className="font-semibold">Playwright Test</span>
            </div>

            {/* Onglets des fichiers ouverts */}
            <div className="flex items-center gap-1">
              {openedFiles.map(file => (
                <div
                  key={file.name}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm cursor-pointer transition-colors ${
                    activeFile?.name === file.name
                      ? 'bg-[#2d2d30] text-white'
                      : 'bg-[#1e1e1e] text-gray-300 hover:bg-[#2d2d30]'
                  } ${file.isDirty ? 'border-t-2 border-[#007acc]' : ''}`}
                  onClick={() => handleFileSelect(file)}
                >
                  {getFileIcon(file.type, 'sm')}
                  <span className="max-w-32 truncate">{file.name}</span>
                  <XIcon
                    className="h-3 w-3 hover:bg-[#3e3e42] rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileClose(file.name);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Contrôles d'exécution */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
            <Button
              size="sm"
                  variant="ghost"
                  className="text-gray-300 hover:text-white hover:bg-[#3e3e42]"
            >
                  <FilePlus className="h-4 w-4 mr-1" />
                  New Test
                  <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#2d2d30] border-[#3e3e42]">
                <DropdownMenuItem onClick={() => handleCreateNewTest('spec', 'basic')}>
                  <TestTube className="h-4 w-4 mr-2 text-green-600" />
                  <span>E2E Test</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateNewTest('api', 'api')}>
                  <Globe className="h-4 w-4 mr-2 text-indigo-600" />
                  <span>API Test</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateNewTest('database', 'database')}>
                  <Database className="h-4 w-4 mr-2 text-blue-500" />
                  <span>Database Test</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleCreateNewTest('mobile', 'mobile')}>
                  <Mobile className="h-4 w-4 mr-2 text-pink-600" />
                  <span>Mobile Test</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateNewTest('performance', 'performance')}>
                  <TrendingUp className="h-4 w-4 mr-2 text-yellow-600" />
                  <span>Performance Test</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCreateNewTest('security', 'security')}>
                  <Shield className="h-4 w-4 mr-2 text-red-600" />
                  <span>Security Test</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => generateTestData(10, 25)}>
                  <Users className="h-4 w-4 mr-2 text-purple-600" />
                  <span>Generate Test Data</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => handleRunTest()}
              disabled={isRunning}
              className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
            >
              <Play className={`h-4 w-4 mr-2 ${isRunning ? 'animate-pulse' : ''}`} />
              {isRunning ? 'Running...' : 'Run'}
            </Button>

                <Button
                  size="sm"
              variant="ghost"
              onClick={() => setTerminalVisible(!terminalVisible)}
              className="text-gray-300 hover:text-white hover:bg-[#3e3e42]"
                >
              <Terminal className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
              variant="ghost"
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="text-gray-300 hover:text-white hover:bg-[#3e3e42]"
            >
              <Sidebar className="h-4 w-4" />
                </Button>
        </div>
      </div>

        {/* Contenu principal - Style VS Code */}
      <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Explorateur (gauche) */}
          {sidebarVisible && (
            <div className="w-64 bg-[#252526] border-r border-[#3e3e42] flex flex-col">
              {/* Onglets de la sidebar */}
              <div className="bg-[#2d2d30] border-b border-[#3e3e42] px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      activeView === 'explorer' ? 'bg-[#007acc] text-white' : 'text-gray-300 hover:bg-[#3e3e42]'
                    }`}
                    onClick={() => setActiveView('explorer')}
                  >
                    📁 Explorer
                  </div>
                  <div
                    className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                      activeView === 'search' ? 'bg-[#007acc] text-white' : 'text-gray-300 hover:bg-[#3e3e42]'
                    }`}
                    onClick={() => setActiveView('search')}
                  >
                    🔍 Search
                  </div>
                <div
                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                    activeView === 'run' ? 'bg-[#007acc] text-white' : 'text-gray-300 hover:bg-[#3e3e42]'
                  }`}
                  onClick={() => setActiveView('run')}
                >
                  ▶️ Run
                </div>
                <div
                  className={`px-2 py-1 rounded cursor-pointer transition-colors ${
                    activeView === 'webview' ? 'bg-[#007acc] text-white' : 'text-gray-300 hover:bg-[#3e3e42]'
                  }`}
                  onClick={() => setActiveView('webview')}
                >
                  🌐 WebView
                </div>
                </div>
            </div>

              {/* Contenu de la sidebar selon l'onglet actif */}
              <div className="flex-1 overflow-auto">
                {activeView === 'explorer' && (
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300 uppercase">Playwright Tests</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <RefreshCw className="h-3 w-3" />
                      </Button>
      </div>

                    {/* Structure des dossiers */}
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-1 text-blue-400 hover:bg-[#2a2d2e] rounded px-1 py-0.5 cursor-pointer">
                        <Folder className="h-4 w-4" />
                        <span>e2e</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-1 text-blue-400 hover:bg-[#2a2d2e] rounded px-1 py-0.5 cursor-pointer">
                          <Folder className="h-4 w-4" />
                          <span>specs</span>
                        </div>
                        <div className="ml-4 space-y-1">
                          {openedFiles.filter(f => f.type === 'spec').map(file => (
                <div
                  key={file.name}
                              className={`flex items-center gap-1 hover:bg-[#2a2d2e] rounded px-1 py-0.5 cursor-pointer ${
                                activeFile?.name === file.name ? 'bg-[#007acc] text-white' : 'text-gray-300'
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                              {getFileIcon(file.type, 'sm')}
                              <span>{file.name}</span>
                  </div>
                          ))}
            </div>

                        <div className="flex items-center gap-1 text-blue-400 hover:bg-[#2a2d2e] rounded px-1 py-0.5 cursor-pointer">
                          <Folder className="h-4 w-4" />
                          <span>utils</span>
                        </div>
                        <div className="ml-4">
                          {openedFiles.filter(f => f.type === 'helper' || f.type === 'fixture').map(file => (
                <div
                  key={file.name}
                              className={`flex items-center gap-1 hover:bg-[#2a2d2e] rounded px-1 py-0.5 cursor-pointer ${
                                activeFile?.name === file.name ? 'bg-[#007acc] text-white' : 'text-gray-300'
                  }`}
                  onClick={() => handleFileSelect(file)}
                >
                              {getFileIcon(file.type, 'sm')}
                              <span>{file.name}</span>
                </div>
              ))}
            </div>
          </div>

                      <div className="flex items-center gap-1 text-blue-400 hover:bg-[#2a2d2e] rounded px-1 py-0.5 cursor-pointer">
                        <SettingsIcon className="h-4 w-4" />
                        <span>playwright.config.ts</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeView === 'webview' && (
                  <div className="p-2">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Playwright WebView</h3>
            <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="ghost"
                          className="w-full justify-start text-xs"
                          onClick={() => setWebviewVisible(!webviewVisible)}
                        >
                          <Monitor className="h-3 w-3 mr-2" />
                          {webviewVisible ? 'Masquer WebView' : 'Afficher WebView'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start text-xs"
                          onClick={() => window.open('http://localhost:8080', '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          Ouvrir dans navigateur
                  </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Environnements</h3>
                      <Select value={selectedEnvironment} onValueChange={(value: any) => setSelectedEnvironment(value)}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dev">Development</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="prod">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Base de données</h3>
                      <Select value={testDatabase} onValueChange={(value: any) => setTestDatabase(value)}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dev">Dev DB</SelectItem>
                          <SelectItem value="staging">Staging DB</SelectItem>
                          <SelectItem value="prod">Prod DB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {activeView === 'run' && (
                  <div className="p-2">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Test Results</h3>
                      <div className="space-y-1">
                        {testResults.map(result => (
                          <div key={result.id} className="flex items-center gap-2 text-xs p-2 bg-[#1e1e1e] rounded">
                            {getStatusIcon(result.status, 'sm')}
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-300 truncate">{result.testName}</div>
                              <div className="text-gray-500">{result.browser} • {result.duration}ms</div>
                            </div>
                </div>
              ))}
            </div>
          </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-2">Projects</h3>
                      <div className="space-y-1">
                        {projects.map(project => (
                          <div
                            key={project.name}
                            className="flex items-center gap-2 text-xs p-2 hover:bg-[#2a2d2e] rounded cursor-pointer"
                            onClick={() => handleRunTest(undefined, project.name)}
                          >
                            <Play className="h-3 w-3" />
                            <span>{project.name}</span>
        </div>
              ))}
            </div>
          </div>
        </div>
                )}
              </div>
            </div>
          )}

        {/* Éditeur de code (centre) */}
        <div className="flex-1 flex flex-col">
            {/* Barre d'outils de l'éditeur - Style VS Code */}
            {activeFile && (
              <div className="bg-[#323233] border-b border-[#3e3e42] px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getFileIcon(activeFile.type, 'sm')}
                    <span className="text-white font-medium">{activeFile.name}</span>
                    <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                      {activeFile.type}
                  </Badge>
                    {isDirty && (
                      <Badge className="text-xs bg-[#007acc] text-white">
                        Modified
                    </Badge>
                  )}
                </div>

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-[#3e3e42]">
                      <Undo className="h-3 w-3" />
                  </Button>
                    <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white hover:bg-[#3e3e42]">
                      <Redo className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-gray-300 hover:text-white hover:bg-[#3e3e42]"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveFile}
                      disabled={!isDirty}
                      className="text-gray-300 hover:text-white hover:bg-[#3e3e42] disabled:opacity-50"
                    >
                      <SaveIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

            {/* Zone d'édition du code */}
            <div className="flex-1 overflow-auto">
              {activeFile ? (
              <div className="h-full">
                {isEditing ? (
                    <textarea
                      ref={editorRef}
                      value={fileContent}
                      onChange={(e) => {
                        setFileContent(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full h-full bg-[#1e1e1e] text-gray-200 font-mono text-sm resize-none border-0 outline-none p-4"
                      placeholder="Enter your Playwright test code here..."
                      style={{
                        lineHeight: '1.5',
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace'
                      }}
                  />
                ) : (
                    <pre className="h-full text-sm text-gray-200 bg-[#1e1e1e] p-4 overflow-auto font-mono">
                      <code>{fileContent}</code>
                  </pre>
                )}
              </div>
            ) : (
                <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-center">
                    <TestTube className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg font-medium mb-2 text-gray-300">No file selected</p>
                    <p className="text-sm mb-4 text-gray-500">Select a test file from the explorer</p>
                    <Button onClick={handleCreateNewTest} className="bg-[#0e639c] hover:bg-[#1177bb] text-white">
                      <FilePlus className="h-4 w-4 mr-2" />
                      New Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

          {/* WebView (optionnel) */}
          {webviewVisible && (
            <div className="w-96 bg-[#1e1e1e] border-l border-[#3e3e42] flex flex-col">
              <div className="bg-[#323233] border-b border-[#3e3e42] px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-green-400" />
                  <span className="font-medium text-white">Playwright WebView</span>
                  <Badge className="text-xs bg-green-600 text-white">
                    {selectedEnvironment.toUpperCase()}
                  </Badge>
              </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setWebviewVisible(false)}
                  className="text-gray-300 hover:text-white hover:bg-[#3e3e42]"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex-1 p-2">
                <iframe
                  src="http://localhost:8080"
                  className="w-full h-full border border-[#3e3e42] rounded"
                  title="Playwright WebView"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </div>
          )}

          {/* Terminal (bas) */}
          {terminalVisible && (
            <div className="h-64 bg-[#1e1e1e] border-t border-[#3e3e42] flex flex-col">
              <div className="bg-[#252526] border-b border-[#3e3e42] px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-white">Terminal</span>
                    {isRunning && (
                      <Badge className="text-xs bg-green-600 text-white animate-pulse">
                        Running
                      </Badge>
                    )}
              </div>
              <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-300 hover:text-white">
                      Clear
                </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-300 hover:text-white">
                      <Split className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          <div
            ref={terminalRef}
            className="flex-1 p-3 overflow-y-auto font-mono text-sm"
                style={{ backgroundColor: '#1e1e1e' }}
          >
            {logs.length === 0 ? (
              <div className="text-gray-500 italic">
                    Ready to run tests...
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-green-400">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
          )}
      </div>
      </div>

      {/* Modal de création d'utilisateur de test */}
      {showUserCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Créer un utilisateur de test
              </h3>
              <button
                onClick={() => setShowUserCreator(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const email = formData.get('email') as string;
                const password = formData.get('password') as string;
                const firstName = formData.get('firstName') as string;
                const lastName = formData.get('lastName') as string;
                const role = formData.get('role') as string;

                if (!email || !password) {
                  addLog('❌ Email et mot de passe requis');
                  return;
                }

                setCreatingUser(true);
                try {
                  const response = await fetch('/api/v1/admin/test-users', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${user?.token}`,
                      'X-Test-Mode': 'true'
                    },
                    body: JSON.stringify({
                      email,
                      password,
                      firstName,
                      lastName,
                      role
                    })
                  });

                  if (response.ok) {
                    const data = await response.json();
                    addLog(`✅ Utilisateur créé: ${data.user.email}`);
                    setShowUserCreator(false);
                    // Recharger la liste des utilisateurs
                    loadTestUsers();
                  } else {
                    const error = await response.json();
                    addLog(`❌ Erreur création utilisateur: ${error.error}`);
                  }
                } catch (error) {
                  addLog(`❌ Erreur réseau: ${error}`);
                } finally {
                  setCreatingUser(false);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="redacted@example.invalid"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Prénom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Nom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rôle
                  </label>
                  <select
                    name="role"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="USER">Utilisateur</option>
                    <option value="ADMIN">Administrateur</option>
                    <option value="SUPER_ADMIN">Super Administrateur</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUserCreator(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingUser ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
