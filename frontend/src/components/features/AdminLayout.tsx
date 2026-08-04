"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/auth";
import { useTheme } from "@/lib/hooks/theme";
import Breadcrumb from "./Breadcrumb";
import { GlobalSearch } from "./GlobalSearch";
import { OfflineActions } from "./OfflineActions";
import { SettingsPopup } from "./SettingsPopup";
import { QuickMenuPopup } from "./QuickMenuPopup";
import { FRONTEND_URLS } from "@/config/ports.config";
// ✅ OPTIMISATION: Import depuis le baril pour permettre le tree-shaking
import { TrendingUp, Database, Activity, Server } from "@/lib/icons";
import { FlaskConical, Eraser } from "lucide-react";
import { BackofficeLink } from "./BackofficeLink";
import { BackofficeRefreshControls } from "./BackofficeRefreshControls";
import { AdminActionToast } from "./AdminActionToast";
import { showAdminActionFeedback } from "@/lib/adminActionFeedback";

const BACKOFFICE_API_URL = FRONTEND_URLS.api;

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  href?: string;
  icon: string;
  onClick?: () => void;
  subItems?: NavItem[];
  /** Libellé de section non cliquable dans un sous-menu */
  sectionLabel?: boolean;
  /** Si true, ouvre le lien dans un nouvel onglet (pour liens externes ex. MailHog) */
  external?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
  isCollapsible?: boolean;
}

/** Correspondance pathname sur un item ou un sous-arbre (sous-menus imbriqués, ex. Analytics → Application). */
function navItemMatchesPath(pathname: string, item: NavItem): boolean {
  if (item.href && !item.external && pathname === item.href) return true;
  if (item.subItems?.length) {
    return item.subItems.some((sub) => navItemMatchesPath(pathname, sub));
  }
  return false;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuth();
  const { theme, actualTheme, toggleTheme, setThemeMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ✅ État pour la sidebar mobile
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // ✅ État pour cacher le drawer sur desktop (visible par défaut)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // ✅ État pour le popup des paramètres
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false); // ✅ État pour le menu rapide utilisateur
  // ✅ SUPPRIMÉ : isThemeDropdownOpen n'est plus nécessaire (thème switcher simplifié)
  const [isQuickActionsDropdownOpen, setIsQuickActionsDropdownOpen] =
    useState(false); // ✅ État pour le dropdown des actions rapides
  const [dataSourceActionLoading, setDataSourceActionLoading] = useState<
    "generate" | "clear" | null
  >(null);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    dashboard: true,
    security: true,
    emails: true,
    admin: true,
    mobile: true,
    dev: true,
    cleanup: false,
  });

  const prefetchInternalRoute = useCallback(
    (href?: string, external?: boolean) => {
      if (!href || external || !href.startsWith("/")) return;
      router.prefetch(href);
    },
    [router],
  );

  // Charger l'état des sections (et items dépliables) depuis localStorage, en fusionnant avec les défauts
  useEffect(() => {
    const savedSections = localStorage.getItem("expandedSections");
    const defaults: Record<string, boolean> = {
      dashboard: true,
      security: true,
      emails: true,
      admin: true,
      mobile: true,
      dev: true,
      cleanup: false,
    };
    if (savedSections) {
      try {
        const parsed = JSON.parse(savedSections) as Record<string, boolean>;
        setExpandedSections({ ...defaults, ...parsed });
      } catch (error) {
        console.error("Erreur chargement état sections:", error);
        setExpandedSections(defaults);
      }
    }
  }, []);

  // ✅ Charger l'état du drawer depuis localStorage au démarrage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("sidebarCollapsed");
      if (savedState !== null) {
        setIsSidebarCollapsed(savedState === "true");
      } else {
        // Par défaut, le drawer est visible sur desktop (false = visible)
        setIsSidebarCollapsed(false);
        localStorage.setItem("sidebarCollapsed", "false");
      }
    }
  }, []);

  // ✅ Fermer la sidebar sur mobile quand on change de page
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Auto-expand sections qui contiennent l'élément actif (seulement si pas explicitement fermé)
  useEffect(() => {
    // Ne pas auto-expand si l'utilisateur a fermé des sections
    const hasUserInteracted = Object.values(expandedSections).some(
      (expanded) => expanded === false,
    );

    if (!hasUserInteracted) {
      const newExpandedSections = { ...expandedSections };

      sections.forEach((section) => {
        if (isSectionActive(section) && section.isCollapsible) {
          newExpandedSections[section.id] = true;
        }
      });

      if (
        JSON.stringify(newExpandedSections) !== JSON.stringify(expandedSections)
      ) {
        setExpandedSections(newExpandedSections);
        localStorage.setItem(
          "expandedSections",
          JSON.stringify(newExpandedSections),
        );
      }
    }
  }, [pathname, expandedSections]);

  // Sauvegarder l'état des sections dans localStorage
  const toggleSection = (sectionId: string) => {
    const newExpandedSections = {
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId],
    };
    setExpandedSections(newExpandedSections);
    localStorage.setItem(
      "expandedSections",
      JSON.stringify(newExpandedSections),
    );
  };

  /** Générer les données de test (suivi intérim, candidatures, etc.) puis recharger la page (URL conservée). */
  const handleGenerateTestData = async () => {
    if (!token) {
      alert("Non connecté. Connectez-vous pour utiliser cette action.");
      return;
    }
    setDataSourceActionLoading("generate");
    setIsQuickActionsDropdownOpen(false);
    try {
      const res = await fetch(
        `${BACKOFFICE_API_URL}/api/v1/admin/generate-test-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ preset: "standard", clean: false }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showAdminActionFeedback(
          typeof data.message === "string"
            ? data.message
            : "Données de test générées.",
        );
        router.refresh();
      } else {
        alert(data?.error || `Erreur ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      alert(
        "Erreur réseau. Vérifiez que la gateway et les services sont démarrés.",
      );
    } finally {
      setDataSourceActionLoading(null);
    }
  };

  /** Revenir à la base propre (supprimer uniquement les données de test) puis recharger la page (URL conservée). */
  const handleClearTestData = async () => {
    if (!token) {
      alert("Non connecté. Connectez-vous pour utiliser cette action.");
      return;
    }
    if (
      !confirm(
        "Supprimer uniquement les données de test (isTestData=true) ? La base principale ne sera pas modifiée.",
      )
    ) {
      return;
    }
    setDataSourceActionLoading("clear");
    setIsQuickActionsDropdownOpen(false);
    try {
      const res = await fetch(
        `${BACKOFFICE_API_URL}/api/v1/admin/clear-test-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ onlyTestData: true }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        showAdminActionFeedback(
          typeof data.message === "string"
            ? data.message
            : "Données de test supprimées.",
        );
        router.refresh();
      } else {
        alert(data?.error || `Erreur ${res.status}: ${res.statusText}`);
      }
    } catch (e) {
      alert(
        "Erreur réseau. Vérifiez que la gateway et les services sont démarrés.",
      );
    } finally {
      setDataSourceActionLoading(null);
    }
  };

  const isSectionActive = (section: NavSection) =>
    section.items.some((item) => navItemMatchesPath(pathname, item));

  const getActiveItemInSection = (section: NavSection) =>
    section.items.find((item) => navItemMatchesPath(pathname, item));

  const sections: NavSection[] = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: "📊",
      isCollapsible: true,
      items: [
        { name: "Vue d'ensemble", href: "/backoffice", icon: "📊" },
        {
          name: "Performances",
          href: "/backoffice/performances",
          icon: "📉",
          subItems: [
            { name: "Synthèse", href: "/backoffice/performances", icon: "📊" },
            {
              name: "CPU & Mémoire",
              href: "/backoffice/performances/cpu-memory",
              icon: "🖥️",
            },
            {
              name: "Temps de réponse",
              href: "/backoffice/performances/latency",
              icon: "⏱️",
            },
            {
              name: "Conteneurs",
              href: "/backoffice/performances/containers",
              icon: "🐳",
            },
            {
              name: "Disque",
              href: "/backoffice/performances/disk",
              icon: "💽",
            },
            {
              name: "Réseau (détail)",
              href: "/backoffice/performances/network",
              icon: "🌐",
            },
            {
              name: "Corrélation",
              href: "/backoffice/performances/correlation",
              icon: "🧩",
            },
          ],
        },
        {
          name: "Statistiques",
          href: "/backoffice/statistics",
          icon: "📈",
          subItems: [
            {
              name: "Vue d’ensemble",
              href: "/backoffice/statistics",
              icon: "📊",
            },
            {
              name: "App data",
              href: "/backoffice/statistics/app-data",
              icon: "📦",
            },
            {
              name: "Sécurité",
              href: "/backoffice/statistics/security",
              icon: "🛡️",
            },
            {
              name: "Logs (stats)",
              href: "/backoffice/statistics/log-stats",
              icon: "📜",
            },
          ],
        },
        {
          name: "Analytics",
          href: "/backoffice/analytics",
          icon: "⚡",
          subItems: [
            {
              name: "Application",
              href: "/backoffice/analytics/application/performance",
              icon: "📱",
              subItems: [
                {
                  name: "Performances live",
                  href: "/backoffice/analytics/application/performance",
                  icon: "📊",
                },
                {
                  name: "Activité & traces",
                  href: "/backoffice/analytics/application/activity",
                  icon: "👣",
                },
                {
                  name: "Retours & signalements",
                  href: "/backoffice/analytics/application/feedback",
                  icon: "✉️",
                },
              ],
            },
            {
              name: "Analytics utilisateur",
              href: "/backoffice/user-analytics",
              icon: "👤",
            },
          ],
        },
      ],
    },
    {
      id: "security",
      label: "Sécurité",
      icon: "🔒",
      isCollapsible: true,
      items: [
        {
          name: "Vue d’ensemble sécurité",
          href: "/backoffice/security",
          icon: "🛡️",
        },
        { name: "Analyse", href: "/backoffice/security/analysis", icon: "📊" },
        {
          name: "Logs de sécurité",
          href: "/backoffice/security/logs",
          icon: "📋",
        },
        {
          name: "Incidents & menaces",
          href: "/backoffice/security/incidents",
          icon: "🚨",
        },
        { name: "Firewall", href: "/backoffice/security/firewall", icon: "🔥" },
        { name: "Réseau", href: "/backoffice/security/network", icon: "🌐" },
        {
          name: "Alertes email",
          href: "/backoffice/security/alerts",
          icon: "📧",
        },
        {
          name: "Politiques",
          href: "/backoffice/security/policies",
          icon: "⚙️",
        },
      ],
    },
    {
      id: "jobsearch",
      label: "Recherche emploi",
      icon: "📬",
      isCollapsible: false,
      items: [{ name: "Agent email", href: "/agent", icon: "📬" }],
    },
    {
      id: "admin",
      label: "Administration",
      icon: "⚙️",
      isCollapsible: true,
      items: [
        {
          name: "Gestion des services",
          href: "/backoffice/services",
          icon: "🔧",
          subItems: [
            {
              name: "Liste des services",
              href: "/backoffice/services",
              icon: "📋",
            },
            {
              name: "Services & Logs",
              href: "/backoffice/services/logs",
              icon: "📜",
            },
          ],
        },
        {
          name: "Gestion des données",
          href: "/backoffice/datas",
          icon: "💾",
          subItems: [
            {
              name: "Données applicatives",
              href: "/backoffice/datas",
              icon: "📋",
            },
            {
              name: "Suivi intérim",
              href: "/backoffice/suivi-interim",
              icon: "👔",
            },
            {
              name: "Stats utilisateur",
              href: "/backoffice/user-stats",
              icon: "📊",
            },
            {
              name: "Abonnement & facturation",
              href: "/backoffice/billing",
              icon: "📄",
            },
            {
              name: "Données de test",
              href: "/backoffice/test-data",
              icon: "🎲",
            },
            { name: "Archives", href: "/backoffice/archives", icon: "📦" },
            { name: "Corbeille", href: "/backoffice/trash", icon: "🗑️" },
          ],
        },
        { name: "Utilisateurs", href: "/backoffice/users", icon: "👥" },
      ],
    },
    {
      id: "mobile",
      label: "Mobile",
      icon: "📱",
      isCollapsible: true,
      items: [
        {
          name: "Mobile — erreurs & retours",
          href: "/backoffice/mobile/logs",
          icon: "🐞",
        },
        {
          name: "Mobile — releases OTA",
          href: "/backoffice/mobile/releases",
          icon: "🚀",
        },
        {
          name: "Émulateur mobile",
          href: "/backoffice/mobile-emulator",
          icon: "📲",
        },
      ],
    },
    {
      id: "pilotage",
      label: "Pilotage",
      icon: "🧭",
      isCollapsible: false,
      items: [
        {
          name: "Suivi des tâches",
          href: "/backoffice/pilotage",
          icon: "🧭",
        },
      ],
    },
    {
      id: "dev",
      label: "Développement",
      icon: "🛠️",
      isCollapsible: true,
      items: [
        {
          name: "Testeur d’API (manuel)",
          href: "/backoffice/api-tester",
          icon: "🧪",
        },
        { name: "Données de test", href: "/backoffice/test-data", icon: "🎲" },
        {
          name: "Tests",
          href: "/backoffice/tests",
          icon: "🧪",
          subItems: [
            { name: "Vue d'ensemble", href: "/backoffice/tests", icon: "📋" },
            {
              name: "Automatisés",
              icon: "🤖",
              sectionLabel: true,
            },
            {
              name: "Tests Playwright",
              href: "/backoffice/playwright-tests",
              icon: "🎭",
            },
            { name: "Tests API", href: "/backoffice/tests-api", icon: "🔌" },
            {
              name: "Tests Backend",
              href: "/backoffice/tests-backend",
              icon: "🗄️",
            },
            {
              name: "Tests Frontend",
              href: "/backoffice/tests-frontend",
              icon: "💻",
            },
            {
              name: "Tests Backoffice",
              href: "/backoffice/tests-backoffice",
              icon: "🛡️",
            },
            {
              name: "Sécurité & charge",
              icon: "🔒",
              sectionLabel: true,
            },
            {
              name: "Tests Sécurité",
              href: "/backoffice/tests-security",
              icon: "🔒",
            },
            {
              name: "Tests Performance",
              href: "/backoffice/performance-tests",
              icon: "⚡",
            },
            {
              name: "Programmer tests",
              href: "/backoffice/performance-tests/schedule",
              icon: "📅",
            },
          ],
        },
        {
          name: "Rapports",
          href: "/backoffice/test-reports",
          icon: "📊",
          subItems: [
            {
              name: "Rapports de tests",
              href: "/backoffice/test-reports",
              icon: "📊",
            },
            {
              name: "Rapports de parcours",
              href: "/backoffice/user-journey/reports",
              icon: "📄",
            },
          ],
        },
        {
          name: "Parcours utilisateur",
          href: "/backoffice/user-journey",
          icon: "🚶",
          subItems: [
            {
              name: "Parcours prédéfinis",
              href: "/backoffice/user-journey",
              icon: "📋",
            },
            {
              name: "Parcours personnalisé",
              href: "/backoffice/user-journey/custom",
              icon: "🎯",
            },
          ],
        },
      ],
    },
    {
      id: "emails",
      label: "Gestion des emails",
      icon: "📧",
      isCollapsible: true,
      items: [
        { name: "Dashboard", href: "/backoffice/emails", icon: "📊" },
        {
          name: "Email Monitor",
          href: "/backoffice/email-monitor",
          icon: "📈",
        },
        { name: "Templates", href: "/backoffice/emails/templates", icon: "📝" },
        {
          name: "Configuration",
          href: "/backoffice/emails/settings",
          icon: "⚙️",
        },
        {
          name: "Déliverabilité",
          href: "/backoffice/emails/deliverability",
          icon: "✅",
        },
        {
          name: "MailHog (interface)",
          href: "/backoffice/emails/mailhog",
          icon: "📬",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <style jsx>{`
        /* Effet de survol amélioré */
        .nav-item-hover {
          transition: all 0.2s ease;
        }

        .nav-item-hover:hover {
          transform: translateX(4px);
        }

        /* Indicateur de section active */
        .section-active {
          position: relative;
        }

        .section-active::before {
          content: "";
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 4px;
          height: 60%;
          background: linear-gradient(180deg, #3b82f6, #1d4ed8);
          border-radius: 2px;
        }
      `}</style>
      <style jsx global>{`
        html,
        body {
          overflow-x: hidden;
        }
      `}</style>
      <div className="min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950 transition-colors">
        {/* ✅ Overlay mobile - Ferme la sidebar quand on clique dessus */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar - Cachée sur mobile, peut être cachée sur desktop */}
        <div
          className={`
          fixed inset-y-0 left-0 w-72 md:w-80 bg-white dark:bg-gray-900 flex flex-col shadow-xl border-r border-gray-200 dark:border-gray-800 z-50 transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isSidebarCollapsed ? "lg:-translate-x-full lg:pointer-events-none lg:opacity-0" : "lg:pointer-events-auto lg:opacity-100"}
        `}
        >
          {/* Logo avec bouton de fermeture sur mobile */}
          <div className="flex h-16 items-center justify-between px-4 bg-gray-100 dark:bg-gray-800 flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
            <BackofficeLink
              href="/backoffice"
              prefetch={false}
              onMouseEnter={() => prefetchInternalRoute("/backoffice")}
              onFocus={() => prefetchInternalRoute("/backoffice")}
              className="flex min-w-0 items-center gap-2 text-xl lg:text-2xl font-bold text-gray-900 dark:text-white"
            >
              <Image
                src="/brand/jobbingtrack-logo.png"
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 flex-shrink-0 rounded-xl"
                priority
              />
              <span className="truncate">JobbingTrack</span>
            </BackofficeLink>
            {/* Bouton fermer visible uniquement sur mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2"
              aria-label="Fermer le menu"
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

          {/* Navigation - Scrollable */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
            {sections.map((section) => {
              const showSectionItems =
                !section.isCollapsible ||
                isSectionActive(section) ||
                expandedSections[section.id] !== false;
              return (
                <div key={section.id} className="mb-4">
                  {/* Section Header - Cliquable */}
                  <button
                    onClick={() =>
                      section.isCollapsible && toggleSection(section.id)
                    }
                    className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider mb-1 relative transition-all
                    ${
                      isSectionActive(section)
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-600/30 dark:shadow-blue-400/30 border-l-4 border-blue-600 dark:border-blue-400 section-active nav-item-active"
                        : section.isCollapsible
                          ? "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer nav-item-hover"
                          : "text-gray-500 dark:text-gray-600 cursor-default"
                    }
                  `}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base transition-all">
                        {section.icon}
                      </span>
                      <span
                        className={`transition-all ${isSectionActive(section) ? "font-bold" : ""}`}
                      >
                        {section.label}
                      </span>
                    </div>
                    {section.isCollapsible && (
                      <span
                        className={`transform transition-transform ${showSectionItems ? "rotate-90" : ""}`}
                      >
                        ▶
                      </span>
                    )}
                  </button>

                  {/* Section Items : ouvert si la section est active (sous-route) ou si l’utilisateur n’a pas replié explicitement à false */}
                  {showSectionItems && (
                    <div className="pl-4 space-y-1 border-l border-gray-200 dark:border-gray-700 ml-2">
                      {section.items.map((item) => {
                        const isActive = !!(
                          item.href &&
                          !item.external &&
                          pathname === item.href
                        );
                        const hasSubItems = !!(
                          item.subItems && item.subItems.length > 0
                        );
                        const isSubItemActive =
                          hasSubItems &&
                          item.subItems!.some((sub) =>
                            navItemMatchesPath(pathname, sub),
                          );
                        const itemKey = `item-${item.name}-${section.id}`;
                        const routeNeedsSubmenuOpen =
                          hasSubItems && (isSubItemActive || isActive);
                        const showItemSubItems =
                          hasSubItems &&
                          (routeNeedsSubmenuOpen ||
                            expandedSections[itemKey] !== false);
                        const activeItem = getActiveItemInSection(section);

                        const content = (
                          <>
                            {/* Indicateur visuel pour l'élément actif */}
                            {(isActive || isSubItemActive) && (
                              <>
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-500 dark:bg-blue-400 rounded-r-full"></div>
                                <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-600 dark:bg-blue-300 rounded-full opacity-75"></div>
                              </>
                            )}

                            {/* Indicateur pour l'élément actif dans la section */}
                            {activeItem &&
                              item.name === activeItem.name &&
                              !isActive &&
                              !isSubItemActive && (
                                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-blue-500 dark:bg-blue-400 rounded-r-full opacity-50"></div>
                              )}

                            <span
                              className={`mr-3 text-base transition-all ${isActive ? "" : "group-hover:scale-110"}`}
                            >
                              {item.icon}
                            </span>
                            <span
                              className={`truncate transition-all ${isActive || isSubItemActive ? "font-bold" : ""}`}
                            >
                              {item.name}
                            </span>

                            {/* Badge pour l'élément actif */}
                            {(isActive || isSubItemActive) && (
                              <div className="ml-auto">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              </div>
                            )}
                          </>
                        );

                        return (
                          <div key={item.name} className="space-y-1">
                            {item.onClick ? (
                              <button
                                onClick={item.onClick}
                                className={`
                                flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative group w-full text-left
                                ${
                                  isActive || isSubItemActive
                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white shadow-xl shadow-blue-600/60 dark:shadow-blue-500/60 border-l-4 border-blue-300 dark:border-blue-200 transform scale-[1.02] nav-item-active"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white hover:translate-x-1 nav-item-hover"
                                }
                              `}
                              >
                                {content}
                              </button>
                            ) : item.href ? (
                              <div>
                                <div className="flex items-center">
                                  <BackofficeLink
                                    href={item.href}
                                    prefetch={false}
                                    onMouseEnter={() =>
                                      prefetchInternalRoute(
                                        item.href,
                                        item.external,
                                      )
                                    }
                                    onFocus={() =>
                                      prefetchInternalRoute(
                                        item.href,
                                        item.external,
                                      )
                                    }
                                    className={`
                                    flex-1 flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative group
                                    ${
                                      isActive || isSubItemActive
                                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl shadow-blue-600/60 border-l-4 border-blue-300 transform scale-[1.02] nav-item-active"
                                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white hover:translate-x-1 nav-item-hover"
                                    }
                                  `}
                                  >
                                    {content}
                                  </BackofficeLink>
                                  {hasSubItems && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSection(itemKey);
                                      }}
                                      className={`ml-1 px-2 py-2 rounded text-gray-600 hover:text-gray-950 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 transition-all ${
                                        showItemSubItems
                                          ? "text-gray-950 bg-gray-100 dark:text-white dark:bg-gray-700"
                                          : ""
                                      }`}
                                      aria-label="Expander les sous-items"
                                    >
                                      <span
                                        className={`transform transition-transform ${showItemSubItems ? "rotate-90" : ""}`}
                                      >
                                        ▶
                                      </span>
                                    </button>
                                  )}
                                </div>
                                {/* Sous-items (retrait supplémentaire sous l'item parent) */}
                                {hasSubItems && showItemSubItems && (
                                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-300 dark:border-gray-700 pl-3">
                                    {(item.subItems ?? []).map((subItem) => {
                                      if (subItem.sectionLabel) {
                                        return (
                                          <div
                                            key={subItem.name}
                                            className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 select-none"
                                          >
                                            {subItem.icon ? (
                                              <span className="mr-1 normal-case">
                                                {subItem.icon}
                                              </span>
                                            ) : null}
                                            {subItem.name}
                                          </div>
                                        );
                                      }
                                      const isSubActive =
                                        !subItem.external &&
                                        navItemMatchesPath(pathname, subItem);
                                      const linkClass = `
                                          flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative group
                                          ${
                                            isSubActive
                                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 border-l-2 border-blue-300 transform scale-[1.01]"
                                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white hover:translate-x-1"
                                          }
                                        `;
                                      return subItem.href ? (
                                        subItem.external ? (
                                          <a
                                            key={subItem.name}
                                            href={subItem.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={linkClass}
                                          >
                                            <span className="mr-2 text-sm">
                                              {subItem.icon}
                                            </span>
                                            <span>{subItem.name}</span>
                                          </a>
                                        ) : (
                                          <BackofficeLink
                                            key={subItem.name}
                                            href={subItem.href}
                                            prefetch={false}
                                            onMouseEnter={() =>
                                              prefetchInternalRoute(
                                                subItem.href,
                                                subItem.external,
                                              )
                                            }
                                            onFocus={() =>
                                              prefetchInternalRoute(
                                                subItem.href,
                                                subItem.external,
                                              )
                                            }
                                            className={linkClass}
                                          >
                                            <span className="mr-2 text-sm">
                                              {subItem.icon}
                                            </span>
                                            <span>{subItem.name}</span>
                                            {isSubActive && (
                                              <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
                                            )}
                                          </BackofficeLink>
                                        )
                                      ) : null;
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User info - Toujours en bas */}
          <div className="border-t border-gray-200 bg-white dark:border-gray-900 dark:bg-gray-950 flex-shrink-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onMouseEnter={() =>
                    user?.id &&
                    prefetchInternalRoute(`/backoffice/users/${user.id}`)
                  }
                  onFocus={() =>
                    user?.id &&
                    prefetchInternalRoute(`/backoffice/users/${user.id}`)
                  }
                  onClick={() => {
                    if (user?.id) {
                      router.push(`/backoffice/users/${user.id}`);
                    }
                  }}
                  className="flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors cursor-pointer"
                  title="Voir le profil"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {user?.role}
                    </p>
                  </div>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={logout}
                  className="text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Déconnexion"
                >
                  🚪
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content - Pas de marge sur mobile, marge sur desktop si drawer visible */}
        <div
          className={`overflow-x-hidden transition-all duration-300 ${isSidebarCollapsed ? "lg:ml-0" : "lg:ml-72"}`}
        >
          {/* Top bar */}
          <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 shadow-md dark:shadow-gray-900/50 border-b border-gray-200 dark:border-gray-800 transition-colors">
            <div
              className={`flex h-16 items-center justify-between px-4 lg:px-8 ${isSidebarCollapsed ? "" : "lg:pl-12"}`}
            >
              {/* Section gauche - Navigation et titre */}
              <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
                {/* ✅ Bouton hamburger pour mobile */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="lg:hidden text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
                  aria-label="Toggle menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isSidebarOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>

                {/* ✅ Bouton toggle pour afficher/masquer le drawer sur desktop - TOUJOURS VISIBLE */}
                <button
                  onClick={() => {
                    const newState = !isSidebarCollapsed;
                    setIsSidebarCollapsed(newState);
                    localStorage.setItem("sidebarCollapsed", String(newState));
                  }}
                  className="hidden lg:flex items-center justify-center w-10 h-10 text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-all p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0 border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md"
                  aria-label="Toggle sidebar"
                  title={
                    isSidebarCollapsed
                      ? "Afficher le menu de navigation"
                      : "Masquer le menu de navigation"
                  }
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    {isSidebarCollapsed ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    )}
                  </svg>
                </button>

                {/* Titre retiré - Plus de texte "Backoffice Administrateur" ou "Backoffice" */}
              </div>

              {/* Section centrale - Recherche globale - Prend toute la place disponible */}
              <div className="hidden sm:flex flex-1 min-w-0 mx-4 lg:mx-6 items-center gap-2">
                <GlobalSearch className="w-full min-w-0" />
                <BackofficeRefreshControls variant="icon" />
              </div>

              {/* Section droite - Actions et contrôles */}
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0 min-w-0">
                {/* Email - Cliquable pour ouvrir le menu rapide - Caché sur petits écrans moyens */}
                <button
                  onClick={() => setIsQuickMenuOpen(true)}
                  className="hidden lg:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Menu rapide utilisateur"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </div>
                  <span className="max-w-32 truncate">{user?.email}</span>
                </button>

                {/* Settings Button - Plus d'espace */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Paramètres"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="hidden md:inline text-sm font-medium text-gray-700 dark:text-gray-300">
                    Paramètres
                  </span>
                </button>

                {/* Quick Actions Dropdown */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setIsQuickActionsDropdownOpen(!isQuickActionsDropdownOpen)
                    }
                    className="px-3 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1.5 sm:gap-2 text-sm font-medium"
                    title="Actions rapides"
                  >
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Actions</span>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isQuickActionsDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsQuickActionsDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                        <button
                          onMouseEnter={() =>
                            prefetchInternalRoute("/backoffice/analytics")
                          }
                          onFocus={() =>
                            prefetchInternalRoute("/backoffice/analytics")
                          }
                          onClick={() => {
                            router.push("/backoffice/analytics");
                            setIsQuickActionsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span>Analytics</span>
                        </button>
                        <button
                          onMouseEnter={() =>
                            prefetchInternalRoute("/backoffice/statistics")
                          }
                          onFocus={() =>
                            prefetchInternalRoute("/backoffice/statistics")
                          }
                          onClick={() => {
                            router.push("/backoffice/statistics");
                            setIsQuickActionsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <Database className="h-4 w-4 text-purple-600" />
                          <span>Statistiques</span>
                        </button>
                        <button
                          onMouseEnter={() => prefetchInternalRoute("/search")}
                          onFocus={() => prefetchInternalRoute("/search")}
                          onClick={() => {
                            router.push("/search");
                            setIsQuickActionsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <Activity className="h-4 w-4 text-orange-600" />
                          <span>Recherche</span>
                        </button>
                        <button
                          onMouseEnter={() =>
                            prefetchInternalRoute("/backoffice/services")
                          }
                          onFocus={() =>
                            prefetchInternalRoute("/backoffice/services")
                          }
                          onClick={() => {
                            router.push("/backoffice/services");
                            setIsQuickActionsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                        >
                          <Server className="h-4 w-4 text-green-600" />
                          <span>Services</span>
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <BackofficeRefreshControls variant="menu" />
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                          onClick={handleGenerateTestData}
                          disabled={!!dataSourceActionLoading}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                          title="Génère des données de test (agences intérim, candidatures, etc.) puis recharge la page"
                        >
                          <FlaskConical className="h-4 w-4 text-amber-600" />
                          <span>Générer données de test (suivi intérim…)</span>
                        </button>
                        <button
                          onClick={handleClearTestData}
                          disabled={!!dataSourceActionLoading}
                          className="w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50"
                          title="Supprime uniquement les données de test puis recharge la page"
                        >
                          <Eraser className="h-4 w-4 text-red-500" />
                          <span>Revenir à la base propre</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* ✅ NOUVEAU : Thème switcher simplifié - juste le logo qui change */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-10 h-10 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={
                    actualTheme === "dark"
                      ? "Passer en mode clair"
                      : "Passer en mode sombre"
                  }
                >
                  <span className="text-2xl">
                    {actualTheme === "dark" ? "🌙" : "☀️"}
                  </span>
                </button>
              </div>
            </div>

            {/* Barre de recherche mobile - Seulement sur très petits écrans */}
            <div className="sm:hidden px-4 pb-3">
              <GlobalSearch className="w-full" />
            </div>
          </div>

          {/* Page content - Padding adapté pour mobile avec espacement supplémentaire si drawer visible */}
          <main
            className={`backoffice-content overflow-x-hidden p-4 lg:p-8 bg-gray-100 dark:bg-gray-950 min-h-[calc(100vh-4rem)] transition-colors ${isSidebarCollapsed ? "" : "lg:pl-12"}`}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Popup des paramètres */}
      <SettingsPopup
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Menu rapide utilisateur */}
      <QuickMenuPopup
        isOpen={isQuickMenuOpen}
        onClose={() => setIsQuickMenuOpen(false)}
        onSelectProfile={() => {
          if (user?.id) {
            router.push(`/backoffice/users/${user.id}`);
          }
          setIsQuickMenuOpen(false);
        }}
        onSelectSettings={() => setIsSettingsOpen(true)}
      />

      <AdminActionToast />
    </div>
  );
}
