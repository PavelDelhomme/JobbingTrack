"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/auth";
import {
  AgentConsent,
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
import { Switch } from "@/components/ui/switch";
import {
  AgentPageShell,
  AgentPanel,
  agentBtnDanger,
  agentBtnPrimary,
  agentBtnSecondary,
  agentFieldClass,
} from "./AgentPageShell";

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
  const [consentMeta, setConsentMeta] = useState<Record<string, AgentConsent>>({});
  const [imapForm, setImapForm] = useState({
    emailAddress: "",
    password: "",
    imapHost: "",
    imapPort: "993",
    smtpHost: "",
    smtpPort: "587",
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
      const meta: Record<string, AgentConsent> = {};
      for (const type of CONSENT_ORDER) {
        const found = agentStatus.consents.find((c) => c.consentType === type);
        draft[type] = found?.granted === true;
        if (found) meta[type] = found;
      }
      setConsentDraft(draft);
      setConsentMeta(meta);
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
          imapHost: discovery.suggested!.imapHost,
          imapPort: String(discovery.suggested!.imapPort),
          smtpHost: discovery.suggested!.smtpHost || f.smtpHost,
          smtpPort: String(discovery.suggested!.smtpPort ?? 587),
          displayName: f.displayName || email,
        }));
        const provider = discovery.suggested.provider || "serveur détecté";
        const source = discovery.suggested.source || "";
        const smtpLine =
          discovery.suggested.smtpHost != null
            ? ` · SMTP ${discovery.suggested.smtpHost}:${discovery.suggested.smtpPort ?? 587}`
            : "";
        const note =
          discovery.suggested.note === "proton_bridge_required"
            ? " Proton Mail nécessite Proton Bridge (IMAP local)."
            : "";
        setImapDiscoveryHint(
          `Détecté : ${provider} — IMAP ${discovery.suggested.imapHost}:${discovery.suggested.imapPort}${smtpLine}${note}${source ? ` · ${source}` : ""}. Corrigez manuellement si besoin.`,
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
        smtpHost: imapForm.smtpHost || undefined,
        smtpPort: Number(imapForm.smtpPort) || undefined,
        displayName: imapForm.displayName || imapForm.emailAddress,
      });
      setImapForm({
        emailAddress: "",
        password: "",
        imapHost: "",
        imapPort: "993",
        smtpHost: "",
        smtpPort: "587",
        displayName: "",
      });
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
      <AgentPageShell
        title="📬 Agent email"
        description="Chargement de votre espace agent…"
        adminExtraNav={isAdmin}
      >
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Chargement…
          </p>
        </div>
      </AgentPageShell>
    );
  }

  return (
    <AgentPageShell
      title="📬 Agent email — recherche d'emploi"
      description={
        <>
          Espace privé : boîtes mail, consentements RGPD et tri des candidatures.
          Les analytics détaillés sont dans l&apos;onglet{" "}
          <strong>Analytics utilisateur</strong>.
        </>
      }
      adminExtraNav={isAdmin}
      actions={
        status?.access.allowed ? (
          <button
            type="button"
            onClick={handleSync}
            disabled={actionLoading === "sync"}
            className={agentBtnPrimary}
          >
            {actionLoading === "sync" ? "Synchronisation…" : "Synchroniser"}
          </button>
        ) : null
      }
    >

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
          <AgentPanel title="Statut">
            <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
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
                <strong className={status.hasRequiredConsents ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
                  {status.hasRequiredConsents ? "OK — accès boîtes autorisé" : "Incomplet — MAILBOX_ACCESS requis"}
                </strong>
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
                      className={agentBtnPrimary}
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
          </AgentPanel>
        )}

        <AgentPanel
          title="Consentements RGPD"
          description={
            <>
              Version {status?.consentVersion || "1.0"} — compte{" "}
              <strong className="text-gray-800 dark:text-gray-200">
                {authUser?.email || "—"}
              </strong>
              . Les consentements mobile apparaissent ici pour le même compte.
            </>
          }
        >
          {!status?.agentEnabled && (
            <p className="text-sm text-amber-700 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
              Agent non activé — les statuts ci-dessous reflètent la base de données ; activez l&apos;agent pour
              modifier.
            </p>
          )}
          <div className="space-y-3">
            {CONSENT_ORDER.map((type) => {
              const meta = CONSENT_LABELS[type];
              const stored = consentMeta[type];
              const granted = consentDraft[type] === true;
              const grantedAt = stored?.grantedAt
                ? new Date(stored.grantedAt).toLocaleString("fr-FR")
                : null;
              const revokedAt = stored?.revokedAt
                ? new Date(stored.revokedAt).toLocaleString("fr-FR")
                : null;
              return (
                <div
                  key={type}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-100 dark:border-gray-800 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">{meta.title}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{meta.description}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {granted && grantedAt && <>Accordé le {grantedAt}</>}
                      {!granted && revokedAt && <>Révoqué le {revokedAt}</>}
                      {!granted && !revokedAt && !stored && <>Jamais enregistré</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        granted
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {granted ? "Actif" : "Inactif"}
                    </span>
                    <Switch
                      checked={granted}
                      disabled={!status?.agentEnabled}
                      aria-label={`${meta.title} — ${granted ? "actif" : "inactif"}`}
                      onCheckedChange={(checked) =>
                        setConsentDraft((prev) => ({ ...prev, [type]: checked }))
                      }
                      className={granted ? "bg-emerald-600" : undefined}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={saveConsents}
            disabled={!status?.agentEnabled || actionLoading === "consents"}
            className={agentBtnPrimary}
          >
            Enregistrer les consentements
          </button>
        </AgentPanel>

        <AgentPanel title="Connecter une boîte mail">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={connectGmail}
              disabled={
                !status?.agentEnabled ||
                !status?.hasRequiredConsents ||
                actionLoading === "gmail"
              }
              className={agentBtnSecondary}
            >
              Lier Gmail (OAuth lecture seule)
            </button>
          </div>

          <form onSubmit={submitImap} className="grid gap-3 md:grid-cols-2">
            <input
              required
              placeholder="Adresse email"
              value={imapForm.emailAddress}
              onChange={(e) => setImapForm((f) => ({ ...f, emailAddress: e.target.value }))}
              onBlur={handleImapEmailBlur}
              className={agentFieldClass}
            />
            <input
              required
              type="password"
              placeholder="Mot de passe / app password"
              value={imapForm.password}
              onChange={(e) => setImapForm((f) => ({ ...f, password: e.target.value }))}
              className={agentFieldClass}
            />
            <input
              required
              placeholder="Hôte IMAP (ex. imap.mail.ovh.net)"
              value={imapForm.imapHost}
              onChange={(e) => setImapForm((f) => ({ ...f, imapHost: e.target.value }))}
              className={agentFieldClass}
            />
            <input
              placeholder="Port IMAP"
              value={imapForm.imapPort}
              onChange={(e) => setImapForm((f) => ({ ...f, imapPort: e.target.value }))}
              className={agentFieldClass}
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
              className={`md:col-span-2 ${agentBtnPrimary}`}
            >
              Ajouter boîte IMAP
            </button>
          </form>
        </AgentPanel>

        {status && status.mailboxes.length > 0 && (
          <AgentPanel title="Boîtes connectées">
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
                    className={agentBtnDanger}
                  >
                    Révoquer
                  </button>
                </li>
              ))}
            </ul>
          </AgentPanel>
        )}

        {messages.length > 0 && (
          <AgentPanel title={`Emails à traiter (${messages.length})`}>
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
          </AgentPanel>
        )}
    </AgentPageShell>
  );
}
