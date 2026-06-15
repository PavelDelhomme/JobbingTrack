export const STATS_PERIOD_OPTIONS = [
  { value: 1, label: "24 h" },
  { value: 7, label: "7 jours" },
  { value: 14, label: "14 jours" },
  { value: 30, label: "30 jours" },
] as const;

export type StatsPeriodDays = (typeof STATS_PERIOD_OPTIONS)[number]["value"];
