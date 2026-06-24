import { apiClient } from "@/lib/api";

export type AgentConsentType =
  | "MAILBOX_ACCESS"
  | "CONTENT_CLASSIFICATION"
  | "DIGEST_NOTIFICATIONS"
  | "GOOGLE_CALENDAR"
  | "GOOGLE_TASKS"
  | "AI_PROCESSING";

export interface AgentConsent {
  consentType: AgentConsentType;
  granted: boolean;
  version: string;
  grantedAt?: string | null;
  revokedAt?: string | null;
}

export interface UserMailboxSummary {
  id: string;
  emailAddress: string;
  displayName?: string | null;
  provider: "GMAIL_OAUTH" | "IMAP_GENERIC";
  syncEnabled: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  lastSyncError?: string | null;
  status: string;
  createdAt: string;
}

export interface TriageMessage {
  id: string;
  fromAddress: string;
  subject: string;
  snippet?: string | null;
  receivedAt: string;
  classification?: string | null;
  confidence?: string | null;
  reviewStatus: string;
  labels: string[];
  applicationId?: string | null;
  companyId?: string | null;
}

export interface ApplicationLinkSuggestion {
  applicationId: string;
  companyId: string | null;
  companyName: string | null;
  position: string;
  score: number;
}

export interface ProposedAgentActions {
  messageId: string;
  classification?: string | null;
  task:
    | { allowed: true; title: string; notes: string }
    | { allowed: false; reason: string };
  calendar:
    | { allowed?: true; kind: string; decision?: string; title?: string; reason?: string; message?: string }
    | { allowed: false; reason: string };
}

export interface AgentStatusResponse {
  success: boolean;
  agentEnabled: boolean;
  emailVerified: boolean;
  access: {
    allowed: boolean;
    reason: string;
    canConnectMailbox: boolean;
    canReadMailbox: boolean;
  };
  consentVersion: string;
  consentTypes: AgentConsentType[];
  consents: AgentConsent[];
  hasRequiredConsents: boolean;
  mailboxes: UserMailboxSummary[];
  pendingTriageCount: number;
}

export const CONSENT_LABELS: Record<AgentConsentType, { title: string; description: string }> = {
  MAILBOX_ACCESS: {
    title: "Accès aux boîtes mail",
    description:
      "Autoriser JobbingTrack à lire vos emails de recherche d'emploi (lecture seule, révocable).",
  },
  CONTENT_CLASSIFICATION: {
    title: "Classification automatique",
    description:
      "Analyser le contenu pour détecter refus, entretiens, relances et propositions.",
  },
  DIGEST_NOTIFICATIONS: {
    title: "Digest et notifications",
    description:
      "Recevoir un récap quotidien (18h) et des alertes utiles via JobbingTrack.",
  },
  GOOGLE_CALENDAR: {
    title: "Google Calendar",
    description:
      "Créer ou proposer des événements calendrier (sans horaire inventé).",
  },
  GOOGLE_TASKS: {
    title: "Google Tasks",
    description: "Synchroniser tâches et relances avec Google Tasks.",
  },
  AI_PROCESSING: {
    title: "Traitement IA (optionnel)",
    description: "Enrichissement assisté par IA locale — opt-in séparé, améliorable ensuite.",
  },
};

export async function fetchAgentStatus() {
  const { data } = await apiClient.get<AgentStatusResponse>("/email-agent/status");
  return data;
}

export async function updateAgentConsents(
  consents: Array<{ consentType: AgentConsentType; granted: boolean }>,
) {
  const { data } = await apiClient.put("/email-agent/consents", { consents });
  return data;
}

export async function startGoogleOAuth() {
  const { data } = await apiClient.get<{ success: boolean; authorizationUrl: string }>(
    "/email-agent/oauth/google/start",
  );
  return data;
}

export interface ImapDiscoveryResult {
  found: boolean;
  reason?: string;
  emailAddress?: string;
  domain?: string;
  suggested?: {
    imapHost: string;
    imapPort: number;
    imapUseTls: boolean;
    provider?: string;
    source?: string;
    note?: string | null;
    confidence?: string;
  };
  alternatives?: Array<{
    imapHost: string;
    imapPort: number;
    imapUseTls: boolean;
    provider?: string;
    source?: string;
  }>;
}

export async function discoverImapSettings(emailAddress: string) {
  const { data } = await apiClient.get<ImapDiscoveryResult & { success: boolean }>(
    "/email-agent/mailboxes/imap/discover",
    { params: { email: emailAddress } },
  );
  return data;
}

export async function connectImapMailbox(payload: {
  emailAddress: string;
  password: string;
  imapHost: string;
  imapPort?: number;
  imapUseTls?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  displayName?: string;
}) {
  const { data } = await apiClient.post("/email-agent/mailboxes/imap", payload);
  return data;
}

export async function revokeMailbox(mailboxId: string) {
  const { data } = await apiClient.delete(`/email-agent/mailboxes/${mailboxId}`);
  return data;
}

export async function syncMailboxesNow() {
  const { data } = await apiClient.post("/email-agent/sync");
  return data;
}

export async function fetchTriageMessages(status = "PENDING") {
  const { data } = await apiClient.get<{ success: boolean; messages: TriageMessage[] }>(
    "/email-agent/triage",
    { params: { status } },
  );
  return data;
}

export async function reviewTriageMessage(
  messageId: string,
  reviewStatus: string,
  applicationId?: string,
) {
  const { data } = await apiClient.patch(`/email-agent/triage/${messageId}`, {
    reviewStatus,
    ...(applicationId ? { applicationId } : {}),
  });
  return data;
}

export async function fetchLinkSuggestions(messageId: string) {
  const { data } = await apiClient.get<{
    success: boolean;
    suggestions: ApplicationLinkSuggestion[];
  }>(`/email-agent/triage/${messageId}/link-suggestions`);
  return data;
}

export async function linkTriageToApplication(messageId: string, applicationId: string) {
  const { data } = await apiClient.post(`/email-agent/triage/${messageId}/link`, {
    applicationId,
  });
  return data;
}

export async function fetchProposedActions(messageId: string) {
  const { data } = await apiClient.get<{ success: boolean; actions: ProposedAgentActions }>(
    `/email-agent/triage/${messageId}/actions`,
  );
  return data;
}

export async function createTriageGoogleTask(messageId: string, payload?: { title?: string; notes?: string }) {
  const { data } = await apiClient.post(`/email-agent/triage/${messageId}/actions/task`, payload || {});
  return data;
}

export async function createTriageCalendarEvent(
  messageId: string,
  payload?: {
    hasExplicitTime?: boolean;
    hour?: number;
    minute?: number;
    startDateTime?: string;
    durationMinutes?: number;
    title?: string;
  },
) {
  const { data } = await apiClient.post(`/email-agent/triage/${messageId}/actions/calendar`, payload || {});
  return data;
}

export async function setUserAgentEnabled(userId: string, enabled: boolean) {
  const { data } = await apiClient.put(`/email-agent/users/${userId}/agent-enabled`, {
    enabled,
  });
  return data;
}
