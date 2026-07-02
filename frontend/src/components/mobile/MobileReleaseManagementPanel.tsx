"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/lib/hooks/auth";
import { FRONTEND_URLS } from "@/config/ports.config";
import { MobileApkBuildPanel } from "@/components/mobile/MobileApkBuildPanel";
import { fetchBuiltApkBlob } from "@/lib/mobile/emulatorControllerClient";

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
};

type ChannelPlatformState = {
  activeReleaseId: string | null;
  minVersion: string;
  minBuild: number;
  forceUpdate: boolean;
  activeRelease: MobileRelease | null;
};

type AdminReleaseState = {
  releasesDir: string;
  deployHints?: {
    publicApiUrl: string | null;
    mobileDownloadBaseUrl?: string | null;
    suggestedVersion: string;
    suggestedBuild: number;
    latestAndroidRelease: MobileRelease | null;
  };
  channels: Record<string, Record<string, ChannelPlatformState>>;
  releases: MobileRelease[];
};

const APK_OUTPUT =
  "mobile/build/app/outputs/flutter-apk/app-debug.apk";

function resolveDownloadHref(release: Pick<MobileRelease, "filename" | "downloadUrl">): string | null {
  if (release.filename) {
    return `/api/v1/mobile/releases/download/${encodeURIComponent(release.filename)}`;
  }
  return release.downloadUrl ?? null;
}

const DEPLOY_STEPS = [
  {
    title: "1 — Build APK (backoffice étape 1)",
    body: "Incrémentez mobile/pubspec.yaml, démarrez le contrôleur, cliquez « Lancer le build APK ».",
    code: "bash scripts/mobile/setup/restart-emulator-controller.sh",
  },
  {
    title: "2 — Tester sur appareil ADB (backoffice étape 2)",
    body: "Sélectionnez l’appareil détecté automatiquement. Vérifiez la version installée, puis « Installer / mettre à jour ».",
    code: "adb devices",
  },
  {
    title: "3 — Publier sur le canal DEV (formulaire ci-dessous)",
    body: "Upload ou bouton « Publier sur canal dev ». Version/build = pubspec.yaml.",
    code: APK_OUTPUT,
  },
  {
    title: "4 — Bêta-testeurs reçoivent la mise à jour OTA",
    body: "APK debug → canal dev au démarrage. Partagez le lien OTA ou laissez l’app proposer la MAJ.",
  },
  {
    title: "5 — Promouvoir en PRODUCTION",
    body: "Après validation porteur : « Promouvoir dev → production » sur la carte Production.",
  },
] as const;

function CopyBlock({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex flex-wrap items-start gap-2">
      <pre className="max-w-full flex-1 overflow-x-auto rounded-md bg-gray-900 px-3 py-2 text-xs text-gray-100">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(text.split("\n")[0] ?? text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
      >
        {copied ? "Copié" : label ?? "Copier"}
      </button>
    </div>
  );
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
      const detail = axios.isAxiosError(e)
        ? (e.response?.data as { error?: string })?.error || e.message
        : "Upload échoué";
      setError(detail);
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
    try {
      const blob = await fetchBuiltApkBlob();
      const file = new File([blob], "app-debug.apk", {
        type: "application/vnd.android.package-archive",
      });
      await uploadApkFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de récupérer l’APK buildé");
    }
  };

  const promoteDevToProd = async () => {
    if (!token) return;
    if (
      !confirm(
        "Promouvoir la release Android active du canal DEV vers PRODUCTION ? Les testeurs production recevront l’OTA.",
      )
    ) {
      return;
    }
    setActionId("promote");
    setMessage(null);
    try {
      await axios.post(
        adminApi("/mobile/releases/promote"),
        { platform: "android", fromChannel: "dev", toChannel: "production" },
        { headers: authHeaders },
      );
      setMessage("Release dev promue en production.");
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
  const publicApiUrl = state?.deployHints?.publicApiUrl;
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
      />

      {state ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
          <p className="font-semibold">État serveur OTA</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            <li>
              Stockage APK : <code>{state.releasesDir}</code>
            </li>
            <li>
              URL publique API (liens OTA mobile) :{" "}
              {publicApiUrl ? (
                <code>{publicApiUrl}</code>
              ) : (
                <span className="text-amber-700 dark:text-amber-300">
                  non configurée — définir <code>PUBLIC_API_URL</code> dans <code>.env</code>
                </span>
              )}
            </li>
            {mobileDownloadBase && mobileDownloadBase !== publicApiUrl ? (
              <li>
                URL téléchargement APK (téléphone) : <code>{mobileDownloadBase}</code>
                <span className="text-gray-600 dark:text-gray-400">
                  {" "}
                  — dérivée de <code>MOBILE_DEV_LAN_HOST</code> (évite *.localhost sur Samsung)
                </span>
              </li>
            ) : null}
            {publicApiUrl?.includes(".localhost") && !mobileDownloadBase ? (
              <li className="text-amber-800 dark:text-amber-200">
                Sur appareil physique, définir <code>MOBILE_DEV_LAN_HOST=&lt;IP LAN&gt;</code> dans{" "}
                <code>.env</code> puis redémarrer <code>api-gateway</code>. L’app réécrit aussi
                l’URL vers son API configurée (adb reverse / LAN).
              </li>
            ) : null}
            <li>
              Prochain build suggéré :{" "}
              <strong>
                {state.deployHints?.suggestedVersion ?? version}+
                {state.deployHints?.suggestedBuild ?? buildNumber}
              </strong>{" "}
              (aligner <code>mobile/pubspec.yaml</code> avant compilation)
            </li>
          </ul>
        </div>
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

      <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
        <h2 className="text-base font-semibold text-indigo-950 dark:text-indigo-100">
          Parcours développeur local (5 étapes)
        </h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-indigo-900 dark:text-indigo-200">
          <li>Build APK (panneau vert ci-dessus)</li>
          <li>Test ADB + version installée (panneau bleu)</li>
          <li>Publication canal dev (formulaire « Étape 3 »)</li>
          <li>OTA bêta-testeurs (canal dev)</li>
          <li>Promotion production</li>
        </ol>
        <p className="mt-2 text-xs text-indigo-800/80 dark:text-indigo-300/80">
          API / backoffice / frontend : stack Docker habituelle. Le conteneur{" "}
          <code>deployment-service</code> sert au déploiement orchestré (Portainer) — pas requis pour
          un push APK local.
        </p>
      </section>

      <section className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm dark:border-indigo-800 dark:from-indigo-950/40 dark:to-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Comment déployer une release Android
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Suivez ces étapes dans l’ordre. Le backoffice héberge l’APK ; l’app mobile vérifie les mises à jour
          via <code className="text-xs">/api/v1/mobile/releases/latest</code> (canal{" "}
          <strong>dev</strong> en debug, <strong>production</strong> en release).
        </p>
        <div className="mt-4 space-y-3">
          {DEPLOY_STEPS.map((step) => (
            <div
              key={step.title}
              className="rounded-lg border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/50 dark:bg-gray-900/60"
            >
              <p className="font-semibold text-indigo-900 dark:text-indigo-200">{step.title}</p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{step.body}</p>
              {"code" in step && step.code ? <CopyBlock text={step.code} /> : null}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Config serveur : <code>MOBILE_RELEASES_DIR</code>, <code>PUBLIC_API_URL</code> ({" "}
          <code>.env.example</code>). Stockage actuel : <code>{state?.releasesDir ?? "—"}</code>
        </p>
      </section>

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
          subtitle="OTA pour utilisateurs finaux (promotion depuis dev)"
          channelState={prodAndroid}
          loading={loading}
          onPromote={promoteDevToProd}
          promoteLoading={actionId === "promote"}
          otaBaseUrl={otaBaseUrl}
        />
      </div>

      <section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Étape 3 — Publier un APK sur le canal DEV
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Sélectionnez le fichier <code>{APK_OUTPUT}</code>. La <strong>version</strong> et le{" "}
          <strong>build</strong> doivent correspondre à{" "}
          <code>mobile/pubspec.yaml</code> (suggestion serveur :{" "}
          <code>
            {state?.deployHints?.suggestedVersion ?? version}+
            {state?.deployHints?.suggestedBuild ?? buildNumber}
          </code>
          ).
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
              disabled={uploading || !apkFile}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? "Envoi…" : "Publier sur le canal (étape 3)"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Historique des builds</h2>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
          >
            Actualiser
          </button>
        </div>
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
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Téléchargement</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.releases.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-2 py-2 font-medium">{r.version}</td>
                    <td className="px-2 py-2">{r.buildNumber}</td>
                    <td className="px-2 py-2">{r.channel}</td>
                    <td className="px-2 py-2">{formatDate(r.createdAt)}</td>
                    <td className="px-2 py-2">
                      {(() => {
                        const href = resolveDownloadHref(r);
                        return href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            APK
                          </a>
                        ) : (
                          "—"
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2">
                      {r.platform === "android" ? (
                        <div className="flex flex-wrap gap-1">
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
                        </div>
                      ) : (
                        "iOS"
                      )}
                    </td>
                  </tr>
                ))}
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
