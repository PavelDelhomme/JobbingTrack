"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

// Types pour les étapes du parcours
type JourneyStep = {
  id: string;
  name: string;
  description: string;
  icon: any;
  status: "pending" | "running" | "success" | "error";
  duration?: number;
  result?: any;
  error?: string;
};

// Scénarios de parcours prédéfinis
const SCENARIOS = {
  complete: {
    name: "Parcours Complet",
    description: "De l'inscription à la statistique complète",
    steps: [
      "register",
      "login",
      "create_applications",
      "create_contacts",
      "schedule_interviews",
      "create_followups",
      "view_statistics",
      "make_calls",
    ],
  },
  quick: {
    name: "Parcours Rapide",
    description: "Actions principales uniquement",
    steps: ["login", "create_applications", "view_statistics"],
  },
  job_seeker: {
    name: "Chercheur d'Emploi Actif",
    description: "Candidature intensive avec suivi",
    steps: [
      "login",
      "create_applications",
      "create_followups",
      "schedule_interviews",
      "view_statistics",
    ],
  },
  beginner: {
    name: "Nouvel Utilisateur",
    description: "Première connexion et découverte",
    steps: ["register", "login", "create_applications", "view_statistics"],
  },
};

// Définition de toutes les étapes possibles
const STEP_DEFINITIONS: Record<string, Omit<JourneyStep, "status">> = {
  register: {
    id: "register",
    name: "Inscription",
    description: "Créer un nouveau compte utilisateur",
    icon: UserPlus,
  },
  login: {
    id: "login",
    name: "Connexion",
    description: "Se connecter à l'application",
    icon: LogIn,
  },
  create_applications: {
    id: "create_applications",
    name: "Créer Candidatures",
    description: "Créer 5 candidatures de test",
    icon: FileText,
  },
  create_contacts: {
    id: "create_contacts",
    name: "Créer Contacts",
    description: "Ajouter des contacts recruteurs",
    icon: Users,
  },
  schedule_interviews: {
    id: "schedule_interviews",
    name: "Planifier Entretiens",
    description: "Planifier des entretiens",
    icon: Calendar,
  },
  create_followups: {
    id: "create_followups",
    name: "Créer Relances",
    description: "Configurer des relances automatiques",
    icon: Clock,
  },
  make_calls: {
    id: "make_calls",
    name: "Enregistrer Appels",
    description: "Logger des appels téléphoniques",
    icon: Phone,
  },
  view_statistics: {
    id: "view_statistics",
    name: "Voir Statistiques",
    description: "Consulter le dashboard statistiques",
    icon: TrendingUp,
  },
};

export default function UserJourneyPage() {
  const [selectedScenario, setSelectedScenario] =
    useState<keyof typeof SCENARIOS>("complete");
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [analytics, setAnalytics] = useState<any>({
    totalDuration: 0,
    successRate: 0,
    failedSteps: [],
    completedAt: null,
  });

  // Initialiser les étapes selon le scénario
  useEffect(() => {
    const scenario = SCENARIOS[selectedScenario];
    const initialSteps = scenario.steps.map((stepId) => ({
      ...STEP_DEFINITIONS[stepId],
      status: "pending" as const,
    }));
    setSteps(initialSteps);
    setCurrentStepIndex(-1);
    setAnalytics({
      totalDuration: 0,
      successRate: 0,
      failedSteps: [],
      completedAt: null,
    });
  }, [selectedScenario]);

  // Exécuter une étape
  const executeStep = async (
    step: JourneyStep,
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    duration: number;
  }> => {
    const startTime = Date.now();

    try {
      let result;

      switch (step.id) {
        case "register":
          result = await fetch("/api/v1/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: `test-${Date.now()}@example.com`,
              password: "Test123!",
              firstName: "Test",
              lastName: "User",
            }),
          });
          break;

        case "login":
          result = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "redacted@example.invalid",
              password: "admin123",
            }),
          });
          break;

        case "create_applications":
          const applications = [];
          for (let i = 0; i < 5; i++) {
            const res = await fetch("/api/v1/applications", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                companyName: `Entreprise Test ${i + 1}`,
                position: `Poste ${i + 1}`,
                status: ["pending", "applied", "interview"][i % 3],
                appliedAt: new Date().toISOString(),
              }),
            });
            applications.push(await res.json());
          }
          result = { ok: true, data: applications };
          break;

        case "create_contacts":
          const contacts = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch("/api/v1/contacts", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                firstName: `Contact${i + 1}`,
                lastName: "Test",
                email: `contact${i + 1}@test.com`,
                phone: `+33600000${i}00`,
              }),
            });
            contacts.push(await res.json());
          }
          result = { ok: true, data: contacts };
          break;

        case "schedule_interviews":
          const interviews = [];
          for (let i = 0; i < 2; i++) {
            const res = await fetch("/api/v1/interviews", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                title: `Entretien Test ${i + 1}`,
                date: new Date(
                  Date.now() + (i + 1) * 24 * 60 * 60 * 1000,
                ).toISOString(),
                type: ["phone", "video", "onsite"][i % 3],
              }),
            });
            interviews.push(await res.json());
          }
          result = { ok: true, data: interviews };
          break;

        case "create_followups":
          const followups = [];
          for (let i = 0; i < 3; i++) {
            const res = await fetch("/api/v1/followups", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                type: ["email", "phone", "linkedin"][i],
                scheduledFor: new Date(
                  Date.now() + i * 7 * 24 * 60 * 60 * 1000,
                ).toISOString(),
                notes: `Relance automatique ${i + 1}`,
              }),
            });
            followups.push(await res.json());
          }
          result = { ok: true, data: followups };
          break;

        case "make_calls":
          const calls = [];
          for (let i = 0; i < 2; i++) {
            const res = await fetch("/api/v1/calls", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                duration: Math.floor(Math.random() * 600) + 60,
                notes: `Appel test ${i + 1}`,
                outcome: ["positive", "neutral", "negative"][i % 3],
              }),
            });
            calls.push(await res.json());
          }
          result = { ok: true, data: calls };
          break;

        case "view_statistics":
          result = await fetch("/api/v1/dashboard/statistics", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          break;

        default:
          result = { ok: true };
      }

      const duration = Date.now() - startTime;

      const resultIsResponse = result instanceof Response;
      const resultOk = resultIsResponse
        ? result.ok
        : !!(result as { ok?: boolean } | undefined)?.ok;
      const resultStatus = resultIsResponse
        ? result.status
        : (result as { status?: number } | undefined)?.status;

      let normalizedResult: unknown;
      if (
        result &&
        !resultIsResponse &&
        typeof result === "object" &&
        "data" in result
      ) {
        normalizedResult = (result as { data: unknown }).data;
      } else if (result instanceof Response) {
        try {
          normalizedResult = await result.json();
        } catch {
          normalizedResult = null;
        }
      } else {
        normalizedResult = undefined;
      }

      if (resultOk || resultStatus === 201) {
        return {
          success: true,
          result: normalizedResult,
          duration,
        };
      } else {
        return {
          success: false,
          error: "Erreur lors de l'exécution",
          duration,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        duration,
      };
    }
  };

  // Exécuter le parcours complet
  const runJourney = async () => {
    setIsRunning(true);
    const startTime = Date.now();
    const failedSteps: string[] = [];

    for (let i = 0; i < steps.length; i++) {
      setCurrentStepIndex(i);

      // Mettre à jour le statut à "running"
      setSteps((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: "running" } : s)),
      );

      // Exécuter l'étape
      const { success, result, error, duration } = await executeStep(steps[i]);

      // Attendre un peu pour voir l'animation
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mettre à jour le statut
      setSteps((prev) =>
        prev.map((s, idx) =>
          idx === i
            ? {
                ...s,
                status: success ? "success" : "error",
                duration,
                result,
                error,
              }
            : s,
        ),
      );

      if (!success) {
        failedSteps.push(steps[i].name);
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = steps.length - failedSteps.length;

    setAnalytics({
      totalDuration,
      successRate: (successCount / steps.length) * 100,
      failedSteps,
      completedAt: new Date(),
    });

    setIsRunning(false);
    setCurrentStepIndex(-1);
  };

  // Réinitialiser le parcours
  const resetJourney = () => {
    setSteps((prev) =>
      prev.map((s) => ({
        ...s,
        status: "pending",
        duration: undefined,
        result: undefined,
        error: undefined,
      })),
    );
    setCurrentStepIndex(-1);
    setAnalytics({
      totalDuration: 0,
      successRate: 0,
      failedSteps: [],
      completedAt: null,
    });
  };

  // Exporter les résultats
  const exportResults = () => {
    const data = {
      scenario: SCENARIOS[selectedScenario].name,
      steps: steps.map((s) => ({
        name: s.name,
        status: s.status,
        duration: s.duration,
        error: s.error,
      })),
      analytics,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-journey-${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🚶 Parcours Utilisateur</h1>
          <p className="text-gray-600 mt-1">
            Testez et analysez les scénarios de parcours utilisateur complets
          </p>
        </div>

        <div className="flex gap-2">
          <Button onClick={runJourney} disabled={isRunning} variant="default">
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? "En cours..." : "Lancer le parcours"}
          </Button>
          <Button onClick={resetJourney} disabled={isRunning} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button
            onClick={exportResults}
            variant="outline"
            disabled={steps.every((s) => s.status === "pending")}
          >
            <Download className="h-4 w-4 mr-2" />
            Exporter
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
                    onClick={() =>
                      !isRunning && setSelectedScenario(key as any)
                    }
                    disabled={isRunning}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${
                        selectedScenario === key
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      }
                      ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    `}
                  >
                    <h3 className="font-semibold mb-1">{scenario.name}</h3>
                    <p className="text-sm text-gray-600">
                      {scenario.description}
                    </p>
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
                        ${isActive ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200"}
                      `}
                    >
                      {/* Icône de statut */}
                      <div
                        className={`
                        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                        ${step.status === "pending" ? "bg-gray-100" : ""}
                        ${step.status === "running" ? "bg-blue-100 animate-pulse" : ""}
                        ${step.status === "success" ? "bg-green-100" : ""}
                        ${step.status === "error" ? "bg-red-100" : ""}
                      `}
                      >
                        {step.status === "pending" && (
                          <Icon className="h-6 w-6 text-gray-400" />
                        )}
                        {step.status === "running" && (
                          <Icon className="h-6 w-6 text-blue-500 animate-pulse" />
                        )}
                        {step.status === "success" && (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        )}
                        {step.status === "error" && (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{step.name}</h3>
                          <Badge
                            variant={
                              step.status === "pending"
                                ? "secondary"
                                : step.status === "running"
                                  ? "default"
                                  : step.status === "success"
                                    ? "default"
                                    : "destructive"
                            }
                          >
                            {step.status === "pending"
                              ? "En attente"
                              : step.status === "running"
                                ? "En cours..."
                                : step.status === "success"
                                  ? "Réussi"
                                  : "Échoué"}
                          </Badge>
                          {step.duration && (
                            <span className="text-sm text-gray-500">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {step.description}
                        </p>

                        {/* Erreur */}
                        {step.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            ❌ {step.error}
                          </div>
                        )}

                        {/* Résultat */}
                        {step.result && step.status === "success" && (
                          <details className="mt-2">
                            <summary className="text-sm text-blue-600 cursor-pointer">
                              Voir le résultat
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
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
                  {steps.filter((s) => s.status === "success").length} /{" "}
                  {steps.length}
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

          {/* Graphique des durées */}
          <Card>
            <CardHeader>
              <CardTitle>Durée par Étape</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {steps
                  .filter((s) => s.duration)
                  .map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className="w-32 text-sm">{step.name}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            step.status === "success"
                              ? "bg-green-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(100, ((step.duration || 0) / Math.max(...steps.map((s) => s.duration || 0))) * 100)}%`,
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
                  {analytics.failedSteps.map(
                    (stepName: string, idx: number) => (
                      <li key={idx} className="text-red-700">
                        {stepName}
                      </li>
                    ),
                  )}
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
                  <div>
                    <strong>Scénario :</strong>{" "}
                    {SCENARIOS[selectedScenario].name}
                  </div>
                  <div>
                    <strong>Complété le :</strong>{" "}
                    {analytics.completedAt.toLocaleString("fr-FR")}
                  </div>
                  <div>
                    <strong>Durée totale :</strong>{" "}
                    {(analytics.totalDuration / 1000).toFixed(2)}s
                  </div>
                  <div>
                    <strong>Taux de réussite :</strong>{" "}
                    {analytics.successRate.toFixed(1)}%
                  </div>
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
                    <h3 className="font-semibold text-lg mb-2">
                      {scenario.name}
                    </h3>
                    <p className="text-gray-600 mb-3">{scenario.description}</p>
                    <div className="space-y-1">
                      <strong className="text-sm">Étapes :</strong>
                      <ol className="list-decimal list-inside text-sm space-y-1">
                        {scenario.steps.map((stepId) => (
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
                Système d'Analytics Mobile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Le système complet de monitoring et analytics mobile est
                documenté et prêt à être implémenté.
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
                  🔧 Guide d'intégration →
                </a>
                <p className="text-sm text-gray-600 mt-4">
                  <strong>Note :</strong> Une fois implémenté, vous pourrez
                  visualiser les analytics mobile en temps réel depuis cette
                  page.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
