'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/features';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/auth';
import { 
  Play, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  CheckCircle,
  XCircle,
  Clock,
  Settings,
  Save,
  Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003';

// Définition des étapes disponibles
const AVAILABLE_STEPS = [
  { id: 'register', name: 'Inscription', description: 'Inscription d\'un nouvel utilisateur', icon: '👤' },
  { id: 'email_validation', name: 'Validation Email', description: 'Validation de l\'email après inscription', icon: '📧' },
  { id: 'login', name: 'Connexion', description: 'Connexion utilisateur', icon: '🔐' },
  { id: 'profile', name: 'Profil Utilisateur', description: 'Mise à jour du profil utilisateur', icon: '👨‍💼' },
  { id: 'application_with_company', name: 'Candidature avec Entreprise', description: 'Création candidature avec création entreprise', icon: '📝' },
  { id: 'contact_to_application', name: 'Contact à Candidature', description: 'Ajout d\'un contact à une candidature', icon: '📇' },
  { id: 'followup', name: 'Relance', description: 'Ajout d\'une relance à une candidature', icon: '📞' },
  { id: 'interview', name: 'Entretien', description: 'Ajout d\'un entretien à une candidature', icon: '📅' },
  { id: 'call_company', name: 'Appel Entreprise', description: 'Enregistrement d\'un appel avec l\'entreprise', icon: '☎️' },
  { id: 'call_contact', name: 'Appel Contact', description: 'Enregistrement d\'un appel avec un contact', icon: '📱' },
  { id: 'application_status', name: 'Statut Candidature', description: 'Vérification/mise à jour du statut', icon: '📊' },
  { id: 'application_rejected', name: 'Candidature Rejetée', description: 'Marquer candidature comme rejetée après entretien', icon: '❌' }
];

type CustomStep = {
  id: string;
  stepId: string;
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

export default function CustomJourneyPage() {
  const { token, isAuthenticated } = useAuth();
  const [steps, setSteps] = useState<CustomStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);
  const [journeyName, setJourneyName] = useState('Mon Parcours Personnalisé');

  const addStep = (stepId: string) => {
    const newStep: CustomStep = {
      id: `step-${Date.now()}`,
      stepId,
      options: {}
    };
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
    if (!token || steps.length === 0) return;

    setIsRunning(true);
    setResults([]);

    try {
      const response = await fetch(`${API_URL}/api/user-journey/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: journeyName,
          steps: steps.map(s => ({
            step: s.stepId,
            options: s.options || {}
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (error: any) {
      console.error('Erreur exécution parcours:', error);
      setResults([{
        step: 'error',
        name: 'Erreur',
        status: 'error',
        message: `Erreur: ${error.message}`
      }]);
    } finally {
      setIsRunning(false);
    }
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
      success: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
      warning: 'bg-yellow-100 text-yellow-800',
      running: 'bg-blue-100 text-blue-800',
      pending: 'bg-gray-100 text-gray-800',
      skipped: 'bg-gray-100 text-gray-500'
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              🎯 Parcours Utilisateur Personnalisé
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Construisez votre propre parcours étape par étape
            </p>
          </div>
          <Button
            onClick={executeJourney}
            disabled={isRunning || steps.length === 0}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Exécution...' : 'Lancer le Parcours'}
          </Button>
        </div>

        {/* Nom du parcours */}
        <Card>
          <CardHeader>
            <CardTitle>Nom du Parcours</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="text"
              value={journeyName}
              onChange={(e) => setJourneyName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Nom de votre parcours"
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Étapes disponibles */}
          <Card>
            <CardHeader>
              <CardTitle>Étapes Disponibles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {AVAILABLE_STEPS.map(step => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{step.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{step.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{step.description}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addStep(step.id)}
                    disabled={isRunning}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Parcours construit */}
          <Card>
            <CardHeader>
              <CardTitle>Votre Parcours ({steps.length} étapes)</CardTitle>
            </CardHeader>
            <CardContent>
              {steps.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Aucune étape ajoutée</p>
                  <p className="text-sm mt-2">Ajoutez des étapes depuis la colonne de gauche</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, index) => {
                    const stepDef = AVAILABLE_STEPS.find(s => s.id === step.stepId);
                    return (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                            {index + 1}
                          </span>
                          <span className="text-xl">{stepDef?.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {stepDef?.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStep(index, 'up')}
                            disabled={index === 0 || isRunning}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => moveStep(index, 'down')}
                            disabled={index === steps.length - 1 || isRunning}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeStep(step.id)}
                            disabled={isRunning}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Résultats de l'Exécution</CardTitle>
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

