"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/features";
import { useAuth } from "@/lib/hooks/auth";
import {
  AgentConsentType,
  AgentStatusResponse,
  CONSENT_LABELS,
  connectImapMailbox,
  fetchAgentStatus,
  fetchTriageMessages,
  reviewTriageMessage,
  revokeMailbox,
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
  const { isAuthenticated, loading: authLoading, token } = useAuth();
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
                <strong>{status.agentEnabled ? "Oui" : "Non (demandez l’activation à un admin)"}</strong>
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
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Flag produit <code>JOB_SEARCH_AGENT_ENABLED</code> — activable par un administrateur
                depuis la fiche utilisateur.
              </p>
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
            <button
              type="submit"
              disabled={
                !status?.agentEnabled ||
                !status?.hasRequiredConsents ||
                actionLoading === "imap"
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
              {messages.map((msg) => (
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
                  <div className="flex gap-2">
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
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </AdminLayout>
  );
}
