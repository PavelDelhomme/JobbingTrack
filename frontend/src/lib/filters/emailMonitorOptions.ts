export const EMAIL_STATUS_FILTER_OPTIONS = [
  { value: "SENT", label: "Envoyé" },
  { value: "DELIVERED", label: "Livré" },
  { value: "READ", label: "Lu" },
  { value: "FAILED", label: "Échoué" },
  { value: "PENDING", label: "En attente" },
  { value: "BOUNCED", label: "Rejeté" },
] as const;

export const EMAIL_TYPE_FILTER_OPTIONS = [
  { value: "WELCOME", label: "Bienvenue" },
  { value: "VERIFICATION", label: "Vérification" },
  { value: "RESET_PASSWORD", label: "Reset Password" },
  { value: "CONFIRMATION", label: "Confirmation" },
  { value: "NOTIFICATION", label: "Notification" },
  { value: "TEST", label: "Test" },
] as const;

export type EmailStatusFilter =
  | ""
  | (typeof EMAIL_STATUS_FILTER_OPTIONS)[number]["value"];

export type EmailTypeFilter =
  | ""
  | (typeof EMAIL_TYPE_FILTER_OPTIONS)[number]["value"];

export const EMAIL_CHANNEL_FILTER_OPTIONS = [
  { value: "crash_report", label: "Crash / retour mobile" },
] as const;

export type EmailChannelFilter =
  | ""
  | (typeof EMAIL_CHANNEL_FILTER_OPTIONS)[number]["value"];
