"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bootstrapEmulatorDev,
  buildApkFromBackoffice,
  fetchApkInfo,
  fetchAdbDevices,
  fetchBuildSession,
  fetchEmulatorHealth,
  installApkOnDevice,
  localApkDownloadHref,
  formatApkDownloadFilename,
  type AdbDevice,
  type AdbDiagnostics,
  type ApkInfo,
  type BuildSession,
} from "@/lib/mobile/emulatorControllerClient";

type MobileApkBuildPanelProps = {
  onBuilt?: (info: { version: string; buildNumber: string }) => void;
  onPublishRequest?: () => void;
  publishing?: boolean;
};

function deviceLabel(d: AdbDevice): string {
  const name = d.model ? `${d.model}` : d.id;
  if (!d.appInstalled) return `${name} — app non installée`;
  return `${name} — v${d.appVersionName ?? "?"} (${d.appVersionCode ?? "?"})`;
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function MobileApkBuildPanel({
  onBuilt,
  onPublishRequest,
  publishing,
}: MobileApkBuildPanelProps) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [controllerOk, setControllerOk] = useState<boolean | null>(null);
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [pendingDevices, setPendingDevices] = useState<AdbDevice[]>([]);
  const [diagnostics, setDiagnostics] = useState<AdbDiagnostics | null>(null);
  const [buildSession, setBuildSession] = useState<BuildSession | null>(null);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [building, setBuilding] = useState(false);
  const [buildSeconds, setBuildSeconds] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastBuildError, setLastBuildError] = useState<string | null>(null);
  const buildAbortRef = useRef<AbortController | null>(null);
  const bootstrapOnceRef = useRef(false);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-24), line]);
  }, []);

  const refreshStatus = useCallback(async () => {
    const health = await fetchEmulatorHealth();
    setControllerOk(!!health?.ok);
    setApkInfo(await fetchApkInfo());
    const adb = await fetchAdbDevices();
    setDevices(adb.devices);
    setPendingDevices(adb.pendingDevices);
    setDiagnostics(adb.diagnostics);
    setSelectedDevice((prev) => {
      if (prev && adb.devices.some((d) => d.id === prev)) return prev;
      return adb.devices[0]?.id || "";
    });
    const sessionData = await fetchBuildSession();
    if (sessionData?.session) setBuildSession(sessionData.session);
  }, []);

  const runBootstrap = useCallback(async () => {
    setBootstrapping(true);
    addLog("Préparation automatique (contrôleur + ADB)…");
    const result = await bootstrapEmulatorDev();
    if (result.steps?.length) {
      for (const step of result.steps) addLog(step);
    }
    if (result.ok) {
      addLog(
        result.deviceCount
          ? `${result.deviceCount} appareil(s) détecté(s).`
          : "Environnement prêt — branchez un téléphone USB si besoin.",
      );
    } else {
      addLog(result.error || "Préparation incomplète — nouvel essai dans quelques secondes…");
    }
    await refreshStatus();
    setBootstrapping(false);
  }, [addLog, refreshStatus]);

  useEffect(() => {
    if (bootstrapOnceRef.current) return;
    bootstrapOnceRef.current = true;
    void runBootstrap();
  }, [runBootstrap]);

  useEffect(() => {
    if (bootstrapping) return;
    // Rafraîchissement rapide tant qu'aucun appareil prêt (détection USB / autorisation RSA)
    const intervalMs =
      devices.length === 0 || pendingDevices.length > 0 ? 3000 : 8000;
    const poll = window.setInterval(() => void refreshStatus(), intervalMs);
    return () => window.clearInterval(poll);
  }, [bootstrapping, refreshStatus, devices.length, pendingDevices.length]);

  useEffect(() => {
    if (!building) return;
    const id = window.setInterval(() => setBuildSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [building]);

  const selected = devices.find((d) => d.id === selectedDevice);

  const runBuild = async () => {
    if (!controllerOk) await runBootstrap();
    setBuilding(true);
    setBuildSeconds(0);
    setLastBuildError(null);
    addLog("Build APK en cours (1–3 min)…");
    buildAbortRef.current = new AbortController();
    try {
      const { ok, data } = await buildApkFromBackoffice(buildAbortRef.current.signal);
      addLog(data.message || (ok ? "Build réussi." : data.error || "Build échoué."));
      if (data.stderr) addLog(data.stderr.slice(-600));
      if (ok) {
        setLastBuildError(null);
        await refreshStatus();
        onBuilt?.({
          version: data.version || apkInfo?.version || "1.0.0",
          buildNumber: String(data.buildNumber || apkInfo?.buildNumber || "1"),
        });
      } else {
        const err = data.stderr || data.error || data.message || "Build échoué";
        setLastBuildError(err);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(msg);
      setLastBuildError(msg);
    } finally {
      setBuilding(false);
      buildAbortRef.current = null;
      await refreshStatus();
    }
  };

  const runInstall = async () => {
    if (!selectedDevice) return;
    if (!controllerOk) await runBootstrap();
    setInstalling(true);
    addLog(`Installation + lancement sur ${selectedDevice}…`);
    try {
      const result = await installApkOnDevice(selectedDevice);
      addLog(result.message || result.error || "Terminé.");
      if (result.success) await refreshStatus();
    } finally {
      setInstalling(false);
    }
  };

  const sessionLabel = buildSession?.finishedAt
    ? buildSession.success
      ? `Dernier build réussi — ${formatWhen(buildSession.finishedAt)} · v${buildSession.version}+${buildSession.buildNumber}`
      : `Dernier build en erreur — ${formatWhen(buildSession.finishedAt)}`
  : apkInfo?.modifiedAt
    ? `APK sur disque — compilé le ${formatWhen(apkInfo.modifiedAt)}`
    : null;

  return (
    <div className="space-y-4">
      {bootstrapping ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100">
          Préparation automatique de l’environnement mobile (contrôleur, adb reverse)…
        </div>
      ) : null}

      <section className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Étape 1 — Build APK
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Tout est piloté depuis ici — pas de terminal requis. Le contrôleur démarre automatiquement
          au chargement de la page.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              controllerOk
                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                : controllerOk === false
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                  : "bg-gray-100 text-gray-600"
            }`}
          >
            Contrôleur :{" "}
            {bootstrapping ? "préparation…" : controllerOk ? "connecté" : "en attente"}
          </span>
          {apkInfo?.exists ? (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              APK v{apkInfo.version}+{apkInfo.buildNumber}
              {apkInfo.sizeBytes
                ? ` · ${Math.round(apkInfo.sizeBytes / 1024 / 1024)} Mo`
                : ""}
            </span>
          ) : (
            <span className="text-xs text-amber-700 dark:text-amber-300">Aucun APK compilé</span>
          )}
          <button
            type="button"
            disabled={bootstrapping}
            onClick={() => void runBootstrap().then(() => refreshStatus())}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Relancer la préparation
          </button>
        </div>

        {sessionLabel ? (
          <p
            className={`mt-2 text-xs ${
              buildSession && !buildSession.success
                ? "font-medium text-red-700 dark:text-red-300"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {sessionLabel}
          </p>
        ) : null}

        {lastBuildError ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            <p className="font-semibold">Erreur du dernier build</p>
            <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-xs">{lastBuildError}</pre>
            {lastBuildError.includes("git") || lastBuildError.includes("safe.directory") ? (
              <p className="mt-2 text-xs">
                Cause : dépôt Flutter monté depuis l’hôte (ownership git). Rebuild le contrôleur :{" "}
                <code className="rounded bg-red-100 px-1 dark:bg-red-900">
                  docker compose build emulator-controller &amp;&amp; docker compose up -d emulator-controller
                </code>
                {" "}puis relancez le build.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={building || bootstrapping}
            onClick={() => void runBuild()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {building ? `Build… ${buildSeconds}s` : "Lancer le build APK"}
          </button>
          {apkInfo?.exists ? (
            <a
              href={localApkDownloadHref()}
              download={
                apkInfo.downloadFilename ||
                formatApkDownloadFilename(apkInfo.version, apkInfo.buildNumber)
              }
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
            >
              Télécharger{" "}
              {formatApkDownloadFilename(apkInfo.version, apkInfo.buildNumber)}
            </a>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm dark:border-sky-900 dark:from-sky-950/30 dark:to-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Étape 2 — Tester sur appareil (ADB)
          </h2>
          <button
            type="button"
            disabled={bootstrapping}
            onClick={() => void refreshStatus()}
            className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            Actualiser appareils
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Appareils détectés automatiquement (rafraîchissement 8 s).{" "}
          <code>adb reverse</code> est appliqué à la préparation.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-900 dark:bg-sky-900/50 dark:text-sky-100">
            {devices.length} prêt(s)
          </span>
          {pendingDevices.length > 0 ? (
            <span className="animate-pulse rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
              {pendingDevices.length} en attente — acceptez le débogage USB sur le téléphone
            </span>
          ) : null}
          <span className="text-gray-400">
            ↻ auto {devices.length === 0 || pendingDevices.length > 0 ? "3 s" : "8 s"}
          </span>
          {(diagnostics?.flutterDevices?.length ?? 0) > 0 ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-900 dark:bg-violet-900/50 dark:text-violet-100">
              {diagnostics?.flutterDevices?.length} émulateur(s) Flutter
            </span>
          ) : null}
        </div>

        {pendingDevices.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            {pendingDevices.map((d) => (
              <li key={d.id}>
                <strong>{d.id}</strong> — état « {d.status} »
                {d.status === "unauthorized"
                  ? " : déverrouillez le téléphone et acceptez le débogage USB."
                  : ""}
              </li>
            ))}
          </ul>
        ) : null}

        {diagnostics?.hints && diagnostics.hints.length > 0 && devices.length === 0 ? (
          <ul className="mt-3 space-y-1 rounded-md border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-400">
            {diagnostics.hints.map((h) => (
              <li key={h}>• {h}</li>
            ))}
          </ul>
        ) : null}

        {devices.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-gray-600">
            Aucun appareil <strong>prêt</strong> — branchez le téléphone (débogage USB + autorisation RSA).
            {pendingDevices.length > 0
              ? " Un appareil est visible mais pas encore autorisé (voir ci-dessus)."
              : null}
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {devices.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                  selectedDevice === d.id
                    ? "border-sky-500 bg-sky-50/80 dark:border-sky-600 dark:bg-sky-950/40"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <input
                  type="radio"
                  name="adb-device"
                  checked={selectedDevice === d.id}
                  onChange={() => setSelectedDevice(d.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{deviceLabel(d)}</p>
                  <p className="text-xs text-gray-500">
                    {d.id}
                    {d.androidVersion ? ` · Android ${d.androidVersion}` : ""}
                  </p>
                  {d.appInstalled && d.updateNeeded ? (
                    <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                      Mise à jour recommandée (pubspec v{d.localApkVersion}+{d.localApkBuild})
                    </p>
                  ) : null}
                </div>
              </label>
            ))}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={!apkInfo?.exists || installing || !selectedDevice || bootstrapping}
                onClick={() => void runInstall()}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {installing ? "Installation…" : "Installer / mettre à jour sur l’appareil"}
              </button>
            </div>
          </div>
        )}

        {(diagnostics?.flutterDevices?.length ?? 0) > 0 ? (
          <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/20">
            <p className="text-xs font-medium text-violet-900 dark:text-violet-200">
              Émulateurs Flutter détectés
            </p>
            <ul className="mt-1 text-xs text-violet-800 dark:text-violet-300">
              {diagnostics?.flutterDevices?.map((fd) => (
                <li key={fd.id}>
                  {fd.name} ({fd.id})
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {apkInfo?.exists && onPublishRequest ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/20">
          <p className="text-sm text-gray-800 dark:text-gray-200">
            <strong>Étape 3</strong> — Après test sur appareil, publiez sur le canal <strong>dev</strong>.
            Les liens OTA utilisent l’API déjà configurée sur le téléphone (plus de *.localhost).
          </p>
          <button
            type="button"
            disabled={publishing}
            onClick={onPublishRequest}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {publishing ? "Publication…" : "Publier sur canal dev (étape 3)"}
          </button>
        </section>
      ) : null}

      {logs.length > 0 ? (
        <pre className="max-h-48 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
          {logs.join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
