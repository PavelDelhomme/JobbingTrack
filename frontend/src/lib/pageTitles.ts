export const APP_NAME = "JobbingTrack";

/** Titres exacts par chemin (sans query string). */
export const PAGE_TITLE_BY_PATH: Record<string, string> = {
  "/": "Accueil",

  // Public / auth
  "/login": "Connexion",
  "/register": "Inscription",
  "/forgot-password": "Mot de passe oublié",
  "/access-denied": "Accès refusé",
  "/verify-email": "Vérification email",

  // Agent & candidatures (utilisateur)
  "/agent": "Agent email",
  "/applications/applications": "Mes candidatures",
  "/entities/companies": "Entreprises",
  "/entities/contacts": "Contacts",
  "/entities/calls": "Appels",
  "/entities/events": "Événements",
  "/entities/followups": "Relances",
  "/entities/interviews": "Entretiens",
  "/entities/users": "Utilisateurs",

  // Backoffice — hub
  "/backoffice": "Vue d'ensemble",

  // Performances
  "/backoffice/performances": "Performances — Synthèse",
  "/backoffice/performances/cpu-memory": "Performances — CPU & Mémoire",
  "/backoffice/performances/latency": "Performances — Temps de réponse",
  "/backoffice/performances/containers": "Performances — Conteneurs",
  "/backoffice/performances/disk": "Performances — Disque",
  "/backoffice/performances/network": "Performances — Réseau",
  "/backoffice/performances/correlation": "Performances — Corrélation",
  "/backoffice/performances/correlation/containers":
    "Performances — Signaux conteneurs",

  // Statistiques
  "/backoffice/statistics": "Statistiques — Vue d'ensemble",
  "/backoffice/statistics/app-data": "Statistiques — App data",
  "/backoffice/statistics/security": "Statistiques — Sécurité",
  "/backoffice/statistics/log-stats": "Statistiques — Logs",
  "/backoffice/statistique": "Statistiques",

  // Analytics
  "/backoffice/analytics": "Analytics",
  "/backoffice/analytics/application": "Analytics — Application",
  "/backoffice/analytics/application/performance":
    "Analytics — Performances live",
  "/backoffice/analytics/application/activity":
    "Analytics — Activité & traces",
  "/backoffice/analytics/application/feedback":
    "Analytics — Retours & signalements",
  "/backoffice/administration/mobile-logs":
    "Administration — Mobile erreurs & retours",
  "/backoffice/analytics/containers": "Analytics — Conteneurs",
  "/backoffice/analytics/network": "Analytics — Réseau",
  "/backoffice/analytics/performances": "Analytics — Performances infra",
  "/backoffice/user-analytics": "Analytics utilisateur",

  // Sécurité
  "/backoffice/security": "Sécurité — Vue d'ensemble",
  "/backoffice/security/analysis": "Sécurité — Analyse",
  "/backoffice/security/logs": "Sécurité — Logs",
  "/backoffice/security/incidents": "Sécurité — Incidents & menaces",
  "/backoffice/security/investigation": "Sécurité — Investigation",
  "/backoffice/security/firewall": "Sécurité — Firewall",
  "/backoffice/security/network": "Sécurité — Réseau",
  "/backoffice/security/alerts": "Sécurité — Alertes email",
  "/backoffice/security/policies": "Sécurité — Politiques",
  "/backoffice/security/threats": "Sécurité — Menaces",

  // Recherche emploi (backoffice)
  "/backoffice/applications": "Candidatures",
  "/backoffice/companies": "Entreprises",
  "/backoffice/contacts": "Contacts",
  "/backoffice/calls": "Appels",
  "/backoffice/events": "Événements",
  "/backoffice/followups": "Relances",
  "/backoffice/interviews": "Entretiens",
  "/backoffice/search": "Recherche",

  // Administration
  "/backoffice/services": "Services — Liste",
  "/backoffice/services/logs": "Services & Logs",
  "/backoffice/services/service-logs": "Services — Logs détaillés",
  "/backoffice/datas": "Données applicatives",
  "/backoffice/suivi-interim": "Suivi intérim",
  "/backoffice/user-stats": "Stats utilisateur",
  "/backoffice/billing": "Abonnement & facturation",
  "/backoffice/test-data": "Données de test",
  "/backoffice/archives": "Archives",
  "/backoffice/trash": "Corbeille",
  "/backoffice/users": "Utilisateurs",
  "/backoffice/notifications": "Notifications",
  "/backoffice/data-management": "Gestion des données",

  // Emails
  "/backoffice/emails": "Emails — Dashboard",
  "/backoffice/email-monitor": "Email Monitor",
  "/backoffice/emails/templates": "Emails — Templates",
  "/backoffice/emails/settings": "Emails — Configuration",
  "/backoffice/emails/deliverability": "Emails — Déliverabilité",
  "/backoffice/emails/mailhog": "MailHog",
  "/backoffice/emails/logs": "Emails — Logs",

  // Développement / tests
  "/backoffice/api-tester": "Testeur d'API",
  "/backoffice/mobile-emulator": "Émulateur mobile",
  "/backoffice/tests": "Tests — Vue d'ensemble",
  "/backoffice/playwright-tests": "Tests Playwright",
  "/backoffice/tests-api": "Tests API",
  "/backoffice/tests-backend": "Tests Backend",
  "/backoffice/tests-frontend": "Tests Frontend",
  "/backoffice/tests-backoffice": "Tests Backoffice",
  "/backoffice/tests-security": "Tests Sécurité",
  "/backoffice/tests-performance": "Tests Performance",
  "/backoffice/performance-tests": "Tests Performance",
  "/backoffice/performance-tests/schedule": "Programmer tests",
  "/backoffice/test-reports": "Rapports de tests",
  "/backoffice/user-journey": "Parcours utilisateur",
  "/backoffice/user-journey/custom": "Parcours personnalisé",
  "/backoffice/user-journey/reports": "Rapports parcours",

  // Admin legacy routes (hors /backoffice)
  "/analytics": "Analytics",
  "/statistics": "Statistiques",
  "/archives": "Archives",
  "/trash": "Corbeille",
  "/search": "Recherche",
  "/notifications": "Notifications",
  "/deployments": "Déploiements",
  "/maintenance": "Maintenance",
  "/data-management": "Gestion des données",
  "/test-data": "Données de test",
  "/settings": "Paramètres",

  // Development zone
  "/tests/api-tester": "Testeur d'API",
  "/tests/performance": "Tests performance",
  "/tests/performance-backoffice": "Tests performance backoffice",
  "/tests/playwright": "Tests Playwright",
  "/tests/playwright-backoffice": "Tests Playwright backoffice",
  "/user-journey": "Parcours utilisateur",
  "/mobile-emulator": "Émulateur mobile",
  "/services/backoffice": "Services backoffice",
  "/services/applications": "Services applications",

  // Security zone (legacy)
  "/alerts/security-alerts": "Alertes sécurité",
  "/analysis/security-analysis": "Analyse sécurité",
  "/intrusions/security-intrusions": "Intrusions",
  "/vulnerabilities/security-vulnerabilities": "Vulnérabilités",
  "/data-generator/security-data-generator": "Générateur données sécurité",
  "/ddos/security-ddos": "Protection DDoS",
};

const DYNAMIC_TITLE_RULES: Array<{ test: RegExp; title: string }> = [
  { test: /^\/reset-password\//, title: "Réinitialisation mot de passe" },
  { test: /^\/docs\//, title: "Documentation" },
  {
    test: /^\/backoffice\/applications\/[^/]+$/,
    title: "Détail candidature",
  },
  {
    test: /^\/applications\/applications\/[^/]+$/,
    title: "Détail candidature",
  },
  { test: /^\/backoffice\/companies\/[^/]+$/, title: "Détail entreprise" },
  { test: /^\/entities\/companies\/[^/]+$/, title: "Détail entreprise" },
  { test: /^\/backoffice\/users\/[^/]+$/, title: "Détail utilisateur" },
  { test: /^\/entities\/calls\/[^/]+$/, title: "Détail appel" },
  {
    test: /^\/backoffice\/services\/[^/]+$/,
    title: "Détail service",
  },
  {
    test: /^\/services\/backoffice\/[^/]+$/,
    title: "Détail service backoffice",
  },
  {
    test: /^\/services\/applications\/[^/]+$/,
    title: "Détail service application",
  },
  {
    test: /^\/backoffice\/security\/threats\/[^/]+$/,
    title: "Détail menace",
  },
  {
    test: /^\/backoffice\/security\/incidents\/alert\/[^/]+$/,
    title: "Détail alerte",
  },
];

const SEGMENT_LABELS: Record<string, string> = {
  backoffice: "Backoffice",
  performances: "Performances",
  statistics: "Statistiques",
  security: "Sécurité",
  analytics: "Analytics",
  emails: "Emails",
  services: "Services",
  tests: "Tests",
  entities: "Entités",
  applications: "Candidatures",
};

function normalizePath(pathname: string): string {
  const base = pathname.split("?")[0]?.split("#")[0] || "/";
  if (base.length > 1 && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base || "/";
}

function humanizeSegment(segment: string): string {
  if (!segment || segment.startsWith("[")) return APP_NAME;
  const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

function humanizePath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return APP_NAME;
  const last = segments[segments.length - 1];
  if (SEGMENT_LABELS[last]) return SEGMENT_LABELS[last];
  return humanizeSegment(last);
}

export function resolvePageTitle(pathname: string): string {
  const path = normalizePath(pathname);

  const exact = PAGE_TITLE_BY_PATH[path];
  if (exact) return exact;

  for (const rule of DYNAMIC_TITLE_RULES) {
    if (rule.test.test(path)) return rule.title;
  }

  return humanizePath(path);
}

export function formatDocumentTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed === APP_NAME) return APP_NAME;
  return `${trimmed} | ${APP_NAME}`;
}
