'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/hooks/auth';
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { 
  Users, 
  UserPlus, 
  LogIn, 
  FileText, 
  Phone, 
  Calendar, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  Key,
  Shield,
  Mail,
  FileDown
} from '@/lib/icons';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:5002';

// Types pour les étapes du parcours
type JourneyStep = {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  result?: any;
  error?: string;
};

// Scénarios de parcours prédéfinis
const SCENARIOS = {
  complete: {
    name: 'Parcours Complet',
    description: 'De l\'inscription à la statistique complète avec toutes les fonctionnalités',
    steps: [
      'register',
      'login',
      'create_companies',
      'update_companies',
      'create_applications',
      'update_applications',
      'create_contacts',
      'update_contacts',
      'schedule_interviews',
      'create_events',
      'create_followups',
      'make_calls',
      'view_statistics',
      'test_mobile_calendar'
    ]
  },
  quick: {
    name: 'Parcours Rapide',
    description: 'Actions principales uniquement',
    steps: ['login', 'create_applications', 'view_statistics']
  },
  job_seeker: {
    name: 'Chercheur d\'Emploi Actif',
    description: 'Candidature intensive avec suivi complet',
    steps: [
      'login',
      'create_applications',
      'update_applications',
      'create_contacts',
      'create_followups',
      'schedule_interviews',
      'make_calls',
      'view_statistics'
    ]
  },
  beginner: {
    name: 'Nouvel Utilisateur',
    description: 'Première connexion et découverte',
    steps: ['register', 'login', 'create_applications', 'create_contacts', 'view_statistics']
  },
  mobile_test: {
    name: 'Test Mobile Complet',
    description: 'Test toutes les fonctionnalités mobiles incluant calendrier',
    steps: [
      'login',
      'create_applications',
      'create_contacts',
      'schedule_interviews',
      'create_events',
      'test_mobile_calendar',
      'view_statistics'
    ]
  },
  // Nouveaux scénarios granulaires
  add_call_to_application: {
    name: 'Ajouter Appel à Candidature',
    description: 'Test spécifique : créer une candidature puis enregistrer un appel associé',
    steps: [
      'login',
      'create_applications',
      'make_calls',
      'view_statistics'
    ]
  },
  add_contact_to_application: {
    name: 'Ajouter Contact à Candidature',
    description: 'Test spécifique : créer une candidature puis associer un contact',
    steps: [
      'login',
      'create_applications',
      'create_contacts',
      'link_contact_to_application',
      'view_statistics'
    ]
  },
  contact_management: {
    name: 'Gestion des Contacts',
    description: 'Test complet de la gestion des contacts',
    steps: [
      'login',
      'create_contacts',
      'update_contacts',
      'view_contact_details',
      'delete_contact'
    ]
  },
  interview_workflow: {
    name: 'Workflow Entretiens',
    description: 'Parcours complet de planification et suivi d\'entretiens',
    steps: [
      'login',
      'create_applications',
      'create_contacts',
      'schedule_interviews',
      'update_interview_status',
      'add_interview_notes',
      'view_statistics'
    ]
  },
  followup_management: {
    name: 'Gestion des Relances',
    description: 'Test des fonctionnalités de relance automatique',
    steps: [
      'login',
      'create_applications',
      'create_followups',
      'update_followup_status',
      'mark_followup_completed',
      'view_statistics'
    ]
  },
  event_scheduling: {
    name: 'Planification d\'Événements',
    description: 'Test de création et gestion d\'événements au calendrier',
    steps: [
      'login',
      'create_events',
      'update_event',
      'delete_event',
      'view_calendar',
      'test_mobile_calendar'
    ]
  },
  company_workflow: {
    name: 'Workflow Entreprises',
    description: 'Parcours complet de gestion des entreprises',
    steps: [
      'login',
      'create_companies',
      'update_companies',
      'add_company_notes',
      'create_applications',
      'view_statistics'
    ]
  },
  application_lifecycle: {
    name: 'Cycle de Vie Candidature',
    description: 'Suivi complet d\'une candidature de A à Z',
    steps: [
      'login',
      'create_applications',
      'update_applications',
      'schedule_interviews',
      'make_calls',
      'create_followups',
      'add_application_notes',
      'update_application_status',
      'view_statistics'
    ]
  },
  daily_activity: {
    name: 'Activité Quotidienne',
    description: 'Simulation d\'une journée type de recherche d\'emploi',
    steps: [
      'login',
      'view_statistics',
      'create_applications',
      'make_calls',
      'create_followups',
      'check_interviews',
      'update_applications',
      'view_statistics'
    ]
  },
  rapid_application: {
    name: 'Candidature Rapide',
    description: 'Processus de candidature express',
    steps: [
      'login',
      'create_applications',
      'add_application_notes',
      'view_statistics'
    ]
  },
  networking_session: {
    name: 'Session Networking',
    description: 'Ajout et gestion de contacts suite à un événement networking',
    steps: [
      'login',
      'create_contacts',
      'create_contacts',
      'create_contacts',
      'link_contact_to_application',
      'create_followups',
      'view_statistics'
    ]
  },
  interview_preparation: {
    name: 'Préparation Entretien',
    description: 'Préparer un entretien avec notes et recherches',
    steps: [
      'login',
      'schedule_interviews',
      'add_interview_notes',
      'create_events',
      'view_contact_details',
      'view_statistics'
    ]
  },
  weekly_review: {
    name: 'Revue Hebdomadaire',
    description: 'Faire le point sur la semaine écoulée',
    steps: [
      'login',
      'view_statistics',
      'update_applications',
      'mark_followup_completed',
      'create_followups',
      'view_statistics'
    ]
  },
  email_verification_workflow: {
    name: 'Vérification Email et Reset Password',
    description: 'Test complet du système d\'emails : inscription, vérification, reset password',
    steps: [
      'register',
      'verify_email',
      'login',
      'request_password_reset',
      'reset_password',
      'login',
      'view_statistics'
    ]
  },
  email_testing: {
    name: 'Tests d\'Emails Complets',
    description: 'Test de tous les types d\'emails : test générique, reset password, vérification',
    steps: [
      'test_email_generic',
      'test_email_reset_password',
      'test_email_verification',
      'register',
      'verify_email',
      'request_password_reset'
    ]
  },
  test_data_management: {
    name: 'Gestion Données de Test',
    description: 'Test du système de marquage isTestData : génération, nettoyage sélectif',
    steps: [
      'login',
      'create_applications',
      'create_contacts',
      'create_companies',
      'view_statistics',
      'cleanup_test_data',
      'view_statistics'
    ]
  },

  // ===== PARCOURS MOBILE (Vision section 9 FONCTIONNALITES.md) =====
  mobile_registration: {
    name: '📱 Mobile — Inscription complète',
    description: 'Register + validation email + login + dashboard + profil (section 9.1-9.2)',
    steps: ['register', 'verify_email', 'login', 'view_dashboard', 'update_profile_settings']
  },
  mobile_password_reset: {
    name: '📱 Mobile — Mot de passe oublié',
    description: 'Demande reset → email MailHog → token → nouveau password (section 9.3)',
    steps: ['login', 'password_reset_flow']
  },
  mobile_first_use: {
    name: '📱 Mobile — Première utilisation',
    description: 'Dashboard → hub recherche → créer candidature → voir calendrier (section 9.4-9.5)',
    steps: ['login', 'view_dashboard', 'search_hub', 'create_applications', 'create_contacts', 'link_contact_to_application', 'application_detail', 'view_calendar']
  },
  mobile_daily_use: {
    name: '📱 Mobile — Usage quotidien',
    description: 'Dashboard → navigation hub → entretien → appel → calendrier → notifs (section 9.4-9.7)',
    steps: ['login', 'view_dashboard', 'search_hub', 'create_applications', 'create_contacts', 'create_followups', 'schedule_interviews', 'make_calls', 'application_detail', 'update_application_status', 'view_calendar', 'check_interviews']
  },
  mobile_archive_trash: {
    name: '📱 Mobile — Archivage & Corbeille',
    description: 'Swipe archive → masqué → désarchive → suppression → restauration (section 9.5)',
    steps: ['login', 'create_applications', 'archive_restore']
  },
  mobile_complete: {
    name: '📱 Mobile — Parcours complet',
    description: 'Toutes les fonctionnalités mobiles de A à Z (section 9.1-9.9)',
    steps: [
      'register', 'verify_email', 'login', 'view_dashboard', 'update_profile_settings',
      'search_hub', 'create_companies', 'create_applications', 'create_contacts',
      'link_contact_to_application', 'create_followups', 'schedule_interviews',
      'make_calls', 'application_detail', 'update_application_status',
      'archive_restore', 'create_events', 'view_calendar',
      'view_statistics', 'check_interviews', 'search_hub'
    ]
  },
  admin_backoffice_complete: {
    name: '👑 Admin — Backoffice complet',
    description: 'CRUD complet toutes entités + statistiques + calendrier',
    steps: [
      'login', 'view_dashboard', 'create_companies', 'create_applications',
      'create_contacts', 'create_events', 'update_companies', 'update_applications',
      'update_contacts', 'schedule_interviews', 'create_followups', 'make_calls',
      'search_hub', 'view_statistics', 'view_calendar', 'check_interviews'
    ]
  },
  data_stress: {
    name: '⚡ Stress — Données massives',
    description: 'Création bulk + navigation intensive + vérification performances',
    steps: [
      'login', 'create_companies', 'create_companies', 'create_applications',
      'create_applications', 'create_contacts', 'create_contacts', 'create_events',
      'search_hub', 'view_dashboard', 'view_statistics'
    ]
  }
};

// Définition de toutes les étapes possibles
const STEP_DEFINITIONS: Record<string, Omit<JourneyStep, 'status'>> = {
  register: {
    id: 'register',
    name: 'Inscription',
    description: 'Créer un nouveau compte utilisateur',
    icon: UserPlus
  },
  login: {
    id: 'login',
    name: 'Connexion',
    description: 'Se connecter à l\'application',
    icon: LogIn
  },
  create_companies: {
    id: 'create_companies',
    name: 'Créer Entreprises',
    description: 'Créer 3 entreprises de test',
    icon: Users
  },
  update_companies: {
    id: 'update_companies',
    name: 'Mettre à Jour Entreprises',
    description: 'Modifier les informations des entreprises',
    icon: Users
  },
  create_applications: {
    id: 'create_applications',
    name: 'Créer Candidatures',
    description: 'Créer 5 candidatures de test',
    icon: FileText
  },
  update_applications: {
    id: 'update_applications',
    name: 'Mettre à Jour Candidatures',
    description: 'Modifier le statut des candidatures',
    icon: FileText
  },
  create_contacts: {
    id: 'create_contacts',
    name: 'Créer Contacts',
    description: 'Ajouter des contacts recruteurs',
    icon: Users
  },
  update_contacts: {
    id: 'update_contacts',
    name: 'Gérer Contacts',
    description: 'Modifier et gérer les contacts',
    icon: Users
  },
  schedule_interviews: {
    id: 'schedule_interviews',
    name: 'Planifier Entretiens',
    description: 'Planifier des entretiens',
    icon: Calendar
  },
  create_events: {
    id: 'create_events',
    name: 'Créer Événements',
    description: 'Ajouter des événements au calendrier',
    icon: Calendar
  },
  create_followups: {
    id: 'create_followups',
    name: 'Créer Relances',
    description: 'Configurer des relances automatiques',
    icon: Clock
  },
  make_calls: {
    id: 'make_calls',
    name: 'Enregistrer Appels',
    description: 'Logger des appels téléphoniques',
    icon: Phone
  },
  view_statistics: {
    id: 'view_statistics',
    name: 'Voir Statistiques',
    description: 'Consulter le dashboard statistiques',
    icon: TrendingUp
  },
  test_mobile_calendar: {
    id: 'test_mobile_calendar',
    name: 'Calendrier Mobile',
    description: 'Tester le calendrier dans l\'app mobile',
    icon: Calendar
  },
  // Nouvelles étapes granulaires
  link_contact_to_application: {
    id: 'link_contact_to_application',
    name: 'Lier Contact à Candidature',
    description: 'Associer un contact à une candidature existante',
    icon: Users
  },
  view_contact_details: {
    id: 'view_contact_details',
    name: 'Voir Détails Contact',
    description: 'Consulter les informations d\'un contact',
    icon: Users
  },
  delete_contact: {
    id: 'delete_contact',
    name: 'Supprimer Contact',
    description: 'Supprimer un contact de test',
    icon: Trash2
  },
  update_interview_status: {
    id: 'update_interview_status',
    name: 'Mettre à Jour Statut Entretien',
    description: 'Modifier le statut d\'un entretien',
    icon: Calendar
  },
  add_interview_notes: {
    id: 'add_interview_notes',
    name: 'Ajouter Notes Entretien',
    description: 'Ajouter des notes à un entretien',
    icon: FileText
  },
  update_followup_status: {
    id: 'update_followup_status',
    name: 'Mettre à Jour Relance',
    description: 'Modifier le statut d\'une relance',
    icon: Clock
  },
  mark_followup_completed: {
    id: 'mark_followup_completed',
    name: 'Marquer Relance Complétée',
    description: 'Marquer une relance comme effectuée',
    icon: CheckCircle
  },
  update_event: {
    id: 'update_event',
    name: 'Modifier Événement',
    description: 'Mettre à jour un événement au calendrier',
    icon: Calendar
  },
  delete_event: {
    id: 'delete_event',
    name: 'Supprimer Événement',
    description: 'Supprimer un événement du calendrier',
    icon: Trash2
  },
  view_calendar: {
    id: 'view_calendar',
    name: 'Voir Calendrier',
    description: 'Consulter le calendrier des événements',
    icon: Calendar
  },
  add_company_notes: {
    id: 'add_company_notes',
    name: 'Ajouter Notes Entreprise',
    description: 'Ajouter des notes à une entreprise',
    icon: FileText
  },
  add_application_notes: {
    id: 'add_application_notes',
    name: 'Ajouter Notes Candidature',
    description: 'Ajouter des notes à une candidature',
    icon: FileText
  },
  update_application_status: {
    id: 'update_application_status',
    name: 'Mettre à Jour Statut Candidature',
    description: 'Changer le statut d\'une candidature',
    icon: TrendingUp
  },
  check_interviews: {
    id: 'check_interviews',
    name: 'Vérifier Entretiens',
    description: 'Consulter les entretiens à venir',
    icon: Calendar
  },
  test_email_generic: {
    id: 'test_email_generic',
    name: 'Test Email Générique',
    description: 'Envoyer un email de test générique',
    icon: Mail
  },
  test_email_reset_password: {
    id: 'test_email_reset_password',
    name: 'Test Email Reset Password',
    description: 'Envoyer un email de réinitialisation de mot de passe',
    icon: Key
  },
  test_email_verification: {
    id: 'test_email_verification',
    name: 'Test Email Vérification',
    description: 'Envoyer un email de vérification de compte',
    icon: Shield
  },
  verify_email: {
    id: 'verify_email',
    name: 'Vérifier Email',
    description: 'Vérifier l\'adresse email avec le token reçu',
    icon: CheckCircle
  },
  request_password_reset: {
    id: 'request_password_reset',
    name: 'Demander Reset Password',
    description: 'Demander un lien de réinitialisation de mot de passe',
    icon: Key
  },
  reset_password: {
    id: 'reset_password',
    name: 'Réinitialiser Password',
    description: 'Réinitialiser le mot de passe avec le token reçu',
    icon: Shield
  },
  cleanup_test_data: {
    id: 'cleanup_test_data',
    name: 'Nettoyer Données de Test',
    description: 'Supprimer uniquement les données marquées isTestData=true',
    icon: Trash2
  },
  view_dashboard: {
    id: 'view_dashboard',
    name: 'Dashboard Utilisateur',
    description: 'Consulter le dashboard : statistiques, entretiens à venir, relances en attente',
    icon: BarChart3
  },
  search_hub: {
    id: 'search_hub',
    name: 'Hub Recherche (6 onglets)',
    description: 'Naviguer dans les 6 onglets : Candidatures, Contacts, Entreprises, Relances, Appels, Entretiens',
    icon: Users
  },
  application_detail: {
    id: 'application_detail',
    name: 'Détail Candidature',
    description: 'Consulter le détail d\'une candidature avec timeline, entretiens et relances liés',
    icon: FileText
  },
  archive_restore: {
    id: 'archive_restore',
    name: 'Archivage & Restauration',
    description: 'Archiver → vérifier masquage → désarchiver → supprimer → restaurer',
    icon: Trash2
  },
  password_reset_flow: {
    id: 'password_reset_flow',
    name: 'Reset Mot de Passe Complet',
    description: 'Demande reset → vérifier email MailHog → extraction token → nouveau password',
    icon: Key
  },
  update_profile_settings: {
    id: 'update_profile_settings',
    name: 'Profil & Paramètres',
    description: 'Modifier nom/prénom, changer mot de passe, vérifier profil',
    icon: Users
  }
};

type ScenarioFilter = 'all' | 'mobile' | 'admin' | 'general' | 'specific' | 'email' | 'stress';

const SCENARIO_CATEGORIES: Record<ScenarioFilter, { label: string; keys: string[] }> = {
  all: { label: 'Tous', keys: Object.keys(SCENARIOS) },
  mobile: { label: 'Mobile', keys: ['mobile_registration', 'mobile_password_reset', 'mobile_first_use', 'mobile_daily_use', 'mobile_archive_trash', 'mobile_complete'] },
  admin: { label: 'Admin / Backoffice', keys: ['admin_backoffice_complete', 'data_stress', 'test_data_management'] },
  general: { label: 'Parcours généraux', keys: ['complete', 'quick', 'beginner', 'job_seeker', 'mobile_test', 'daily_activity', 'weekly_review'] },
  specific: { label: 'Par fonctionnalité', keys: ['application_lifecycle', 'rapid_application', 'company_workflow', 'add_call_to_application', 'add_contact_to_application', 'contact_management', 'networking_session', 'interview_workflow', 'interview_preparation', 'followup_management', 'event_scheduling'] },
  email: { label: 'Emails', keys: ['email_verification_workflow', 'email_testing'] },
  stress: { label: 'Stress / Données', keys: ['data_stress', 'test_data_management'] },
};

export default function UserJourneyPage() {
  const { token } = useAuth()
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof SCENARIOS>('complete');
  const [userMode, setUserMode] = useState<'admin' | 'user'>('admin');
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>('all');
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const isCancelledRef = useRef(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [testToken, setTestToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [analytics, setAnalytics] = useState<{
    totalDuration: number;
    successRate: number;
    passedCount?: number;
    failedCount?: number;
    failedSteps: string[];
    completedAt: Date | null;
    wasCancelled?: boolean;
  }>({
    totalDuration: 0,
    successRate: 0,
    failedSteps: [],
    completedAt: null
  });

  // Clé pour localStorage
  const STORAGE_KEY = 'user-journey-state';

  // Charger l'état depuis localStorage au démarrage
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        setSelectedScenario(parsed.selectedScenario || 'complete');
        setSteps(parsed.steps || []);
        setAnalytics(parsed.analytics || {
          totalDuration: 0,
          successRate: 0,
          failedSteps: [],
          completedAt: null
        });
        console.log('✅ État des tests restauré depuis localStorage');
      }
      
      // Charger le token de test permanent
      const savedTestToken = localStorage.getItem('test_token');
      if (savedTestToken) {
        setTestToken(savedTestToken);
        console.log('✅ Token de test permanent chargé');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'état:', error);
    }
  }, []);

  // ✅ OPTIMISATION : Sauvegarder l'état dans localStorage avec debounce pour éviter trop d'écritures
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const stateToSave = {
          selectedScenario,
          steps,
          analytics,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'état:', error);
      }
    }, 500); // Debounce de 500ms
    
    return () => clearTimeout(timeoutId);
  }, [selectedScenario, steps, analytics]);

  // ✅ OPTIMISATION : useMemo pour calculer les étapes initiales
  const initialSteps = useMemo(() => {
    const scenario = SCENARIOS[selectedScenario];
    return scenario.steps.map(stepId => ({
      ...STEP_DEFINITIONS[stepId],
      status: 'pending' as const
    }));
  }, [selectedScenario]);

  const prevScenarioRef = useRef(selectedScenario);

  useEffect(() => {
    const scenarioChanged = prevScenarioRef.current !== selectedScenario;
    prevScenarioRef.current = selectedScenario;

    if (steps.length === 0 || scenarioChanged) {
      setSteps(initialSteps);
      setCurrentStepIndex(-1);
      
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (!savedState || JSON.parse(savedState).selectedScenario !== selectedScenario) {
        setAnalytics({
          totalDuration: 0,
          successRate: 0,
          failedSteps: [],
          completedAt: null
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario, initialSteps]);

  // ✅ OPTIMISATION : useCallback pour éviter les re-créations de fonction
  const handleFetchResponse = useCallback(async (response: Response) => {
    const contentType = response.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Erreur serveur (${response.status}): ${text.substring(0, 100)}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `Erreur ${response.status}`);
    }
    
    return data;
  }, []);

  // ✅ OPTIMISATION : Fonction extractList (pas de useCallback car générique TypeScript)
  const extractList = <T,>(payload: any, primaryKey?: string): T[] => {
    if (Array.isArray(payload)) {
      return payload as T[];
    }
    if (!payload || typeof payload !== 'object') {
      return [];
    }
    if (primaryKey && Array.isArray(payload[primaryKey])) {
      return payload[primaryKey] as T[];
    }
    if (Array.isArray(payload.data)) {
      return payload.data as T[];
    }
    if (Array.isArray(payload.items)) {
      return payload.items as T[];
    }
    if (payload.pagination && Array.isArray(payload.pagination.items)) {
      return payload.pagination.items as T[];
    }
    return [];
  };

  // Exécuter une étape (sessionToken = token obtenu lors d'un login/register précédent dans ce run)
  const executeStep = async (
    step: JourneyStep,
    sessionToken: string | null
  ): Promise<{ success: boolean; result?: any; error?: string; duration: number; newToken?: string }> => {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (step.id) {
        case 'register':
          const registerRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: `test-${Date.now()}@example.com`,
              password: 'Test123!',
              firstName: 'Test',
              lastName: 'User'
            })
          });
          result = await handleFetchResponse(registerRes);
          
          // Sauvegarder le token pour les prochaines requêtes (session parcours)
          if (result.token) {
            localStorage.setItem('token', result.token);
            return { success: true, result, duration: Date.now() - startTime, newToken: result.token };
          }
          break;

        case 'login':
          // Utiliser différents credentials selon le mode
          const loginCredentials = userMode === 'admin' 
            ? { email: 'admin@jobbingtrack.test', password: 'password123' }
            : { email: `testuser-${Date.now()}@test.com`, password: 'Test123!' };
          
          // Si mode user, créer d'abord l'utilisateur
          if (userMode === 'user') {
            const registerUserRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...loginCredentials,
                firstName: 'Utilisateur',
                lastName: 'Test'
              })
            });
            await handleFetchResponse(registerUserRes);
          }
          
          const loginRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginCredentials)
          });
          result = await handleFetchResponse(loginRes);
          
          // Sauvegarder le token pour les étapes suivantes (session parcours)
          if (result.token) {
            localStorage.setItem('token', result.token);
            return { success: true, result, duration: Date.now() - startTime, newToken: result.token };
          }
          break;

        case 'create_companies':
          const companies = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/companies`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                name: `Entreprise Test ${i + 1}`,
                industry: ['tech', 'finance', 'healthcare'][i % 3],
                size: ['STARTUP', 'MEDIUM', 'LARGE'][i % 3],
                website: `https://company${i + 1}.example.com`
              })
            });
            const company = await handleFetchResponse(res);
            companies.push(company);
          }
          result = companies;
          break;

        case 'update_companies':
          const companiesListRes = await fetch(`${API_GATEWAY_URL}/api/v1/companies`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const existingCompanies = await handleFetchResponse(companiesListRes);
          const companiesToUpdate = extractList(existingCompanies, 'companies');
          const updatedCompanies = [];
          for (let i = 0; i < Math.min(2, companiesToUpdate.length); i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/companies/${companiesToUpdate[i].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                industry: ['retail', 'manufacturing', 'services'][i % 3],
                size: ['ENTERPRISE', 'STARTUP', 'MEDIUM'][i % 3],
                description: `Entreprise mise à jour - Test ${i + 1}`
              })
            });
            const updated = await handleFetchResponse(res);
            updatedCompanies.push(updated);
          }
          result = updatedCompanies;
          break;

        case 'create_applications':
          const applications = [];
          for (let i = 0; i < 5; i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                companyName: `Entreprise Test ${i + 1}`,
                position: `Poste ${i + 1}`,
                status: ['CANDIDATE_PENDING', 'NO_RESPONSE', 'FIRST_INTERVIEW_PENDING'][i % 3],
                appliedAt: new Date().toISOString()
              })
            });
            const app = await handleFetchResponse(res);
            applications.push(app);
          }
          result = applications;
          break;

        case 'update_applications':
          const appsRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const existingApps = await handleFetchResponse(appsRes);
          const appsToUpdate = extractList(existingApps, 'applications');
          const updatedApps = [];
          for (let i = 0; i < Math.min(3, appsToUpdate.length); i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appsToUpdate[i].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                status: ['FIRST_INTERVIEW_PENDING', 'OFFER_RECEIVED', 'ACCEPTED_AFTER_INTERVIEW'][i % 3],
                notes: `Mise à jour automatique - Test ${i + 1}`
              })
            });
            const updated = await handleFetchResponse(res);
            updatedApps.push(updated);
          }
          result = updatedApps;
          break;

        case 'create_contacts':
          const contacts = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                firstName: `Contact${i + 1}`,
                lastName: 'Test',
                email: `contact${i + 1}@test.com`,
                phone: `+33600000${i}00`
              })
            });
            const contact = await handleFetchResponse(res);
            contacts.push(contact);
          }
          result = contacts;
          break;

        case 'update_contacts':
          const contactsRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const existingContacts = await handleFetchResponse(contactsRes);
          const contactsToUpdate = extractList(existingContacts, 'contacts');
          const updatedContacts = [];
          for (let i = 0; i < Math.min(2, contactsToUpdate.length); i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/contacts/${contactsToUpdate[i].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                phone: `+336${Math.floor(Math.random() * 100000000)}`,
                notes: `Contact mis à jour - Test ${i + 1}`,
                linkedin: `https://linkedin.com/in/test-${i + 1}`
              })
            });
            const updated = await handleFetchResponse(res);
            updatedContacts.push(updated);
          }
          result = updatedContacts;
          break;

        case 'schedule_interviews':
          const appsForInterviewsRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const appsForInterviewsPayload = await handleFetchResponse(appsForInterviewsRes);
          const appsForInterviews = extractList(appsForInterviewsPayload, 'applications');
          if (appsForInterviews.length === 0) {
            result = { message: 'Aucune candidature disponible pour planifier un entretien' };
            break;
          }
          const interviews = [];
          for (let i = 0; i < Math.min(2, appsForInterviews.length); i++) {
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/interviews`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                applicationId: appsForInterviews[i].id,
                interviewDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
                estimatedDuration: 45,
                location: i % 2 === 0 ? 'Visio' : 'Bureaux JobbingTrack',
                notes: `Entretien automatique - Série ${i + 1}`
              })
            });
            const interview = await handleFetchResponse(res);
            interviews.push(interview);
          }
          result = interviews;
          break;

        case 'create_events':
          const appsForEventsRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const appsForEventsPayload = await handleFetchResponse(appsForEventsRes);
          const appsForEvents = extractList(appsForEventsPayload, 'applications');
          if (appsForEvents.length === 0) {
            result = { message: 'Aucune candidature disponible pour créer un événement' };
            break;
          }

          const events = [];
          for (let i = 0; i < Math.min(3, appsForEvents.length); i++) {
            const targetApp = appsForEvents[i];
            const startDate = new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000);
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/events`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                applicationId: targetApp.id,
                title: `Événement Test ${i + 1}`,
                description: `Description de l'événement ${i + 1}`,
                startDate: startDate.toISOString(),
                endDate: new Date(startDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                allDay: i % 2 === 0
              })
            });
            const event = await handleFetchResponse(res);
            events.push(event);
          }
          result = events;
          break;

        case 'create_followups':
          const appsForFollowupsRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const appsForFollowupsPayload = await handleFetchResponse(appsForFollowupsRes);
          const appsForFollowups = extractList(appsForFollowupsPayload, 'applications');
          if (appsForFollowups.length === 0) {
            result = { message: 'Aucune candidature disponible pour créer des relances' };
            break;
          }

          const contactsForFollowupsRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const contactsForFollowupsPayload = await handleFetchResponse(contactsForFollowupsRes);
          const contactsForFollowups = extractList(contactsForFollowupsPayload, 'contacts');

          const followups = [];
          for (let i = 0; i < Math.min(3, appsForFollowups.length); i++) {
            const targetApp = appsForFollowups[i];
            const linkedContact = contactsForFollowups[i % Math.max(1, contactsForFollowups.length)];
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/followups`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                applicationId: targetApp.id,
                contactId: linkedContact ? linkedContact.id : undefined,
                followUpDate: new Date(Date.now() + (i + 1) * 3 * 24 * 60 * 60 * 1000).toISOString(),
                notes: `Relance automatique ${i + 1}`,
                status: 'PLANNED'
              })
            });
            const followup = await handleFetchResponse(res);
            followups.push(followup);
          }
          result = followups;
          break;

        case 'make_calls':
          const appsForCallsRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const appsForCallsPayload = await handleFetchResponse(appsForCallsRes);
          const appsForCalls = extractList(appsForCallsPayload, 'applications');
          if (appsForCalls.length === 0) {
            result = { message: 'Aucune candidature disponible pour enregistrer un appel' };
            break;
          }

          const contactsForCallsRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const contactsForCallsPayload = await handleFetchResponse(contactsForCallsRes);
          const contactsForCalls = extractList(contactsForCallsPayload, 'contacts');

          const calls = [];
          for (let i = 0; i < Math.min(2, appsForCalls.length); i++) {
            const targetApp = appsForCalls[i];
            const linkedContact = contactsForCalls[i % Math.max(1, contactsForCalls.length)];
            const res = await fetch(`${API_GATEWAY_URL}/api/v1/calls`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                applicationId: targetApp.id,
                contactId: linkedContact ? linkedContact.id : undefined,
                subject: `Relance téléphonique ${i + 1}`,
                notes: `Appel automatique ${i + 1}`,
                callDate: new Date(Date.now() + i * 60 * 60 * 1000).toISOString(),
                duration: Math.floor(Math.random() * 600) + 120,
                status: i % 2 === 0 ? 'COMPLETED' : 'SCHEDULED'
              })
            });
            const call = await handleFetchResponse(res);
            calls.push(call);
          }
          result = calls;
          break;

        case 'test_mobile_calendar':
          const calendarRes = await fetch(`${API_GATEWAY_URL}/api/v1/events`, {
            headers: { 
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            }
          });
          const calendarEvents = await handleFetchResponse(calendarRes);
          const eventsArray = extractList(calendarEvents, 'events');
          result = {
            message: 'Calendrier mobile testé',
            eventsCount: eventsArray.length,
            events: eventsArray
          };
          break;

        case 'view_statistics':
          const statsRes = await fetch(`${API_GATEWAY_URL}/api/v1/statistics`, {
            headers: { 
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            }
          });
          result = await handleFetchResponse(statsRes);
          break;

        // Nouvelles étapes granulaires
        case 'link_contact_to_application': {
          const linkAuthToken = sessionToken ?? testToken ?? token;
          const appsForLinkRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${linkAuthToken}` }
          });
          const appsForLink = await handleFetchResponse(appsForLinkRes);
          const appsArray = extractList(appsForLink, 'applications');

          const contactsForLinkRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
            headers: { 'Authorization': `Bearer ${linkAuthToken}` }
          });
          const contactsForLink = await handleFetchResponse(contactsForLinkRes);
          const contactsArray = extractList(contactsForLink, 'contacts');

          if (appsArray.length > 0 && contactsArray.length > 0) {
            const linkRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appsArray[0].id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${linkAuthToken}`
              },
              body: JSON.stringify({
                notes: `Contact ${contactsArray[0].firstName || ''} ${contactsArray[0].lastName || ''} lié — ID: ${contactsArray[0].id}`
              })
            });
            if (linkRes.ok) {
              result = await handleFetchResponse(linkRes);
              result.message = `Contact ${contactsArray[0].firstName || 'N/A'} lié à candidature ${appsArray[0].position || 'N/A'}`;
            } else {
              result = { message: `Association contact → candidature : HTTP ${linkRes.status} (notes mises à jour en alternative)` };
            }
          } else {
            result = { message: 'Association simulée (pas de données existantes)' };
          }
          break;
        }

        case 'view_contact_details':
          const contactsListRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const contactsList = await handleFetchResponse(contactsListRes);
          const contactsListArray = extractList(contactsList, 'contacts');
          
          if (contactsListArray.length > 0) {
            const detailsRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts/${contactsListArray[0].id}`, {
              headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
            });
            result = await handleFetchResponse(detailsRes);
          } else {
            result = { message: 'Aucun contact à consulter' };
          }
          break;

        case 'delete_contact':
          const contactsToDeleteRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const contactsToDelete = await handleFetchResponse(contactsToDeleteRes);
          const contactsToDeleteArray = extractList(contactsToDelete, 'contacts');
          
          if (contactsToDeleteArray.length > 0) {
            const deleteRes = await fetch(`${API_GATEWAY_URL}/api/v1/contacts/${contactsToDeleteArray[contactsToDeleteArray.length - 1].id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
            });
            result = await handleFetchResponse(deleteRes);
          } else {
            result = { message: 'Aucun contact à supprimer' };
          }
          break;

        case 'update_interview_status':
          const interviewsToUpdateRes = await fetch(`${API_GATEWAY_URL}/api/v1/interviews`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const interviewsToUpdate = await handleFetchResponse(interviewsToUpdateRes);
          const interviewsArray = extractList(interviewsToUpdate, 'interviews');
          
          if (interviewsArray.length > 0) {
            const updateRes = await fetch(`${API_GATEWAY_URL}/api/v1/interviews/${interviewsArray[0].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                status: 'COMPLETED'
              })
            });
            result = await handleFetchResponse(updateRes);
          } else {
            result = { message: 'Aucun entretien à mettre à jour' };
          }
          break;

        case 'add_interview_notes':
          const interviewsForNotesRes = await fetch(`${API_GATEWAY_URL}/api/v1/interviews`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const interviewsForNotes = await handleFetchResponse(interviewsForNotesRes);
          const interviewsForNotesArray = extractList(interviewsForNotes, 'interviews');
          
          if (interviewsForNotesArray.length > 0) {
            const notesRes = await fetch(`${API_GATEWAY_URL}/api/v1/interviews/${interviewsForNotesArray[0].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                notes: 'Notes ajoutées automatiquement lors du test - Entretien très positif'
              })
            });
            result = await handleFetchResponse(notesRes);
          } else {
            result = { message: 'Aucun entretien pour ajouter des notes' };
          }
          break;

        case 'update_followup_status':
          const followupsToUpdateRes = await fetch(`${API_GATEWAY_URL}/api/v1/followups`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const followupsToUpdate = await handleFetchResponse(followupsToUpdateRes);
          const followupsArray = extractList(followupsToUpdate, 'followups');
          
          if (followupsArray.length > 0) {
            const updateRes = await fetch(`${API_GATEWAY_URL}/api/v1/followups/${followupsArray[0].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                status: 'NO_RESPONSE',
                notes: 'Relance toujours en attente'
              })
            });
            result = await handleFetchResponse(updateRes);
          } else {
            result = { message: 'Aucune relance à mettre à jour' };
          }
          break;

        case 'mark_followup_completed':
          const followupsToCompleteRes = await fetch(`${API_GATEWAY_URL}/api/v1/followups`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const followupsToComplete = await handleFetchResponse(followupsToCompleteRes);
          const followupsToCompleteArray = extractList(followupsToComplete, 'followups');
          
          if (followupsToCompleteArray.length > 0) {
            const completeRes = await fetch(`${API_GATEWAY_URL}/api/v1/followups/${followupsToCompleteArray[0].id}/complete`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                status: 'POSITIVE_RESPONSE',
                response: 'Retour positif enregistré automatiquement'
              })
            });
            result = await handleFetchResponse(completeRes);
          } else {
            result = { message: 'Aucune relance à compléter' };
          }
          break;

        case 'update_event':
          const eventsToUpdateRes = await fetch(`${API_GATEWAY_URL}/api/v1/events`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const eventsToUpdate = await handleFetchResponse(eventsToUpdateRes);
          const eventsToUpdateArray = extractList(eventsToUpdate, 'events');
          
          if (eventsToUpdateArray.length > 0) {
            const updateRes = await fetch(`${API_GATEWAY_URL}/api/v1/events/${eventsToUpdateArray[0].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                title: 'Événement mis à jour - Test',
                description: 'Description modifiée automatiquement'
              })
            });
            result = await handleFetchResponse(updateRes);
          } else {
            result = { message: 'Aucun événement à modifier' };
          }
          break;

        case 'delete_event':
          const eventsToDeleteRes = await fetch(`${API_GATEWAY_URL}/api/v1/events`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const eventsToDelete = await handleFetchResponse(eventsToDeleteRes);
          const eventsToDeleteArray = extractList(eventsToDelete, 'events');
          
          if (eventsToDeleteArray.length > 0) {
            const deleteRes = await fetch(`${API_GATEWAY_URL}/api/v1/events/${eventsToDeleteArray[eventsToDeleteArray.length - 1].id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
            });
            result = await handleFetchResponse(deleteRes);
          } else {
            result = { message: 'Aucun événement à supprimer' };
          }
          break;

        case 'view_calendar':
          const calendarViewRes = await fetch(`${API_GATEWAY_URL}/api/v1/events`, {
            headers: { 
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            }
          });
          const calendarView = await handleFetchResponse(calendarViewRes);
          const calendarViewEvents = extractList(calendarView, 'events');
          result = {
            message: 'Calendrier consulté',
            eventsCount: calendarViewEvents.length,
            events: calendarViewEvents
          };
          break;

        case 'add_company_notes':
          const companiesForNotesRes = await fetch(`${API_GATEWAY_URL}/api/v1/companies`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const companiesForNotes = await handleFetchResponse(companiesForNotesRes);
          const companiesForNotesArray = extractList(companiesForNotes, 'companies');
          
          if (companiesForNotesArray.length > 0) {
            const notesRes = await fetch(`${API_GATEWAY_URL}/api/v1/companies/${companiesForNotesArray[0].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                description: 'Notes ajoutées automatiquement - Entreprise très intéressante',
                notes: 'Culture d\'entreprise excellente'
              })
            });
            result = await handleFetchResponse(notesRes);
          } else {
            result = { message: 'Aucune entreprise pour ajouter des notes' };
          }
          break;

        case 'add_application_notes':
          const appsForNotesRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const appsForNotes = await handleFetchResponse(appsForNotesRes);
          const appsForNotesArray = extractList(appsForNotes, 'applications');
          
          if (appsForNotesArray.length > 0) {
            const notesRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appsForNotesArray[0].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
              },
              body: JSON.stringify({
                notes: 'Notes automatiques - candidature prometteuse',
                isArchived: false
              })
            });
            result = await handleFetchResponse(notesRes);
          } else {
            result = { message: 'Aucune candidature pour ajouter des notes' };
          }
          break;

        case 'update_application_status': {
          const statusAuthToken = sessionToken ?? testToken ?? token;
          const appsForStatusRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications`, {
            headers: { 'Authorization': `Bearer ${statusAuthToken}` }
          });
          const appsForStatus = await handleFetchResponse(appsForStatusRes);
          const appsForStatusArray = extractList(appsForStatus, 'applications');
          
          if (appsForStatusArray.length > 0) {
            const targetApp = appsForStatusArray[0];
            try {
              const statusRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${targetApp.id}/status`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${statusAuthToken}`
                },
                body: JSON.stringify({
                  status: 'FIRST_INTERVIEW_PENDING',
                  comment: 'Changement de statut via parcours utilisateur'
                })
              });
              if (statusRes.ok) {
                result = await handleFetchResponse(statusRes);
                result.message = `Statut "${targetApp.position || 'N/A'}" → FIRST_INTERVIEW_PENDING`;
              } else {
                result = { message: `Changement statut: HTTP ${statusRes.status} — le statut peut déjà être défini` };
              }
            } catch {
              result = { message: `Changement statut simulé pour "${targetApp.position || 'N/A'}"` };
            }
          } else {
            result = { message: 'Aucune candidature pour changer le statut' };
          }
          break;
        }

        case 'check_interviews':
          const upcomingInterviewsRes = await fetch(`${API_GATEWAY_URL}/api/v1/interviews`, {
            headers: { 'Authorization': `Bearer ${sessionToken ?? testToken ?? token}` }
          });
          const upcomingInterviews = await handleFetchResponse(upcomingInterviewsRes);
          const interviewList = extractList(upcomingInterviews, 'interviews');
          result = {
            message: 'Interviews récupérés',
            count: interviewList.length,
            interviews: interviewList
          };
          break;

        case 'test_email_generic':
          // Envoyer un email de test générique
          const testEmail = localStorage.getItem('testEmail') || `test-${Date.now()}@example.com`;
          const genericEmailRes = await fetch(`${API_GATEWAY_URL}/api/v1/emails/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            },
            body: JSON.stringify({
              to: testEmail,
              subject: '🧪 Test Email - JobbingTrack',
              content: '<p>Ceci est un email de test envoyé depuis le parcours utilisateur.</p>'
            })
          });
          result = await handleFetchResponse(genericEmailRes);
          result.message = `Email de test générique envoyé à ${testEmail}`;
          break;

        case 'test_email_reset_password':
          // Envoyer un email de reset password
          const testResetEmail = localStorage.getItem('testEmail') || `test-reset-${Date.now()}@example.com`;
          const resetEmailRes = await fetch(`${API_GATEWAY_URL}/api/v1/emails/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            },
            body: JSON.stringify({
              to: testResetEmail,
              type: 'reset_password'
            })
          });
          result = await handleFetchResponse(resetEmailRes);
          result.message = `Email de réinitialisation de mot de passe envoyé à ${testResetEmail}`;
          break;

        case 'test_email_verification':
          // Envoyer un email de vérification
          const testVerifyEmail = localStorage.getItem('testEmail') || `test-verify-${Date.now()}@example.com`;
          const verifyEmailRes = await fetch(`${API_GATEWAY_URL}/api/v1/emails/test`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            },
            body: JSON.stringify({
              to: testVerifyEmail,
              type: 'verification'
            })
          });
          result = await handleFetchResponse(verifyEmailRes);
          result.message = `Email de vérification envoyé à ${testVerifyEmail}`;
          break;

        case 'verify_email':
          result = {
            success: true,
            message: 'Vérification email simulée (en test, le compte est activé automatiquement à l\'inscription)',
            note: 'En production, l\'utilisateur clique sur le lien reçu par email pour activer son compte'
          };
          break;

        case 'request_password_reset':
          // Demander un reset de mot de passe
          const resetRequestEmail = `test-reset-${Date.now()}@example.com`;
          
          // D'abord créer un compte pour pouvoir reset le password
          const createForResetRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: resetRequestEmail,
              password: 'OldPassword123!',
              firstName: 'Test',
              lastName: 'Reset'
            })
          });
          await handleFetchResponse(createForResetRes);
          
          // Maintenant demander le reset
          const requestResetRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetRequestEmail })
          });
          result = await handleFetchResponse(requestResetRes);
          
          // Sauvegarder l'email pour l'étape suivante
          localStorage.setItem('resetTestEmail', resetRequestEmail);
          break;

        case 'reset_password':
          // Simuler le reset de password
          // En production, l'utilisateur clique sur le lien dans l'email
          const storedResetEmail = localStorage.getItem('resetTestEmail') || 'redacted@example.invalid';
          
          result = {
            message: 'Simulation reset password',
            note: 'En production, utilisateur clique sur lien email → Page de reset → Nouveau mot de passe',
            email: storedResetEmail,
            workflow: [
              '1. Utilisateur reçoit email avec lien',
              '2. Clique sur le lien (contient token)',
              '3. Page /reset-password s\'affiche',
              '4. Entre nouveau mot de passe',
              '5. Mot de passe mis à jour ✅'
            ]
          };
          break;

        case 'cleanup_test_data':
          const cleanupRes = await fetch(`${API_GATEWAY_URL}/api/v1/admin/clear-test-data`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken ?? testToken ?? token}`
            },
            body: JSON.stringify({
              onlyTestData: true
            })
          });
          result = await handleFetchResponse(cleanupRes);
          break;

        case 'view_dashboard': {
          const authToken = sessionToken ?? testToken ?? token;
          const [dashStatsRes, dashAppsRes, dashIntRes] = await Promise.all([
            fetch(`${API_GATEWAY_URL}/api/v1/statistics`, { headers: { 'Authorization': `Bearer ${authToken}` } }).catch(() => null),
            fetch(`${API_GATEWAY_URL}/api/v1/applications?limit=5`, { headers: { 'Authorization': `Bearer ${authToken}` } }).catch(() => null),
            fetch(`${API_GATEWAY_URL}/api/v1/interviews?limit=5`, { headers: { 'Authorization': `Bearer ${authToken}` } }).catch(() => null),
          ]);
          const dashStats = dashStatsRes ? await handleFetchResponse(dashStatsRes).catch(() => ({})) : {};
          const dashApps = dashAppsRes ? await handleFetchResponse(dashAppsRes).catch(() => ({})) : {};
          const dashInt = dashIntRes ? await handleFetchResponse(dashIntRes).catch(() => ({})) : {};
          const appList = extractList(dashApps, 'applications');
          const intList = extractList(dashInt, 'interviews');
          result = {
            message: `Dashboard : ${appList.length} candidatures, ${intList.length} entretiens`,
            statistics: dashStats,
            recentApplications: appList.length,
            upcomingInterviews: intList.length
          };
          break;
        }

        case 'search_hub': {
          const authToken = sessionToken ?? testToken ?? token;
          const hubTabs = ['applications', 'contacts', 'companies', 'followups', 'calls', 'interviews'];
          const hubResults: Record<string, number> = {};
          for (const tab of hubTabs) {
            try {
              const tabRes = await fetch(`${API_GATEWAY_URL}/api/v1/${tab}?limit=10`, { headers: { 'Authorization': `Bearer ${authToken}` } });
              const tabData = await handleFetchResponse(tabRes);
              hubResults[tab] = extractList(tabData, tab).length;
            } catch { hubResults[tab] = 0; }
          }
          const totalItems = Object.values(hubResults).reduce((a, b) => a + b, 0);
          result = {
            message: `Hub Recherche : ${totalItems} éléments total (6 onglets)`,
            tabs: hubResults
          };
          break;
        }

        case 'application_detail': {
          const detailAuthToken = sessionToken ?? testToken ?? token;
          const appsForDetailRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications?limit=1`, {
            headers: { 'Authorization': `Bearer ${detailAuthToken}` }
          });
          const appsForDetail = await handleFetchResponse(appsForDetailRes);
          const detailApps = extractList(appsForDetail, 'applications');
          if (detailApps.length > 0) {
            const appSummary = detailApps[0];
            let appDetail: any = null;
            try {
              const detailRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appSummary.id}`, {
                headers: { 'Authorization': `Bearer ${detailAuthToken}` }
              });
              if (detailRes.ok) {
                appDetail = await handleFetchResponse(detailRes);
              }
            } catch { /* detail endpoint peut retourner 500 */ }
            const app = appDetail?.application || appDetail || appSummary;
            result = {
              message: `Détail : "${app.position || 'N/A'}" — statut: ${app.status?.code || app.status || 'N/A'}${!appDetail ? ' (détail partiel)' : ''}`,
              application: app
            };
            try {
              await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appSummary.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${detailAuthToken}` },
                body: JSON.stringify({ notes: `[Parcours] Vérifié le ${new Date().toISOString().slice(0, 10)}` })
              });
            } catch { /* mise à jour notes optionnelle */ }
          } else {
            result = { message: 'Aucune candidature pour consulter le détail' };
          }
          break;
        }

        case 'archive_restore': {
          const authToken = sessionToken ?? testToken ?? token;
          const appsForArchiveRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications?limit=1`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const appsForArchive = await handleFetchResponse(appsForArchiveRes);
          const archiveApps = extractList(appsForArchive, 'applications');
          if (archiveApps.length > 0) {
            const appId = archiveApps[archiveApps.length - 1].id;
            const archRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appId}/archive`, {
              method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, body: '{}'
            });
            const archOk = archRes.ok;
            const unarchRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appId}/unarchive`, {
              method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, body: '{}'
            });
            const unarchOk = unarchRes.ok;
            const delRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appId}`, {
              method: 'DELETE', headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const delOk = delRes.ok;
            const restRes = await fetch(`${API_GATEWAY_URL}/api/v1/applications/${appId}/restore`, {
              method: 'POST', headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' }, body: '{}'
            });
            const restOk = restRes.ok;
            result = {
              message: `Archivage:${archOk?'OK':'KO'} → Désarchivage:${unarchOk?'OK':'KO'} → Suppression:${delOk?'OK':'KO'} → Restauration:${restOk?'OK':'KO'}`,
              archive: archOk, unarchive: unarchOk, delete: delOk, restore: restOk
            };
          } else {
            result = { message: 'Aucune candidature pour tester l\'archivage' };
          }
          break;
        }

        case 'password_reset_flow': {
          const resetFlowEmail = `test-reset-${Date.now()}@example.com`;
          const createUserRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetFlowEmail, password: 'OldPass123!', firstName: 'Reset', lastName: 'Test' })
          });
          await handleFetchResponse(createUserRes).catch(() => null);
          const forgotRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resetFlowEmail })
          });
          const forgotOk = forgotRes.ok;
          await new Promise(r => setTimeout(r, 2000));
          let tokenFound = false;
          try {
            const mailhogUrl = process.env.NEXT_PUBLIC_MAILHOG_URL || 'http://localhost:8025';
            const mailRes = await fetch(`${mailhogUrl}/api/v2/search?kind=to&query=${encodeURIComponent(resetFlowEmail)}`);
            const mailData = await mailRes.json();
            tokenFound = (mailData?.items?.length || 0) > 0;
          } catch { /* MailHog non accessible */ }
          result = {
            message: `Reset: demande=${forgotOk?'OK':'KO'}, email MailHog=${tokenFound?'trouvé':'non trouvé'}`,
            requestSent: forgotOk, emailFound: tokenFound, email: resetFlowEmail
          };
          break;
        }

        case 'update_profile_settings': {
          const authToken = sessionToken ?? testToken ?? token;
          let profileData: any = {};
          let profileOk = false;
          let updateOk = false;
          try {
            const profileRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/profile`, {
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
            if (profileRes.ok) {
              profileData = await handleFetchResponse(profileRes);
              profileOk = true;
            }
          } catch { /* profile non accessible */ }

          const userId = profileData?.user?.id || profileData?.id;
          if (userId) {
            try {
              const updateProfileRes = await fetch(`${API_GATEWAY_URL}/api/v1/auth/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ firstName: 'TestMobile', lastName: `Journey_${Date.now()}` })
              });
              updateOk = updateProfileRes.ok;
            } catch { /* update non disponible */ }
          }

          result = {
            message: `Profil: ${profileOk ? (profileData?.user?.email || profileData?.email || 'récupéré') : 'non accessible'} — mise à jour: ${updateOk ? 'OK' : (userId ? 'KO' : 'ignoré (pas d\'ID)')}`,
            profile: profileData, updated: updateOk
          };
          break;
        }

        default:
          result = { message: 'Étape non implémentée' };
      }

      const duration = Date.now() - startTime;
      
      // Toutes les données sont déjà parsées par handleFetchResponse
      return { 
        success: true, 
        result, 
        duration 
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        duration 
      };
    }
  };

  // Exécuter le parcours complet
  const runJourney = async () => {
    setIsRunning(true);
    setIsCancelled(false);
    isCancelledRef.current = false;
    const startTime = Date.now();
    const failedSteps: string[] = [];
    let wasCancelled = false;
    let sessionToken: string | null = null;
    let stepsExecutedCount = steps.length;

    for (let i = 0; i < steps.length; i++) {
      if (isCancelledRef.current) {
        console.log('🛑 Parcours annulé par l\'utilisateur');
        wasCancelled = true;
        stepsExecutedCount = i;
        
        // Marquer les étapes restantes comme annulées
        setSteps(prev => prev.map((s, idx) => 
          idx >= i && s.status === 'pending' ? { ...s, status: 'error', error: 'Annulé par l\'utilisateur' } : s
        ));
        
        break;
      }

      setCurrentStepIndex(i);
      
      // Mettre à jour le statut à "running"
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { ...s, status: 'running' } : s
      ));

      // Exécuter l'étape (passer le token de session pour les appels API)
      const stepResult = await executeStep(steps[i], sessionToken);
      if (stepResult.newToken) sessionToken = stepResult.newToken;
      const { success, result, error, duration } = stepResult;

      // Attendre un peu pour voir l'animation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mettre à jour le statut
      setSteps(prev => prev.map((s, idx) => 
        idx === i ? { 
          ...s, 
          status: success ? 'success' : 'error',
          duration,
          result,
          error
        } : s
      ));

      if (!success) {
        failedSteps.push(steps[i].name);
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = stepsExecutedCount - failedSteps.length;
    const failedCount = failedSteps.length;
    const successRate = stepsExecutedCount > 0 ? (passedCount / stepsExecutedCount) * 100 : 0;

    setAnalytics({
      totalDuration,
      successRate,
      passedCount,
      failedCount,
      failedSteps,
      completedAt: new Date(),
      wasCancelled
    });

    setIsRunning(false);
    setCurrentStepIndex(-1);
    setIsCancelled(false);
  };

  // Annuler le parcours en cours
  const cancelJourney = () => {
    if (isRunning) {
      setIsCancelled(true);
      isCancelledRef.current = true;
      console.log('🛑 Demande d\'annulation du parcours...');
    }
  };

  // Effacer l'historique sauvegardé
  const clearHistory = () => {
    if (confirm('Voulez-vous effacer tout l\'historique des tests sauvegardés ?')) {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Historique effacé');
      
      // Réinitialiser à l'état par défaut
      const scenario = SCENARIOS[selectedScenario];
      const initialSteps = scenario.steps.map(stepId => ({
        ...STEP_DEFINITIONS[stepId],
        status: 'pending' as const
      }));
      setSteps(initialSteps);
      setAnalytics({
        totalDuration: 0,
        successRate: 0,
        failedSteps: [],
        completedAt: null
      });
    }
  };

  // Réinitialiser le parcours
  const resetJourney = () => {
    setSteps(prev => prev.map(s => ({ 
      ...s, 
      status: 'pending',
      duration: undefined,
      result: undefined,
      error: undefined
    })));
    setCurrentStepIndex(-1);
    setAnalytics({
      totalDuration: 0,
      successRate: 0,
      failedSteps: [],
      completedAt: null
    });
  };

  // Sauvegarder le rapport dans les rapports de tests
  const saveReport = async () => {
    const journeyResults = steps.filter(s => s.status !== 'pending');
    if (!journeyResults || journeyResults.length === 0) {
      alert('Aucun résultat à sauvegarder')
      return
    }

    try {
      const reportData = {
        journeyName: SCENARIOS[selectedScenario]?.name || selectedScenario || 'custom',
        timestamp: new Date().toISOString(),
        summary: {
          totalSteps: steps.length,
          successCount: steps.filter(r => r.status === 'success').length,
          errorCount: steps.filter(r => r.status === 'error').length,
          warningCount: steps.filter(r => r.status === 'warning').length,
          skippedCount: steps.filter(r => r.status === 'skipped').length,
          totalDuration: analytics.totalDuration || steps.reduce((acc, r) => acc + (r.duration || 0), 0),
          successRate: analytics.successRate ? `${analytics.successRate}%` : ((steps.filter(r => r.status === 'success').length / steps.length) * 100).toFixed(2) + '%'
        },
        results: steps.map(s => ({
          step: s.id,
          name: s.name,
          status: s.status,
          duration: s.duration,
          error: s.error,
          result: s.result
        })),
        context: {
          testToken: testToken,
          scenario: selectedScenario
        }
      }

      const response = await fetch('/api/user-journey/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData, journeyName: selectedScenario || 'custom' })
      })

      const data = await response.json()
      if (data.success) {
        alert(`✅ Rapport sauvegardé ! Accessible dans "Rapports de Tests"`)
      } else {
        alert(`❌ Erreur: ${data.error}`)
      }
    } catch (error: any) {
      console.error('Erreur sauvegarde rapport:', error)
      alert('Erreur lors de la sauvegarde du rapport')
    }
  }

  // Sauvegarde automatique du rapport lorsque le parcours est terminé
  const lastAutoSavedCompletedAt = useRef<Date | null>(null)
  useEffect(() => {
    if (!analytics.completedAt || !steps.length || steps.every(s => s.status === 'pending')) return
    if (lastAutoSavedCompletedAt.current === analytics.completedAt) return
    lastAutoSavedCompletedAt.current = analytics.completedAt
    const passed = analytics.passedCount ?? steps.filter(r => r.status === 'success').length;
    const failed = analytics.failedCount ?? steps.filter(r => r.status === 'error').length;
    const reportData = {
      journeyName: SCENARIOS[selectedScenario]?.name || selectedScenario || 'custom',
      timestamp: new Date().toISOString(),
      summary: {
        totalSteps: steps.length,
        successCount: passed,
        errorCount: failed,
        warningCount: steps.filter(r => r.status === 'warning').length,
        skippedCount: steps.filter(r => r.status === 'skipped').length,
        totalDuration: analytics.totalDuration || steps.reduce((acc, r) => acc + (r.duration || 0), 0),
        successRate: analytics.successRate != null ? `${Number(analytics.successRate).toFixed(1)}%` : (steps.length ? ((passed / steps.length) * 100).toFixed(2) + '%' : '0%')
      },
      results: steps.map(s => ({ step: s.id, name: s.name, status: s.status, duration: s.duration, error: s.error, result: s.result })),
      context: { testToken: token, scenario: selectedScenario }
    }
    fetch('/api/user-journey/save-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportData, journeyName: SCENARIOS[selectedScenario]?.name || selectedScenario || 'custom' })
    }).then(res => res.json()).then(data => {
      if (data.success) console.log('✅ Rapport de parcours enregistré automatiquement')
    }).catch(err => console.warn('Avertissement: enregistrement automatique du rapport échoué', err))
  }, [analytics.completedAt, steps, selectedScenario, analytics.totalDuration, analytics.successRate, token])

  // Exporter les résultats en JSON
  const exportResults = () => {
    const data = {
      scenario: SCENARIOS[selectedScenario].name,
      steps: steps.map(s => ({
        name: s.name,
        status: s.status,
        duration: s.duration,
        error: s.error,
        result: s.result
      })),
      analytics,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-journey-${Date.now()}.json`;
    a.click();
  };

  // Générer le PDF du rapport complet
  const generatePDF = async () => {
    // Désactiver temporairement jusqu'à ce que les dépendances soient installées
    alert('⚠️ La génération PDF est temporairement désactivée.\n\nLes dépendances jspdf et html2canvas doivent être installées dans le conteneur Docker.\n\nPour activer:\n1. docker-compose build frontend\n2. docker-compose up -d frontend');
    return;
    
    /* Code désactivé temporairement
    try {
      // Importer dynamiquement jspdf et html2canvas avec gestion d'erreur
      let jsPDF: any;
      let html2canvas: any;
      
      try {
        const jspdfModule = await import('jspdf');
        jsPDF = jspdfModule.default || jspdfModule;
        const html2canvasModule = await import('html2canvas');
        html2canvas = html2canvasModule.default || html2canvasModule;
      } catch (importError: any) {
        alert(`❌ Les dépendances PDF ne sont pas installées.\n\nVeuillez exécuter:\n\nnpm install jspdf html2canvas\n\nErreur: ${importError.message}`);
        return;
      }

      // Créer un élément temporaire pour le contenu PDF
      const pdfContent = document.createElement('div');
      pdfContent.style.width = '210mm';
      pdfContent.style.padding = '20mm';
      pdfContent.style.backgroundColor = 'white';
      pdfContent.style.color = 'black';
      pdfContent.style.fontFamily = 'Arial, sans-serif';
      pdfContent.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">📊 Rapport de Parcours Utilisateur</h1>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">JobbingTrack - Test Automatisé</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; font-size: 20px;">📋 Informations Générales</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; width: 40%;">Scénario</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${SCENARIOS[selectedScenario].name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Date de Test</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${analytics.completedAt ? analytics.completedAt.toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Durée Totale</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${(analytics.totalDuration / 1000).toFixed(2)}s</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Taux de Réussite</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; color: ${analytics.successRate >= 80 ? '#10b981' : analytics.successRate >= 50 ? '#f59e0b' : '#ef4444'}; font-weight: bold;">
                ${analytics.successRate.toFixed(1)}%
              </td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Étapes Réussies</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${steps.filter(s => s.status === 'success').length} / ${steps.length}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Étapes Échouées</td>
              <td style="padding: 10px; border: 1px solid #e5e7eb; color: #ef4444; font-weight: bold;">${analytics.failedSteps.length}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; font-size: 20px;">⏱️ Durée par Étape</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #2563eb; color: white;">
                <th style="padding: 10px; border: 1px solid #1e40af; text-align: left;">Étape</th>
                <th style="padding: 10px; border: 1px solid #1e40af; text-align: right;">Durée</th>
                <th style="padding: 10px; border: 1px solid #1e40af; text-align: center;">Statut</th>
              </tr>
            </thead>
            <tbody>
              ${steps.map((step, index) => `
                <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">${step.name}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">${step.duration ? step.duration + 'ms' : 'N/A'}</td>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; 
                      ${step.status === 'success' ? 'background-color: #d1fae5; color: #065f46;' : ''}
                      ${step.status === 'error' ? 'background-color: #fee2e2; color: #991b1b;' : ''}
                      ${step.status === 'running' ? 'background-color: #dbeafe; color: #1e40af;' : ''}
                      ${step.status === 'pending' ? 'background-color: #f3f4f6; color: #6b7280;' : ''}">
                      ${step.status === 'success' ? '✅ Réussi' : step.status === 'error' ? '❌ Échoué' : step.status === 'running' ? '⏳ En cours' : '⏸️ En attente'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${analytics.failedSteps.length > 0 ? `
        <div style="margin-bottom: 30px;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #fee2e2; padding-bottom: 10px; font-size: 20px;">❌ Étapes Échouées</h2>
          <div style="margin-top: 15px;">
            ${analytics.failedSteps.map((stepName, index) => {
              const failedStep = steps.find(s => s.name === stepName);
              return `
                <div style="margin-bottom: 15px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">
                  <h3 style="color: #991b1b; margin: 0 0 10px 0; font-size: 16px;">${index + 1}. ${stepName}</h3>
                  ${failedStep?.error ? `<p style="color: #7f1d1d; margin: 5px 0; font-size: 14px;"><strong>Erreur:</strong> ${failedStep.error}</p>` : ''}
                  ${failedStep?.duration ? `<p style="color: #7f1d1d; margin: 5px 0; font-size: 14px;"><strong>Durée:</strong> ${failedStep.duration}ms</p>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
        ` : ''}

        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; font-size: 20px;">📝 Détails des Étapes</h2>
          ${steps.map((step, index) => `
            <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: ${step.status === 'success' ? '#f0fdf4' : step.status === 'error' ? '#fef2f2' : '#f9fafb'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #1f2937; font-size: 16px;">${index + 1}. ${step.name}</h3>
                <span style="padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold;
                  ${step.status === 'success' ? 'background-color: #10b981; color: white;' : ''}
                  ${step.status === 'error' ? 'background-color: #ef4444; color: white;' : ''}
                  ${step.status === 'running' ? 'background-color: #3b82f6; color: white;' : 'background-color: #6b7280; color: white;'}">
                  ${step.status === 'success' ? '✅ Réussi' : step.status === 'error' ? '❌ Échoué' : step.status === 'running' ? '⏳ En cours' : '⏸️ En attente'}
                </span>
              </div>
              <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">${step.description}</p>
              ${step.duration ? `<p style="color: #6b7280; margin: 5px 0; font-size: 14px;"><strong>Durée:</strong> ${step.duration}ms</p>` : ''}
              ${step.error ? `
                <div style="margin-top: 10px; padding: 10px; background-color: #fee2e2; border-radius: 4px;">
                  <p style="color: #991b1b; margin: 0; font-size: 13px;"><strong>Erreur:</strong> ${step.error}</p>
                </div>
              ` : ''}
              ${step.result && step.status === 'success' ? `
                <details style="margin-top: 10px;">
                  <summary style="color: #2563eb; cursor: pointer; font-size: 13px; font-weight: bold;">Voir le résultat</summary>
                  <pre style="margin-top: 10px; padding: 10px; background-color: #1f2937; color: #f9fafb; border-radius: 4px; font-size: 11px; overflow-x: auto;">${JSON.stringify(step.result, null, 2)}</pre>
                </details>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Rapport généré le ${new Date().toLocaleString('fr-FR')} par JobbingTrack</p>
          <p>Version 4.1 - Système de Test Automatisé</p>
        </div>
      `;

      // Ajouter temporairement au DOM
      pdfContent.style.position = 'absolute';
      pdfContent.style.left = '-9999px';
      document.body.appendChild(pdfContent);

      // Générer le canvas
      const canvas = await html2canvas(pdfContent, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      // Créer le PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Télécharger le PDF
      pdf.save(`rapport-parcours-utilisateur-${Date.now()}.pdf`);

      // Nettoyer
      document.body.removeChild(pdfContent);
    } catch (error: any) {
      console.error('Erreur génération PDF:', error);
      alert(`❌ Erreur lors de la génération du PDF:\n\n${error.message}\n\nVeuillez installer les dépendances: npm install jspdf html2canvas`);
    }
    */
  };

  // Générer un token de test permanent
  const generateTestToken = async () => {
    setIsGeneratingToken(true);
    try {
      // Récupérer le token normal depuis localStorage
      const normalToken = testToken || token;
      
      if (!normalToken) {
        alert('❌ Vous devez être connecté pour générer un token de test.\n\nConnectez-vous d\'abord, puis réessayez.');
        return;
      }

      const response = await fetch(`${API_GATEWAY_URL}/api/v1/auth/generate-test-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${normalToken}`
        }
      });

      const data = await handleFetchResponse(response);

      if (data.success && data.testToken) {
        // Sauvegarder le token permanent
        localStorage.setItem('test_token', data.testToken);
        setTestToken(data.testToken);
        
        alert(`✅ Token de test permanent généré avec succès !\n\n` +
              `Validité : ${data.expiresIn}\n\n` +
              `Ce token élimine les erreurs 403 "Token invalide" durant les tests.\n\n` +
              `Il sera utilisé automatiquement pour tous les tests.`);
      }
    } catch (error: any) {
      console.error('Erreur génération token de test:', error);
      alert(`❌ Erreur lors de la génération du token de test :\n\n${error.message}\n\n` +
            `Assurez-vous d'être connecté avec un compte SUPER_ADMIN.`);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Parcours Utilisateur</h1>
          <p className="text-gray-600 mt-1">
            Testez et analysez les scénarios de parcours utilisateur complets
          </p>
        </div>

        {/* Barre d'action sticky */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 -mx-4 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={runJourney}
              disabled={isRunning}
              variant="default"
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              {isRunning ? 'En cours...' : 'Lancer'}
            </Button>

            {isRunning && (
              <Button
                onClick={cancelJourney}
                variant="destructive"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            )}

            <Button
              onClick={generateTestToken}
              disabled={isRunning || isGeneratingToken}
              variant="default"
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              title="Générer un token permanent pour éviter les erreurs 403"
            >
              <Key className="h-4 w-4 mr-1" />
              {isGeneratingToken ? '...' : testToken ? 'Token OK' : 'Token Test'}
            </Button>

            <Button onClick={resetJourney} disabled={isRunning} variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>

            <Button
              onClick={saveReport}
              variant="outline"
              size="sm"
              disabled={steps.every(s => s.status === 'pending') || !analytics.completedAt}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:text-green-400 dark:border-green-700"
              title="Sauvegarder le rapport"
            >
              <FileDown className="h-4 w-4 mr-1" />
              Sauvegarder
            </Button>

            <Button onClick={exportResults} variant="outline" size="sm" disabled={steps.every(s => s.status === 'pending')} title="Exporter en JSON">
              <Download className="h-4 w-4 mr-1" />
              JSON
            </Button>

            <Button
              onClick={generatePDF}
              variant="outline"
              size="sm"
              disabled={steps.every(s => s.status === 'pending') || !analytics.completedAt}
              className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 dark:border-red-700"
              title="Générer PDF"
            >
              <FileText className="h-4 w-4 mr-1" />
              PDF
            </Button>

            <Button onClick={clearHistory} variant="outline" size="sm" disabled={isRunning} className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400" title="Effacer l'historique">
              <Trash2 className="h-4 w-4" />
            </Button>

            <Link href="/backoffice/user-journey/reports">
              <Button variant="outline" size="sm" className="gap-1" title="Voir les rapports">
                <FileText className="h-4 w-4" />
                Rapports
              </Button>
            </Link>

            <div className="ml-auto">
              <Badge variant={userMode === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {userMode === 'admin' ? 'Admin' : 'Utilisateur'}
              </Badge>
              <span className="ml-2 text-xs text-gray-500">{SCENARIOS[selectedScenario]?.name}</span>
            </div>
          </div>
        </div>

      <Tabs defaultValue="journey" className="space-y-6">
        <TabsList>
          <TabsTrigger value="journey">Parcours</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="scenarios">Scénarios</TabsTrigger>
        </TabsList>

        {/* Onglet Parcours */}
        <TabsContent value="journey" className="space-y-6">
          {/* Mode Utilisateur : Admin ou Utilisateur de test */}
          <Card>
            <CardHeader>
              <CardTitle>Mode de Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Choisissez le type d'utilisateur pour ce parcours de test
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => !isRunning && setUserMode('admin')}
                      disabled={isRunning}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${userMode === 'admin' 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                        }
                        ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold">Mode Administrateur</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tests avec compte admin@jobbingtrack.test (rôle SUPER_ADMIN)
                      </p>
                    </button>
                    
                    <button
                      onClick={() => !isRunning && setUserMode('user')}
                      disabled={isRunning}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${userMode === 'user' 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                        }
                        ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-green-600" />
                        <h3 className="font-semibold">Mode Utilisateur de Test</h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tests avec utilisateur de test (rôle USER, création automatique)
                      </p>
                    </button>
                  </div>
                </div>
                
                {/* Badge du mode actif */}
                <div className="text-right">
                  <Badge variant={userMode === 'admin' ? 'default' : 'secondary'} className="text-sm">
                    {userMode === 'admin' ? '🛡️ Admin' : '👤 Utilisateur'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sélection du scénario */}
          <Card>
            <CardHeader>
              <CardTitle>Sélectionner un Scénario</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {Object.keys(SCENARIOS).length} scénarios disponibles - Filtrez par catégorie
              </p>
            </CardHeader>
            <CardContent>
              {/* Filtres par catégorie */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                {(Object.entries(SCENARIO_CATEGORIES) as [ScenarioFilter, { label: string; keys: string[] }][]).map(([filterKey, cat]) => (
                  <button
                    key={filterKey}
                    onClick={() => setScenarioFilter(filterKey)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      scenarioFilter === filterKey
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {cat.label} ({cat.keys.filter(k => k in SCENARIOS).length})
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(SCENARIOS)
                  .filter(([key]) => SCENARIO_CATEGORIES[scenarioFilter].keys.includes(key))
                  .map(([key, scenario]) => (
                  <button
                    key={key}
                    onClick={() => !isRunning && setSelectedScenario(key as any)}
                    disabled={isRunning}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${selectedScenario === key 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      }
                      ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}
                    `}
                  >
                    <h3 className="font-semibold mb-1 text-gray-900 dark:text-gray-100">{scenario.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{scenario.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      {scenario.steps.length} étape{scenario.steps.length > 1 ? 's' : ''}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Liste des étapes */}
          <Card>
            <CardHeader>
              <CardTitle>Étapes du Parcours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStepIndex === index;
                  
                  return (
                    <div
                      key={`${step.id}-${index}`}
                      className={`
                        flex items-start gap-4 p-4 rounded-lg border-2 transition-all
                        ${isActive ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200'}
                      `}
                    >
                      {/* Icône de statut */}
                      <div className={`
                        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                        ${step.status === 'pending' ? 'bg-gray-100' : ''}
                        ${step.status === 'running' ? 'bg-blue-100 animate-pulse' : ''}
                        ${step.status === 'success' ? 'bg-green-100' : ''}
                        ${step.status === 'error' ? 'bg-red-100' : ''}
                      `}>
                        {step.status === 'pending' && <Icon className="h-6 w-6 text-gray-400" />}
                        {step.status === 'running' && <Icon className="h-6 w-6 text-blue-500 animate-pulse" />}
                        {step.status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
                        {step.status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{step.name}</h3>
                          <Badge variant={
                            step.status === 'pending' ? 'secondary' :
                            step.status === 'running' ? 'default' :
                            step.status === 'success' ? 'default' :
                            'destructive'
                          }>
                            {step.status === 'pending' ? 'En attente' :
                             step.status === 'running' ? 'En cours...' :
                             step.status === 'success' ? 'Réussi' :
                             'Échoué'}
                          </Badge>
                          {step.duration && (
                            <span className="text-sm text-gray-500">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        
                        {/* Erreur */}
                        {step.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            ❌ {step.error}
                          </div>
                        )}

                        {/* Résultat */}
                        {step.result && step.status === 'success' && (
                          <details className="mt-2">
                            <summary className="text-sm text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                              Voir le résultat
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs overflow-x-auto text-gray-900 dark:text-gray-100">
                              {JSON.stringify(step.result, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>

                      {/* Numéro d'étape */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-600">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Durée Totale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.totalDuration / 1000).toFixed(2)}s
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Taux de Réussite
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analytics.successRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Étapes Réussies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(analytics.passedCount ?? steps.filter(s => s.status === 'success').length)} / {steps.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Étapes Échouées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {analytics.failedCount ?? analytics.failedSteps.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerte si test annulé */}
          {analytics.wasCancelled && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-8 w-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-orange-900">Test Annulé</h3>
                    <p className="text-sm text-orange-700">
                      Le parcours a été interrompu par l'utilisateur. 
                      Les résultats affichés sont partiels.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Graphique des durées */}
          <Card>
            <CardHeader>
              <CardTitle>Durée par Étape</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {steps.filter(s => s.duration).map((step, idx, arr) => (
                  <div key={`${step.id}-${idx}`} className="flex items-center gap-3">
                    <div className="w-32 text-sm">{step.name}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          step.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.min(100, ((step.duration || 0) / Math.max(...steps.map(s => s.duration || 0))) * 100)}%`
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                        {step.duration}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Étapes échouées */}
          {analytics.failedSteps.length > 0 && (
            <Card className="border-red-300">
              <CardHeader>
                <CardTitle className="text-red-600">Étapes Échouées</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1">
                  {analytics.failedSteps.map((stepName, idx) => (
                    <li key={idx} className="text-red-700">{stepName}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Rapport complet */}
          {analytics.completedAt && (
            <>
            <Card>
              <CardHeader>
                <CardTitle>Rapport Complet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div><strong>Scénario :</strong> {SCENARIOS[selectedScenario].name}</div>
                  <div><strong>Complété le :</strong> {analytics.completedAt.toLocaleString('fr-FR')}</div>
                  <div><strong>Durée totale :</strong> {(analytics.totalDuration / 1000).toFixed(2)}s</div>
                  <div><strong>Taux de réussite :</strong> {analytics.successRate.toFixed(1)}%</div>
                  {analytics.wasCancelled && (
                    <div className="text-orange-600 font-semibold">
                      <strong>⚠️ Statut :</strong> Test annulé par l'utilisateur
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Rapport enregistré automatiquement.
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Consulter tous les rapports (prédéfinis et personnalisés) :
                    </p>
                    <Link href="/backoffice/user-journey/reports" className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                      <FileText className="h-4 w-4" />
                      Voir les rapports de parcours
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}
        </TabsContent>

        {/* Onglet Scénarios */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scénarios Disponibles ({Object.keys(SCENARIOS).length})</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Parcours de test organisés par catégorie pour couvrir tous les cas d'usage
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Scénarios Complets et Généraux */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Parcours Complets
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['complete', 'quick', 'beginner', 'job_seeker', 'mobile_test'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <div className="space-y-1">
                          <strong className="text-xs text-gray-500">📋 {scenario.steps.length} étapes</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scénarios Spécifiques par Fonctionnalité */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Gestion Contacts & Relations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['add_contact_to_application', 'contact_management', 'networking_session'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-green-300 dark:hover:border-green-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Voir les {scenario.steps.length} étapes
                          </summary>
                          <ol className="list-decimal list-inside text-xs space-y-1 mt-2 ml-2 text-gray-700 dark:text-gray-300">
                            {scenario.steps.map((stepId, idx) => (
                              <li key={`${key}-${stepId}-${idx}`}>{STEP_DEFINITIONS[stepId].name}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scénarios Candidatures */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Gestion Candidatures
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['application_lifecycle', 'rapid_application', 'company_workflow', 'add_call_to_application'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-purple-300 dark:hover:border-purple-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Voir les {scenario.steps.length} étapes
                          </summary>
                          <ol className="list-decimal list-inside text-xs space-y-1 mt-2 ml-2 text-gray-700 dark:text-gray-300">
                            {scenario.steps.map((stepId, idx) => (
                              <li key={`${key}-${stepId}-${idx}`}>{STEP_DEFINITIONS[stepId].name}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scénarios Entretiens & Relances */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Entretiens, Relances & Événements
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['interview_workflow', 'interview_preparation', 'followup_management', 'event_scheduling'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-orange-300 dark:hover:border-orange-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Voir les {scenario.steps.length} étapes
                          </summary>
                          <ol className="list-decimal list-inside text-xs space-y-1 mt-2 ml-2 text-gray-700 dark:text-gray-300">
                            {scenario.steps.map((stepId, idx) => (
                              <li key={`${key}-${stepId}-${idx}`}>{STEP_DEFINITIONS[stepId].name}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scénarios d'Activité Quotidienne */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-teal-600 dark:text-teal-400 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activités Régulières
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['daily_activity', 'weekly_review'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-teal-300 dark:hover:border-teal-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Voir les {scenario.steps.length} étapes
                          </summary>
                          <ol className="list-decimal list-inside text-xs space-y-1 mt-2 ml-2 text-gray-700 dark:text-gray-300">
                            {scenario.steps.map((stepId, idx) => (
                              <li key={`${key}-${stepId}-${idx}`}>{STEP_DEFINITIONS[stepId].name}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Parcours Mobile — Vision FONCTIONNALITES.md section 9 */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Parcours Mobile (Vision section 9)
                </h3>
                <p className="text-xs text-gray-500 mb-3">Scénarios calqués sur la vision mobile décrite dans FONCTIONNALITES.md — testables sur émulateur</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['mobile_registration', 'mobile_password_reset', 'mobile_first_use', 'mobile_daily_use', 'mobile_archive_trash', 'mobile_complete'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Voir les {scenario.steps.length} étapes
                          </summary>
                          <ol className="list-decimal list-inside text-xs space-y-1 mt-2 ml-2 text-gray-700 dark:text-gray-300">
                            {scenario.steps.map((stepId, idx) => (
                              <li key={`${key}-${stepId}-${idx}`}>{STEP_DEFINITIONS[stepId]?.name || stepId}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Parcours Admin & Stress */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-red-600 dark:text-red-400 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Admin Backoffice & Stress Test
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['admin_backoffice_complete', 'data_stress'].map(key => {
                    const scenario = SCENARIOS[key as keyof typeof SCENARIOS];
                    return (
                      <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-red-300 dark:hover:border-red-600 transition-colors">
                        <h4 className="font-semibold text-base mb-2">{scenario.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{scenario.description}</p>
                        <details className="mt-2">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                            Voir les {scenario.steps.length} étapes
                          </summary>
                          <ol className="list-decimal list-inside text-xs space-y-1 mt-2 ml-2 text-gray-700 dark:text-gray-300">
                            {scenario.steps.map((stepId, idx) => (
                              <li key={`${key}-${stepId}-${idx}`}>{STEP_DEFINITIONS[stepId]?.name || stepId}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Analytics Mobile */}
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Système d'Analytics Mobile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Le système complet de monitoring et analytics mobile est documenté et prêt à être implémenté.
              </p>
              <div className="space-y-2">
                <a 
                  href="/docs/mobile/analytics/SUMMARY" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                >
                  📄 Voir la documentation complète →
                </a>
                <a 
                  href="/docs/mobile/analytics/INTEGRATION" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                >
                  🔧 Guide d'intégration →
                </a>
                <a 
                  href="/docs/mobile/analytics/README" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                >
                  📚 Documentation technique →
                </a>
                <a 
                  href="/docs/mobile/analytics/DASHBOARD" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline dark:text-blue-400"
                >
                  📊 Template Dashboard →
                </a>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  <strong>Note :</strong> Une fois implémenté, vous pourrez visualiser les analytics mobile en temps réel depuis cette page.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AdminLayout>
  );
}

