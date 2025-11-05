'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield
} from 'lucide-react';

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
  }
};

export default function UserJourneyPage() {
  const [selectedScenario, setSelectedScenario] = useState<keyof typeof SCENARIOS>('complete');
  const [userMode, setUserMode] = useState<'admin' | 'user'>('admin'); // Mode Admin ou Utilisateur de test
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [testToken, setTestToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [analytics, setAnalytics] = useState<any>({
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

  // Sauvegarder l'état dans localStorage à chaque changement
  useEffect(() => {
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
  }, [selectedScenario, steps, analytics]);

  // Initialiser les étapes selon le scénario
  useEffect(() => {
    // Ne réinitialiser que si les steps sont vides ou si le scénario a changé manuellement
    const scenario = SCENARIOS[selectedScenario];
    if (steps.length === 0 || !isRunning) {
      const initialSteps = scenario.steps.map(stepId => ({
        ...STEP_DEFINITIONS[stepId],
        status: 'pending' as const
      }));
      setSteps(initialSteps);
      setCurrentStepIndex(-1);
      
      // Ne réinitialiser analytics que si on n'est pas en train de charger depuis localStorage
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
  }, [selectedScenario]);

  // Fonction helper pour gérer les réponses fetch
  const handleFetchResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type');
    
    // Si ce n'est pas du JSON, c'est probablement une erreur HTML
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Erreur serveur (${response.status}): ${text.substring(0, 100)}`);
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || data.error || `Erreur ${response.status}`);
    }
    
    return data;
  };

  // Exécuter une étape
  const executeStep = async (step: JourneyStep): Promise<{ success: boolean; result?: any; error?: string; duration: number }> => {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (step.id) {
        case 'register':
          const registerRes = await fetch('/api/v1/auth/register', {
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
          
          // Sauvegarder le token pour les prochaines requêtes
          if (result.token) {
            localStorage.setItem('token', result.token);
          }
          break;

        case 'login':
          // Utiliser différents credentials selon le mode
          const loginCredentials = userMode === 'admin' 
            ? { email: 'admin@jobbingtrack.com', password: 'password123' }
            : { email: `testuser-${Date.now()}@test.com`, password: 'Test123!' };
          
          // Si mode user, créer d'abord l'utilisateur
          if (userMode === 'user') {
            const registerUserRes = await fetch('/api/v1/auth/register', {
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
          
          const loginRes = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginCredentials)
          });
          result = await handleFetchResponse(loginRes);
          
          // Sauvegarder le token
          if (result.token) {
            localStorage.setItem('token', result.token);
          }
          break;

        case 'create_companies':
          const companies = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch('/api/v1/companies', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          // Récupérer les entreprises existantes
          const companiesListRes = await fetch('/api/v1/companies', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const existingCompanies = await handleFetchResponse(companiesListRes);
          
          // Mettre à jour les 2 premières
          const updatedCompanies = [];
          for (let i = 0; i < Math.min(2, existingCompanies.length); i++) {
            const res = await fetch(`/api/v1/companies/${existingCompanies[i].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
            const res = await fetch('/api/v1/applications', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          // Récupérer les candidatures existantes
          const appsRes = await fetch('/api/v1/applications', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const existingApps = await handleFetchResponse(appsRes);
          
          // Mettre à jour les 3 premières
          const updatedApps = [];
          const appsToUpdate = Array.isArray(existingApps) ? existingApps : (existingApps.data || []);
          for (let i = 0; i < Math.min(3, appsToUpdate.length); i++) {
            const res = await fetch(`/api/v1/applications/${appsToUpdate[i].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                status: ['interview', 'offer', 'accepted'][i % 3],
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
            const res = await fetch('/api/v1/contacts', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          // Récupérer les contacts existants
          const contactsRes = await fetch('/api/v1/contacts', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          });
          const existingContacts = await handleFetchResponse(contactsRes);
          
          // Mettre à jour les 2 premiers
          const updatedContacts = [];
          const contactsToUpdate = Array.isArray(existingContacts) ? existingContacts : (existingContacts.data || []);
          for (let i = 0; i < Math.min(2, contactsToUpdate.length); i++) {
            const res = await fetch(`/api/v1/contacts/${contactsToUpdate[i].id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
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
          const interviews = [];
          for (let i = 0; i < 2; i++) {
            const res = await fetch('/api/v1/interviews', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                title: `Entretien Test ${i + 1}`,
                date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
                type: ['phone', 'video', 'onsite'][i % 3]
              })
            });
            const interview = await handleFetchResponse(res);
            interviews.push(interview);
          }
          result = interviews;
          break;

        case 'create_events':
          const events = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch('/api/v1/events', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                title: `Événement Test ${i + 1}`,
                description: `Description de l'événement ${i + 1}`,
                date: new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString(),
                type: ['meeting', 'deadline', 'reminder'][i % 3],
                allDay: i % 2 === 0
              })
            });
            const event = await handleFetchResponse(res);
            events.push(event);
          }
          result = events;
          break;

        case 'create_followups':
          const followups = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch('/api/v1/followups', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                type: ['email', 'phone', 'linkedin'][i],
                scheduledFor: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000).toISOString(),
                notes: `Relance automatique ${i + 1}`
              })
            });
            const followup = await handleFetchResponse(res);
            followups.push(followup);
          }
          result = followups;
          break;

        case 'make_calls':
          const calls = [];
          for (let i = 0; i < 2; i++) {
            const res = await fetch('/api/v1/calls', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                duration: Math.floor(Math.random() * 600) + 60,
                notes: `Appel test ${i + 1}`,
                outcome: ['positive', 'neutral', 'negative'][i % 3]
              })
            });
            const call = await handleFetchResponse(res);
            calls.push(call);
          }
          result = calls;
          break;

        case 'test_mobile_calendar':
          // Simuler un test du calendrier mobile
          // Dans la vraie implémentation, cela interrogerait l'émulateur mobile
          const calendarRes = await fetch('/api/v1/events', {
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const calendarEvents = await handleFetchResponse(calendarRes);
          const eventsArray = Array.isArray(calendarEvents) ? calendarEvents : (calendarEvents.data || []);
          result = {
            message: 'Calendrier mobile testé',
            eventsCount: eventsArray.length,
            events: eventsArray
          };
          break;

        case 'view_statistics':
          const statsRes = await fetch('/api/v1/dashboard/statistics', {
            headers: { 
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          result = await handleFetchResponse(statsRes);
          break;

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
    const startTime = Date.now();
    const failedSteps: string[] = [];
    let wasCancelled = false;

    for (let i = 0; i < steps.length; i++) {
      // Vérifier si l'utilisateur a annulé
      if (isCancelled) {
        console.log('🛑 Parcours annulé par l\'utilisateur');
        wasCancelled = true;
        
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

      // Exécuter l'étape
      const { success, result, error, duration } = await executeStep(steps[i]);

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
    const completedSteps = steps.filter(s => s.status === 'success').length;
    const successCount = wasCancelled ? completedSteps : steps.length - failedSteps.length;
    
    setAnalytics({
      totalDuration,
      successRate: (successCount / steps.length) * 100,
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

  // Exporter les résultats
  const exportResults = () => {
    const data = {
      scenario: SCENARIOS[selectedScenario].name,
      steps: steps.map(s => ({
        name: s.name,
        status: s.status,
        duration: s.duration,
        error: s.error
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

  // Générer un token de test permanent
  const generateTestToken = async () => {
    setIsGeneratingToken(true);
    try {
      // Récupérer le token normal depuis localStorage
      const normalToken = localStorage.getItem('token');
      
      if (!normalToken) {
        alert('❌ Vous devez être connecté pour générer un token de test.\n\nConnectez-vous d\'abord, puis réessayez.');
        return;
      }

      const response = await fetch('/api/v1/auth/generate-test-token', {
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🚶 Parcours Utilisateur</h1>
            <p className="text-gray-600 mt-1">
              Testez et analysez les scénarios de parcours utilisateur complets
            </p>
          </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={runJourney}
            disabled={isRunning}
            variant="default"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'En cours...' : 'Lancer le parcours'}
          </Button>
          
          {isRunning && (
            <Button
              onClick={cancelJourney}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          )}
          
          <Button
            onClick={generateTestToken}
            disabled={isRunning || isGeneratingToken}
            variant="default"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
            title="Générer un token permanent pour éviter les erreurs 403"
          >
            <Key className="h-4 w-4 mr-2" />
            {isGeneratingToken ? 'Génération...' : testToken ? '✅ Token Actif' : 'Générer Token de Test'}
          </Button>
          
          <Button
            onClick={resetJourney}
            disabled={isRunning}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            onClick={exportResults}
            variant="outline"
            disabled={steps.every(s => s.status === 'pending')}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          
          <Button
            onClick={clearHistory}
            variant="outline"
            disabled={isRunning}
            className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            title="Effacer l'historique sauvegardé"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
                        Tests avec compte admin@jobbingtrack.com (rôle SUPER_ADMIN)
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
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(SCENARIOS).map(([key, scenario]) => (
                  <button
                    key={key}
                    onClick={() => !isRunning && setSelectedScenario(key as any)}
                    disabled={isRunning}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${selectedScenario === key 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                      }
                      ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <h3 className="font-semibold mb-1">{scenario.name}</h3>
                    <p className="text-sm text-gray-600">{scenario.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {scenario.steps.length} étapes
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
                      key={step.id}
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
                  {steps.filter(s => s.status === 'success').length} / {steps.length}
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
                  {analytics.failedSteps.length}
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
                      Le parcours a été interrompu par l&apos;utilisateur. 
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
                {steps.filter(s => s.duration).map(step => (
                  <div key={step.id} className="flex items-center gap-3">
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
                      <strong>⚠️ Statut :</strong> Test annulé par l&apos;utilisateur
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Onglet Scénarios */}
        <TabsContent value="scenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scénarios Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(SCENARIOS).map(([key, scenario]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-2">{scenario.name}</h3>
                    <p className="text-gray-600 mb-3">{scenario.description}</p>
                    <div className="space-y-1">
                      <strong className="text-sm">Étapes :</strong>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        {scenario.steps.map(stepId => (
                          <li key={stepId}>{STEP_DEFINITIONS[stepId].name}</li>
                        ))}
                      </ol>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Info Analytics Mobile */}
          <Card className="border-blue-300 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Système d&apos;Analytics Mobile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Le système complet de monitoring et analytics mobile est documenté et prêt à être implémenté.
              </p>
              <div className="space-y-2">
                <a 
                  href="/docs/mobile/analytics/SUMMARY.md" 
                  target="_blank"
                  className="block text-blue-600 hover:underline"
                >
                  📄 Voir la documentation complète →
                </a>
                <a 
                  href="/docs/mobile/analytics/INTEGRATION.md" 
                  target="_blank"
                  className="block text-blue-600 hover:underline"
                >
                  🔧 Guide d&apos;intégration →
                </a>
                <p className="text-sm text-gray-600 mt-4">
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

