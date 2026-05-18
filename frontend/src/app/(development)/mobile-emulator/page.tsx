"use client";

import { useState, useEffect } from "react";
import { FRONTEND_URLS } from "@/config/ports.config";

// Styles CSS personnalisés pour l'émulateur mobile
const mobileEmulatorStyles = `
  /* Masquer les barres de défilement sur tous les navigateurs */
  .mobile-scroll::-webkit-scrollbar {
    display: none;
  }
  .mobile-scroll {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Masquer les barres de défilement pour la navigation */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Indicateur de scroll subtil pour le contenu qui dépasse */
  .scroll-indicator {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 60%;
    background: linear-gradient(to bottom,
      transparent 0%,
      rgba(59, 130, 246, 0.3) 20%,
      rgba(59, 130, 246, 0.6) 50%,
      rgba(59, 130, 246, 0.3) 80%,
      transparent 100%);
    border-radius: 1px;
    opacity: var(--scroll-indicator-opacity, 0);
    transition: opacity 0.2s ease;
    pointer-events: none;
  }

  /* Animation de rebond pour les éléments interactifs */
  @keyframes mobileBounce {
    0%, 20%, 50%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-3px);
    }
    60% {
      transform: translateY(-2px);
    }
  }

  .mobile-bounce {
    animation: mobileBounce 1s infinite;
  }

  /* Effet de vibration pour les interactions */
  @keyframes mobileVibrate {
    0% { transform: translateX(0); }
    25% { transform: translateX(-1px); }
    50% { transform: translateX(1px); }
    75% { transform: translateX(-1px); }
    100% { transform: translateX(0); }
  }

  .mobile-vibrate {
    animation: mobileVibrate 0.1s ease-in-out;
  }

  /* Slider personnalisé moderne */
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3B82F6, #1D4ED8);
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  }

  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }

  .slider::-webkit-slider-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, #E5E7EB, #D1D5DB);
  }

  .slider::-moz-range-thumb {
    height: 12px;
    width: 12px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3B82F6, #1D4ED8);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    transition: all 0.2s ease;
  }

  .slider::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  }

  .slider::-moz-range-track {
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, #E5E7EB, #D1D5DB);
    border: none;
  }
`;
import { AdminLayout } from "@/components/features";
import MobileNotificationCenter from "@/app/shared/components/MobileNotificationCenter";
import { useAuth } from "@/lib/hooks/auth";
import { api } from "@/lib/api";
import { isMobileEmulator } from "@/lib/utils";
import axios from "axios";

type DeviceType =
  | "iphone-14"
  | "iphone-14-pro-max"
  | "pixel-7"
  | "samsung-s23"
  | "ipad";
type OrientationType = "portrait" | "landscape";
type MobileScreen =
  | "login"
  | "home"
  | "applications"
  | "companies"
  | "contacts"
  | "interviews"
  | "profile"
  | "settings"
  | "admin-backoffice";
type EmulatorType = "web" | "flutter" | "react-native";

interface Device {
  id: DeviceType;
  name: string;
  width: number;
  height: number;
  icon: string;
  os: "iOS" | "Android" | "Tablet";
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Application {
  id: string;
  position: string;
  company: { name: string };
  status: string;
}

interface RealTimeMetrics {
  activeServices: number;
  availability: number;
  responseTime: number;
  requestsPerMinute: number;
}

interface Service {
  id: string;
  name: string;
  status: "running" | "stopped" | "warning" | "error";
  uptime: string;
  cpu: number;
  memory: number;
  lastRestart?: string;
}

// Services système simulés
const SYSTEM_SERVICES: Service[] = [
  {
    id: "api-gateway",
    name: "API Gateway",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 12,
    memory: 45,
  },
  {
    id: "auth-service",
    name: "Service d'Authentification",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 8,
    memory: 32,
  },
  {
    id: "application-service",
    name: "Service des Candidatures",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 15,
    memory: 67,
  },
  {
    id: "company-service",
    name: "Service des Entreprises",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 10,
    memory: 28,
  },
  {
    id: "contact-service",
    name: "Service des Contacts",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 7,
    memory: 25,
  },
  {
    id: "interview-service",
    name: "Service des Entretiens",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 9,
    memory: 31,
  },
  {
    id: "notification-service",
    name: "Service de Notifications",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 6,
    memory: 22,
  },
  {
    id: "dashboard-service",
    name: "Service du Tableau de Bord",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 11,
    memory: 38,
  },
  {
    id: "workflow-service",
    name: "Service de Workflow",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 13,
    memory: 42,
  },
  {
    id: "scheduler-service",
    name: "Service de Planification",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 5,
    memory: 18,
  },
  {
    id: "event-service",
    name: "Service des Événements",
    status: "warning",
    uptime: "15j 4h 23m",
    cpu: 18,
    memory: 55,
    lastRestart: "Il y a 2h",
  },
  {
    id: "followup-service",
    name: "Service de Relance",
    status: "running",
    uptime: "15j 4h 23m",
    cpu: 4,
    memory: 16,
  },
];

// Hook pour le monitoring en temps réel
function useRealTimeMonitoring() {
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    activeServices: 8,
    availability: 95,
    responseTime: 120,
    requestsPerMinute: 1800,
  });

  useEffect(() => {
    if (!isMobileEmulator()) return;

    const interval = setInterval(() => {
      setMetrics((prev) => ({
        activeServices: Math.max(
          6,
          Math.min(12, prev.activeServices + Math.floor(Math.random() * 3) - 1),
        ),
        availability: Math.max(
          90,
          Math.min(99.9, prev.availability + Math.random() * 2 - 1),
        ),
        responseTime: Math.max(
          80,
          Math.min(
            300,
            prev.responseTime + Math.floor(Math.random() * 40) - 20,
          ),
        ),
        requestsPerMinute: Math.max(
          1500,
          Math.min(
            2500,
            prev.requestsPerMinute + Math.floor(Math.random() * 200) - 100,
          ),
        ),
      }));
    }, 3000); // Mise à jour toutes les 3 secondes

    return () => clearInterval(interval);
  }, []);

  return metrics;
}

// Hook pour les services temps réel
function useRealTimeServices() {
  const [services, setServices] = useState<Service[]>(SYSTEM_SERVICES);

  useEffect(() => {
    if (!isMobileEmulator()) return;

    const interval = setInterval(() => {
      setServices((prev) =>
        prev.map((service) => ({
          ...service,
          cpu: Math.max(
            1,
            Math.min(25, service.cpu + Math.floor(Math.random() * 6) - 3),
          ),
          memory: Math.max(
            10,
            Math.min(80, service.memory + Math.floor(Math.random() * 8) - 4),
          ),
          status:
            Math.random() > 0.95
              ? Math.random() > 0.5
                ? "warning"
                : "error"
              : service.status,
          uptime:
            service.status === "running"
              ? service.uptime
              : `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
        })),
      );
    }, 2000); // Mise à jour toutes les 2 secondes

    return () => clearInterval(interval);
  }, []);

  return services;
}

const DEVICES: Device[] = [
  {
    id: "iphone-14",
    name: "iPhone 14",
    width: 390,
    height: 844,
    icon: "📱",
    os: "iOS",
  },
  {
    id: "iphone-14-pro-max",
    name: "iPhone 14 Pro Max",
    width: 430,
    height: 932,
    icon: "📱",
    os: "iOS",
  },
  {
    id: "pixel-7",
    name: "Google Pixel 7",
    width: 412,
    height: 915,
    icon: "📱",
    os: "Android",
  },
  {
    id: "samsung-s23",
    name: "Samsung Galaxy S23",
    width: 360,
    height: 780,
    icon: "📱",
    os: "Android",
  },
  {
    id: "ipad",
    name: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    icon: "📱",
    os: "Tablet",
  },
];

const API_URL = FRONTEND_URLS.api;

export default function MobileEmulatorPage() {
  // ✅ HOOKS - Tous les hooks doivent être déclarés en premier
  const { user: adminUser, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState<Device>(DEVICES[0]);
  const [orientation, setOrientation] = useState<OrientationType>("portrait");
  const [scale, setScale] = useState(0.8);
  const [showDeviceFrame, setShowDeviceFrame] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState<"fast" | "slow" | "offline">(
    "fast",
  );

  // Mobile app state
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>("login");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [mobileToken, setMobileToken] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [touchEffect, setTouchEffect] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<
    Array<{ time: string; type: "info" | "error" | "success"; message: string }>
  >([]);
  const [appRunning, setAppRunning] = useState(true);
  const [hasAutoLoggedIn, setHasAutoLoggedIn] = useState(false);
  const [emulatorType, setEmulatorType] = useState<EmulatorType>("web");
  const [showMonitoring, setShowMonitoring] = useState(true);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [selectedServiceForLogs, setSelectedServiceForLogs] =
    useState<Service | null>(null);

  // Monitoring en temps réel
  const realTimeMetrics = useRealTimeMonitoring();
  const realTimeServices = useRealTimeServices();

  // Logs pour chaque service
  const getServiceLogs = (serviceId: string) => {
    return logs
      .filter(
        (log) =>
          log.message.toLowerCase().includes(serviceId.toLowerCase()) ||
          log.message
            .toLowerCase()
            .includes(serviceId.replace("-service", "").toLowerCase()),
      )
      .slice(0, 20); // Derniers 20 logs
  };

  // ✅ Calculs après les hooks
  const width =
    orientation === "portrait" ? selectedDevice.width : selectedDevice.height;
  const height =
    orientation === "portrait" ? selectedDevice.height : selectedDevice.width;

  // ✅ FONCTIONS UTILES
  const addLog = (
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    const time = new Date().toLocaleTimeString("fr-FR");
    setLogs((prevLogs) => [{ time, type, message }, ...prevLogs.slice(0, 49)]);
  };

  // ✅ HOOKS - Tous les hooks doivent être déclarés ici
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (isMounted) {
        await loadUsers();
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedUser && !mobileToken && !hasAutoLoggedIn) {
      setHasAutoLoggedIn(true);
      loginAsUser(selectedUser.email);
    }
  }, [selectedUser, mobileToken, hasAutoLoggedIn]);

  useEffect(() => {
    let isMounted = true;
    if (mobileToken && currentScreen !== "login" && isMounted) {
      loadApplications();
    }
    return () => {
      isMounted = false;
    };
  }, [mobileToken, currentScreen]);

  // ✅ Vérification d'authentification (après tous les hooks)
  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">
              Vérification de l'authentification...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">Accès refusé</p>
            <p className="text-gray-600">
              Vous devez être connecté pour accéder à cette page.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const loadUsers = async () => {
    try {
      addLog("Chargement des utilisateurs...", "info");
      // Récupérer les vrais utilisateurs de la base de données
      const response = await axios.get(`${API_URL}/api/v1/auth/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (response.data.success && response.data.users) {
        // Filtrer les utilisateurs actifs et non supprimés
        const activeUsers = response.data.users.filter(
          (user: any) => user.isActive && !user.isDeleted && !user.isArchived,
        );
        setUsers(activeUsers);
        addLog(
          `${activeUsers.length} utilisateurs chargés depuis la base de données`,
          "success",
        );
      } else {
        throw new Error("Aucun utilisateur trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
      addLog("Erreur chargement utilisateurs depuis l'API", "error");
      // Ne pas utiliser de fallback - l'API doit fonctionner
      throw error;
    }
  };

  const loginAsUser = async (
    email: string,
    password: string = "password123",
  ) => {
    setLoadingData(true);
    addLog(`Tentative de connexion pour ${email}`, "info");
    try {
      const response = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email,
        password,
      });
      if (response.data.success && response.data.token) {
        setMobileToken(response.data.token);
        const user = users.find((u) => u.email === email);
        if (user) setSelectedUser(user);
        setCurrentScreen("home");
        addLog(`Connexion réussie pour ${email}`, "success");
      }
    } catch (error: any) {
      console.error("Erreur login:", error);
      addLog(`Erreur de connexion: ${error.message}`, "error");
      alert(`Erreur de connexion: ${error.message}`);
    } finally {
      setLoadingData(false);
    }
  };

  const loadApplications = async () => {
    if (!mobileToken) return;
    setLoadingData(true);
    addLog("Chargement des candidatures...", "info");
    try {
      const response = await axios.get(`${API_URL}/api/v1/applications`, {
        headers: { Authorization: `Bearer ${mobileToken}` },
      });
      if (response.data.success) {
        setApplications(response.data.applications || []);
        addLog(
          `${response.data.applications?.length || 0} candidatures chargées`,
          "success",
        );
      }
    } catch (error: any) {
      console.error("Erreur chargement candidatures:", error);
      addLog(`Erreur chargement candidatures: ${error.message}`, "error");
    } finally {
      setLoadingData(false);
    }
  };

  const handleScreenTouch = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Effet tactile amélioré
    setTouchEffect({ x, y });
    setTimeout(() => setTouchEffect(null), 200);

    // Vibration simulée plus réaliste
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const logout = () => {
    addLog("Déconnexion de l'utilisateur", "info");
    setMobileToken(null);
    setSelectedUser(null);
    setHasAutoLoggedIn(false); // ✅ Réinitialiser le flag pour permettre un nouveau login
    setCurrentScreen("login");
    setApplications([]);
  };

  const switchUser = (user: User) => {
    addLog(`Changement d'utilisateur vers ${user.email}`, "info");
    logout();
    setHasAutoLoggedIn(false); // ✅ Réinitialiser le flag pour permettre un nouveau login
    setSelectedUser(user);
    setShowUserSwitcher(false);
    setTimeout(() => loginAsUser(user.email, "password123"), 100);
  };

  const toggleOrientation = () => {
    setOrientation(orientation === "portrait" ? "landscape" : "portrait");
    addLog(
      `Orientation changée: ${orientation === "portrait" ? "paysage" : "portrait"}`,
      "info",
    );
  };

  const restartApp = () => {
    addLog("Redémarrage de l'application...", "info");
    setAppRunning(false);
    logout();
    setTimeout(() => {
      setAppRunning(true);
      addLog("Application redémarrée", "success");
    }, 1000);
  };

  const stopApp = () => {
    addLog("Arrêt de l'application", "info");
    setAppRunning(false);
    logout();
  };

  const startApp = () => {
    addLog("Démarrage de l'application", "success");
    setAppRunning(true);
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("Logs effacés", "info");
  };

  return (
    <AdminLayout>
      <style jsx>{mobileEmulatorStyles}</style>
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
        {/* Toolbar - Responsive et Mobile-First */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-2 sm:p-4">
          {/* Version Mobile - Contrôles essentiels en colonnes */}
          <div className="block lg:hidden space-y-3">
            {/* Première rangée - Sélection appareil et utilisateur */}
            <div className="flex items-stretch gap-2">
              {/* Emulator Type Selector - Mobile */}
              <div className="flex-shrink-0">
                <select
                  value={emulatorType}
                  onChange={(e) => {
                    const newType = e.target.value as EmulatorType;
                    setEmulatorType(newType);
                    addLog(
                      `Émulateur basculé vers: ${newType === "flutter" ? "Flutter" : "Web"}`,
                      "info",
                    );
                  }}
                  className="h-8 px-3 text-xs border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="web">🌐 Web</option>
                  <option value="flutter">🚀 Flutter</option>
                </select>
              </div>

              {/* Device Selector - Mobile */}
              <div className="flex-shrink-0">
                <select
                  value={selectedDevice.id}
                  onChange={(e) => {
                    const device = DEVICES.find((d) => d.id === e.target.value);
                    if (device) setSelectedDevice(device);
                  }}
                  className="h-8 px-3 text-xs border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {DEVICES.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.icon} {device.name.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Switcher - Mobile compact et étendu */}
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                  className="w-full h-8 px-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-between gap-1"
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-sm flex-shrink-0">👤</span>
                    <span className="text-xs font-medium truncate text-left">
                      {selectedUser
                        ? `${selectedUser.firstName[0]}${selectedUser.lastName[0]}`
                        : "👤"}
                    </span>
                  </div>
                  <span className="text-xs flex-shrink-0">▼</span>
                </button>

                {showUserSwitcher && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-64 max-w-[calc(100vw-2rem)]">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                        Basculer vers un utilisateur :
                      </p>
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => switchUser(user)}
                          className={`w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                            selectedUser?.id === user.id
                              ? "bg-blue-50 dark:bg-blue-900/30"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Deuxième rangée - Contrôles de visualisation */}
            <div className="flex items-center gap-3 justify-between flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={toggleOrientation}
                  className="h-8 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  title={
                    orientation === "portrait"
                      ? "Passer en paysage"
                      : "Passer en portrait"
                  }
                >
                  <span className="text-sm">
                    {orientation === "portrait" ? "📱" : "🔄"}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    Zoom:
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-16 h-2"
                  />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowDeviceFrame(!showDeviceFrame)}
                  className={`h-8 px-3 rounded transition-colors ${
                    showDeviceFrame
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  title={
                    showDeviceFrame ? "Masquer le cadre" : "Afficher le cadre"
                  }
                >
                  <span className="text-sm">📱</span>
                </button>

                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`h-8 px-3 rounded transition-colors ${
                    isDarkMode
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  title={isDarkMode ? "Mode clair" : "Mode sombre"}
                >
                  <span className="text-sm">{isDarkMode ? "🌙" : "☀️"}</span>
                </button>

                <select
                  value={networkSpeed}
                  onChange={(e) => setNetworkSpeed(e.target.value as any)}
                  className="h-8 px-3 text-xs border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300 dark:hover:border-green-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  title="Vitesse réseau"
                >
                  <option value="fast">📶 Rapide</option>
                  <option value="slow">📶 Lent</option>
                  <option value="offline">📵 Hors ligne</option>
                </select>
              </div>
            </div>

            {/* Troisième rangée - Contrôles d'application et monitoring */}
            <div className="flex items-center gap-3 justify-between flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {emulatorType === "flutter" ? (
                  <>
                    <button
                      onClick={async () => {
                        try {
                          await fetch("http://localhost:8090/api/reload", {
                            method: "POST",
                          });
                          addLog("Rechargement Flutter demandé", "info");
                        } catch (err: any) {
                          addLog(
                            `Erreur rechargement: ${err.message}`,
                            "error",
                          );
                        }
                      }}
                      className="h-8 px-3 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-300 rounded-xl hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600"
                      title="Recharger Flutter"
                    >
                      <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                        🔄
                      </span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await fetch("http://localhost:8090/api/hot-restart", {
                            method: "POST",
                          });
                          addLog("Hot restart Flutter demandé", "info");
                        } catch (err: any) {
                          addLog(`Erreur hot restart: ${err.message}`, "error");
                        }
                      }}
                      className="h-8 px-3 bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 text-orange-700 dark:text-orange-300 rounded-xl hover:from-orange-200 hover:to-orange-300 dark:hover:from-orange-800 dark:hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-600"
                      title="Hot Restart Flutter"
                    >
                      <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                        ⚡
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        addLog("Ouverture Dev Menu Flutter", "info");
                      }}
                      className="h-8 px-3 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 text-purple-700 dark:text-purple-300 rounded-xl hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-800 dark:hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md border-2 border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-600"
                      title="Menu développeur Flutter"
                    >
                      <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                        ⚙️
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {appRunning ? (
                      <>
                        <button
                          onClick={restartApp}
                          className="h-8 px-3 bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 text-orange-700 dark:text-orange-300 rounded-xl hover:from-orange-200 hover:to-orange-300 dark:hover:from-orange-800 dark:hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-600"
                          title="Redémarrer l'application"
                        >
                          <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                            🔄
                          </span>
                        </button>
                        <button
                          onClick={stopApp}
                          className="h-8 px-3 bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 text-red-700 dark:text-red-300 rounded-xl hover:from-red-200 hover:to-red-300 dark:hover:from-red-800 dark:hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md border-2 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-600"
                          title="Arrêter l'application"
                        >
                          <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                            ⏹️
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startApp}
                        className="h-8 px-3 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-300 rounded-xl hover:from-green-200 hover:to-green-300 dark:hover:from-green-800 dark:hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-600"
                        title="Démarrer l'application"
                      >
                        <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                          ▶️
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowMonitoring(!showMonitoring)}
                  className={`h-8 px-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-2 ${
                    showMonitoring
                      ? "bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 hover:from-green-200 hover:to-green-300 dark:hover:from-green-800 dark:hover:to-green-700"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600"
                  }`}
                  title={
                    showMonitoring
                      ? "Masquer le monitoring"
                      : "Afficher le monitoring"
                  }
                >
                  <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                    📊
                  </span>
                </button>

                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className={`h-8 px-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-2 flex items-center gap-1 ${
                    showLogs
                      ? "bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:from-purple-200 hover:to-purple-300 dark:hover:from-purple-800 dark:hover:to-purple-700"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600"
                  }`}
                  title="Afficher/masquer les logs"
                >
                  <span className="text-sm transform transition-transform duration-200 hover:scale-110">
                    📋
                  </span>
                  {logs.length > 0 && (
                    <span className="text-xs font-bold">({logs.length})</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Version Desktop - Contrôles organisés en lignes */}
          <div className="hidden lg:block">
            {/* Première ligne - Contrôles principaux responsive */}
            <div className="flex items-center gap-3 justify-between flex-wrap">
              {/* Emulator Type Selector */}
              <div className="flex-shrink-0">
                <select
                  value={emulatorType}
                  onChange={(e) => {
                    const newType = e.target.value as EmulatorType;
                    setEmulatorType(newType);
                    addLog(
                      `Émulateur basculé vers: ${newType === "flutter" ? "Flutter" : "Web"}`,
                      "info",
                    );
                  }}
                  className="h-10 px-4 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 font-medium min-w-[120px] shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="web">🌐 Web</option>
                  <option value="flutter">🚀 Flutter</option>
                </select>
              </div>

              {/* Device Selector */}
              <div className="flex-shrink-0">
                <select
                  value={selectedDevice.id}
                  onChange={(e) => {
                    const device = DEVICES.find((d) => d.id === e.target.value);
                    if (device) setSelectedDevice(device);
                  }}
                  className="h-10 px-4 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 min-w-[140px] shadow-sm hover:shadow-md transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {DEVICES.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.icon} {device.name.split(" ")[0]}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Switcher */}
              <div className="relative flex-1 min-w-0 max-w-md">
                <button
                  onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                  className="w-full h-10 px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-300 rounded-xl hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800 dark:hover:to-blue-700 transition-all duration-200 flex items-center justify-between gap-2 shadow-sm hover:shadow-md border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0 animate-pulse">
                      👤
                    </span>
                    <span className="text-sm font-medium truncate text-left">
                      {selectedUser
                        ? `${selectedUser.firstName[0]}${selectedUser.lastName[0]}`
                        : "👤"}
                    </span>
                  </div>
                  <span className="text-sm flex-shrink-0 transform transition-transform duration-200 hover:scale-110">
                    ▼
                  </span>
                </button>

                {showUserSwitcher && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 w-80 max-w-[calc(100vw-2rem)]">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                        Basculer vers un utilisateur :
                      </p>
                      {users.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => switchUser(user)}
                          className={`w-full text-left px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm ${
                            selectedUser?.id === user.id
                              ? "bg-blue-50 dark:bg-blue-900/30"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {user.firstName[0]}
                              {user.lastName[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Centre de notifications - Responsive */}
              <div className="flex-shrink-0">
                <MobileNotificationCenter />
              </div>
            </div>

            {/* Deuxième ligne - Contrôles de visualisation */}
            <div className="flex items-center gap-3 justify-between flex-wrap">
              {/* Orientation + Zoom + Cadre */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={toggleOrientation}
                  className="h-10 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-2 border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500"
                  title={
                    orientation === "portrait"
                      ? "Passer en paysage"
                      : "Passer en portrait"
                  }
                >
                  <span className="text-lg transform transition-transform duration-200 hover:scale-110">
                    {orientation === "portrait" ? "📱" : "🔄"}
                  </span>
                </button>

                <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-600 shadow-sm">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    Zoom:
                  </span>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-24 h-3 bg-gradient-to-r from-blue-200 to-blue-400 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 w-12 text-center bg-white dark:bg-gray-800 rounded-lg py-1 shadow-sm">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <button
                  onClick={() => setShowDeviceFrame(!showDeviceFrame)}
                  className={`h-10 px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md border-2 ${
                    showDeviceFrame
                      ? "bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:from-blue-200 hover:to-blue-300 dark:hover:from-blue-800 dark:hover:to-blue-700"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600"
                  }`}
                  title={
                    showDeviceFrame ? "Masquer le cadre" : "Afficher le cadre"
                  }
                >
                  <span className="text-base transform transition-transform duration-200 hover:scale-110">
                    📱
                  </span>
                </button>
              </div>

              {/* Mode sombre + Réseau */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`h-10 px-3 py-2 rounded transition-colors ${
                    isDarkMode
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  title={isDarkMode ? "Mode clair" : "Mode sombre"}
                >
                  <span className="text-base">{isDarkMode ? "🌙" : "☀️"}</span>
                </button>

                <select
                  value={networkSpeed}
                  onChange={(e) => setNetworkSpeed(e.target.value as any)}
                  className="h-10 px-4 py-2 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300 dark:hover:border-green-500 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  title="Vitesse réseau"
                >
                  <option value="fast">📶 Rapide</option>
                  <option value="slow">📶 Lent</option>
                  <option value="offline">📵 Hors ligne</option>
                </select>
              </div>

              {/* Contrôles de l'application */}
              <div className="flex items-center gap-2 flex-wrap">
                {emulatorType === "flutter" ? (
                  <>
                    <button
                      onClick={() => {
                        fetch("http://localhost:8090/api/reload", {
                          method: "POST",
                        })
                          .then(() =>
                            addLog("Rechargement Flutter demandé", "info"),
                          )
                          .catch((err) =>
                            addLog(
                              `Erreur rechargement: ${err.message}`,
                              "error",
                            ),
                          );
                      }}
                      className="h-10 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Recharger Flutter"
                    >
                      <span className="text-sm">🔄</span>
                    </button>
                    <button
                      onClick={() => {
                        fetch("http://localhost:8090/api/hot-restart", {
                          method: "POST",
                        })
                          .then(() =>
                            addLog("Hot restart Flutter demandé", "info"),
                          )
                          .catch((err) =>
                            addLog(
                              `Erreur hot restart: ${err.message}`,
                              "error",
                            ),
                          );
                      }}
                      className="h-10 px-3 py-2 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                      title="Hot Restart Flutter"
                    >
                      <span className="text-sm">⚡</span>
                    </button>
                    <button
                      onClick={() => {
                        addLog("Ouverture Dev Menu Flutter", "info");
                      }}
                      className="h-10 px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                      title="Menu développeur Flutter"
                    >
                      <span className="text-sm">⚙️</span>
                    </button>
                  </>
                ) : (
                  <>
                    {appRunning ? (
                      <>
                        <button
                          onClick={restartApp}
                          className="h-10 px-3 py-2 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
                          title="Redémarrer l'application"
                        >
                          <span className="text-sm">🔄</span>
                        </button>
                        <button
                          onClick={stopApp}
                          className="h-10 px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          title="Arrêter l'application"
                        >
                          <span className="text-sm">⏹️</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={startApp}
                        className="h-10 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                        title="Démarrer l'application"
                      >
                        <span className="text-sm">▶️</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Boutons monitoring et logs */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowMonitoring(!showMonitoring)}
                  className={`h-10 px-3 py-2 rounded transition-colors ${
                    showMonitoring
                      ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  title={
                    showMonitoring
                      ? "Masquer le monitoring"
                      : "Afficher le monitoring"
                  }
                >
                  <span className="text-sm">📊</span>
                </button>

                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className={`h-10 px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                    showLogs
                      ? "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  }`}
                  title="Afficher/masquer les logs"
                >
                  <span className="text-sm">📋</span>
                  {logs.length > 0 && (
                    <span className="text-xs">({logs.length})</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panneau de logs - Entre la barre d'outils et l'émulateur */}
        {showLogs && (
          <div className="bg-white dark:bg-gray-900 border-y border-gray-200 dark:border-gray-800 p-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span className="text-2xl animate-pulse">📋</span>
                  Logs de l'émulateur
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={clearLogs}
                    className="px-3 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-600 rounded-lg transition-all duration-200 text-gray-700 dark:text-gray-300 font-medium shadow-sm hover:shadow-md"
                  >
                    🗑️ Effacer
                  </button>
                  <button
                    onClick={() => setShowLogs(false)}
                    className="px-3 py-2 text-sm bg-gradient-to-r from-red-100 to-red-200 dark:from-red-900/20 dark:to-red-800/30 hover:from-red-200 hover:to-red-300 dark:hover:from-red-800/40 dark:hover:to-red-700/50 rounded-lg transition-all duration-200 text-red-700 dark:text-red-300 font-medium shadow-sm hover:shadow-md"
                  >
                    ❌ Fermer
                  </button>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-2 border border-gray-200 dark:border-gray-700 shadow-inner">
                {logs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2 animate-bounce">📭</div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Aucun log disponible
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Les logs apparaîtront ici en temps réel
                    </p>
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] ${
                        log.type === "error"
                          ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                          : log.type === "success"
                            ? "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                            : "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium">
                        {log.time}
                      </span>
                      <span className="shrink-0 text-lg">
                        {log.type === "error"
                          ? "❌"
                          : log.type === "success"
                            ? "✅"
                            : "ℹ️"}
                      </span>
                      <span className="flex-1 leading-relaxed">
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Layout principal avec émulateur et monitoring côte à côte */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Emulator Area */}
          <div className="flex-1 p-3 sm:p-8 overflow-auto">
            <div className="flex justify-center items-start min-h-full">
              <div
                style={{
                  width: showDeviceFrame ? width + 40 : width,
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Device Frame */}
                <div
                  className={`relative ${showDeviceFrame ? (isDarkMode ? "bg-gray-900" : "bg-gray-800") : ""} ${showDeviceFrame ? "rounded-[3rem] p-3 shadow-2xl" : ""}`}
                >
                  {showDeviceFrame && (
                    <>
                      {/* Notch (pour iOS) */}
                      {selectedDevice.os === "iOS" &&
                        orientation === "portrait" && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-3xl z-10"></div>
                        )}
                      {/* Power Button */}
                      <div
                        className={`absolute ${orientation === "portrait" ? "right-0 top-32" : "top-0 right-32"} w-1 h-16 bg-gray-700 rounded-l`}
                      ></div>
                      {/* Volume Buttons */}
                      <div
                        className={`absolute ${orientation === "portrait" ? "left-0 top-24" : "top-0 left-24"} w-1 h-12 bg-gray-700 rounded-r`}
                      ></div>
                      <div
                        className={`absolute ${orientation === "portrait" ? "left-0 top-40" : "top-0 left-40"} w-1 h-12 bg-gray-700 rounded-r`}
                      ></div>
                    </>
                  )}

                  {/* Screen */}
                  <div
                    className={`relative overflow-hidden ${showDeviceFrame ? "rounded-[2.5rem]" : "rounded-lg shadow-2xl"} ${isDarkMode ? "bg-black" : "bg-white"}`}
                  >
                    {/* Status Bar */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-11 ${isDarkMode ? "bg-black/90 backdrop-blur-sm" : "bg-white/90 backdrop-blur-sm"} z-20 flex items-center justify-between px-6 text-xs ${isDarkMode ? "text-white" : "text-black"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">9:41</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">📶</span>
                          <span
                            className={`text-xs ${networkSpeed === "fast" ? "text-green-500" : networkSpeed === "slow" ? "text-yellow-500" : "text-red-500"}`}
                          >
                            {networkSpeed === "fast"
                              ? "LTE"
                              : networkSpeed === "slow"
                                ? "3G"
                                : "✕"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">🔋</span>
                        <span className="text-xs">100%</span>
                        <div className="w-4 h-2 bg-green-500 rounded-sm"></div>
                      </div>
                    </div>

                    {/* App Content Container - Scrollable */}
                    <div
                      className="relative overflow-hidden"
                      style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        paddingTop: "44px",
                      }}
                    >
                      {/* App Stopped Overlay */}
                      {!appRunning && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center">
                          <div className="text-center text-white">
                            <div className="text-6xl mb-4 animate-pulse">
                              ⏸️
                            </div>
                            <p className="text-xl font-semibold mb-2">
                              Application arrêtée
                            </p>
                            <p className="text-sm text-gray-300 mb-4">
                              Cliquez sur le bouton de démarrage pour relancer
                            </p>
                            <button
                              onClick={startApp}
                              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                            >
                              ▶️ Démarrer l'application
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Touch Effect */}
                      {touchEffect && emulatorType === "web" && (
                        <div
                          className="absolute pointer-events-none z-50"
                          style={{
                            left: touchEffect.x,
                            top: touchEffect.y,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div className="w-12 h-12 rounded-full bg-blue-500 opacity-40 animate-pulse"></div>
                          <div className="absolute inset-0 w-12 h-12 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                        </div>
                      )}

                      {/* Content Area - Switch between Web and React Native */}
                      {emulatorType === "react-native" ? (
                        // React Native via iframe
                        <iframe
                          src="http://localhost:8090"
                          className="w-full h-full border-0"
                          style={{
                            transform: "scale(1)",
                            transformOrigin: "top left",
                          }}
                          title="React Native App"
                        />
                      ) : (
                        // Web version
                        <div
                          className="h-full overflow-y-auto overflow-x-hidden relative"
                          style={{
                            // Style pour simuler le comportement mobile
                            WebkitOverflowScrolling: "touch",
                            scrollbarWidth: "none", // Firefox
                            msOverflowStyle: "none", // IE/Edge
                          }}
                          onScroll={(e) => {
                            const scrollTop = e.currentTarget.scrollTop;
                            const scrollHeight = e.currentTarget.scrollHeight;
                            const clientHeight = e.currentTarget.clientHeight;

                            // Ajouter un indicateur de scroll subtil
                            if (scrollHeight > clientHeight) {
                              e.currentTarget.style.setProperty(
                                "--scroll-indicator-opacity",
                                String(Math.min(scrollTop / 50, 1)),
                              );
                            }
                          }}
                        >
                          <MobileApp
                            currentScreen={currentScreen}
                            setCurrentScreen={setCurrentScreen}
                            selectedUser={selectedUser}
                            mobileToken={mobileToken}
                            applications={applications}
                            loadingData={loadingData}
                            isDarkMode={isDarkMode}
                            loginAsUser={loginAsUser}
                            logout={logout}
                            width={width}
                            height={height - 44}
                            onTouchStart={(x, y) => {
                              setTouchEffect({ x, y });
                              // Vibration simulée
                              if (navigator.vibrate) {
                                navigator.vibrate(10);
                              }
                            }}
                            onTouchEnd={() => {
                              setTimeout(() => setTouchEffect(null), 200);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Home Indicator (iOS) */}
                    {showDeviceFrame &&
                      selectedDevice.os === "iOS" &&
                      orientation === "portrait" && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white opacity-50 rounded-full"></div>
                      )}
                  </div>
                </div>

                {/* Device Info */}
                <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium">
                    {selectedDevice.name} - {width}x{height}px -{" "}
                    {orientation === "portrait" ? "Portrait" : "Paysage"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Monitoring Panel - Desktop Only */}
          {showMonitoring && (
            <div className="hidden lg:block w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 pb-4 mb-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <span className="text-2xl">📊</span>
                    Monitoring en temps réel
                  </h2>
                  <button
                    onClick={() => setShowMonitoring(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Masquer le monitoring"
                  >
                    <span className="text-lg">←</span>
                  </button>
                </div>
              </div>

              {/* Métriques principales - Temps réel */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setShowServicesModal(true)}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer w-full"
                >
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                    {realTimeMetrics.activeServices}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Services actifs
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Cliquez pour voir la liste
                  </div>
                </button>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105">
                  <div
                    className={`text-3xl font-bold ${realTimeMetrics.availability > 98 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"} animate-pulse`}
                  >
                    {realTimeMetrics.availability.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Disponibilité
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105">
                  <div
                    className={`text-3xl font-bold ${realTimeMetrics.responseTime < 150 ? "text-green-600 dark:text-green-400" : realTimeMetrics.responseTime < 250 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"} animate-pulse`}
                  >
                    {realTimeMetrics.responseTime}ms
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Temps de réponse
                  </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center transition-all duration-300 hover:scale-105">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 animate-pulse">
                    {(realTimeMetrics.requestsPerMinute / 1000).toFixed(1)}K
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Requêtes/min
                  </div>
                </div>
              </div>

              {/* Graphiques miniatures - Temps réel */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                {/* Graphique CPU */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Utilisation CPU (%)
                  </h3>
                  <div className="relative h-20">
                    {/* Axe Y */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>100</span>
                      <span>75</span>
                      <span>50</span>
                      <span>25</span>
                      <span>0</span>
                    </div>

                    {/* Barres */}
                    <div className="flex items-end justify-between gap-1 h-full pl-10">
                      {[...Array(12)].map((_, i) => {
                        const cpuValue = Math.max(
                          20,
                          Math.min(
                            80,
                            realTimeMetrics.activeServices * 8 +
                              Math.sin(Date.now() / 1000 + i) * 10 +
                              30,
                          ),
                        );
                        return (
                          <div
                            key={i}
                            className="bg-gradient-to-t from-blue-600 to-blue-400 rounded-t min-h-[4px] transition-all duration-500 relative group"
                            style={{
                              height: `${cpuValue}%`,
                              width: "6px",
                              opacity: 0.8 + (cpuValue / 100) * 0.2,
                            }}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {Math.round(cpuValue)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Axe X */}
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pl-10">
                      <span>Temps</span>
                      <span>Maintenant</span>
                    </div>
                  </div>
                </div>

                {/* Graphique Mémoire */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Utilisation Mémoire (MB)
                  </h3>
                  <div className="relative h-20">
                    {/* Axe Y */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-400 dark:text-gray-500">
                      <span>1200</span>
                      <span>900</span>
                      <span>600</span>
                      <span>300</span>
                      <span>0</span>
                    </div>

                    {/* Barres */}
                    <div className="flex items-end justify-between gap-1 h-full pl-14">
                      {[...Array(12)].map((_, i) => {
                        const memValue = Math.max(
                          30,
                          Math.min(
                            70,
                            (realTimeMetrics.requestsPerMinute / 2500) * 60 +
                              Math.cos(Date.now() / 1500 + i) * 5 +
                              40,
                          ),
                        );
                        const memMB = Math.round((memValue / 100) * 1200);
                        return (
                          <div
                            key={i}
                            className="bg-gradient-to-t from-green-600 to-green-400 rounded-t min-h-[4px] transition-all duration-500 relative group"
                            style={{
                              height: `${memValue}%`,
                              width: "6px",
                              opacity: 0.8 + (memValue / 100) * 0.2,
                            }}
                          >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {memMB}MB
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Axe X */}
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 pl-14">
                      <span>Temps</span>
                      <span>Maintenant</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activité récente - Dynamique */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Activité récente
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse ${realTimeMetrics.activeServices > 9 ? "bg-green-500" : "bg-yellow-500"}`}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      {realTimeMetrics.activeServices > 9
                        ? "Tous les services opérationnels"
                        : `${realTimeMetrics.activeServices} services actifs`}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                      Maintenant
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse ${realTimeMetrics.availability > 98 ? "bg-green-500" : realTimeMetrics.availability > 95 ? "bg-blue-500" : "bg-orange-500"}`}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Disponibilité système :{" "}
                      {realTimeMetrics.availability.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                      Maintenant
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full animate-pulse ${realTimeMetrics.responseTime < 150 ? "bg-green-500" : realTimeMetrics.responseTime < 250 ? "bg-yellow-500" : "bg-red-500"}`}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Temps de réponse : {realTimeMetrics.responseTime}ms
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                      Maintenant
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Trafic :{" "}
                      {(realTimeMetrics.requestsPerMinute / 1000).toFixed(1)}K
                      req/min
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-500 ml-auto">
                      Maintenant
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-xl">
                  {emulatorType === "flutter" ? "🚀" : "🌐"}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {emulatorType === "flutter"
                      ? "Flutter Natif"
                      : "Émulateur Mobile Web"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {emulatorType === "flutter"
                      ? "Exécute du vrai code Flutter dans un conteneur avec Hot Reload"
                      : "Testez l'application avec différents utilisateurs et appareils"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-xl">👤</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Utilisateur actuel
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {selectedUser
                      ? `${selectedUser.email} (${selectedUser.role})`
                      : "Aucun utilisateur connecté"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-xl">📱</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {emulatorType === "flutter"
                      ? "Code Flutter"
                      : "Retour tactile"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    {emulatorType === "flutter"
                      ? "Application Flutter complète avec Hot Reload et Material Design"
                      : "Cliquez sur l'écran pour simuler des interactions tactiles"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Services actifs */}
      {showServicesModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowServicesModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border-2 border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🔧</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Services Système</h2>
                    <p className="text-blue-100 dark:text-blue-200 text-sm">
                      {
                        realTimeServices.filter((s) => s.status === "running")
                          .length
                      }{" "}
                      services actifs sur {realTimeServices.length} total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowServicesModal(false)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realTimeServices.map((service) => {
                  const serviceLogs = getServiceLogs(service.id);
                  return (
                    <div
                      key={service.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer ${
                        service.status === "running"
                          ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600"
                          : service.status === "warning"
                            ? "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 border-yellow-200 dark:border-yellow-700 hover:border-yellow-300 dark:hover:border-yellow-600"
                            : "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600"
                      }`}
                      onClick={() => setSelectedServiceForLogs(service)}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full animate-pulse ${
                              service.status === "running"
                                ? "bg-green-500"
                                : service.status === "warning"
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          ></div>
                          <span
                            className={`text-sm font-medium px-2 py-1 rounded-full ${
                              service.status === "running"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                : service.status === "warning"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {service.status === "running"
                              ? "🟢 Actif"
                              : service.status === "warning"
                                ? "🟡 Avertissement"
                                : "🔴 Erreur"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {serviceLogs.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>📋</span>
                              <span>{serviceLogs.length}</span>
                            </div>
                          )}
                          {service.lastRestart && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Redémarré {service.lastRestart}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Service Info */}
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {service.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Service ID: {service.id}
                      </p>

                      {/* Stats */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            CPU
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  service.cpu < 30
                                    ? "bg-green-500"
                                    : service.cpu < 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(service.cpu, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                              {service.cpu}%
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Mémoire
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  service.memory < 40
                                    ? "bg-green-500"
                                    : service.memory < 70
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                }`}
                                style={{
                                  width: `${Math.min(service.memory, 100)}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">
                              {service.memory}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Uptime */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 dark:text-gray-400">
                            Temps de fonctionnement
                          </span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {service.uptime}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Logs du service sélectionné */}
      {selectedServiceForLogs && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedServiceForLogs(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl border-2 border-gray-200 dark:border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className={`p-6 ${
                selectedServiceForLogs.status === "running"
                  ? "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
                  : selectedServiceForLogs.status === "warning"
                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700"
                    : "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700"
              } text-white`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedServiceForLogs.status === "running"
                        ? "bg-white/20"
                        : selectedServiceForLogs.status === "warning"
                          ? "bg-white/20"
                          : "bg-white/20"
                    }`}
                  >
                    <span className="text-2xl">
                      {selectedServiceForLogs.status === "running"
                        ? "🔧"
                        : selectedServiceForLogs.status === "warning"
                          ? "⚠️"
                          : "❌"}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedServiceForLogs.name}
                    </h2>
                    <p className="text-sm opacity-90">
                      Logs récents •{" "}
                      {getServiceLogs(selectedServiceForLogs.id).length} entrées
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedServiceForLogs(null)}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Content - Logs */}
            <div className="p-6 max-h-[calc(80vh-140px)] overflow-y-auto">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-inner">
                {getServiceLogs(selectedServiceForLogs.id).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2 animate-bounce">📭</div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Aucun log disponible
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Les logs apparaîtront ici en temps réel
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getServiceLogs(selectedServiceForLogs.id).map(
                      (log, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 hover:scale-[1.01] ${
                            log.type === "error"
                              ? "bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
                              : log.type === "success"
                                ? "bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                                : "bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          <span className="text-gray-500 dark:text-gray-400 shrink-0 font-medium text-xs">
                            {log.time}
                          </span>
                          <span className="shrink-0 text-sm">
                            {log.type === "error"
                              ? "❌"
                              : log.type === "success"
                                ? "✅"
                                : "ℹ️"}
                          </span>
                          <span className="flex-1 leading-relaxed text-sm">
                            {log.message}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// Composant de l'application mobile simulée
function MobileApp({
  currentScreen,
  setCurrentScreen,
  selectedUser,
  mobileToken,
  applications,
  loadingData,
  isDarkMode,
  loginAsUser,
  logout,
  width,
  height,
  onTouchStart,
  onTouchEnd,
}: {
  currentScreen: MobileScreen;
  setCurrentScreen: (screen: MobileScreen) => void;
  selectedUser: User | null;
  mobileToken: string | null;
  applications: Application[];
  loadingData: boolean;
  isDarkMode: boolean;
  loginAsUser: (email: string, password: string) => void;
  logout: () => void;
  width: number;
  height: number;
  onTouchStart?: (x: number, y: number) => void;
  onTouchEnd?: () => void;
}) {
  // État local pour les champs de formulaire
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("password123");

  // Mettre à jour les champs de login quand l'utilisateur sélectionné change
  useEffect(() => {
    if (selectedUser) {
      setLoginEmail(selectedUser.email);
      setLoginPassword("password123"); // Mot de passe par défaut
    } else {
      setLoginEmail("user1@jobbingtrack.test"); // Utilisateur par défaut
      setLoginPassword("password123");
    }
  }, [selectedUser]);

  const bgClass = isDarkMode ? "bg-gray-950" : "bg-gray-50";
  const textClass = isDarkMode ? "text-gray-100" : "text-gray-900";
  const cardClass = isDarkMode
    ? "bg-gray-900 border-gray-800"
    : "bg-white border-gray-200";

  // Gestionnaire d'événements tactiles pour simuler l'utilisation mobile
  const handleTouchStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onTouchStart) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onTouchStart(x, y);
    }
  };

  const handleTouchEnd = () => {
    if (onTouchEnd) {
      onTouchEnd();
    }
  };

  if (currentScreen === "login") {
    return (
      <div
        className={`${bgClass} ${textClass} w-full h-full flex flex-col items-center justify-center p-8`}
        onClick={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        <div className="text-6xl mb-4 animate-bounce">🎯</div>
        <h1 className="text-3xl font-bold mb-2">JobbingTrack</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Suivez vos candidatures facilement
        </p>

        <div className="w-full max-w-sm space-y-4">
          <div className="relative">
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="Email"
              className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedUser
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                  : isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300"
              }`}
            />
            {selectedUser && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                Pré-rempli
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Mot de passe"
              className={`w-full px-4 py-3 pr-12 rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                selectedUser
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600"
                  : isDarkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-white border-gray-300"
              }`}
            />
            {selectedUser && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                Pré-rempli
              </div>
            )}
          </div>

          <button
            onClick={() => loginAsUser(loginEmail, loginPassword)}
            disabled={loadingData}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transform transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {loadingData ? "🔄 Connexion..." : "Se connecter"}
          </button>
        </div>

        <div className="mt-8 text-xs text-gray-500 dark:text-gray-400 text-center">
          {selectedUser ? (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="font-medium text-blue-800 dark:text-blue-300">
                Utilisateur sélectionné : {selectedUser.firstName}{" "}
                {selectedUser.lastName}
              </p>
              <p className="mt-1">
                Les champs de connexion sont automatiquement pré-remplis.
              </p>
              <p className="mt-1 text-green-600 dark:text-green-400 font-medium">
                {loadingData
                  ? "🔄 Connexion en cours..."
                  : "✅ Prêt à se connecter"}
              </p>
            </div>
          ) : (
            <>
              <p>Comptes de test :</p>
              <p>
                user1@jobbingtrack.test • user2@jobbingtrack.test •
                user3@jobbingtrack.test
              </p>
              <p className="mt-1">Mot de passe : password123</p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (currentScreen === "home") {
    return (
      <div
        className={`${bgClass} w-full h-full flex flex-col`}
        onClick={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Header */}
        <div className={`${cardClass} border-b p-4`}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">
              Bonjour {selectedUser?.firstName} 👋
            </h1>
            <button
              onClick={logout}
              className="text-2xl hover:scale-110 transition-transform duration-200"
            >
              🚪
            </button>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez vos candidatures en un coup d'œil
          </p>
        </div>

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div
            className={`${cardClass} border p-4 rounded-lg hover:shadow-lg transition-all duration-200`}
          >
            <p className="text-3xl font-bold text-blue-600">
              {applications.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Candidatures
            </p>
          </div>
          <div
            className={`${cardClass} border p-4 rounded-lg hover:shadow-lg transition-all duration-200`}
          >
            <p className="text-3xl font-bold text-green-600">
              {
                applications.filter((a) => a.status === "INTERVIEW_SCHEDULED")
                  .length
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Entretiens
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <h2 className="font-semibold mb-3">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentScreen("applications")}
              className="bg-blue-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-blue-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">📝</span>
              <span className="text-sm font-medium">Candidatures</span>
            </button>
            <button
              onClick={() => setCurrentScreen("companies")}
              className="bg-purple-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-purple-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">🏢</span>
              <span className="text-sm font-medium">Entreprises</span>
            </button>
            <button
              onClick={() => setCurrentScreen("contacts")}
              className="bg-green-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-green-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">👤</span>
              <span className="text-sm font-medium">Contacts</span>
            </button>
            <button
              onClick={() => setCurrentScreen("interviews")}
              className="bg-orange-600 text-white p-4 rounded-lg flex flex-col items-center gap-2 hover:bg-orange-700 transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <span className="text-3xl">📅</span>
              <span className="text-sm font-medium">Entretiens</span>
            </button>
          </div>
        </div>

        {/* Bottom Navigation */}
        <BottomNav
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          isDarkMode={isDarkMode}
          selectedUser={selectedUser}
        />
      </div>
    );
  }

  if (currentScreen === "applications") {
    return (
      <div
        className={`${bgClass} w-full h-full flex flex-col`}
        onClick={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Header */}
        <div className={`${cardClass} border-b p-4`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentScreen("home")}
              className="text-2xl hover:scale-110 transition-transform duration-200"
            >
              ←
            </button>
            <h1 className="text-xl font-bold">Mes Candidatures</h1>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 mobile-scroll relative">
          {/* Indicateur de scroll subtil */}
          <div className="scroll-indicator"></div>
          {loadingData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Chargement...
              </p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2 animate-bounce">📭</p>
              <p className="text-gray-500 dark:text-gray-400">
                Aucune candidature
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Les candidatures apparaîtront ici
              </p>
            </div>
          ) : (
            applications.map((app, index) => (
              <div
                key={index}
                className={`${cardClass} border p-4 rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer`}
                onClick={() => {
                  // Simulation d'ouverture de détail (pourrait ouvrir un modal ou une autre vue)
                  console.log("Ouverture candidature:", app.id);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{app.position}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {app.company.name}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${
                      app.status === "INTERVIEW_SCHEDULED"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : app.status === "SENT"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {app.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>📅 {new Date().toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                      <span>👁️</span>
                      <span>Voir détails</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <BottomNav
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          isDarkMode={isDarkMode}
          selectedUser={selectedUser}
        />
      </div>
    );
  }

  // Écran Admin Backoffice (Super Admin uniquement)
  if (currentScreen === "admin-backoffice") {
    return (
      <div className={`${bgClass} w-full h-full flex flex-col`}>
        {/* Header avec option de retour */}
        <div
          className={`${cardClass} border-b p-3 flex items-center justify-between`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentScreen("home")}
              className="text-xl hover:scale-110 transition-transform duration-200"
            >
              ←
            </button>
            <h1 className="text-lg font-bold">Admin Backoffice</h1>
          </div>
          <button
            onClick={() => {
              // Basculer en plein écran web
              window.open("http://localhost:8080/b4ck0ff1ce", "_blank");
            }}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
          >
            🖥️ Version Web
          </button>
        </div>

        {/* Iframe du backoffice web adapté au mobile */}
        <div className="flex-1 overflow-hidden relative">
          <iframe
            src="http://localhost:8080/b4ck0ff1ce"
            className="w-full h-full border-0"
            style={{
              transform: "scale(1)",
              transformOrigin: "top left",
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Admin Backoffice"
          />
        </div>

        <BottomNav
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          isDarkMode={isDarkMode}
          selectedUser={selectedUser}
        />
      </div>
    );
  }

  // Autres écrans
  return (
    <div
      className={`${bgClass} w-full h-full flex flex-col`}
      onClick={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
    >
      <div className={`${cardClass} border-b p-4`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentScreen("home")}
            className="text-2xl hover:scale-110 transition-transform duration-200"
          >
            ←
          </button>
          <h1 className="text-xl font-bold capitalize">{currentScreen}</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-6xl mb-4 animate-pulse">🚧</p>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
            Écran en développement
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Cette fonctionnalité sera bientôt disponible
          </p>
        </div>
      </div>
      <BottomNav
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        isDarkMode={isDarkMode}
        selectedUser={selectedUser}
      />
    </div>
  );
}

function BottomNav({
  currentScreen,
  setCurrentScreen,
  isDarkMode,
  selectedUser,
}: {
  currentScreen: MobileScreen;
  setCurrentScreen: (screen: MobileScreen) => void;
  isDarkMode: boolean;
  selectedUser?: User | null;
}) {
  const navItems = [
    { screen: "home" as MobileScreen, icon: "🏠", label: "Accueil" },
    {
      screen: "applications" as MobileScreen,
      icon: "📝",
      label: "Candidatures",
    },
    { screen: "interviews" as MobileScreen, icon: "📅", label: "Entretiens" },
    { screen: "profile" as MobileScreen, icon: "👤", label: "Profil" },
  ];
  // Ajouter le backoffice pour les Super Admin
  const isAdmin =
    selectedUser?.role === "SUPER_ADMIN" || selectedUser?.role === "ADMIN";

  if (isAdmin && currentScreen !== "login") {
    navItems.push({
      screen: "admin-backoffice" as MobileScreen,
      icon: "⚙️",
      label: "Admin",
    });
  }

  return (
    <div
      className={`${isDarkMode ? "bg-gray-900/95 border-gray-800" : "bg-white/95 border-gray-200"} border-t backdrop-blur-sm sticky bottom-0 left-0 right-0 z-30 shadow-lg`}
    >
      {/* Navigation scrollable horizontalement */}
      <div className="flex overflow-x-auto scrollbar-hide p-2 gap-1">
        {navItems.map((item) => (
          <button
            key={item.screen}
            onClick={() => setCurrentScreen(item.screen)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 flex-shrink-0 ${
              currentScreen === item.screen
                ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30 transform scale-110"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium whitespace-nowrap">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
