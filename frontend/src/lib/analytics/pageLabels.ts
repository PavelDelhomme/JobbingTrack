const MOBILE_PAGE_LABELS: Record<string, string> = {
  "/home": "Accueil",
  home: "Accueil",
  "/login": "Connexion",
  login: "Connexion",
  "/register": "Inscription",
  register: "Inscription",
  "/settings": "Paramètres",
  settings: "Paramètres",
  "/search": "Recherche",
  search: "Recherche",
  "/applications": "Candidatures",
  applications: "Candidatures",
  "/companies": "Entreprises",
  companies: "Entreprises",
  "/contacts": "Contacts",
  contacts: "Contacts",
  "/interviews": "Entretiens",
  interviews: "Entretiens",
  "/followups": "Relances",
  followups: "Relances",
  "/calls": "Appels",
  calls: "Appels",
  "/events": "Événements",
  events: "Événements",
  "/profile": "Profil",
  profile: "Profil",
  "/admin": "Administration",
  admin: "Administration",
  "/analytics": "Analytics",
  analytics: "Analytics",
  "/statistics": "Statistiques",
  statistics: "Statistiques",
  "/interim": "Intérim",
  interim: "Intérim",
  unknown: "Inconnu",
};

/** Libellé lisible pour une page analytics (mobile ou backoffice). */
export function formatAnalyticsPageLabel(
  page: string | null | undefined,
  platform?: string | null,
): string {
  if (!page || page.trim() === "") return "—";
  const raw = page.trim();
  const key = raw.startsWith("/") ? raw : raw.replace(/Screen$|Tab$|Page$/, "");
  const label = MOBILE_PAGE_LABELS[key] || MOBILE_PAGE_LABELS[`/${key}`];
  if (label) return label;
  if (raw.startsWith("/backoffice") || raw.startsWith("/b4ck0ff1ce")) {
    return raw.replace(/^\/b4ck0ff1ce/, "/backoffice");
  }
  const plat = (platform || "").toLowerCase();
  if (plat === "android" || plat === "ios" || plat === "mobile") {
    return `Mobile · ${raw}`;
  }
  return raw;
}
