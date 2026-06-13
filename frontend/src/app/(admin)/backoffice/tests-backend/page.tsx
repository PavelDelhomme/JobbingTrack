"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { DevelopmentPageShell } from "../DevelopmentSubNav";
import { useAuth } from "@/lib/hooks/auth";
import {
  Play,
  Square,
  Loader2,
  CheckCircle,
  XCircle,
  Server,
  Activity,
  Clock,
  Zap,
  RefreshCw,
  Database,
  CheckCircle2,
  FileText,
} from "@/lib/icons";

interface TestItem {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

interface TestStatus {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  progress: number;
}

export default function BackendTestsPage() {
  const { user, loading: authLoading, isAuthenticated, token } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [testStatuses, setTestStatuses] = useState<TestStatus[]>([]);
  const [currentTest, setCurrentTest] = useState<string>("");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [lastReportId, setLastReportId] = useState<string | null>(null);

  // Liste des tests disponibles avec leurs descriptions
  const [availableTests, setAvailableTests] = useState<TestItem[]>([
    {
      id: "auth-service",
      name: "Service d'Authentification",
      description:
        "Tests du service d'authentification (login, register, tokens)",
      category: "Services",
      enabled: true,
    },
    {
      id: "company-service",
      name: "Service Entreprises",
      description: "Tests CRUD du service de gestion des entreprises",
      category: "Services",
      enabled: true,
    },
    {
      id: "application-service",
      name: "Service Candidatures",
      description: "Tests CRUD du service de gestion des candidatures",
      category: "Services",
      enabled: true,
    },
    {
      id: "dashboard-service",
      name: "Service Dashboard",
      description: "Tests du service de dashboard et statistiques",
      category: "Services",
      enabled: true,
    },
    {
      id: "api-gateway",
      name: "API Gateway",
      description: "Tests de l'API Gateway (health, routes, routing)",
      category: "Infrastructure",
      enabled: true,
    },
    {
      id: "database",
      name: "Base de Données",
      description: "Tests de connexion et requêtes à la base de données",
      category: "Infrastructure",
      enabled: true,
    },
    {
      id: "integration",
      name: "Tests d'Intégration",
      description: "Tests d'intégration entre les services",
      category: "Intégration",
      enabled: true,
    },
  ]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("fr-FR");
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const toggleTest = (testId: string) => {
    setAvailableTests((prev) =>
      prev.map((test) =>
        test.id === testId ? { ...test, enabled: !test.enabled } : test,
      ),
    );
  };

  const startBackendTests = async () => {
    if (isRunning) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setIsRunning(false);
      setProgress(0);
      addLog("⏹️ Tests arrêtés");
      return;
    }

    const selectedTests = availableTests.filter((t) => t.enabled);
    if (selectedTests.length === 0) {
      alert("Veuillez sélectionner au moins un test à exécuter");
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setLogs([]);
    setCurrentTest("");
    setLastReportId(null);

    setTestStatuses(
      selectedTests.map((test) => ({
        name: test.name,
        status: "pending",
        progress: 0,
      })),
    );
    addLog(`🚀 Démarrage des tests backend...`);
    addLog(`📋 ${selectedTests.length} test(s) sélectionné(s)`);

    try {
      setCurrentTest("Exécution en cours...");
      const response = await fetch("/api/test/run-backend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tests: selectedTests.map((t) => t.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur API: ${response.status}`);
      }

      addLog(`✅ ${data.message || "Tests backend terminés."}`);
      if (data.reportId) {
        setLastReportId(data.reportId);
        addLog("📄 Voir le rapport ci-dessous.");
      }
      setTestStatuses((prev) =>
        prev.map((t) => ({ ...t, status: "completed", progress: 100 })),
      );
      setCurrentTest("");
      setIsRunning(false);
      setProgress(100);
      addLog("🎉 Tous les tests backend sont terminés !");
    } catch (error: any) {
      addLog(`❌ Erreur: ${error.message}`);
      setIsRunning(false);
      setProgress(0);
    }
  };

  const categories = Array.from(new Set(availableTests.map((t) => t.category)));

  if (authLoading) {
    return (
      <DevelopmentPageShell
        title="Tests Backend"
        description="Tests complets des services backend"
      >
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DevelopmentPageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <DevelopmentPageShell
        title="Tests Backend"
        description="Tests complets des services backend"
      >
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Vous devez être connecté.
          </p>
        </div>
      </DevelopmentPageShell>
    );
  }

  return (
    <DevelopmentPageShell
      title={
        <span className="flex items-center gap-2">
          <Database className="w-7 h-7 text-purple-600" />
          Tests Backend
        </span>
      }
      description="Tests complets des services backend"
      actions={
        <button
            onClick={startBackendTests}
            disabled={!token || isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isRunning
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRunning ? (
              <>
                <Square className="h-5 w-5" />
                Arrêter
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                Lancer les tests Backend
              </>
            )}
          </button>
      }
    >
      <div className="space-y-6">
        {/* Liste des tests disponibles */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Tests Disponibles ({availableTests.filter((t) => t.enabled).length}{" "}
            sélectionné(s))
          </h2>

          {categories.map((category) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableTests
                  .filter((test) => test.category === category)
                  .map((test) => (
                    <div
                      key={test.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        test.enabled
                          ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                      }`}
                      onClick={() => !isRunning && toggleTest(test.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2
                              className={`w-5 h-5 ${
                                test.enabled
                                  ? "text-purple-600 dark:text-purple-400"
                                  : "text-gray-400"
                              }`}
                            />
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {test.name}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {test.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Progression */}
        {isRunning && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentTest || "Préparation..."}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Statuts des tests */}
            {testStatuses.length > 0 && (
              <div className="mt-4 space-y-2">
                {testStatuses.map((test, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {test.status === "completed" && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                      {test.status === "running" && (
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      )}
                      {test.status === "error" && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {test.status === "pending" && (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-gray-700 dark:text-gray-300">
                        {test.name}
                      </span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">
                      {test.progress}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Terminal</span>
              <button
                onClick={() => {
                  setLogs([]);
                  setProgress(0);
                }}
                className="text-gray-400 hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="mb-1">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
            {lastReportId && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <Link
                  href={`/b4ck0ff1ce/test-reports?open=${encodeURIComponent(lastReportId)}`}
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Voir le rapport
                </Link>
              </div>
            )}
          </div>
        )}

        {lastReportId && logs.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <Link
              href={`/b4ck0ff1ce/test-reports?open=${encodeURIComponent(lastReportId)}`}
              className="inline-flex items-center gap-2 text-blue-700 dark:text-blue-300 hover:underline font-medium"
            >
              <FileText className="w-4 h-4" />
              Voir le rapport généré
            </Link>
          </div>
        )}
      </div>
    </DevelopmentPageShell>
  );
}
