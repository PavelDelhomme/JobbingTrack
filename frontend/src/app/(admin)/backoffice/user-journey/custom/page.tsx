'use client';

import { useState, useRef, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/auth';
import Link from 'next/link';
import {
  Play,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Smartphone,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronRight,
  Settings2,
} from 'lucide-react';
import { AdbClient, MOBILE_ACTIONS, ACTION_CATEGORIES, executeMobileAction } from '@/lib/adb';
import type { MobileAction } from '@/lib/adb';

// Définition des étapes disponibles (alignées avec journey-builder.js)
const AVAILABLE_STEPS = [
  // Auth & profil
  { id: 'register', name: 'Inscription', description: "Inscription d'un nouvel utilisateur", icon: '👤' },
  { id: 'email_validation', name: 'Validation Email', description: "Validation de l'email après inscription", icon: '📧' },
  { id: 'login', name: 'Connexion', description: 'Connexion utilisateur', icon: '🔐' },
  { id: 'profile', name: 'Profil Utilisateur', description: 'Mise à jour du profil utilisateur', icon: '👨‍💼' },
  // Entreprises
  { id: 'create_companies', name: 'Créer Entreprises', description: 'Créer des entreprises de test', icon: '🏢' },
  { id: 'update_companies', name: 'Mise à jour Entreprises', description: 'Mettre à jour une entreprise existante', icon: '✏️' },
  { id: 'application_with_company', name: 'Candidature avec Entreprise', description: 'Création candidature avec création entreprise', icon: '📝' },
  // Candidatures
  { id: 'create_applications', name: 'Créer Candidatures', description: 'Créer des candidatures de test', icon: '📄' },
  { id: 'update_applications', name: 'Mise à jour Candidatures', description: 'Mettre à jour une candidature existante', icon: '✏️' },
  { id: 'application_status', name: 'Statut Candidature', description: 'Vérification/mise à jour du statut candidature', icon: '📊' },
  { id: 'application_rejected', name: 'Candidature Rejetée', description: 'Marquer candidature comme rejetée après entretien', icon: '❌' },
  // Contacts
  { id: 'create_contacts', name: 'Créer Contacts', description: 'Créer des contacts recruteurs', icon: '👥' },
  { id: 'update_contacts', name: 'Mise à jour Contacts', description: 'Mettre à jour un contact existant', icon: '✏️' },
  { id: 'contact_to_application', name: 'Contact à Candidature', description: "Ajout d'un contact à une candidature", icon: '📇' },
  // Suivi candidature
  { id: 'followup', name: 'Relance', description: "Ajout d'une relance à une candidature", icon: '📞' },
  { id: 'interview', name: 'Entretien', description: "Ajout d'un entretien à une candidature", icon: '📅' },
  { id: 'call_company', name: 'Appel Entreprise', description: "Enregistrement d'un appel avec l'entreprise", icon: '☎️' },
  { id: 'call_contact', name: 'Appel Contact', description: "Enregistrement d'un appel avec un contact", icon: '📱' },
  // Calendrier & événements
  { id: 'create_events', name: 'Créer Événements', description: 'Créer des événements au calendrier', icon: '📆' },
  { id: 'view_calendar', name: 'Voir Calendrier', description: 'Consulter le calendrier des événements', icon: '🗓️' },
  // Dashboard & notifications
  { id: 'view_statistics', name: 'Voir Statistiques', description: 'Consulter le dashboard et les statistiques', icon: '📈' },
  { id: 'list_notifications', name: 'Liste Notifications', description: 'Récupérer la liste des notifications', icon: '🔔' },
  // Mobile vision (section 9 FONCTIONNALITES.md)
  { id: 'view_dashboard', name: 'Dashboard Utilisateur', description: 'Consulter le dashboard mobile : stats, entretiens, relances', icon: '📊' },
  { id: 'search_hub', name: 'Hub Recherche (6 tabs)', description: 'Naviguer les 6 onglets : candidatures, contacts, entreprises, relances, appels, entretiens', icon: '🔍' },
  { id: 'application_detail', name: 'Détail Candidature', description: 'Consulter le détail candidature : timeline, entretiens, relances liés', icon: '📋' },
  { id: 'archive_restore', name: 'Archivage & Restauration', description: 'Archiver → masquer → désarchiver → supprimer → restaurer', icon: '🗑️' },
  { id: 'password_reset', name: 'Reset Mot de Passe', description: 'Demande reset → email MailHog → token → nouveau password', icon: '🔑' },
  { id: 'update_profile_settings', name: 'Profil & Paramètres', description: 'Modifier nom/prénom, changer mot de passe, vérifier profil', icon: '⚙️' },
];

type CustomStep = {
  id: string;
  stepId: string;
  isMobile?: boolean;
  options?: Record<string, any>;
};

type StepResult = {
  step: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning' | 'skipped';
  duration?: number;
  message?: string;
  error?: string;
  verifications?: Array<{ check: string; status: string; message: string }>;
};

type UserMode = 'admin' | 'user';

const CONTROLLER_URL_DEFAULT = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_EMULATOR_CONTROLLER_URL || 'http://localhost:5055')
  : 'http://localhost:5055';

export default function CustomJourneyPage() {
  const { token, isAuthenticated } = useAuth();
  const [steps, setSteps] = useState<CustomStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);
  const [journeyName, setJourneyName] = useState('Mon Parcours Personnalisé');
  const [reportSaved, setReportSaved] = useState(false);
  const [userMode, setUserMode] = useState<UserMode>('user');

  const [controllerUrl, setControllerUrl] = useState(CONTROLLER_URL_DEFAULT);
  const [controllerOk, setControllerOk] = useState<boolean | null>(null);
  const [adbDevices, setAdbDevices] = useState<{ id: string; status: string }[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [showMobileSteps, setShowMobileSteps] = useState(false);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [mobileFilter, setMobileFilter] = useState<string>('all');

  const hasMobileSteps = steps.some(s => s.isMobile);

  useEffect(() => {
    checkController();
  }, [controllerUrl]);

  const checkController = async () => {
    try {
      const res = await fetch(`${controllerUrl.replace(/\/$/, '')}/health`);
      const data = await res.json();
      setControllerOk(!!data.ok);
      if (data.ok) {
        const devRes = await fetch(`${controllerUrl.replace(/\/$/, '')}/devices`);
        const devData = await devRes.json();
        setAdbDevices(devData.devices || []);
        if (devData.devices?.length === 1 && !selectedDevice) {
          setSelectedDevice(devData.devices[0].id);
        }
      }
    } catch {
      setControllerOk(false);
    }
  };

  const addStep = (stepId: string, isMobile = false) => {
    const newStep: CustomStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      stepId,
      isMobile,
      options: {},
    };
    if (isMobile) {
      const action = MOBILE_ACTIONS.find(a => a.id === stepId);
      if (action) {
        const defaults: Record<string, any> = {};
        action.params.forEach(p => { if (p.default !== undefined) defaults[p.key] = p.default; });
        newStep.options = defaults;
      }
    }
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(s => s.id !== stepId));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSteps.length) {
      [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
      setSteps(newSteps);
    }
  };

  const updateStepOptions = (stepId: string, options: Record<string, any>) => {
    setSteps(steps.map(s => s.id === stepId ? { ...s, options: { ...s.options, ...options } } : s));
  };

  const executeJourney = async () => {
    if (steps.length === 0) return;
    if (hasMobileSteps && !selectedDevice) {
      setResults([{ step: 'error', name: 'Configuration', status: 'error', message: 'Selectionnez un appareil ADB pour les etapes mobiles' }]);
      return;
    }

    setIsRunning(true);
    setResults([]);
    setReportSaved(false);

    const apiSteps = steps.filter(s => !s.isMobile);
    const allResults: StepResult[] = [];
    let adb: AdbClient | null = null;

    if (hasMobileSteps) {
      adb = new AdbClient(controllerUrl, selectedDevice);
    }

    for (const step of steps) {
      const stepDef = step.isMobile
        ? MOBILE_ACTIONS.find(a => a.id === step.stepId)
        : AVAILABLE_STEPS.find(s => s.id === step.stepId);

      const result: StepResult = {
        step: step.stepId,
        name: stepDef?.name || step.stepId,
        status: 'running',
      };
      setResults(prev => [...prev, result]);

      const t0 = Date.now();
      try {
        if (step.isMobile && adb) {
          const msg = await executeMobileAction(step.stepId, step.options || {}, adb);
          result.status = 'success';
          result.message = msg;
        } else if (!step.isMobile && token) {
          const response = await fetch('/api/user-journey/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: journeyName, userMode, steps: [{ step: step.stepId, options: step.options || {} }] }),
          });
          const data = await response.json();
          const r = data.results?.[0];
          if (r) {
            result.status = r.status;
            result.message = r.message;
            result.error = r.error;
            result.verifications = r.verifications;
          } else {
            result.status = response.ok ? 'success' : 'error';
            result.message = response.ok ? 'OK' : `HTTP ${response.status}`;
          }
        } else {
          result.status = 'skipped';
          result.message = step.isMobile ? 'Pas d\'appareil ADB' : 'Pas de token d\'authentification';
        }
      } catch (e: any) {
        result.status = 'error';
        result.error = e.message;
      }

      result.duration = Date.now() - t0;
      allResults.push(result);
      setResults([...allResults]);
    }

    if (allResults.length > 0) {
      try {
        const successCount = allResults.filter(r => r.status === 'success').length;
        const reportData = {
          journeyName: journeyName || 'Parcours Personnalise',
          timestamp: new Date().toISOString(),
          summary: {
            totalSteps: allResults.length,
            successCount,
            errorCount: allResults.filter(r => r.status === 'error').length,
            warningCount: allResults.filter(r => r.status === 'warning').length,
            skippedCount: allResults.filter(r => r.status === 'skipped').length,
            totalDuration: allResults.reduce((s, r) => s + (r.duration || 0), 0),
            successRate: `${Math.round((successCount / allResults.length) * 100)}%`,
          },
          results: allResults,
          hasMobileSteps,
          deviceId: selectedDevice || undefined,
        };
        const saveRes = await fetch('/api/user-journey/save-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportData, journeyName: journeyName || 'Parcours Personnalise' }),
        });
        const saveData = await saveRes.json();
        if (saveData.success) setReportSaved(true);
      } catch {}
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: StepResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'running': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: StepResult['status']) => {
    const colors = {
      success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300',
      error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      running: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      pending: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
      skipped: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
    };
    return <Badge className={colors[status] || colors.pending}>{status}</Badge>;
  };

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p>Veuillez vous connecter pour accéder à cette page.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🎯 Parcours Utilisateur Personnalisé
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Construisez votre propre parcours étape par étape
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/backoffice/user-journey/reports">
              <Button variant="outline" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Voir les rapports de parcours
              </Button>
            </Link>
            <Button
              onClick={executeJourney}
              disabled={isRunning || steps.length === 0}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Exécution...' : 'Lancer le Parcours'}
            </Button>
          </div>
        </div>

        {/* Configuration : nom + type d'utilisateur */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration du Parcours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
              <input
                type="text"
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Nom de votre parcours"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type d&apos;utilisateur</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUserMode('user')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    userMode === 'user'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <span className="font-medium text-gray-900 dark:text-white">Utilisateur</span>
                    {userMode === 'user' && <Badge className="ml-auto bg-blue-500">Actif</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Crée un compte test (rôle USER). Simule l&apos;usage réel de l&apos;app mobile.
                  </p>
                </button>
                <button
                  onClick={() => setUserMode('admin')}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    userMode === 'admin'
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🛡️</span>
                    <span className="font-medium text-gray-900 dark:text-white">Admin</span>
                    {userMode === 'admin' && <Badge className="ml-auto bg-orange-500">Actif</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Utilise le compte admin connecté. Pour tester le backoffice.
                  </p>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Config mobile si besoin */}
        {(hasMobileSteps || showMobileSteps) && (
          <Card className="ring-1 ring-indigo-200 dark:ring-indigo-800/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Smartphone className="w-5 h-5" /> Configuration Mobile (ADB)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Controleur</label>
                  <div className="flex gap-2">
                    <input type="text" value={controllerUrl} onChange={(e) => setControllerUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 text-sm" />
                    <button onClick={checkController} className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm">
                      {controllerOk === true ? <Wifi className="w-4 h-4 text-emerald-500" /> : controllerOk === false ? <WifiOff className="w-4 h-4 text-red-500" /> : '...'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Appareil ADB</label>
                  <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 dark:text-gray-100 text-sm">
                    <option value="">-- Choisir --</option>
                    {adbDevices.map(d => <option key={d.id} value={d.id}>{d.id} ({d.status})</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className={`px-3 py-2 rounded-lg text-sm ${controllerOk && selectedDevice ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'}`}>
                    {controllerOk && selectedDevice ? 'Pret pour les tests mobiles' : 'Configurez le controleur + appareil'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Etapes disponibles */}
          <div className="space-y-4">
            {/* API Steps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Etapes API</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {AVAILABLE_STEPS.map(step => (
                  <div key={step.id}
                    className="flex items-center justify-between p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{step.icon}</span>
                      <div>
                        <div className="font-medium text-sm text-gray-900 dark:text-white">{step.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">{step.description}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addStep(step.id)} disabled={isRunning}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Mobile Steps */}
            <Card className="ring-1 ring-indigo-200 dark:ring-indigo-800/30">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowMobileSteps(!showMobileSteps)}>
                <CardTitle className="text-base flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                  <Smartphone className="w-4 h-4" /> Actions Mobiles (ADB)
                  {showMobileSteps ? <ChevronDown className="w-4 h-4 ml-auto" /> : <ChevronRight className="w-4 h-4 ml-auto" />}
                </CardTitle>
              </CardHeader>
              {showMobileSteps && (
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button onClick={() => setMobileFilter('all')}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${mobileFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                      Tout
                    </button>
                    {Object.entries(ACTION_CATEGORIES).map(([key, cat]) => (
                      <button key={key} onClick={() => setMobileFilter(key)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${mobileFilter === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                    {MOBILE_ACTIONS.filter(a => mobileFilter === 'all' || a.category === mobileFilter).map(action => (
                      <div key={action.id}
                        className="flex items-center justify-between p-2.5 border border-indigo-200 dark:border-indigo-800/40 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{action.icon}</span>
                          <div>
                            <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                              {action.name}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                                {ACTION_CATEGORIES[action.category].label}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">{action.description}</div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => addStep(action.id, true)} disabled={isRunning}
                          className="border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Parcours construit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Votre Parcours ({steps.length} etapes)</CardTitle>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Aucune etape ajoutee</p>
                  <p className="text-sm mt-2">Ajoutez des etapes API ou des actions mobiles depuis la colonne de gauche</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const isM = step.isMobile;
                    const stepDef = isM
                      ? MOBILE_ACTIONS.find(a => a.id === step.stepId)
                      : AVAILABLE_STEPS.find(s => s.id === step.stepId);
                    const mobileAction = isM ? (stepDef as MobileAction) : null;
                    const isExpanded = expandedStepId === step.id;

                    return (
                      <div key={step.id}
                        className={`p-3 border rounded-lg ${isM ? 'border-indigo-200 dark:border-indigo-800/40 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-500 w-6">{index + 1}</span>
                          <span className="text-lg">{stepDef?.icon || '?'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                              {stepDef?.name || step.stepId}
                              {isM && <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300">Mobile</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {isM && mobileAction && mobileAction.params.length > 0 && (
                              <Button size="sm" variant="ghost" onClick={() => setExpandedStepId(isExpanded ? null : step.id)}>
                                <Settings2 className="w-4 h-4 text-indigo-500" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => moveStep(index, 'up')} disabled={index === 0 || isRunning}>
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => moveStep(index, 'down')} disabled={index === steps.length - 1 || isRunning}>
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeStep(step.id)} disabled={isRunning}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                        {/* Params editing for mobile actions */}
                        {isExpanded && mobileAction && mobileAction.params.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-800/40 space-y-2">
                            {mobileAction.params.map(param => (
                              <div key={param.key} className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 w-28 shrink-0">{param.label}</label>
                                {param.type === 'select' ? (
                                  <select
                                    value={String(step.options?.[param.key] ?? param.default ?? '')}
                                    onChange={(e) => updateStepOptions(step.id, { [param.key]: e.target.value })}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-100">
                                    {param.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                ) : param.type === 'boolean' ? (
                                  <input type="checkbox"
                                    checked={!!step.options?.[param.key]}
                                    onChange={(e) => updateStepOptions(step.id, { [param.key]: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-700" />
                                ) : (
                                  <input
                                    type={param.type === 'number' ? 'number' : 'text'}
                                    value={String(step.options?.[param.key] ?? param.default ?? '')}
                                    onChange={(e) => updateStepOptions(step.id, { [param.key]: param.type === 'number' ? Number(e.target.value) : e.target.value })}
                                    placeholder={param.placeholder}
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 dark:text-gray-100" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notification rapport sauvegardé */}
        {reportSaved && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-5 h-5" />
                  <span>Rapport sauvegardé dans Rapports de tests</span>
                </div>
                <Link href="/backoffice/user-journey/reports">
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="w-4 h-4" />
                    Voir les rapports de parcours
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Résultats */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Résultats de l&apos;Exécution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {result.name}
                          </div>
                          {result.duration && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Durée: {result.duration}ms
                            </div>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.message && (
                      <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        {result.message}
                      </div>
                    )}
                    {result.error && (
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        {result.error}
                      </div>
                    )}
                    {result.verifications && result.verifications.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {result.verifications.map((v, vIndex) => (
                          <div key={vIndex} className="text-sm text-gray-600 dark:text-gray-400">
                            {v.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

