/** Racine affichée dans l’onglet navigateur pour le hub backoffice. */
export const BACKOFFICE_HUB_LABEL = "Tableau de bord";

/**
 * Fil d’Ariane backoffice (sans le suffixe « | JobbingTrack »).
 * Clé = pathname normalisé (sans query).
 */
export const BACKOFFICE_DOCUMENT_TITLES: Record<string, string> = {
  "/backoffice": `${BACKOFFICE_HUB_LABEL} / Vue d'ensemble`,

  // — Tableau de bord : Performances
  "/backoffice/performances": `${BACKOFFICE_HUB_LABEL} / Performances / Synthèse`,
  "/backoffice/performances/cpu-memory": `${BACKOFFICE_HUB_LABEL} / Performances / CPU & Mémoire`,
  "/backoffice/performances/latency": `${BACKOFFICE_HUB_LABEL} / Performances / Temps de réponse`,
  "/backoffice/performances/containers": `${BACKOFFICE_HUB_LABEL} / Performances / Conteneurs`,
  "/backoffice/performances/disk": `${BACKOFFICE_HUB_LABEL} / Performances / Disque`,
  "/backoffice/performances/network": `${BACKOFFICE_HUB_LABEL} / Performances / Réseau (détail)`,
  "/backoffice/performances/correlation": `${BACKOFFICE_HUB_LABEL} / Performances / Corrélation / Incidents & logs`,
  "/backoffice/performances/correlation/containers": `${BACKOFFICE_HUB_LABEL} / Performances / Corrélation / Signaux conteneurs`,

  // — Tableau de bord : Statistiques
  "/backoffice/statistics": `${BACKOFFICE_HUB_LABEL} / Statistiques / Vue d'ensemble`,
  "/backoffice/statistics/app-data": `${BACKOFFICE_HUB_LABEL} / Statistiques / App data`,
  "/backoffice/statistics/security": `${BACKOFFICE_HUB_LABEL} / Statistiques / Sécurité`,
  "/backoffice/statistics/log-stats": `${BACKOFFICE_HUB_LABEL} / Statistiques / Logs (stats)`,
  "/backoffice/statistique": `${BACKOFFICE_HUB_LABEL} / Statistiques`,

  // — Tableau de bord : Analytics
  "/backoffice/analytics": `${BACKOFFICE_HUB_LABEL} / Analytics`,
  "/backoffice/analytics/application": `${BACKOFFICE_HUB_LABEL} / Analytics / Application`,
  "/backoffice/analytics/application/performance": `${BACKOFFICE_HUB_LABEL} / Analytics / Application / Performances live`,
  "/backoffice/analytics/application/activity": `${BACKOFFICE_HUB_LABEL} / Analytics / Application / Activité & traces`,
  "/backoffice/analytics/application/feedback": `${BACKOFFICE_HUB_LABEL} / Analytics / Application / Retours & signalements`,
  "/backoffice/analytics/containers": `${BACKOFFICE_HUB_LABEL} / Analytics / Conteneurs`,
  "/backoffice/analytics/network": `${BACKOFFICE_HUB_LABEL} / Analytics / Réseau`,
  "/backoffice/analytics/performances": `${BACKOFFICE_HUB_LABEL} / Analytics / Performances infra`,
  "/backoffice/user-analytics": `${BACKOFFICE_HUB_LABEL} / Analytics utilisateur`,

  // — Sécurité
  "/backoffice/security": "Sécurité / Vue d'ensemble",
  "/backoffice/security/analysis": "Sécurité / Analyse",
  "/backoffice/security/logs": "Sécurité / Logs",
  "/backoffice/security/incidents": "Sécurité / Incidents",
  "/backoffice/security/investigation": "Sécurité / Investigation",
  "/backoffice/security/firewall": "Sécurité / Firewall",
  "/backoffice/security/network": "Sécurité / Réseau",
  "/backoffice/security/alerts": "Sécurité / Alertes email",
  "/backoffice/security/policies": "Sécurité / Politiques",
  "/backoffice/security/threats": "Sécurité / Menaces",

  // — Administration
  "/backoffice/services": "Administration / Services / Liste des services",
  "/backoffice/services/logs": "Administration / Services / Services & Logs",
  "/backoffice/services/service-logs": "Administration / Services / Logs détaillés",
  "/backoffice/datas": "Administration / Données applicatives",
  "/backoffice/suivi-interim": "Administration / Suivi intérim",
  "/backoffice/user-stats": "Administration / Stats utilisateur",
  "/backoffice/billing": "Administration / Facturation",
  "/backoffice/test-data": "Administration / Données de test",
  "/backoffice/archives": "Administration / Archives",
  "/backoffice/trash": "Administration / Corbeille",
  "/backoffice/users": "Administration / Utilisateurs",
  "/backoffice/notifications": "Administration / Notifications",
  "/backoffice/data-management": "Administration / Gestion des données",

  // — Mobile
  "/backoffice/mobile/logs": "Mobile / Erreurs & retours",
  "/backoffice/mobile/releases": "Mobile / Releases OTA",
  "/backoffice/mobiles/logs": "Mobile / Erreurs & retours",
  "/backoffice/mobiles/releases": "Mobile / Releases OTA",
  "/backoffice/mobile-emulator": "Mobile / Émulateur",
  "/backoffice/administration/mobile-logs": "Mobile / Erreurs & retours",
  "/backoffice/administration/mobile-releases": "Mobile / Releases OTA",

  // — Gestion des emails
  "/backoffice/emails": "Gestion des emails / Dashboard",
  "/backoffice/email-monitor": "Gestion des emails / Email Monitor",
  "/backoffice/emails/templates": "Gestion des emails / Templates",
  "/backoffice/emails/settings": "Gestion des emails / Configuration",
  "/backoffice/emails/deliverability": "Gestion des emails / Déliverabilité",
  "/backoffice/emails/mailhog": "Gestion des emails / MailHog",
  "/backoffice/emails/logs": "Gestion des emails / Logs",

  // — Développement
  "/backoffice/api-tester": "Développement / Testeur d'API",
  "/backoffice/tests": "Développement / Tests / Vue d'ensemble",
  "/backoffice/playwright-tests": "Développement / Tests Playwright",
  "/backoffice/tests-api": "Développement / Tests / Tests API",
  "/backoffice/tests-backend": "Développement / Tests / Tests Backend",
  "/backoffice/tests-frontend": "Développement / Tests / Tests Frontend",
  "/backoffice/tests-backoffice": "Développement / Tests / Tests Backoffice",
  "/backoffice/tests-security": "Développement / Tests / Tests Sécurité",
  "/backoffice/tests-performance": "Développement / Tests / Tests Performance",
  "/backoffice/performance-tests": "Développement / Tests Performance",
  "/backoffice/performance-tests/schedule": "Développement / Programmer tests",
  "/backoffice/test-reports": "Développement / Rapports de tests",
  "/backoffice/user-journey": "Développement / Parcours utilisateur",
  "/backoffice/user-journey/custom": "Développement / Parcours personnalisé",
  "/backoffice/user-journey/reports": "Développement / Rapports parcours",

  // — Recherche emploi (pages métier backoffice)
  "/backoffice/applications": "Recherche emploi / Candidatures",
  "/backoffice/companies": "Recherche emploi / Entreprises",
  "/backoffice/contacts": "Recherche emploi / Contacts",
  "/backoffice/calls": "Recherche emploi / Appels",
  "/backoffice/events": "Recherche emploi / Événements",
  "/backoffice/followups": "Recherche emploi / Relances",
  "/backoffice/interviews": "Recherche emploi / Entretiens",
  "/backoffice/search": "Recherche emploi / Recherche",
};

/** Préfixes triés (longueur décroissante) pour résolution par chemin parent. */
const BACKOFFICE_PREFIX_RULES: Array<{ prefix: string; title: string }> =
  Object.entries(BACKOFFICE_DOCUMENT_TITLES)
    .map(([prefix, title]) => ({ prefix, title }))
    .sort((a, b) => b.prefix.length - a.prefix.length);

export function resolveBackofficeDocumentTitle(pathname: string): string | null {
  const exact = BACKOFFICE_DOCUMENT_TITLES[pathname];
  if (exact) return exact;

  for (const { prefix, title } of BACKOFFICE_PREFIX_RULES) {
    if (pathname.startsWith(`${prefix}/`)) {
      return `${title} / Détail`;
    }
  }

  if (pathname.startsWith("/backoffice/")) {
    const segments = pathname.split("/").filter(Boolean).slice(1);
    if (segments.length === 0) return `${BACKOFFICE_HUB_LABEL} / Vue d'ensemble`;
    const last = segments[segments.length - 1]?.replace(/[-_]/g, " ");
    const label = last ? last.charAt(0).toUpperCase() + last.slice(1) : "Page";
    return `Backoffice / ${label}`;
  }

  return null;
}

/** Construit un titre backoffice à partir d’un fil existant + suffixe (pages dynamiques). */
export function extendBackofficeDocumentTitle(
  basePath: string,
  suffix: string,
): string {
  const base =
    BACKOFFICE_DOCUMENT_TITLES[basePath] ??
    resolveBackofficeDocumentTitle(basePath) ??
    BACKOFFICE_HUB_LABEL;
  return `${base} / ${suffix}`;
}
