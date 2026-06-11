"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/lib/hooks/theme";
import { useAuth } from "@/lib/hooks/auth";
import preferencesService, {
  type UserPreferences,
} from "@/lib/services/preferencesService";
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import {
  RefreshCw,
  Save,
  Check,
  Clock,
  Loader2,
  Download,
  Upload,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
} from "@/lib/icons";

interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function SettingsPopup({ isOpen, onClose }: SettingsPopupProps) {
  const { theme, actualTheme, toggleTheme, setThemeMode } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | "appearance"
    | "account"
    | "notifications"
    | "system"
    | "refresh"
    | "history"
    | "display"
  >("appearance");
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [interimMode, setInterimMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Refs pour debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await preferencesService.getUserPreferences();
        setPreferences(prefs);
      } catch (error) {
        console.error("Erreur chargement préférences:", error);
      }
    };
    if (isOpen) {
      loadPreferences();
      setInterimMode(
        typeof window !== "undefined" &&
          localStorage.getItem("backoffice_interim_mode") === "true",
      );
    }
  }, [isOpen]);

  // Fonction d'enregistrement automatique avec debounce
  const autoSave = useCallback((newPreferences: UserPreferences) => {
    // Annuler l'enregistrement précédent s'il existe
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Annuler le timeout de statut s'il existe
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    // Indiquer que la sauvegarde est en attente
    setSaveStatus("saving");

    // Programmer l'enregistrement avec un délai de 800ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await preferencesService.updateUserPreferences(newPreferences);
        setSaveStatus("saved");

        // Réinitialiser le statut après 2 secondes
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
      } catch (error) {
        console.error("Erreur sauvegarde automatique:", error);
        setSaveStatus("error");

        // Réinitialiser le statut d'erreur après 3 secondes
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus("idle");
        }, 3000);
      }
    }, 800); // Debounce de 800ms
  }, []);

  // Nettoyer les timeouts au démontage
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Mise à jour avec auto-save
  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      if (!preferences) return;

      const newPreferences = { ...preferences, ...updates };
      setPreferences(newPreferences);
      autoSave(newPreferences);
    },
    [preferences, autoSave],
  );

  const updateRefreshInterval = useCallback(
    (key: keyof UserPreferences["refreshInterval"], value: number) => {
      if (!preferences) return;

      const newPreferences = {
        ...preferences,
        refreshInterval: {
          ...preferences.refreshInterval,
          [key]: value,
        },
      };
      setPreferences(newPreferences);
      autoSave(newPreferences);
    },
    [preferences, autoSave],
  );

  const updateDisplay = useCallback(
    (key: keyof UserPreferences["display"], value: any) => {
      if (!preferences) return;

      const newPreferences = {
        ...preferences,
        display: {
          ...preferences.display,
          [key]: value,
        },
      };
      setPreferences(newPreferences);
      autoSave(newPreferences);
    },
    [preferences, autoSave],
  );

  const updateNotifications = useCallback(
    (key: keyof UserPreferences["notifications"], value: boolean) => {
      if (!preferences) return;

      const newPreferences = {
        ...preferences,
        notifications: {
          ...preferences.notifications,
          [key]: value,
        },
      };
      setPreferences(newPreferences);
      autoSave(newPreferences);
    },
    [preferences, autoSave],
  );

  const formatInterval = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${ms / 1000}s`;
  };

  if (!isOpen) return null;

  // Indicateur de statut de sauvegarde
  const SaveStatusIndicator = () => {
    if (saveStatus === "idle") return null;

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all">
        {saveStatus === "saving" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-blue-600">Enregistrement...</span>
          </>
        )}
        {saveStatus === "saved" && (
          <>
            <Check className="h-4 w-4 text-green-600" />
            <span className="text-green-600">Enregistré !</span>
          </>
        )}
        {saveStatus === "error" && (
          <>
            <Clock className="h-4 w-4 text-red-600" />
            <span className="text-red-600">Erreur</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800 sm:max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-popup-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-200 p-4 dark:border-gray-700 sm:p-6">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <h3
                id="settings-popup-title"
                className="text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                Paramètres
              </h3>
              <SaveStatusIndicator />
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Fermer les paramètres"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            💡 Les modifications sont enregistrées automatiquement
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Sidebar des onglets */}
          <div className="border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900 md:w-64 md:flex-shrink-0 md:border-b-0 md:border-r md:p-4">
            <nav className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-2 md:overflow-visible md:pb-0">
              {[
                { id: "appearance", label: "🎨 Apparence", icon: "🎨" },
                { id: "refresh", label: "🔄 Rafraîchissement", icon: "🔄" },
                { id: "notifications", label: "🔔 Notifications", icon: "🔔" },
                { id: "display", label: "📱 Affichage", icon: "📱" },
                { id: "history", label: "📊 Historique", icon: "📊" },
                { id: "system", label: "⚙️ Système", icon: "⚙️" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors md:w-full ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Contenu des onglets */}
          <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Onglet Apparence */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Apparence
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Thème
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {["light", "dark", "system"].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setThemeMode(mode as any);
                            updatePreferences({ theme: mode });
                          }}
                          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                            theme === mode
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                          }`}
                        >
                          {mode === "light" && "☀️ Clair"}
                          {mode === "dark" && "🌙 Sombre"}
                          {mode === "system" && "💻 Système"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Langue
                    </label>
                    <select
                      value={preferences?.language || "fr"}
                      onChange={(e) =>
                        updatePreferences({ language: e.target.value })
                      }
                      className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="fr">🇫🇷 Français</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="es">🇪🇸 Español</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Fuseau horaire
                    </label>
                    <select
                      value={preferences?.timezone || "Europe/Paris"}
                      onChange={(e) =>
                        updatePreferences({ timezone: e.target.value })
                      }
                      className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="Europe/Paris">
                        🇫🇷 Europe/Paris (CET)
                      </option>
                      <option value="Europe/London">
                        🇬🇧 Europe/London (GMT)
                      </option>
                      <option value="America/New_York">
                        🇺🇸 America/New_York (EST)
                      </option>
                      <option value="America/Los_Angeles">
                        🇺🇸 America/Los_Angeles (PST)
                      </option>
                      <option value="Asia/Tokyo">🇯🇵 Asia/Tokyo (JST)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Rafraîchissement */}
            {activeTab === "refresh" && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Intervalles de Rafraîchissement
                </h4>

                <div className="space-y-6">
                  {[
                    {
                      key: "logs" as const,
                      label: "Logs de Sécurité",
                      min: 5,
                      max: 120,
                      step: 5,
                    },
                    {
                      key: "analytics" as const,
                      label: "Analytics",
                      min: 5,
                      max: 60,
                      step: 5,
                    },
                    {
                      key: "metrics" as const,
                      label: "Métriques",
                      min: 5,
                      max: 60,
                      step: 5,
                    },
                    {
                      key: "dashboard" as const,
                      label: "Dashboard",
                      min: 10,
                      max: 120,
                      step: 10,
                    },
                    {
                      key: "services" as const,
                      label: "Services",
                      min: 10,
                      max: 120,
                      step: 10,
                    },
                    {
                      key: "notifications" as const,
                      label: "Notifications",
                      min: 30,
                      max: 300,
                      step: 30,
                    },
                  ].map(({ key, label, min, max, step }) => {
                    const value =
                      (preferences.refreshInterval?.[key] || 30000) / 1000;
                    return (
                      <div key={key}>
                        <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {label}
                          </label>
                          <span className="flex-shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatInterval(value * 1000)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={value}
                          onChange={(e) =>
                            updateRefreshInterval(
                              key,
                              parseInt(e.target.value) * 1000,
                            )
                          }
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{min}s</span>
                          <span>{max}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Conseil :</strong> Des intervalles plus courts
                    (5-15s) offrent une meilleure réactivité mais consomment
                    plus de ressources. Pour un usage optimal, utilisez 20-30s.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-semibold">
                    À venir : réglages par graphique
                  </p>
                  <p className="mt-1">
                    Les réglages actuels sont globaux par zone. Le prochain lot
                    doit permettre de régler l’actualisation par emplacement
                    précis, par exemple le graphe “temps de réponse” dans
                    Performances → Synthèse, sans forcer tous les autres
                    graphes.
                  </p>
                </div>
              </div>
            )}

            {/* Onglet Notifications */}
            {activeTab === "notifications" && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Notifications
                </h4>

                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">
                    Alertes email sécurité (menaces, CVE, indisponibilité)
                  </p>
                  <p className="mt-1 text-sm text-red-800/90 dark:text-red-200/90">
                    Destinataires, niveaux critical/high, réauth admin et envoi
                    de test — page dédiée hors de cette popup.
                  </p>
                  <Link
                    href="/b4ck0ff1ce/security/alerts"
                    onClick={onClose}
                    className="mt-3 inline-flex max-w-full items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Ouvrir Alertes email sécurité
                  </Link>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-3">
                      Paramètres généraux
                    </p>
                    {[
                      {
                        key: "desktop" as const,
                        label: "Notifications Bureau",
                        desc: "Recevoir des notifications de bureau",
                      },
                      {
                        key: "sound" as const,
                        label: "Son",
                        desc: "Jouer un son pour les notifications",
                      },
                      {
                        key: "highPriorityOnly" as const,
                        label: "Priorité Élevée Uniquement",
                        desc: "Ne montrer que les notifications importantes",
                      },
                    ].map(({ key, label, desc }) => (
                      <div
                        key={key}
                        className="mb-2 flex min-w-0 items-start justify-between gap-3 rounded-lg bg-white p-3 dark:bg-gray-800"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {desc}
                          </div>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={preferences.notifications?.[key] || false}
                            onChange={(e) =>
                              updateNotifications(key, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-300 mb-3">
                      Types de notifications
                    </p>
                    {[
                      {
                        key: "applicationUpdates" as const,
                        label: "Mises à jour de candidatures",
                        desc: "Notifications pour les changements de statut",
                      },
                      {
                        key: "interviewReminders" as const,
                        label: "Rappels d'entretiens",
                        desc: "Notifications avant les entretiens",
                      },
                      {
                        key: "followupReminders" as const,
                        label: "Rappels de relances",
                        desc: "Notifications pour les relances à faire",
                      },
                      {
                        key: "deadlineAlerts" as const,
                        label: "Alertes de deadlines",
                        desc: "Notifications pour les échéances importantes",
                      },
                      {
                        key: "systemAlerts" as const,
                        label: "Alertes système",
                        desc: "Notifications système et de sécurité",
                      },
                    ].map(({ key, label, desc }) => (
                      <div
                        key={key}
                        className="mb-2 flex min-w-0 items-start justify-between gap-3 rounded-lg bg-white p-3 dark:bg-gray-700"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {label}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {desc}
                          </div>
                        </div>
                        <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={preferences.notifications?.[key] !== false}
                            onChange={(e) =>
                              updateNotifications(key, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Affichage */}
            {activeTab === "display" && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Affichage
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Éléments par page
                    </label>
                    <select
                      value={preferences.display?.itemsPerPage || 20}
                      onChange={(e) =>
                        updateDisplay("itemsPerPage", parseInt(e.target.value))
                      }
                      className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>

                  {[
                    {
                      key: "compactMode" as const,
                      label: "Mode Compact",
                      desc: "Interface plus dense",
                    },
                    {
                      key: "showCharts" as const,
                      label: "Afficher les Graphiques",
                      desc: "Afficher les graphiques sur le dashboard",
                    },
                    {
                      key: "showMetrics" as const,
                      label: "Afficher les Métriques",
                      desc: "Afficher les métriques de base",
                    },
                    {
                      key: "detailedMetrics" as const,
                      label: "Métriques Détaillées",
                      desc: "Afficher toutes les métriques détaillées (CPU, mémoire, réseau par service)",
                    },
                  ].map(({ key, label, desc }) => (
                    <div
                      key={key}
                      className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {desc}
                        </div>
                      </div>
                      <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={preferences.display?.[key] !== false}
                          onChange={(e) => updateDisplay(key, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}

                  <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Mode intérim
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Mettre en avant Suivi intérim, filtres et couleurs
                        calendrier (événements via agence)
                      </div>
                    </div>
                    <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={interimMode}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setInterimMode(v);
                          if (typeof window !== "undefined")
                            localStorage.setItem(
                              "backoffice_interim_mode",
                              String(v),
                            );
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Historique */}
            {activeTab === "history" && preferences && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Configuration de l'Historique
                </h4>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 <strong>Information :</strong> Configurez la durée de
                    rétention des métriques et données d'historique. Les données
                    plus anciennes seront automatiquement supprimées.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Durée de rétention des métriques (jours)
                    </label>
                    <select
                      value={preferences.metricsRetentionDays || 30}
                      onChange={(e) => {
                        const days = parseInt(e.target.value);
                        if (days >= 7) {
                          updatePreferences({ metricsRetentionDays: days });
                        }
                      }}
                      className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="7">7 jours (minimum)</option>
                      <option value="14">14 jours</option>
                      <option value="30">30 jours (recommandé)</option>
                      <option value="60">60 jours</option>
                      <option value="90">90 jours</option>
                      <option value="180">180 jours (6 mois)</option>
                      <option value="365">365 jours (1 an)</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Les métriques système (CPU, mémoire, réseau, etc.) seront
                      conservées pendant cette durée. Minimum : 7 jours.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Durée de rétention des logs (jours)
                    </label>
                    <select
                      value={preferences.logsRetentionDays || 30}
                      onChange={(e) => {
                        const days = parseInt(e.target.value);
                        if (days >= 7) {
                          updatePreferences({ logsRetentionDays: days });
                        }
                      }}
                      className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <option value="7">7 jours (minimum)</option>
                      <option value="14">14 jours</option>
                      <option value="30">30 jours (recommandé)</option>
                      <option value="60">60 jours</option>
                      <option value="90">90 jours</option>
                    </select>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Les logs système et d'application seront conservés pendant
                      cette durée. Minimum : 7 jours.
                    </p>
                  </div>

                  <div className="flex min-w-0 items-start justify-between gap-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Nettoyage automatique
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Supprimer automatiquement les données expirées
                      </div>
                    </div>
                    <label className="relative inline-flex flex-shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={preferences.autoCleanupHistory !== false}
                        onChange={(e) =>
                          updatePreferences({
                            autoCleanupHistory: e.target.checked,
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      ⚠️ <strong>Attention :</strong> La modification de la
                      durée de rétention déclenchera immédiatement un nettoyage
                      des données expirées. Cette action est irréversible.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Système */}
            {activeTab === "system" && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Informations Système
                </h4>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Utilisateur
                      </div>
                      <div className="break-all font-medium text-gray-900 dark:text-gray-100">
                        {user?.email}
                      </div>
                    </div>

                    <div className="min-w-0 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Rôle
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
                          ? "👑 Administrateur"
                          : "👤 Utilisateur"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Version
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        JobbingTrack v1.0.0
                      </div>
                    </div>

                    <div className="min-w-0 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Environnement
                      </div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {process.env.NODE_ENV === "production"
                          ? "🚀 Production"
                          : "🔧 Développement"}
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Informations Navigateur
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="break-all">
                        User Agent:{" "}
                        {typeof window !== "undefined"
                          ? navigator.userAgent.substring(0, 50) + "..."
                          : "N/A"}
                      </div>
                      <div className="break-words">
                        Langue:{" "}
                        {typeof window !== "undefined"
                          ? navigator.language
                          : "N/A"}
                      </div>
                      <div className="break-words">
                        Résolution:{" "}
                        {typeof window !== "undefined"
                          ? `${window.screen.width}x${window.screen.height}`
                          : "N/A"}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                    <h5 className="font-semibold text-gray-900 dark:text-gray-100">
                      Gestion des Préférences
                    </h5>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        onClick={async () => {
                          try {
                            await preferencesService.exportPreferences();
                            setMessage({
                              type: "success",
                              text: "Préférences exportées avec succès !",
                            });
                            setTimeout(() => setMessage(null), 3000);
                          } catch (error) {
                            console.error("Erreur:", error);
                            setMessage({
                              type: "error",
                              text: "Erreur lors de l'export",
                            });
                            setTimeout(() => setMessage(null), 3000);
                          }
                        }}
                        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4" />
                        Exporter
                      </button>

                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700">
                        <Upload className="h-4 w-4" />
                        Importer
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const prefs =
                                  await preferencesService.importPreferences(
                                    file,
                                  );
                                setPreferences(prefs);
                                setMessage({
                                  type: "success",
                                  text: "Préférences importées avec succès !",
                                });
                                setTimeout(() => setMessage(null), 3000);
                              } catch (error) {
                                console.error("Erreur:", error);
                                setMessage({
                                  type: "error",
                                  text: "Erreur lors de l'import",
                                });
                                setTimeout(() => setMessage(null), 3000);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    <button
                      onClick={async () => {
                        if (
                          confirm(
                            "Êtes-vous sûr de vouloir réinitialiser tous les paramètres ? Cette action est irréversible.",
                          )
                        ) {
                          try {
                            await preferencesService.resetUserPreferences();
                            const prefs =
                              await preferencesService.getUserPreferences();
                            setPreferences(prefs);
                            setMessage({
                              type: "success",
                              text: "Préférences réinitialisées avec succès !",
                            });
                            setTimeout(() => setMessage(null), 3000);
                          } catch (error) {
                            console.error("Erreur:", error);
                            setMessage({
                              type: "error",
                              text: "Erreur lors de la réinitialisation",
                            });
                            setTimeout(() => setMessage(null), 3000);
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      🔄 Réinitialiser tous les paramètres
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
