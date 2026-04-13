/**
 * Formatage des dates/heures en heure locale de l'utilisateur (fuseau du navigateur).
 * Les API doivent continuer à renvoyer des ISO (UTC ou offset explicite) ; le front convertit à l’affichage.
 * `formatLocalDateTime` ajoute le nom court du fuseau (ex. « GMT+2 ») pour lever l’ambiguïté.
 */

const defaultLocale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';

/**
 * Normalise un instant renvoyé par l’API vers une chaîne ISO **UTC** (`…Z` ou offset explicite).
 * Les sérialisations PostgreSQL / Prisma sans suffixe sont traitées comme **UTC** (pas heure locale ambiguë).
 */
export function normalizeMetricTimestampToIso(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }
  const s = String(value).trim();
  if (!s) return '';
  // Epoch en chaîne (ms ou s) — ex. sérialisation JSON atypique
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    const ms = s.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString();
  }
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) return `${s}Z`;
  const pg = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/.exec(s);
  if (pg) return `${pg[1]}T${pg[2]}${pg[3] || ''}Z`;
  return s;
}

/**
 * Formate une date ISO ou Date en date + heure locale (ex. "27/02/2025 14:32").
 * Utilise des champs explicites (year, month, …) + fuseau court : avec `dateStyle` / `timeStyle`,
 * `Intl` refuse `timeZoneName` (TypeError « can't set option timeZoneName when dateStyle is used » sur Chromium).
 */
export function formatLocalDateTime(
  value: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  let d: Date;
  if (typeof value === 'object' && value !== null && 'getTime' in value) {
    d = value as Date;
  } else if (typeof value === 'string') {
    const iso = normalizeMetricTimestampToIso(value);
    d = new Date(iso || value);
  } else {
    d = new Date(value as number);
  }
  if (Number.isNaN(d.getTime())) return '—';

  const resolved: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
    ...options,
  };

  if (resolved.dateStyle != null || resolved.timeStyle != null) {
    delete resolved.timeZoneName;
  }

  return d.toLocaleString(defaultLocale, resolved);
}

/**
 * Formate en date seule (heure locale).
 */
export function formatLocalDate(
  value: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (value == null) return '—';
  let d: Date;
  if (typeof value === 'object' && value !== null && 'getTime' in value) {
    d = value as Date;
  } else if (typeof value === 'string') {
    const iso = normalizeMetricTimestampToIso(value);
    d = new Date(iso || value);
  } else {
    d = new Date(value as number);
  }
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
  let d: Date;
  if (typeof value === 'object' && value !== null && 'getTime' in value) {
    d = value as Date;
  } else if (typeof value === 'string') {
    const iso = normalizeMetricTimestampToIso(value);
    d = new Date(iso || value);
  } else {
    d = new Date(value as number);
  }
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(defaultLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Parse un instant pour les graphiques (ISO, ms, ou secondes unix).
 * Chaîne ISO sans fuseau explicite : traitée comme UTC (suffixe Z) pour éviter
 * l’ambiguïté « heure serveur en clair » vs fuseau navigateur.
 */
export function parseChartTimestamp(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value !== null && 'getTime' in value) {
    const d = value as Date;
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = normalizeMetricTimestampToIso(value);
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Graduations d’axe : heure locale (option jour si série longue). */
export function formatLocalChartAxisTick(
  value: unknown,
  opts?: { withDate?: boolean }
): string {
  const d = parseChartTimestamp(value);
  if (!d) return '';
  const withDate = opts?.withDate ?? false;
  if (withDate) {
    return d.toLocaleString(defaultLocale, {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return d.toLocaleTimeString(defaultLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
