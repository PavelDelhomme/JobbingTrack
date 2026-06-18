/** Entrée utilisateur pour le sélecteur analytics backoffice. */
export interface AnalyticsUserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

/** Libellé lisible : nom · email (rôle). */
export function formatAnalyticsUserLabel(u: AnalyticsUserListItem): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (name) return `${name} · ${u.email} (${u.role})`;
  return `${u.email} (${u.role})`;
}

export function analyticsUserSuggestions(users: AnalyticsUserListItem[]) {
  return users.map((u) => ({
    value: u.id,
    label: formatAnalyticsUserLabel(u),
  }));
}
