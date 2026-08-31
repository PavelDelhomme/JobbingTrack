import {
  BACKOFFICE_DOCUMENT_TITLES,
  resolveBackofficeDocumentTitle,
} from "./backofficeDocumentTitles";

export const APP_NAME = "JobbingTrack";

/** Titres exacts par chemin (sans query string) — hors backoffice (voir backofficeDocumentTitles). */
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

  // Admin legacy routes (hors /backoffice)
  "/analytics": "Analytics",
  "/statistics": "Statistiques",
  "/archives": "Archives",
  "/trash": "Corbeille",
  "/search": "Recherche",
  "/notifications": "Notifications",
  "/deployments": "Déploiements",
  "/backoffice/maintenance": "Maintenance services",
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
    title: "Recherche emploi / Candidatures / Détail",
  },
  {
    test: /^\/applications\/applications\/[^/]+$/,
    title: "Détail candidature",
  },
  { test: /^\/backoffice\/companies\/[^/]+$/, title: "Recherche emploi / Entreprises / Détail" },
  { test: /^\/entities\/companies\/[^/]+$/, title: "Détail entreprise" },
  { test: /^\/backoffice\/users\/[^/]+$/, title: "Administration / Utilisateurs / Détail" },
  { test: /^\/entities\/calls\/[^/]+$/, title: "Détail appel" },
  {
    test: /^\/backoffice\/services\/[^/]+$/,
    title: "Administration / Services / Détail service",
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
    title: "Sécurité / Menaces / Détail",
  },
  {
    test: /^\/backoffice\/security\/incidents\/alert\/[^/]+$/,
    title: "Sécurité / Incidents / Détail alerte",
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

  const backofficeTitle = resolveBackofficeDocumentTitle(path);
  if (backofficeTitle) return backofficeTitle;

  const exact = PAGE_TITLE_BY_PATH[path];
  if (exact) return exact;

  for (const rule of DYNAMIC_TITLE_RULES) {
    if (rule.test.test(path)) return rule.title;
  }

  return humanizePath(path);
}

export { BACKOFFICE_DOCUMENT_TITLES };

export function formatDocumentTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed || trimmed === APP_NAME) return APP_NAME;
  return `${trimmed} | ${APP_NAME}`;
}
