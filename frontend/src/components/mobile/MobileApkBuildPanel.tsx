"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  bootstrapEmulatorDev,
  buildApkFromBackoffice,
  fetchApkInfo,
  fetchAdbDevices,
  fetchEmulatorHealth,
  installApkOnDevice,
  localApkDownloadHref,
  formatApkDownloadFilename,
  type AdbDevice,
  type ApkInfo,
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

export function MobileApkBuildPanel({
  onBuilt,
  onPublishRequest,
  publishing,
}: MobileApkBuildPanelProps) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [controllerOk, setControllerOk] = useState<boolean | null>(null);
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [building, setBuilding] = useState(false);
  const [buildSeconds, setBuildSeconds] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const buildAbortRef = useRef<AbortController | null>(null);
  const bootstrapOnceRef = useRef(false);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-14), line]);
  }, []);

  const refreshStatus = useCallback(async () => {
    const health = await fetchEmulatorHealth();
    setControllerOk(!!health?.ok);
    setApkInfo(await fetchApkInfo());
    const devs = await fetchAdbDevices();
    setDevices(devs);
    setSelectedDevice((prev) => {
      if (prev && devs.some((d) => d.id === prev)) return prev;
      return devs[0]?.id || "";
    });
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
    const poll = window.setInterval(() => void refreshStatus(), 8000);
    return () => window.clearInterval(poll);
  }, [bootstrapping, refreshStatus]);

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
    addLog("Build APK en cours (1–3 min)…");
    buildAbortRef.current = new AbortController();
    try {
      const { ok, data } = await buildApkFromBackoffice(buildAbortRef.current.signal);
      addLog(data.message || (ok ? "Build réussi." : data.error || "Build échoué."));
      if (data.stderr) addLog(data.stderr.slice(-400));
      if (ok) {
        await refreshStatus();
        onBuilt?.({
          version: data.version || apkInfo?.version || "1.0.0",
          buildNumber: String(data.buildNumber || apkInfo?.buildNumber || "1"),
        });
      }
    } catch (e) {
      addLog(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
      buildAbortRef.current = null;
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Étape 2 — Tester sur appareil (ADB)
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Appareils détectés automatiquement. <code>adb reverse</code> est appliqué à la préparation
          (OTA + API sur le téléphone sans config manuelle).
        </p>

        {devices.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-gray-300 px-3 py-4 text-sm text-gray-500 dark:border-gray-600">
            Aucun appareil pour l’instant — branchez le téléphone (débogage USB), la liste se met à
            jour toutes les 8 s.
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
        <pre className="max-h-36 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
          {logs.join("\n")}
        </pre>
      ) : null}
    </div>
  );
}
