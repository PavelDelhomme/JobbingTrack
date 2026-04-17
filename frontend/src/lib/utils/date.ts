/**
 * Formatage des dates/heures en heure locale de l'utilisateur.
 * Les API renvoient des ISO (UTC) ; le front convertit via **`displayTimeZoneOptions()`** :
 * **`NEXT_PUBLIC_CHART_TIMEZONE`** ou **`NEXT_PUBLIC_TZ`** (IANA) en priorité, sinon fuseau navigateur,
 * avec repli **Europe/Paris** si le navigateur annonce **`Atlantic/Reykjavik`** ou **`Iceland`**
 * (= UTC toute l’année, souvent incohérent avec une horloge France métropolitaine en été).
 */

const defaultLocale = typeof navigator !== 'undefined' ? navigator.language : 'fr-FR';

/**
 * Fuseau annoncé par le navigateur (sous Jest : **TZ**).
 */
function browserTimeZoneOptions(): Pick<Intl.DateTimeFormatOptions, 'timeZone'> | Record<string, never> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz ? { timeZone: tz } : {};
  } catch {
    return {};
  }
}

/** Fuseaux équivalents UTC où l’affichage « heure locale » = heure UTC (décalage ~0 h / ~2 h vs France). */
const UTC_LIKE_MISLEADING_ZONES = new Set(['Atlantic/Reykjavik', 'Iceland']);

function readEnvDisplayTimeZone(): string | null {
  if (typeof process === 'undefined') return null;
  for (const key of ['NEXT_PUBLIC_CHART_TIMEZONE', 'NEXT_PUBLIC_TZ'] as const) {
    const v = process.env[key];
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    try {
      Intl.DateTimeFormat('en-US', { timeZone: t }).format(new Date());
      return t;
    } catch {
      /* IANA inconnu pour ICU */
    }
  }
  return null;
}

/**
 * Fuseau passé à `Intl` pour `formatLocalDateTime`, axes graphiques, etc.
 * Priorité : env **NEXT_PUBLIC_CHART_TIMEZONE** puis **NEXT_PUBLIC_TZ** ; sinon repli Paris si
 * `Intl` annonce Reykjavik / Islande ; sinon fuseau navigateur.
 */
export function displayTimeZoneOptions(): Pick<Intl.DateTimeFormatOptions, 'timeZone'> | Record<string, never> {
  const fromEnv = readEnvDisplayTimeZone();
  if (fromEnv) return { timeZone: fromEnv };

  const br = browserTimeZoneOptions();
  const id = 'timeZone' in br && typeof br.timeZone === 'string' ? br.timeZone : '';
  if (id && UTC_LIKE_MISLEADING_ZONES.has(id)) {
    const fallback = 'Europe/Paris';
    try {
      Intl.DateTimeFormat('en-US', { timeZone: fallback }).format(new Date());
      return { timeZone: fallback };
    } catch {
      return br;
    }
  }
  return br;
}

/** Fuseau brut `Intl` (diagnostic). */
export function getResolvedBrowserTimeZoneId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

/** Fuseau réellement utilisé pour l’affichage (après env + repli Reykjavik). */
export function getEffectiveDisplayTimeZoneId(): string {
  const o = displayTimeZoneOptions();
  if ('timeZone' in o && typeof o.timeZone === 'string' && o.timeZone) return o.timeZone;
  return getResolvedBrowserTimeZoneId() || '—';
}

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
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value as number;
    const ms = n < 1e12 ? n * 1000 : n;
    d = new Date(ms);
  } else {
    d = new Date(value as number);
  }
  if (Number.isNaN(d.getTime())) return '—';

  const resolved: Intl.DateTimeFormatOptions = {
    ...displayTimeZoneOptions(),
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
  if ((resolved.dateStyle != null || resolved.timeStyle != null) && resolved.timeZone == null) {
    Object.assign(resolved, displayTimeZoneOptions());
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
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value as number;
    const ms = n < 1e12 ? n * 1000 : n;
    d = new Date(ms);
  } else {
    d = new Date(value as number);
  }
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(defaultLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...displayTimeZoneOptions(),
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
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    const n = value as number;
    const ms = n < 1e12 ? n * 1000 : n;
    d = new Date(ms);
  } else {
    d = new Date(value as number);
  }
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(defaultLocale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...displayTimeZoneOptions(),
  });
}

/**
 * Parse un instant pour les graphiques (ISO, ms, ou secondes unix).
 * Chaîne ISO sans fuseau explicite : traitée comme UTC (suffixe Z) pour éviter
 * l’ambiguïté « heure serveur en clair » vs fuseau navigateur.
 */
export function parseChartTimestamp(value: unknown): Date | null {
  if (value == null) return null;

  let v: unknown = value;
  for (let depth = 0; depth < 6; depth += 1) {
    if (v == null || typeof v !== 'object') break;
    if ('value' in v && (v as { value: unknown }).value !== undefined) {
      const inner = (v as { value: unknown }).value;
      if (inner === v) break;
      v = inner;
      continue;
    }
    break;
  }

  if (typeof v === 'string') {
    const t = v.trim();
    if (/^\d{10,13}$/.test(t)) {
      const n = Number(t);
      const ms = t.length <= 10 ? n * 1000 : n;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v < 1e12 ? v * 1000 : v;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === 'object' && v !== null && 'getTime' in v) {
    const d = v as Date;
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = normalizeMetricTimestampToIso(v);
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Instant en ms pour graphiques / tri (métriques API), sans ambiguïté « heure locale du parseur ». */
export function metricTimestampToMs(value: unknown): number | null {
  const d = parseChartTimestamp(value);
  return d ? d.getTime() : null;
}

/**
 * Lit **`timestampMs`** sur la ligne ; après **`normalizeMetricRows`** (analytics), ce champ est
 * aligné sur **`Date.parse(timestamp ISO)`** quand l’ISO est présent — évite un axe Recharts faux
 * si l’API avait laissé un **`timestampMs`** divergent. Sinon dérive depuis l’ISO / **`timestamp`**.
 */
export function metricRowToTimeMs(
  row: Record<string, unknown>,
  normalizedIso: string
): number | null {
  const direct = row.timestampMs;
  if (typeof direct === 'number' && Number.isFinite(direct)) return direct;
  if (typeof direct === 'string' && /^\d{10,13}$/.test(direct.trim())) {
    const t = direct.trim();
    const n = Number(t);
    const ms = t.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  return metricTimestampToMs(normalizedIso || row.timestamp);
}

/** Graduations d’axe : heure locale (option jour si série longue). */
export function formatLocalChartAxisTick(
  value: unknown,
  opts?: { withDate?: boolean }
): string {
  const d = parseChartTimestamp(value);
  if (!d) return '';
  const withDate = opts?.withDate ?? false;
  /** `timeZone` en tête : certains moteurs appliquent mieux le fuseau qu’avec un spread en fin d’objet. */
  const tz = displayTimeZoneOptions();
  if (withDate) {
    return d.toLocaleString(defaultLocale, {
      ...tz,
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return d.toLocaleTimeString(defaultLocale, {
    ...tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
