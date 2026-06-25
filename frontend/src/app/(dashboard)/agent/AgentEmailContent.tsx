"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import {
  AgentConsentType,
  AgentStatusResponse,
  ApplicationLinkSuggestion,
  CONSENT_LABELS,
  connectImapMailbox,
  discoverImapSettings,
  createTriageCalendarEvent,
  createTriageGoogleTask,
  fetchAgentStatus,
  fetchLinkSuggestions,
  fetchProposedActions,
  fetchTriageMessages,
  linkTriageToApplication,
  ProposedAgentActions,
  reviewTriageMessage,
  revokeMailbox,
  setUserAgentEnabled,
  startGoogleOAuth,
  syncMailboxesNow,
  TriageMessage,
  updateAgentConsents,
} from "@/lib/services/emailAgentService";

const CONSENT_ORDER: AgentConsentType[] = [
  "MAILBOX_ACCESS",
  "CONTENT_CLASSIFICATION",
  "DIGEST_NOTIFICATIONS",
  "GOOGLE_CALENDAR",
  "GOOGLE_TASKS",
  "AI_PROCESSING",
];

export default function AgentEmailContent() {
  const { isAuthenticated, loading: authLoading, token, isAdmin, user: authUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthResult = searchParams.get("oauth");

  const [status, setStatus] = useState<AgentStatusResponse | null>(null);
  const [messages, setMessages] = useState<TriageMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consentDraft, setConsentDraft] = useState<Record<string, boolean>>({});
  const [imapForm, setImapForm] = useState({
    emailAddress: "",
    password: "",
    imapHost: "",
    imapPort: "993",
    displayName: "",
  });
  const [imapDiscoveryHint, setImapDiscoveryHint] = useState<string | null>(null);
  const [imapDiscovering, setImapDiscovering] = useState(false);
  const [linkSuggestions, setLinkSuggestions] = useState<Record<string, ApplicationLinkSuggestion[]>>({});
  const [proposedActions, setProposedActions] = useState<Record<string, ProposedAgentActions>>({});
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [selfActivating, setSelfActivating] = useState(false);

  const activateAgentForSelf = async () => {
    if (!authUser?.id) return;
    setSelfActivating(true);
    setError(null);
    try {
      await setUserAgentEnabled(authUser.id, true);
      await loadAll();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Activation agent échouée";
      setError(msg);
    } finally {
      setSelfActivating(false);
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agentStatus = await fetchAgentStatus();
      setStatus(agentStatus);
      const draft: Record<string, boolean> = {};
      for (const type of CONSENT_ORDER) {
        const found = agentStatus.consents.find((c) => c.consentType === type);
        draft[type] = found?.granted === true;
      }
      setConsentDraft(draft);
      if (agentStatus.access.allowed) {
        const triage = await fetchTriageMessages("PENDING");
        setMessages(triage.messages || []);
      } else {
        setMessages([]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur chargement agent email";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadAll();
    }
  }, [isAuthenticated, token, loadAll]);

  const oauthBanner = useMemo(() => {
    if (oauthResult === "success") {
      return { type: "success" as const, text: "Gmail connecté avec succès." };
    }
    if (oauthResult === "error") {
      return {
        type: "error" as const,
        text: `Connexion Gmail échouée (${searchParams.get("reason") || "erreur"}).`,
      };
    }
    return null;
  }, [oauthResult, searchParams]);

  const saveConsents = async () => {
    setActionLoading("consents");
    try {
      await updateAgentConsents(
        CONSENT_ORDER.map((consentType) => ({
          consentType,
          granted: consentDraft[consentType] === true,
        })),
      );
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur enregistrement consentements");
    } finally {
      setActionLoading(null);
    }
  };

  const connectGmail = async () => {
    setActionLoading("gmail");
    try {
      const { authorizationUrl } = await startGoogleOAuth();
      window.location.href = authorizationUrl;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "OAuth Google indisponible");
      setActionLoading(null);
    }
  };

  const handleImapEmailBlur = async () => {
    const email = imapForm.emailAddress.trim();
    if (!email.includes("@")) return;
    setImapDiscovering(true);
    setImapDiscoveryHint(null);
    try {
      const discovery = await discoverImapSettings(email);
      if (discovery.found && discovery.suggested) {
        setImapForm((f) => ({
          ...f,
          imapHost: f.imapHost || discovery.suggested!.imapHost,
          imapPort: f.imapPort === "993" ? String(discovery.suggested!.imapPort) : f.imapPort,
          displayName: f.displayName || email,
        }));
        const provider = discovery.suggested.provider || "serveur détecté";
        const source = discovery.suggested.source || "";
        const note =
          discovery.suggested.note === "proton_bridge_required"
            ? " Proton Mail nécessite Proton Bridge (IMAP local)."
            : "";
        setImapDiscoveryHint(
          `Détecté : ${provider} (${discovery.suggested.imapHost}:${discovery.suggested.imapPort})${note}${source ? ` · ${source}` : ""}. Vous pouvez corriger manuellement.`,
        );
      }
    } catch {
      setImapDiscoveryHint("Détection automatique indisponible — saisissez l'hôte IMAP manuellement.");
    } finally {
      setImapDiscovering(false);
    }
  };

  const submitImap = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("imap");
    try {
      await connectImapMailbox({
        emailAddress: imapForm.emailAddress,
        password: imapForm.password,
        imapHost: imapForm.imapHost,
        imapPort: Number(imapForm.imapPort) || 993,
        displayName: imapForm.displayName || imapForm.emailAddress,
      });
      setImapForm({ emailAddress: "", password: "", imapHost: "", imapPort: "993", displayName: "" });
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connexion IMAP échouée");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (mailboxId: string) => {
    if (!confirm("Révoquer cette boîte mail ? La synchronisation sera arrêtée.")) return;
    setActionLoading(`revoke-${mailboxId}`);
    try {
      await revokeMailbox(mailboxId);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Révocation échouée");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSync = async () => {
    setActionLoading("sync");
    try {
      await syncMailboxesNow();
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Synchronisation échouée");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReview = async (messageId: string, reviewStatus: string) => {
    setActionLoading(`review-${messageId}`);
    try {
      await reviewTriageMessage(messageId, reviewStatus);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Mise à jour échouée");
    } finally {
      setActionLoading(null);
    }
  };

  const loadSuggestions = async (messageId: string) => {
    setActionLoading(`links-${messageId}`);
    try {
      const data = await fetchLinkSuggestions(messageId);
      setLinkSuggestions((prev) => ({ ...prev, [messageId]: data.suggestions || [] }));
      setExpandedMessageId(messageId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Suggestions liaison indisponibles");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLink = async (messageId: string, applicationId: string) => {
    setActionLoading(`link-${messageId}`);
    try {
      await linkTriageToApplication(messageId, applicationId);
      await loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Liaison échouée");
    } finally {
      setActionLoading(null);
    }
  };

  const loadActions = async (messageId: string) => {
    setActionLoading(`actions-${messageId}`);
    try {
      const data = await fetchProposedActions(messageId);
      setProposedActions((prev) => ({ ...prev, [messageId]: data.actions }));
      setExpandedMessageId(messageId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Actions indisponibles");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateTask = async (messageId: string) => {
    setActionLoading(`task-${messageId}`);
    try {
      await createTriageGoogleTask(messageId);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Création tâche Google échouée");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCalendar = async (messageId: string) => {
    setActionLoading(`calendar-${messageId}`);
    try {
      const result = await createTriageCalendarEvent(messageId, {
        hasExplicitTime: true,
        hour: 10,
        minute: 0,
      });
      if (result.skipped) {
        setError("Horaire à confirmer — créez une tâche ou précisez l’heure.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Création événement Calendar échouée");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="p-6">Chargement…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent email — recherche d&apos;emploi
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Espace utilisateur privé : connectez vos boîtes, gérez vos consentements RGPD et validez
            les emails triés. Distinct du backoffice admin.
          </p>
        </div>

        {oauthBanner && (
          <div
            className={`rounded-lg p-3 text-sm ${
              oauthBanner.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
            }`}
          >
            {oauthBanner.text}
          </div>
        )}

        {error && (
          <div className="rounded-lg p-3 text-sm bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200">
            {error}
          </div>
        )}

        {status && (
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">Statut</h2>
            <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
              <li>
                Agent activé :{" "}
                <strong>
                  {status.agentEnabled
                    ? "Oui"
                    : isAdmin
                      ? "Non — activez-le ci-dessous ou depuis la fiche utilisateur"
                      : "Non (demandez l’activation à un admin)"}
                </strong>
              </li>
              <li>
                Email JobbingTrack vérifié :{" "}
                <strong>{status.emailVerified ? "Oui" : "Non — vérifiez votre email d’abord"}</strong>
              </li>
              <li>
                Consentements requis :{" "}
                <strong>{status.hasRequiredConsents ? "OK" : "Accès boîtes mail requis"}</strong>
              </li>
              <li>
                À traiter : <strong>{status.pendingTriageCount}</strong>
              </li>
            </ul>
            {!status.agentEnabled && (
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-2">
                <p>
                  Flag produit <code>jobSearchAgentEnabled</code> — chaque utilisateur
                  doit être activé individuellement (RGPD / consentement boîte mail).
                </p>
                {isAdmin && (
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      type="button"
                      onClick={activateAgentForSelf}
                      disabled={selfActivating}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 disabled:opacity-50"
                    >
                      {selfActivating ? "Activation…" : "Activer pour mon compte"}
                    </button>
                    <a
                      href="/backoffice/users"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Gérer les agents des utilisateurs →
                    </a>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Consentements RGPD</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Version {status?.consentVersion || "1.0"} — horodatés et révocables à tout moment.
          </p>
          <div className="space-y-3">
            {CONSENT_ORDER.map((type) => {
              const meta = CONSENT_LABELS[type];
              return (
                <label
                  key={type}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consentDraft[type] === true}
                    onChange={(e) =>
                      setConsentDraft((prev) => ({ ...prev, [type]: e.target.checked }))
                    }
                    disabled={!status?.agentEnabled}
                  />
                  <span>
                    <span className="font-medium text-gray-900 dark:text-white">{meta.title}</span>
                    <span className="block text-sm text-gray-600 dark:text-gray-400">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={saveConsents}
            disabled={!status?.agentEnabled || actionLoading === "consents"}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
          >
            Enregistrer les consentements
          </button>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Connecter une boîte mail</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={connectGmail}
              disabled={
                !status?.agentEnabled ||
                !status?.hasRequiredConsents ||
                actionLoading === "gmail"
              }
              className="px-4 py-2 rounded-lg bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-600 text-sm disabled:opacity-50"
            >
              Lier Gmail (OAuth lecture seule)
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={!status?.access.allowed || actionLoading === "sync"}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              Synchroniser maintenant
            </button>
          </div>

          <form onSubmit={submitImap} className="grid gap-3 md:grid-cols-2">
            <input
              required
              placeholder="Adresse email"
              value={imapForm.emailAddress}
              onChange={(e) => setImapForm((f) => ({ ...f, emailAddress: e.target.value }))}
              onBlur={handleImapEmailBlur}
              className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              required
              type="password"
              placeholder="Mot de passe / app password"
              value={imapForm.password}
              onChange={(e) => setImapForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              required
              placeholder="Hôte IMAP (ex. imap.mail.ovh.net)"
              value={imapForm.imapHost}
              onChange={(e) => setImapForm((f) => ({ ...f, imapHost: e.target.value }))}
              className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
            />
            <input
              placeholder="Port IMAP"
              value={imapForm.imapPort}
              onChange={(e) => setImapForm((f) => ({ ...f, imapPort: e.target.value }))}
              className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900 dark:border-gray-700"
            />
            {imapDiscoveryHint && (
              <p className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400">
                {imapDiscovering ? "Détection du serveur IMAP…" : imapDiscoveryHint}
              </p>
            )}
            <button
              type="submit"
              disabled={
                !status?.agentEnabled ||
                !status?.hasRequiredConsents ||
                actionLoading === "imap" ||
                imapDiscovering
              }
              className="md:col-span-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"
            >
              Ajouter boîte IMAP
            </button>
          </form>
        </section>

        {status && status.mailboxes.length > 0 && (
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Boîtes connectées</h2>
            <ul className="space-y-2">
              {status.mailboxes.map((mb) => (
                <li
                  key={mb.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-gray-800 p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">{mb.emailAddress}</div>
                    <div className="text-gray-500">
                      {mb.provider} · sync {mb.lastSyncStatus || "—"}
                      {mb.lastSyncAt ? ` · ${new Date(mb.lastSyncAt).toLocaleString("fr-FR")}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRevoke(mb.id)}
                    disabled={actionLoading === `revoke-${mb.id}`}
                    className="text-red-600 text-sm"
                  >
                    Révoquer
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {messages.length > 0 && (
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">
              Emails à traiter ({messages.length})
            </h2>
            <ul className="space-y-3">
              {messages.map((msg) => {
                const actions = proposedActions[msg.id];
                const taskAction = actions?.task;
                const calendarAction = actions?.calendar;
                return (
                <li
                  key={msg.id}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 p-3 text-sm space-y-2"
                >
                  <div className="font-medium">{msg.subject}</div>
                  <div className="text-gray-500">{msg.fromAddress}</div>
                  <div className="text-xs text-gray-400">
                    {msg.classification} · {msg.confidence} ·{" "}
                    {new Date(msg.receivedAt).toLocaleString("fr-FR")}
                  </div>
                  {msg.snippet && <p className="text-gray-600 dark:text-gray-400">{msg.snippet}</p>}
                  {msg.applicationId && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      Lié à candidature {msg.applicationId.slice(0, 8)}…
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleReview(msg.id, "ACCEPTED")}
                      className="px-2 py-1 rounded bg-green-600 text-white text-xs"
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(msg.id, "REJECTED")}
                      className="px-2 py-1 rounded bg-gray-500 text-white text-xs"
                    >
                      Ignorer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReview(msg.id, "DEFERRED")}
                      className="px-2 py-1 rounded border text-xs"
                    >
                      Reporter
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSuggestions(msg.id)}
                      disabled={actionLoading === `links-${msg.id}`}
                      className="px-2 py-1 rounded border border-blue-300 text-blue-700 text-xs"
                    >
                      Lier candidature
                    </button>
                    <button
                      type="button"
                      onClick={() => loadActions(msg.id)}
                      disabled={actionLoading === `actions-${msg.id}`}
                      className="px-2 py-1 rounded border border-purple-300 text-purple-700 text-xs"
                    >
                      Tasks / Calendar
                    </button>
                  </div>
                  {expandedMessageId === msg.id && linkSuggestions[msg.id] && (
                    <div className="rounded border border-blue-100 dark:border-blue-900 p-2 space-y-1">
                      <div className="text-xs font-medium">Candidatures suggérées</div>
                      {linkSuggestions[msg.id].length === 0 && (
                        <p className="text-xs text-gray-500">Aucune correspondance détectée.</p>
                      )}
                      {linkSuggestions[msg.id].map((s) => (
                        <div key={s.applicationId} className="flex items-center justify-between gap-2 text-xs">
                          <span>
                            {s.companyName || "Entreprise"} — {s.position} (score {s.score})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleLink(msg.id, s.applicationId)}
                            disabled={actionLoading === `link-${msg.id}`}
                            className="text-blue-600"
                          >
                            Lier
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {expandedMessageId === msg.id && actions && (
                    <div className="rounded border border-purple-100 dark:border-purple-900 p-2 space-y-2 text-xs">
                      {taskAction?.allowed ? (
                        <div>
                          <div className="font-medium">Google Tasks</div>
                          <p>{taskAction.title}</p>
                          <button
                            type="button"
                            onClick={() => handleCreateTask(msg.id)}
                            disabled={actionLoading === `task-${msg.id}`}
                            className="mt-1 px-2 py-1 rounded bg-purple-600 text-white"
                          >
                            Créer la tâche
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-500">
                          Tasks : consentement GOOGLE_TASKS + Gmail OAuth requis.
                        </p>
                      )}
                      {calendarAction?.allowed === false ? (
                        <p className="text-gray-500">
                          Calendar : consentement GOOGLE_CALENDAR requis.
                        </p>
                      ) : calendarAction ? (
                        <div>
                          <div className="font-medium">Google Calendar</div>
                          <p>
                            {"message" in calendarAction
                              ? calendarAction.message
                              : calendarAction.reason || "Proposition calendrier"}
                          </p>
                          {"decision" in calendarAction &&
                            calendarAction.decision === "schedule" && (
                            <button
                              type="button"
                              onClick={() => handleCreateCalendar(msg.id)}
                              disabled={actionLoading === `calendar-${msg.id}`}
                              className="mt-1 px-2 py-1 rounded bg-indigo-600 text-white"
                            >
                              Créer événement (10h00)
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
