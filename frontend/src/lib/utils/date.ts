/**
 * Formatage des dates/heures en heure locale de l'utilisateur (fuseau du navigateur).
 * À utiliser partout en front pour logs, emails, listes, etc.
 */

const defaultLocale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';

/**
 * Formate une date ISO ou Date en date + heure locale (ex. "27/02/2025 14:32").
 */
export function formatLocalDateTime(
  value: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  const d = typeof value === 'object' && 'getTime' in value ? value : new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(defaultLocale, {
    dateStyle: 'short',
    timeStyle: 'medium',
    ...options,
  });
}

/**
 * Formate en date seule (heure locale).
 */
export function formatLocalDate(
  value: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  const d = typeof value === 'object' && 'getTime' in value ? value : new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(defaultLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  });
}

/**
 * Formate en heure locale pour les logs (date + heure avec secondes).
 */
export function formatLocalTime(
  value: string | Date | number | null | undefined
): string {
  if (value == null) return '—';
  const d = typeof value === 'object' && 'getTime' in value ? value : new Date(value as string | number);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(defaultLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
