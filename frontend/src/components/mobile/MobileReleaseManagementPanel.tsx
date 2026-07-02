"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/lib/hooks/auth";
import { FRONTEND_URLS } from "@/config/ports.config";

const API_URL = FRONTEND_URLS.api;

type Release = {
  id: string;
  channel: string;
  platform: string;
  version: string;
  buildNumber: number;
  releaseNotes?: string;
  filename?: string | null;
  storeUrl?: string | null;
  downloadUrl?: string | null;
  createdAt: string;
  createdBy?: string | null;
  status: string;
};

type ChannelPlatformState = {
  activeReleaseId: string | null;
  minVersion: string;
  minBuild: number;
  forceUpdate: boolean;
  activeRelease?: Release | null;
};

type AdminMobileReleaseState = {
  releasesDir: string;
  channels: Record<string, Record<string, ChannelPlatformState>>;
  releases: Release[];
};

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function MobileReleaseManagementPanel() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminMobileReleaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [uploadVersion, setUploadVersion] = useState("1.0.0");
  const [uploadBuild, setUploadBuild] = useState("1");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/v1/admin/mobile/releases`, {
        headers: authHeaders(token),
      });
      setData(res.data.data);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.error || e.message
        : "Erreur chargement releases mobile";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const devAndroid = data?.channels?.dev?.android;
  const prodAndroid = data?.channels?.production?.android;

  const recentReleases = useMemo(
    () => (data?.releases || []).slice(0, 12),
    [data?.releases],
  );

  async function uploadDevApk() {
    if (!token || !uploadFile) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("apk", uploadFile);
      form.append("channel", "dev");
      form.append("platform", "android");
      form.append("version", uploadVersion);
      form.append("buildNumber", uploadBuild);
      form.append("releaseNotes", uploadNotes);
      await axios.post(`${API_URL}/api/v1/admin/mobile/releases/upload`, form, {
        headers: {
          ...authHeaders(token),
          "Content-Type": "multipart/form-data",
        },
      });
      setMessage("APK dev publié — les appareils debug recevront cette version.");
      setUploadFile(null);
      await load();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.error || e.message
        : "Upload échoué";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  }

  async function promoteDevToProd() {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await axios.post(
        `${API_URL}/api/v1/admin/mobile/releases/promote`,
        { platform: "android", fromChannel: "dev", toChannel: "production" },
        { headers: authHeaders(token) },
      );
      setMessage("Version dev promue en production.");
      await load();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.error || e.message
        : "Promotion échouée";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  }

  async function patchPolicy(
    channel: "dev" | "production",
    patch: Partial<{ minVersion: string; minBuild: number; forceUpdate: boolean }>,
  ) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await axios.patch(
        `${API_URL}/api/v1/admin/mobile/releases/channels/${channel}/android`,
        patch,
        { headers: authHeaders(token) },
      );
      setMessage(`Politique ${channel} mise à jour.`);
      await load();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? e.response?.data?.error || e.message
        : "Mise à jour politique échouée";
      setError(String(msg));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">Chargement des releases mobile…</p>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ChannelCard
          title="Canal DEV (appareils debug / tests)"
          state={devAndroid}
          onForceUpdate={(forceUpdate) => patchPolicy("dev", { forceUpdate })}
        />
        <ChannelCard
          title="Canal PRODUCTION (app release)"
          state={prodAndroid}
          onForceUpdate={(forceUpdate) => patchPolicy("production", { forceUpdate })}
        />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Pousser une nouvelle version DEV (Android)
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Upload APK → canal dev. Les builds debug de l&apos;app consultent automatiquement ce canal.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Version</span>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={uploadVersion}
              onChange={(e) => setUploadVersion(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Build</span>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={uploadBuild}
              onChange={(e) => setUploadBuild(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Notes</span>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
            />
          </label>
          <label className="text-sm sm:col-span-2 lg:col-span-4">
            <span className="mb-1 block font-medium">Fichier APK</span>
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !uploadFile}
            onClick={() => void uploadDevApk()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Publier en DEV
          </button>
          <button
            type="button"
            disabled={busy || !devAndroid?.activeRelease}
            onClick={() => void promoteDevToProd()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Valider → passer en PRODUCTION
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Historique</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-2 py-2">Canal</th>
                <th className="px-2 py-2">Plateforme</th>
                <th className="px-2 py-2">Version</th>
                <th className="px-2 py-2">Statut</th>
                <th className="px-2 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentReleases.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-2">{r.channel}</td>
                  <td className="px-2 py-2">{r.platform}</td>
                  <td className="px-2 py-2">
                    {r.version}+{r.buildNumber}
                  </td>
                  <td className="px-2 py-2">{r.status}</td>
                  <td className="px-2 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.releasesDir ? (
          <p className="mt-3 text-xs text-gray-500">Stockage serveur : {data.releasesDir}</p>
        ) : null}
      </section>
    </div>
  );
}

function ChannelCard({
  title,
  state,
  onForceUpdate,
}: {
  title: string;
  state?: ChannelPlatformState;
  onForceUpdate: (force: boolean) => void;
}) {
  const active = state?.activeRelease;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {active ? (
        <dl className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <dt className="inline font-medium">Version active : </dt>
            <dd className="inline">
              {active.version}+{active.buildNumber}
            </dd>
          </div>
          {active.releaseNotes ? (
            <div>
              <dt className="font-medium">Notes</dt>
              <dd>{active.releaseNotes}</dd>
            </div>
          ) : null}
          {active.downloadUrl ? (
            <div className="truncate">
              <dt className="inline font-medium">URL : </dt>
              <dd className="inline break-all">{active.downloadUrl}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Aucune release active.</p>
      )}
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state?.forceUpdate === true}
          onChange={(e) => onForceUpdate(e.target.checked)}
        />
        Mise à jour obligatoire
      </label>
    </div>
  );
}
