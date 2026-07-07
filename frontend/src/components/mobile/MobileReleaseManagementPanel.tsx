"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/lib/hooks/auth";
import { FRONTEND_URLS } from "@/config/ports.config";
import { MobileApkBuildPanel } from "@/components/mobile/MobileApkBuildPanel";
import { readWizardPublish, writeWizardPublish } from "@/lib/mobile/mobileOtaWizardStorage";

type MobileRelease = {
  id: string;
  channel: string;
  platform: string;
  version: string;
  buildNumber: number;
  releaseNotes?: string;
  filename?: string | null;
  downloadUrl?: string | null;
  storeUrl?: string | null;
  createdAt: string;
  createdBy?: string | null;
  status?: string;
  githubTag?: string;
  githubReleaseUrl?: string | null;
  fileSizeBytes?: number;
  fileSizeLabel?: string | null;
};

type DeployHints = {
  publicApiUrl: string | null;
  mobileDownloadBaseUrl?: string | null;
  suggestedVersion: string;
  suggestedBuild: number;
  pubspecVersion?: string | null;
  pubspecBuild?: number | null;
  pubspecPath?: string | null;
  needsPubspecBump?: boolean;
  canPublishCurrentBuild?: boolean;
  publishBlockedReason?: string | null;
  githubReleasesEnabled?: boolean;
  githubRepository?: string | null;
  latestAndroidRelease: MobileRelease | null;
  activeDevRelease?: MobileRelease | null;
  activeProdRelease?: MobileRelease | null;
};

type AdminReleaseState = {
  releasesDir: string;
  deployHints?: DeployHints;
  channels: Record<string, Record<string, ChannelPlatformState>>;
  releases: MobileRelease[];
};

type ChannelPlatformState = {
  activeReleaseId: string | null;
  minVersion: string;
  minBuild: number;
  forceUpdate: boolean;
  activeRelease: MobileRelease | null;
};

function statusBadge(status?: string, channel?: string) {
  const label = status || "active";
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    superseded: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    promoted: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[label] || styles.active}`}
      title={channel ? `Canal ${channel}` : undefined}
    >
      {label}
    </span>
  );
}

function resolveDownloadHref(release: Pick<MobileRelease, "filename" | "downloadUrl">): string | null {
  if (release.filename) {
    return `/api/v1/mobile/releases/download/${encodeURIComponent(release.filename)}`;
  }
  return release.downloadUrl ?? null;
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("fr-FR");
}

export function MobileReleaseManagementPanel() {
  const { token } = useAuth();
  const [state, setState] = useState<AdminReleaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiDiag, setApiDiag] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [version, setVersion] = useState("1.0.0");
  const [buildNumber, setBuildNumber] = useState("1");
  const [channel, setChannel] = useState<"dev" | "production">("dev");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [hintsApplied, setHintsApplied] = useState(false);

  const apiBase =
    typeof window !== "undefined" ? "" : FRONTEND_URLS.api.replace(/\/$/, "");

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  const adminApi = (path: string) =>
    `${apiBase}/api/v1/admin${path.startsWith("/") ? path : `/${path}`}`;

  const load = useCallback(async () => {
    if (!token) {
      setError("Connectez-vous au backoffice pour gérer les releases mobile.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setApiDiag(null);
    try {
      const res = await axios.get<{ success: boolean; data: AdminReleaseState }>(
        adminApi("/mobile/releases"),
        { headers: authHeaders },
      );
      if (res.data.success) {
        setState(res.data.data);
        const hints = res.data.data.deployHints;
        if (hints && !hintsApplied) {
          setVersion(hints.suggestedVersion);
          setBuildNumber(String(hints.suggestedBuild));
          setHintsApplied(true);
        }
      } else {
        setError("Réponse API inattendue.");
      }
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const body = e.response?.data as { error?: string; message?: string } | undefined;
        const detail = body?.error || body?.message || e.message;
        if (status === 404) {
          let testHint = "";
          try {
            const testRes = await axios.get(adminApi("/test"), { headers: authHeaders });
            if (testRes.status === 200) {
              testHint =
                " La route admin générale répond (GET /admin/test OK) mais pas mobile/releases "
                + "→ le processus gateway doit être redémarré pour charger le code à jour.";
            }
          } catch {
            testHint = " Même GET /admin/test en échec → conteneur api-gateway arrêté ou code admin non chargé.";
          }
          setApiDiag(
            "Route `/api/v1/admin/mobile/releases` introuvable (404)."
              + testHint
              + " Correction : `docker compose up -d api-gateway` (npm install au démarrage) "
              + "ou `docker compose restart api-gateway` après `docker compose exec api-gateway npm install`.",
          );
        }
        setError(`Erreur ${status ?? "réseau"} : ${detail}`);
      } else {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    } finally {
      setLoading(false);
    }
  }, [authHeaders, hintsApplied, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const uploadApkFile = async (file: File) => {
    if (!token) return;
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("apk", file);
      form.append("version", version.trim());
      form.append("buildNumber", buildNumber.trim());
      form.append("channel", channel);
      form.append("platform", "android");
      form.append("releaseNotes", releaseNotes.trim());
      await axios.post(adminApi("/mobile/releases/upload"), form, {
        headers: { ...authHeaders, "Content-Type": "multipart/form-data" },
      });
      setMessage(`APK ${version} (build ${buildNumber}) publié sur le canal ${channel}.`);
      setApkFile(null);
      setReleaseNotes("");
      await load();
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 413) {
        setError(
          "APK trop volumineux pour l’upload navigateur (limite nginx). Utilisez le bouton « Publier sur canal dev » du panneau vert (étape 1) — copie directe côté serveur.",
        );
      } else {
        const detail = axios.isAxiosError(e)
          ? (e.response?.data as { error?: string })?.error || e.message
          : "Upload échoué";
        setError(detail);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!apkFile) return;
    await uploadApkFile(apkFile);
  };

  const publishBuiltApk = async () => {
    if (!token) return;
    const deployHints = state?.deployHints;
    const pubV = deployHints?.pubspecVersion?.trim() || version.trim();
    const pubB = deployHints?.pubspecBuild != null ? String(deployHints.pubspecBuild) : buildNumber.trim();
    setUploading(true);
    setMessage(null);
    setError(null);
    try {
      await axios.post(
        adminApi("/mobile/releases/publish-built"),
        {
          version: pubV,
          buildNumber: pubB,
          channel: "dev",
          releaseNotes: releaseNotes.trim(),
          platform: "android",
        },
        { headers: authHeaders },
      );
      const msg = `APK ${pubV} (build ${pubB}) publié sur le canal dev (copie serveur).`;
      setMessage(msg);
      writeWizardPublish({
        version: pubV,
        buildNumber: pubB,
        channel: "dev",
        message: msg,
      });
      setReleaseNotes("");
      await load();
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 413) {
        setError(
          "Fichier trop volumineux (413). Utilisez « Publier sur canal dev » du panneau vert (copie serveur) ou augmentez client_max_body_size nginx.",
        );
      } else {
        const detail = axios.isAxiosError(e)
          ? (e.response?.data as { error?: string })?.error || e.message
          : "Publication échouée";
        setError(detail);
      }
    } finally {
      setUploading(false);
    }
  };

  const promoteDevToProd = async () => {
    if (!token) return;
    const src = state?.deployHints?.activeDevRelease;
    const label = src ? `v${src.version}+${src.buildNumber}` : "la release dev active";
    if (
      !confirm(
        `Promouvoir ${label} vers PRODUCTION ? Les appareils production recevront l’OTA.`,
      )
    ) {
      return;
    }
    setActionId("promote");
    setMessage(null);
    setError(null);
    try {
      await axios.post(
        adminApi("/mobile/releases/promote"),
        { platform: "android", fromChannel: "dev", toChannel: "production" },
        { headers: authHeaders },
      );
      const msg = `Release ${label} promue en production.`;
      setMessage(msg);
      await load();
    } catch (e) {
      setError(
        axios.isAxiosError(e)
          ? (e.response?.data as { error?: string })?.error || e.message
          : "Promotion échouée",
      );
    } finally {
      setActionId(null);
    }
  };

  const activateRelease = async (id: string, targetChannel: "dev" | "production") => {
    if (!token) return;
    setActionId(id);
    try {
      await axios.post(
        adminApi(`/mobile/releases/${id}/activate`),
        { channel: targetChannel, platform: "android" },
        { headers: authHeaders },
      );
      setMessage(`Release ${id} activée sur ${targetChannel}.`);
      await load();
    } catch (e) {
      setError(
        axios.isAxiosError(e)
          ? (e.response?.data as { error?: string })?.error || e.message
          : "Activation échouée",
      );
    } finally {
      setActionId(null);
    }
  };

  const devAndroid = state?.channels?.dev?.android;
  const prodAndroid = state?.channels?.production?.android;
  const hints = state?.deployHints;
  const activeDev = hints?.activeDevRelease;
  const activeProd = hints?.activeProdRelease;
  const storedPublish = typeof window !== "undefined" ? readWizardPublish() : null;
  const devPublishDone = Boolean(
    activeDev
    && hints?.pubspecBuild != null
    && activeDev.buildNumber === hints.pubspecBuild,
  );
  const prodPromoted = Boolean(
    activeProd
    && activeDev
    && activeProd.version === activeDev.version
    && activeProd.buildNumber === activeDev.buildNumber,
  );
  const devPublishMessage =
    storedPublish?.message
    || (activeDev
      ? `Canal dev actif : v${activeDev.version}+${activeDev.buildNumber} (${formatDate(activeDev.createdAt)})`
      : null);
  const promoteTargetLabel = activeDev ? `v${activeDev.version}+${activeDev.buildNumber}` : null;
  const publicApiUrl = hints?.publicApiUrl;
  const mobileDownloadBase = state?.deployHints?.mobileDownloadBaseUrl;
  const otaBaseUrl = mobileDownloadBase || publicApiUrl || (typeof window !== "undefined" ? window.location.origin : null);

  return (
    <div className="space-y-6">
      <MobileApkBuildPanel
        onBuilt={({ version: v, buildNumber: b }) => {
          setVersion(v);
          setBuildNumber(b);
        }}
        onPublishRequest={() => void publishBuiltApk()}
        publishing={uploading}
        publishBlocked={hints?.canPublishCurrentBuild === false}
        publishBlockedReason={hints?.publishBlockedReason ?? null}
        devPublishDone={devPublishDone}
        devPublishMessage={devPublishMessage}
        onPromoteRequest={() => void promoteDevToProd()}
        promoting={actionId === "promote"}
        prodPromoted={prodPromoted}
        promoteMessage={
          prodPromoted && activeProd
            ? `Production active : v${activeProd.version}+${activeProd.buildNumber}`
            : null
        }
        promoteTargetLabel={promoteTargetLabel}
      />

      {message ? (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-100">
          {error}
        </div>
      ) : null}

      {state ? (
        <details className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
          <summary className="cursor-pointer font-semibold">État serveur OTA (détails)</summary>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            <li>
              Stockage : <code>{state.releasesDir}</code>
            </li>
            <li>
              API OTA : {publicApiUrl ? <code>{publicApiUrl}</code> : "PUBLIC_API_URL non définie"}
            </li>
            <li>
              <code>pubspec.yaml</code> :{" "}
              <strong>
                {hints?.pubspecVersion ?? "—"}
              </strong>
              {" · "}
              build <strong>{hints?.pubspecBuild ?? "—"}</strong>
              {" · "}
              format JobbingTrack : le 3e chiffre = build (ex. 1.0.12+12). Incrément auto à chaque « Build APK ».
            </li>
            <li>
              Dev actif :{" "}
              {activeDev ? `v${activeDev.version}+${activeDev.buildNumber}` : "aucun"}
              {" · "}
              Prod actif :{" "}
              {activeProd ? `v${activeProd.version}+${activeProd.buildNumber}` : "aucun"}
            </li>
            {hints?.needsPubspecBump ? (
              <li className="text-amber-800 dark:text-amber-200">
                Prochain build suggéré :{" "}
                <code>
                  {hints.suggestedVersion}+{hints.suggestedBuild}
                </code>{" "}
                (incrément automatique au clic « Build APK », ou édition manuelle pubspec).
              </li>
            ) : null}
          </ul>
        </details>
      ) : null}
      {apiDiag ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">Diagnostic API (404)</p>
          <p className="mt-2">{apiDiag}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 rounded-md bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ChannelCard
          title="Canal DEV (bêta-testeurs)"
          subtitle="Appareils de test, émulateurs, APK fraîche avant prod"
          channelState={devAndroid}
          loading={loading}
          otaBaseUrl={otaBaseUrl}
        />
        <ChannelCard
          title="Canal PRODUCTION"
          subtitle="OTA utilisateurs finaux"
          channelState={prodAndroid}
          loading={loading}
          otaBaseUrl={otaBaseUrl}
        />
      </div>

      <details className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-800 dark:bg-gray-900">
        <summary className="cursor-pointer text-lg font-semibold text-gray-900 dark:text-gray-100">
          Upload manuel APK (optionnel)
        </summary>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Préférez le bouton « Publier sur canal dev » du panneau vert (copie serveur). L’upload navigateur
          sert de secours si l’APK n’est pas sur le serveur de build.
        </p>
        <form onSubmit={handleUpload} className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">Version (semver)</span>
            <input
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              placeholder="1.2.0"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Numéro de build</span>
            <div className="mt-1 flex gap-2">
              <input
                required
                value={buildNumber}
                onChange={(e) => setBuildNumber(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                placeholder="42"
              />
              {state?.deployHints ? (
                <button
                  type="button"
                  onClick={() => {
                    setVersion(state.deployHints!.suggestedVersion);
                    setBuildNumber(String(state.deployHints!.suggestedBuild));
                  }}
                  className="shrink-0 rounded-md border border-gray-300 px-2 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  Suggestion
                </button>
              ) : null}
            </div>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Canal</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "dev" | "production")}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            >
              <option value="dev">dev — bêta / validation (recommandé)</option>
              <option value="production">production — utilisateurs finaux (après promote)</option>
            </select>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              En pratique : uploadez d’abord en <strong>dev</strong>, validez, puis utilisez le bouton
              « Promouvoir dev → production » plutôt qu’un upload direct prod.
            </p>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium">Notes de version</span>
            <textarea
              value={releaseNotes}
              onChange={(e) => setReleaseNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="font-medium">Fichier APK</span>
            <input
              required
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => setApkFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={uploading || !apkFile || hints?.canPublishCurrentBuild === false}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Envoi…" : "Upload APK (secours)"}
            </button>
          </div>
        </form>
      </details>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Historique des versions</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Actualiser
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Chaque publication crée une entrée (package APK, notes, canal). La release{" "}
          <strong>active</strong> par canal est celle servie par l’OTA.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Chargement…</p>
        ) : !state?.releases?.length ? (
          <p className="mt-4 text-sm text-gray-500">Aucune release enregistrée. Uploadez un premier APK.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-2 py-2">Version</th>
                  <th className="px-2 py-2">Build</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2">Statut</th>
                  <th className="px-2 py-2">Package</th>
                  <th className="px-2 py-2">Taille</th>
                  <th className="px-2 py-2">Notes</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Auteur</th>
                  <th className="px-2 py-2">GitHub</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.releases.map((r) => {
                  const isActiveDev = devAndroid?.activeRelease?.id === r.id;
                  const isActiveProd = prodAndroid?.activeRelease?.id === r.id;
                  return (
                  <tr
                    key={r.id}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      isActiveDev || isActiveProd ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                    }`}
                  >
                    <td className="px-2 py-2 font-medium">
                      {r.version}
                      {isActiveDev || isActiveProd ? (
                        <span className="ml-1 text-xs text-emerald-700 dark:text-emerald-300">● OTA</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">{r.buildNumber}</td>
                    <td className="px-2 py-2">{r.channel}</td>
                    <td className="px-2 py-2">{statusBadge(r.status, r.channel)}</td>
                    <td className="px-2 py-2 max-w-[140px] truncate text-xs" title={r.filename ?? undefined}>
                      {r.filename ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-xs">{r.fileSizeLabel ?? "—"}</td>
                    <td className="px-2 py-2 max-w-[160px] truncate text-xs" title={r.releaseNotes || undefined}>
                      {r.releaseNotes?.trim() ? r.releaseNotes : "—"}
                    </td>
                    <td className="px-2 py-2">{formatDate(r.createdAt)}</td>
                    <td className="px-2 py-2 text-xs">{r.createdBy ?? "—"}</td>
                    <td className="px-2 py-2 text-xs">
                      {r.githubReleaseUrl ? (
                        <a
                          href={r.githubReleaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {r.githubTag ?? "Release"}
                        </a>
                      ) : r.githubTag ? (
                        <code>{r.githubTag}</code>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {(() => {
                          const href = resolveDownloadHref(r);
                          return href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                            >
                              APK
                            </a>
                          ) : null;
                        })()}
                      {r.platform === "android" ? (
                        <>
                          <button
                            type="button"
                            disabled={actionId === r.id}
                            onClick={() => void activateRelease(r.id, "dev")}
                            className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                          >
                            Activer dev
                          </button>
                          <button
                            type="button"
                            disabled={actionId === r.id}
                            onClick={() => void activateRelease(r.id, "production")}
                            className="rounded border border-gray-300 px-2 py-0.5 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                          >
                            Activer prod
                          </button>
                        </>
                      ) : (
                        "iOS"
                      )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ChannelCard({
  title,
  subtitle,
  channelState,
  loading,
  onPromote,
  promoteLoading,
  otaBaseUrl,
}: {
  title: string;
  subtitle: string;
  channelState?: ChannelPlatformState;
  loading: boolean;
  onPromote?: () => void;
  promoteLoading?: boolean;
  otaBaseUrl?: string | null;
}) {
  const active = channelState?.activeRelease;
  const downloadHref = active ? resolveDownloadHref(active) : null;
  const otaCheckUrl =
    otaBaseUrl && active
      ? `${String(otaBaseUrl).replace(/\/$/, "")}/api/v1/mobile/releases/latest?platform=android&channel=${encodeURIComponent(active.channel)}`
      : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      {loading ? (
        <p className="mt-3 text-sm text-gray-500">…</p>
      ) : active ? (
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <span className="text-gray-500">Active :</span> v{active.version} (build{" "}
            {active.buildNumber})
          </p>
          <p className="text-xs text-gray-500">{formatDate(active.createdAt)}</p>
          {downloadHref ? (
            <a
              href={downloadHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-blue-600 hover:underline dark:text-blue-400"
            >
              Télécharger l’APK
            </a>
          ) : null}
          {otaCheckUrl ? (
            <p className="text-xs text-gray-500">
              OTA :{" "}
              <code className="break-all">{otaCheckUrl}</code>
            </p>
          ) : null}
          {channelState?.forceUpdate ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Mise à jour forcée</p>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Aucune release active.</p>
      )}
      {onPromote ? (
        <button
          type="button"
          onClick={onPromote}
          disabled={promoteLoading || !channelState?.activeRelease}
          className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {promoteLoading ? "Promotion…" : "Étape 5 — Promouvoir dev → production"}
        </button>
      ) : null}
    </div>
  );
}
