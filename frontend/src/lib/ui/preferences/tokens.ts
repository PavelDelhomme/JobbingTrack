/** Variables CSS JobbingTrack (moteur UI) — pas de palette 50–900 générée sur :root. */
export const JT_CSS_VARS = {
  primary: "--jt-primary",
  accent: "--jt-accent",
} as const;

/** Alias legacy lus par customization.css (dérivés de --jt-*). */
export const LEGACY_ALIAS_VARS = [
  "--primary-color",
  "--accent-color",
] as const;

export const JT_DOM_VARS_TO_CLEAR = [
  ...Object.values(JT_CSS_VARS),
  ...LEGACY_ALIAS_VARS,
  "--animation-duration",
  "--items-per-page",
  "--notification-duration",
  "--cache-duration",
  "--sync-frequency",
] as const;
