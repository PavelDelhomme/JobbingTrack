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

type LogLine = { ts: string; msg: string };

const INSTALL_OK_KEY = "jt-mobile-releases-install-ok";

function nowLabel(): string {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function deviceLabel(d: AdbDevice): string {
  const name = d.model ? `${d.model}` : d.id;
  if (d.appInstalled === false) return `${name} — app non installée`;
  if (d.appInstalled === undefined) return name;
  if (!d.appInstalled) return `${name} — app non installée`;
  return `${name} — v${d.appVersionName ?? "?"} (${d.appVersionCode ?? "?"})`;
}

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function StepPill({
  n,
  label,
  state,
}: {
  n: number;
  label: string;
  state: "done" | "active" | "locked" | "error" | "ready";
}) {
  const styles = {
    done: "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    active: "border-blue-500 bg-blue-100 text-blue-900 ring-2 ring-blue-300 dark:bg-blue-900/40 dark:text-blue-100",
    ready: "border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100",
    locked: "border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-500",
    error: "border-red-500 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  };
  return (
    <div className={`flex flex-1 min-w-[120px] flex-col items-center rounded-lg border px-2 py-2 text-center text-xs ${styles[state]}`}>
      <span className="font-bold">{n}</span>
      <span className="mt-0.5 leading-tight">{label}</span>
    </div>
  );
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
  const [installPhase, setInstallPhase] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<LogLine[]>([]);
  const [lastBuildError, setLastBuildError] = useState<string | null>(null);
  const [installDone, setInstallDone] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const buildAbortRef = useRef<AbortController | null>(null);
  const bootstrapOnceRef = useRef(false);

  useEffect(() => {
    try {
      setInstallDone(sessionStorage.getItem(INSTALL_OK_KEY) === "1");
    } catch { /* ignore */ }
  }, []);

  const pushLog = useCallback((msg: string) => {
    setActivityLog((prev) => [...prev.slice(-30), { ts: nowLabel(), msg }]);
  }, []);

  const clearLog = useCallback(() => setActivityLog([]), []);

  const refreshStatus = useCallback(
    async (opts?: { full?: boolean }) => {
      const health = await fetchEmulatorHealth();
      setControllerOk(!!health?.ok);
      setApkInfo(await fetchApkInfo());
      const adb = await fetchAdbDevices({ light: !opts?.full });
      setDevices(adb.devices);
      setPendingDevices(adb.pendingDevices);
      setDiagnostics(adb.diagnostics);
      setSelectedDevice((prev) => {
        if (prev && adb.devices.some((d) => d.id === prev)) return prev;
        return adb.devices[0]?.id || "";
      });
      const sessionData = await fetchBuildSession();
      if (sessionData?.session) setBuildSession(sessionData.session);
      if (health?.lastBuildSession && typeof health.lastBuildSession === "object") {
        setBuildSession(health.lastBuildSession as BuildSession);
      }
      setLastRefreshAt(nowLabel());
    },
    [],
  );

  const runBootstrap = useCallback(async () => {
    setBootstrapping(true);
    clearLog();
    pushLog("Préparation contrôleur + ADB (une fois)…");
    const result = await bootstrapEmulatorDev();
    if (result.steps?.length) {
      for (const step of result.steps) pushLog(step);
    }
    if (result.ok) {
      pushLog(
        result.deviceCount
          ? `${result.deviceCount} appareil(s) prêt(s).`
          : "Contrôleur OK — branchez le téléphone si besoin.",
      );
    } else {
      pushLog(result.error || "Préparation incomplète.");
    }
    await refreshStatus({ full: true });
    setBootstrapping(false);
  }, [clearLog, pushLog, refreshStatus]);

  useEffect(() => {
    if (bootstrapOnceRef.current) return;
    bootstrapOnceRef.current = true;
    void runBootstrap();
  }, [runBootstrap]);

  useEffect(() => {
    if (bootstrapping || building || installing) return;
    const hasPending = pendingDevices.length > 0;
    const intervalMs = hasPending ? 5000 : devices.length === 0 ? 5000 : 10000;
    const poll = window.setInterval(() => void refreshStatus({ full: false }), intervalMs);
    return () => window.clearInterval(poll);
  }, [bootstrapping, building, installing, refreshStatus, devices.length, pendingDevices.length]);

  useEffect(() => {
    if (!building) return;
    const tick = window.setInterval(() => setBuildSeconds((s) => s + 1), 1000);
    const poll = window.setInterval(() => void refreshStatus({ full: false }), 4000);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(poll);
    };
  }, [building, refreshStatus]);

  const apkReady = !!apkInfo?.exists;
  const step1State = building
    ? "active"
    : buildSession?.success
      ? "done"
      : buildSession && !buildSession.success && !buildSession.inProgress
        ? "error"
        : apkReady
          ? "done"
          : "ready";

  const step2State = !apkReady
    ? "locked"
    : installing
      ? "active"
      : installDone
        ? "done"
        : devices.length > 0
          ? "ready"
          : "ready";

  const step3State = !apkReady || !installDone ? "locked" : publishing ? "active" : "ready";

  const runBuild = async () => {
    if (!controllerOk) await runBootstrap();
    clearLog();
    setBuilding(true);
    setBuildSeconds(0);
    setLastBuildError(null);
    pushLog("Étape 1 — compilation Flutter/Gradle (1–3 min)…");
    buildAbortRef.current = new AbortController();
    try {
      const { ok, data } = await buildApkFromBackoffice(buildAbortRef.current.signal);
      pushLog(data.message || (ok ? "Build réussi." : data.error || "Build échoué."));
      if (data.stderr) pushLog(data.stderr.slice(-400));
      if (ok) {
        setLastBuildError(null);
        await refreshStatus({ full: true });
        onBuilt?.({
          version: data.version || apkInfo?.version || "1.0.0",
          buildNumber: String(data.buildNumber || apkInfo?.buildNumber || "1"),
        });
      } else {
        setLastBuildError(data.stderr || data.error || data.message || "Build échoué");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushLog(`Erreur : ${msg}`);
      setLastBuildError(msg);
    } finally {
      setBuilding(false);
      buildAbortRef.current = null;
      await refreshStatus({ full: true });
    }
  };

  const runInstall = async () => {
    if (!apkReady) {
      pushLog("Étape 2 bloquée — terminez l’étape 1 (APK requis).");
      return;
    }
    if (!selectedDevice) return;
    clearLog();
    setInstalling(true);
    setInstallPhase("Préparation…");
    pushLog(`Étape 2 — installation sur ${selectedDevice}…`);
    try {
      setInstallPhase("adb reverse + installation APK…");
      const result = await installApkOnDevice(selectedDevice);
      if (result.steps?.length) {
        for (const s of result.steps) {
          pushLog(`${s.phase} : ${s.detail || (s.ok ? "OK" : "échec")}`);
        }
      }
      pushLog(result.message || result.error || "Terminé.");
      if (result.success) {
        setInstallDone(true);
        try {
          sessionStorage.setItem(INSTALL_OK_KEY, "1");
        } catch { /* ignore */ }
        await refreshStatus({ full: true });
      }
    } finally {
      setInstalling(false);
      setInstallPhase(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          Parcours (dans l’ordre) — actualisé {lastRefreshAt ?? "…"}
        </p>
        <div className="flex flex-wrap gap-2">
          <StepPill n={1} label="Build APK" state={step1State as "done"} />
          <span className="self-center text-gray-300">→</span>
          <StepPill n={2} label="Install appareil" state={step2State as "done"} />
          <span className="self-center text-gray-300">→</span>
          <StepPill n={3} label="Publish dev" state={step3State as "done"} />
        </div>
      </div>

      {bootstrapping ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-100">
          Préparation automatique…
        </div>
      ) : null}

      <section className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Étape 1 — Build APK</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Compile l’APK debug. Obligatoire avant l’installation sur appareil.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${controllerOk ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>
            Contrôleur : {bootstrapping ? "…" : controllerOk ? "connecté" : "attente"}
          </span>
          {apkReady ? (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              APK v{apkInfo?.version}+{apkInfo?.buildNumber}
              {apkInfo?.sizeBytes ? ` · ${Math.round(apkInfo.sizeBytes / 1024 / 1024)} Mo` : ""}
              {apkInfo?.modifiedAt ? ` · ${formatWhen(apkInfo.modifiedAt)}` : ""}
            </span>
          ) : (
            <span className="text-xs text-amber-700">Aucun APK — lancez le build</span>
          )}
        </div>

        {building ? (
          <p className="mt-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            Compilation en cours… {buildSeconds}s
            {buildSession?.inProgress ? ` — ${buildSession.message || ""}` : ""}
          </p>
        ) : null}

        {lastBuildError ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            <p className="font-semibold">Dernier build en erreur</p>
            <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap">{lastBuildError}</pre>
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
          {apkReady ? (
            <a
              href={localApkDownloadHref()}
              download={apkInfo?.downloadFilename || formatApkDownloadFilename(apkInfo?.version, apkInfo?.buildNumber)}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200"
            >
              Télécharger APK
            </a>
          ) : null}
        </div>
      </section>

      <section
        className={`rounded-xl border-2 p-5 shadow-sm transition-opacity ${
          apkReady
            ? "border-sky-200 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900 dark:from-sky-950/30 dark:to-gray-900"
            : "border-gray-200 bg-gray-50 opacity-75 dark:border-gray-700 dark:bg-gray-900/50"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Étape 2 — Appareil (ADB)</h2>
          <button
            type="button"
            disabled={bootstrapping}
            onClick={() => void refreshStatus({ full: true })}
            className="text-xs text-blue-600 hover:underline"
          >
            Actualiser (détails)
          </button>
        </div>

        {!apkReady ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            Complétez l’<strong>étape 1</strong> avant d’installer sur le téléphone.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Détection légère toutes les 5–10 s (moins de sollicitation USB). Cochez « Toujours autoriser » sur le téléphone.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-900">{devices.length} prêt(s)</span>
              {pendingDevices.length > 0 ? (
                <span className="animate-pulse rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">
                  {pendingDevices.length} non autorisé — validez sur l’écran du téléphone
                </span>
              ) : null}
            </div>

            {pendingDevices.length > 0 ? (
              <ul className="mt-2 space-y-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                {pendingDevices.map((d) => (
                  <li key={d.id}>
                    <strong>{d.id}</strong> — {d.status}
                    {d.status === "unauthorized"
                      ? " : acceptez RSA + « Toujours autoriser depuis cet ordinateur »"
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}

            {devices.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">Aucun appareil prêt — USB débogage activé, mode transfert fichiers.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {devices.map((d) => (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${selectedDevice === d.id ? "border-sky-500 bg-sky-50/80" : "border-gray-200"}`}
                  >
                    <input
                      type="radio"
                      name="adb-device"
                      checked={selectedDevice === d.id}
                      onChange={() => setSelectedDevice(d.id)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <p className="font-medium">{deviceLabel(d)}</p>
                      <p className="text-xs text-gray-500">{d.id}{d.androidVersion ? ` · Android ${d.androidVersion}` : ""}</p>
                    </div>
                  </label>
                ))}
                <button
                  type="button"
                  disabled={installing || !selectedDevice}
                  onClick={() => void runInstall()}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {installing ? installPhase || "Installation…" : "Installer sur l’appareil"}
                </button>
                {installDone ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">Installation réussie — passez à l’étape 3.</p>
                ) : null}
              </div>
            )}
          </>
        )}
      </section>

      {apkReady && installDone && onPublishRequest ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/20">
          <p className="text-sm text-gray-800 dark:text-gray-200">
            <strong>Étape 3</strong> — Publier sur le canal <strong>dev</strong> (copie serveur, pas d’upload 171 Mo).
          </p>
          <button
            type="button"
            disabled={publishing}
            onClick={onPublishRequest}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {publishing ? "Publication…" : "Publier sur canal dev"}
          </button>
        </section>
      ) : apkReady && !installDone ? (
        <p className="text-xs text-gray-500">Étape 3 débloquée après installation réussie (étape 2).</p>
      ) : null}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Journal de session</span>
          <button type="button" onClick={clearLog} className="text-xs text-blue-600 hover:underline">
            Effacer
          </button>
        </div>
        {activityLog.length === 0 ? (
          <p className="px-3 py-4 text-xs text-gray-400">Les actions en cours s’affichent ici en temps réel.</p>
        ) : (
          <ul className="max-h-40 overflow-auto px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
            {activityLog.map((line, i) => (
              <li key={`${line.ts}-${i}`} className="py-0.5">
                <span className="text-gray-400">[{line.ts}]</span> {line.msg}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
