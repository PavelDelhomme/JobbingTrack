export type AdminActionFeedbackType = "success" | "error" | "info";

export type AdminActionFeedbackDetail = {
  message: string;
  type?: AdminActionFeedbackType;
};

export const ADMIN_ACTION_FEEDBACK_EVENT = "jobbingtrack-admin-action-feedback";

/** Toast global backoffice — contextuel après actions POST/PUT/PATCH/DELETE ou appels manuels. */
export function showAdminActionFeedback(
  message: string,
  type: AdminActionFeedbackType = "success",
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ADMIN_ACTION_FEEDBACK_EVENT, {
      detail: { message, type } satisfies AdminActionFeedbackDetail,
    }),
  );
}

const SKIP_URL_PARTS = [
  "/health",
  "/metrics",
  "/stream",
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/refresh",
];

function shouldSkipToast(url?: string, headers?: Record<string, unknown>): boolean {
  if (!url) return true;
  if (headers?.["X-Skip-Action-Toast"] === "1") return true;
  if (headers?.["x-skip-action-toast"] === "1") return true;
  return SKIP_URL_PARTS.some((part) => url.includes(part));
}

function contextualSuccessMessage(method: string, url: string, data: unknown): string {
  const body = data as { message?: string; success?: boolean } | undefined;
  if (body?.message && typeof body.message === "string" && body.message.length < 120) {
    return body.message;
  }

  const path = url.split("?")[0] || url;
  if (path.includes("/clear-test-data")) return "Données de test supprimées.";
  if (path.includes("/test-data/generate")) return "Données de test générées.";
  if (path.includes("/resend-verification")) return "Email de vérification renvoyé.";
  if (path.includes("/verify-email")) return "Email vérifié.";
  if (path.includes("/email-agent/sync")) return "Synchronisation des boîtes terminée.";
  if (path.includes("/mailboxes/imap")) return "Boîte mail IMAP connectée.";
  if (path.includes("/mailboxes/") && method === "DELETE") return "Boîte mail révoquée.";
  if (path.includes("/agent-enabled")) return "Agent email mis à jour.";
  if (path.includes("/consents")) return "Consentements enregistrés.";
  if (path.includes("/restore")) return "Élément restauré.";
  if (path.includes("/archive/")) return "Archivage effectué.";
  if (path.includes("/trash/")) return "Corbeille mise à jour.";
  if (path.includes("/services/restart")) return "Service redémarré.";
  if (path.includes("/services/start")) return "Service démarré.";
  if (path.includes("/services/stop")) return "Service arrêté.";

  if (method === "POST") return "Action enregistrée.";
  if (method === "PUT" || method === "PATCH") return "Modification enregistrée.";
  if (method === "DELETE") return "Suppression effectuée.";
  return "Opération réussie.";
}

function isBackofficeContext(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname || "";
  return path.startsWith("/backoffice") || path.startsWith("/b4ck0ff1ce");
}

/** Intercepteur axios — appeler depuis api.ts sur les réponses réussies. */
export function maybeToastApiSuccess(
  method: string | undefined,
  url: string | undefined,
  status: number,
  data: unknown,
  headers?: Record<string, unknown>,
) {
  if (!isBackofficeContext()) return;
  const m = (method || "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(m)) return;
  if (status < 200 || status >= 300) return;
  if (shouldSkipToast(url, headers)) return;

  const body = data as { success?: boolean } | undefined;
  if (body && "success" in body && body.success === false) return;

  const message = contextualSuccessMessage(m, url || "", data);
  showAdminActionFeedback(message, "success");
}
