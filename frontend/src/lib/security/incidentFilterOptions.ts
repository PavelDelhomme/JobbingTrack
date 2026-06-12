export const INCIDENT_KIND_FILTER_OPTIONS = [
  { value: "threat", label: "Menaces" },
  { value: "alert", label: "Alertes" },
  { value: "event", label: "Événements" },
] as const;

export type IncidentKindFilter =
  | ""
  | (typeof INCIDENT_KIND_FILTER_OPTIONS)[number]["value"];
