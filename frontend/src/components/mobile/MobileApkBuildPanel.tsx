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
  type BuildHistoryEntry,
  type BuildSession,
} from "@/lib/mobile/emulatorControllerClient";
import {
  BUILD_LOG_LEVEL_CLASS,
  classifyBuildLogLine,
  splitBuildOutput,
  summarizeBuildWarnings,
  type BuildLogLevel,
} from "@/lib/mobile/buildLogUtils";

import {
  installMatchesApk,
  readWizardActivityLog,
  readWizardInstall,
  writeWizardActivityLog,
  writeWizardInstall,
  type StoredActivityLine,
} from "@/lib/mobile/mobileOtaWizardStorage";

type ActiveDevRelease = {
  version: string;
  buildNumber: number;
  createdAt?: string;
};

type MobileApkBuildPanelProps = {
  onBuilt?: (info: { version: string; buildNumber: string }) => void;
  onPublishRequest?: () => void | Promise<void>;
  publishing?: boolean;
  publishBlocked?: boolean;
  publishBlockedReason?: string | null;
  activeDevRelease?: ActiveDevRelease | null;
  onPromoteRequest?: () => void;
  promoting?: boolean;
  prodPromoted?: boolean;
  promoteMessage?: string | null;
  promoteTargetLabel?: string | null;
};

type LogLine = { ts: string; msg: string; level: BuildLogLevel };

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

async function copyTextToClipboard(text: string): Promise<boolean> {
  const value = text.trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function formatActivityLog(lines: LogLine[]): string {
  return lines.map((line) => `[${line.ts}] ${line.msg}`).join("\n");
}

function historyLabel(entry: BuildHistoryEntry): string {
  const ver = entry.version ? `v${entry.version}+${entry.buildNumber ?? "?"}` : "version ?";
  return `${ver} — ${entry.success ? "OK" : "KO"} — ${formatWhen(entry.finishedAt)}`;
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

function deviceMatchesApk(d: AdbDevice, info: ApkInfo | null): boolean {
  if (!info?.version || info.buildNumber == null || !d.appInstalled) return false;
  return d.appVersionName === info.version && String(d.appVersionCode) === String(info.buildNumber);
}

export function MobileApkBuildPanel({
  onBuilt,
  onPublishRequest,
  publishing,
  publishBlocked,
  publishBlockedReason,
  activeDevRelease,
  onPromoteRequest,
  promoting,
  prodPromoted,
  promoteMessage,
  promoteTargetLabel,
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
  const [buildHistory, setBuildHistory] = useState<BuildHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [lastBuildError, setLastBuildError] = useState<string | null>(null);
  const [lastBuildWarnings, setLastBuildWarnings] = useState<string[]>([]);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [installDone, setInstallDone] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const buildAbortRef = useRef<AbortController | null>(null);
  const bootstrapOnceRef = useRef(false);

  useEffect(() => {
    const storedLog = readWizardActivityLog();
    if (storedLog.length > 0) {
      setActivityLog(storedLog as LogLine[]);
    }
  }, []);

  const pushLog = useCallback((msg: string, level: BuildLogLevel = "info") => {
    setActivityLog((prev) => {
      const next = [...prev.slice(-120), { ts: nowLabel(), msg, level }];
      writeWizardActivityLog(next as StoredActivityLine[]);
      return next;
    });
  }, []);

  const pushOutputLines = useCallback(
    (raw: string | undefined | null, defaultLevel: BuildLogLevel = "info") => {
      for (const line of splitBuildOutput(raw)) {
        pushLog(line, classifyBuildLogLine(line) === "info" ? defaultLevel : classifyBuildLogLine(line));
      }
    },
    [pushLog],
  );

  const applySessionPayload = useCallback(
    (sessionData: Awaited<ReturnType<typeof fetchBuildSession>>) => {
      if (sessionData?.session) {
        setBuildSession(sessionData.session);
        if (!sessionData.session.success && sessionData.session.stderrTail) {
          setLastBuildError(sessionData.session.stderrTail);
        }
        const warnings = summarizeBuildWarnings(sessionData.session.warnings);
        if (warnings.length > 0) setLastBuildWarnings(warnings);
        else if (sessionData.session.success) setLastBuildWarnings([]);
      }
      if (Array.isArray(sessionData?.history)) {
        setBuildHistory(sessionData.history);
        return sessionData.history;
      }
      return null;
    },
    [],
  );

  const loadBuildHistory = useCallback(async () => {
    const sessionData = await fetchBuildSession();
    return applySessionPayload(sessionData) ?? [];
  }, [applySessionPayload]);

  const clearLog = useCallback(() => {
    setActivityLog([]);
    writeWizardActivityLog([]);
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    const ok = await copyTextToClipboard(text);
    setCopyHint(ok ? `${label} copié` : `Copie impossible (${label})`);
    window.setTimeout(() => setCopyHint(null), 2500);
  }, []);

  const refreshStatus = useCallback(
    async (opts?: { full?: boolean }) => {
      const health = await fetchEmulatorHealth();
      setControllerOk(!!health?.ok);
      const info = await fetchApkInfo();
      setApkInfo(info);
      const adb = await fetchAdbDevices({ light: !opts?.full });
      setDevices(adb.devices);
      setPendingDevices(adb.pendingDevices);
      setDiagnostics(adb.diagnostics);
      setSelectedDevice((prev) => {
        if (prev && adb.devices.some((d) => d.id === prev)) return prev;
        return adb.devices[0]?.id || "";
      });
      if (info && adb.devices.some((d) => deviceMatchesApk(d, info))) {
        setInstallDone(true);
      }
      const sessionData = await fetchBuildSession();
      const history = applySessionPayload(sessionData);
      if (health?.lastBuildSession && typeof health.lastBuildSession === "object") {
        const last = health.lastBuildSession as BuildSession;
        setBuildSession(last);
        const warnings = summarizeBuildWarnings(last.warnings);
        if (warnings.length > 0) setLastBuildWarnings(warnings);
      }
      if (sessionData?.session?.inProgress) {
        setBuilding(true);
        if (sessionData.session.startedAt) {
          const started = new Date(sessionData.session.startedAt).getTime();
          if (Number.isFinite(started)) {
            setBuildSeconds(Math.max(0, Math.floor((Date.now() - started) / 1000)));
          }
        }
      } else if (!sessionData?.session?.inProgress && !buildAbortRef.current) {
        setBuilding(false);
      }
      setLastRefreshAt(nowLabel());
      return { history: history ?? sessionData?.history ?? [] };
    },
    [applySessionPayload],
  );

  useEffect(() => {
    if (!apkInfo?.version || apkInfo.buildNumber == null) return;
    const stored = readWizardInstall();
    if (installMatchesApk(stored, apkInfo.version, apkInfo.buildNumber)) {
      setInstallDone(true);
      if (stored?.deviceId) setSelectedDevice(stored.deviceId);
    }
  }, [apkInfo?.version, apkInfo?.buildNumber]);

  const seedJournalFromHistory = useCallback(
    (history: BuildHistoryEntry[]) => {
      if (history.length === 0) return;
      const latest = history[0];
      pushLog(
        `Dernier build enregistré : ${historyLabel(latest)}`,
        latest.success ? "success" : "error",
      );
      if (latest.warningCount && latest.warningCount > 0) {
        pushLog(
          `${latest.warningCount} avertissement(s) Flutter/Kotlin — build OK, voir historique ou doc BL-26-09`,
          "warning",
        );
      }
    },
    [pushLog],
  );

  const runBootstrap = useCallback(async () => {
    setBootstrapping(true);
    const existingLog = readWizardActivityLog();
    if (existingLog.length === 0) {
      pushLog("Préparation contrôleur + ADB (une fois)…");
    } else {
      pushLog("Reprise de session — actualisation du contrôleur…");
    }
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
    const { history } = await refreshStatus({ full: true });
    if (!existingLog.some((l) => l.msg.includes("Dernier build enregistré"))) {
      seedJournalFromHistory(Array.isArray(history) ? history : []);
    }
    setBootstrapping(false);
  }, [pushLog, refreshStatus, seedJournalFromHistory]);

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
  const builtLabel = apkInfo?.version && apkInfo.buildNumber != null
    ? `v${apkInfo.version}+${apkInfo.buildNumber}`
    : null;
  const activeDevLabel = activeDevRelease
    ? `v${activeDevRelease.version}+${activeDevRelease.buildNumber}`
    : null;
  const devPublishDone = Boolean(
    apkReady
    && activeDevRelease
    && apkInfo?.version === activeDevRelease.version
    && String(apkInfo?.buildNumber) === String(activeDevRelease.buildNumber),
  );
  const deviceHasMatchingApp = Boolean(
    apkInfo && devices.some((d) => deviceMatchesApk(d, apkInfo)),
  );
  const installSatisfied = installDone || deviceHasMatchingApp;
  const selectedDeviceInfo = devices.find((d) => d.id === selectedDevice) ?? devices[0] ?? null;
  const deviceLabelVersion = selectedDeviceInfo?.appInstalled && selectedDeviceInfo.appVersionName
    ? `v${selectedDeviceInfo.appVersionName} (${selectedDeviceInfo.appVersionCode ?? "?"})`
    : null;

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
      : installSatisfied
        ? "done"
        : devices.length > 0
          ? "ready"
          : "ready";

  const step3State = !apkReady || !installSatisfied
    ? "locked"
    : publishing
      ? "active"
      : devPublishDone
        ? "done"
        : publishBlocked
          ? "error"
          : "ready";

  const step4State = !devPublishDone ? "locked" : "ready";
  const step5State = !devPublishDone
    ? "locked"
    : promoting
      ? "active"
      : prodPromoted
        ? "done"
        : "ready";

  const runBuild = async () => {
    if (!controllerOk) await runBootstrap();
    clearLog();
    setBuilding(true);
    setBuildSeconds(0);
    setLastBuildError(null);
    setLastBuildWarnings([]);
    pushLog("Étape 1 — compilation Flutter/Gradle (1–3 min)…");
    buildAbortRef.current = new AbortController();
    try {
      const { ok, data } = await buildApkFromBackoffice(buildAbortRef.current.signal);
      pushLog(data.message || (ok ? "Build réussi." : data.error || "Build échoué."), ok ? "success" : "error");
      const stderrFull = data.stderr || buildSession?.stderrTail || "";
      const stdoutFull = data.stdout || "";
      if (stdoutFull) pushOutputLines(stdoutFull);
      if (stderrFull) pushOutputLines(stderrFull);
      const warnings = summarizeBuildWarnings(data.warnings || []);
      if (warnings.length > 0) {
        setLastBuildWarnings(warnings);
        pushLog(
          `${warnings.length} avertissement(s) — non bloquant (dette Kotlin BL-26-09, voir docs/mobile/ANDROID_TOOLCHAIN.md)`,
          "warning",
        );
      }
      if (ok) {
        setLastBuildError(null);
        await refreshStatus({ full: true });
        onBuilt?.({
          version: data.version || apkInfo?.version || "1.0.0",
          buildNumber: String(data.buildNumber || apkInfo?.buildNumber || "1"),
        });
      } else {
        const errText = [data.stderr, data.stdout, data.error, data.message].filter(Boolean).join("\n\n");
        setLastBuildError(errText || "Build échoué");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushLog(`Erreur : ${msg}`, "error");
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
        writeWizardInstall({
          version: apkInfo?.version || "1.0.0",
          buildNumber: String(apkInfo?.buildNumber ?? "1"),
          deviceId: selectedDevice,
        });
        pushLog("Installation réussie — passez à l’étape 3 (publish dev).", "success");
        await refreshStatus({ full: true });
      } else {
        pushLog(result.error || "Installation échouée.", "error");
      }
    } finally {
      setInstalling(false);
      setInstallPhase(null);
    }
  };


  return (
    <div className="space-y-4">
      <details className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-100">
        <summary className="cursor-pointer font-semibold">Aide porteur (étape 2 mobile + OTA)</summary>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
          <li>
            <strong>Étape 2 mobile</strong> : checklist{" "}
            <code className="text-[11px]">GUIDE_VALIDATION_PORTEUR.md</code>
          </li>
          <li>
            <strong>OTA</strong> : Build → Install → Publish dev → MAJ sur Samsung → Promote prod
          </li>
          <li>
            Warning Kotlin après build OK = dette <strong>BL-26-09</strong>, pas bloquant OTA.
          </li>
        </ul>
      </details>

      {apkReady && (builtLabel || activeDevLabel || deviceLabelVersion) ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100">
          <p className="font-semibold">Alignement des versions</p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed">
            <li>
              <strong>APK buildé (étape 1)</strong> : {builtLabel ?? "—"}
            </li>
            <li>
              <strong>Téléphone (étape 2)</strong> : {deviceLabelVersion ?? "non détecté / app absente"}
              {builtLabel && deviceLabelVersion && !deviceHasMatchingApp ? (
                <span className="ml-1 text-amber-800 dark:text-amber-200">
                  — différent de l&apos;APK : réinstallez (USB) ou attendez l&apos;OTA (étape 4).
                </span>
              ) : null}
            </li>
            <li>
              <strong>Canal dev OTA (étape 3)</strong> : {activeDevLabel ?? "aucune release active"}
              {builtLabel && activeDevLabel && !devPublishDone ? (
                <span className="ml-1 font-medium text-blue-800 dark:text-blue-200">
                  — publiez {builtLabel} pour activer l&apos;OTA.
                </span>
              ) : null}
            </li>
          </ul>
        </div>
      ) : null}

      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
          Parcours — actualisé {lastRefreshAt ?? "…"}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <StepPill n={1} label="Build APK" state={step1State} />
          <StepPill n={2} label="Install" state={step2State} />
          <StepPill n={3} label="Publish dev" state={step3State} />
          <StepPill n={4} label="OTA Samsung" state={step4State} />
          <StepPill n={5} label="Promote prod" state={step5State} />
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

        {lastBuildWarnings.length > 0 ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Avertissements build ({lastBuildWarnings.length}) — APK produit quand même
              </p>
              <button
                type="button"
                onClick={() => void handleCopy(lastBuildWarnings.join("\n\n"), "Avertissements")}
                className="rounded-md border border-amber-400 bg-white px-2 py-1 text-xs font-medium hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950"
              >
                Copier
              </button>
            </div>
            <p className="mt-1 text-xs">
              Built-in Kotlin Flutter — voir{" "}
              <code className="text-[11px]">docs/mobile/ANDROID_TOOLCHAIN.md</code> (BL-26-09). À traiter avant Flutter majeur, pas avant fin étape 2.
            </p>
            <ul className="mt-2 max-h-40 overflow-auto font-mono text-[12px] leading-relaxed">
              {lastBuildWarnings.map((w, i) => (
                <li key={i} className="border-t border-amber-200/60 py-1 first:border-0 dark:border-amber-800/60">
                  {w}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {lastBuildError ? (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">Dernier build en erreur</p>
              <button
                type="button"
                onClick={() => void handleCopy(lastBuildError, "Log build")}
                className="rounded-md border border-red-400 bg-white px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-600 dark:bg-red-950 dark:text-red-100"
              >
                Copier le log
              </button>
            </div>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
              {lastBuildError}
            </pre>
          </div>
        ) : null}

        {copyHint ? (
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">{copyHint}</p>
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
                {installSatisfied ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {deviceHasMatchingApp && !installDone
                      ? "Version déjà installée sur l’appareil — passez à l’étape 3."
                      : "Installation réussie — passez à l’étape 3."}
                  </p>
                ) : null}
              </div>
            )}
          </>
        )}
      </section>

      {apkReady && installSatisfied ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950/20">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Étape 3 — Publish canal dev</p>
          {devPublishDone ? (
            <div className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-medium">Publication dev OK — {builtLabel}</p>
              <p className="mt-1 text-xs">
                Canal dev actif : {activeDevLabel}
                {activeDevRelease?.createdAt ? ` (${formatWhen(activeDevRelease.createdAt)})` : ""}
              </p>
            </div>
          ) : publishBlocked ? (
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
              {publishBlockedReason || "Ce build est déjà publié sur dev — incrémentez pubspec puis recompilez."}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Copie {builtLabel ?? "l’APK buildé"} vers le serveur OTA (sans upload 171 Mo).
              {activeDevLabel && builtLabel ? (
                <span className="mt-1 block text-xs text-blue-800 dark:text-blue-200">
                  Canal dev actuellement {activeDevLabel} — après publication, l&apos;étape 4 proposera la MAJ OTA.
                </span>
              ) : null}
            </p>
          )}
          {onPublishRequest && !devPublishDone ? (
            <button
              type="button"
              disabled={publishing || publishBlocked}
              onClick={onPublishRequest}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {publishing ? "Publication…" : "Publier sur canal dev"}
            </button>
          ) : null}
        </section>
      ) : apkReady && !installSatisfied ? (
        <p className="text-xs text-gray-500">Étape 3 débloquée après installation réussie (étape 2).</p>
      ) : null}

      {devPublishDone ? (
        <section className="rounded-lg border border-violet-200 bg-violet-50/40 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/20">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Étape 4 — OTA sur Samsung</p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            Ouvrez l&apos;app JobbingTrack sur le téléphone (canal dev). Elle doit proposer la MAJ vers{" "}
            <strong>{activeDevLabel ?? "la version publiée"}</strong>
            {deviceLabelVersion && activeDevLabel && !deviceHasMatchingApp && devPublishDone ? (
              <> (installé : {deviceLabelVersion} — MAJ OTA attendue)</>
            ) : null}
            . Si rien n&apos;apparaît : force-stop + relance, ou vérifiez le réseau / adb reverse.
          </p>
        </section>
      ) : null}

      {devPublishDone && onPromoteRequest ? (
        <section className="rounded-lg border border-indigo-200 bg-indigo-50/40 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/20">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Étape 5 — Promote production</p>
          {prodPromoted ? (
            <div className="mt-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-medium">Production mise à jour</p>
              <p className="mt-1 text-xs">{promoteMessage || "Canal production aligné sur la release dev validée."}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {promoteTargetLabel
                ? `Promouvoir ${promoteTargetLabel} (dev actif) vers le canal production.`
                : "Après validation OTA dev, promouvez la release active dev en production."}
            </p>
          )}
          {!prodPromoted ? (
            <button
              type="button"
              disabled={promoting}
              onClick={onPromoteRequest}
              className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {promoting ? "Promotion…" : "Promouvoir dev → production"}
            </button>
          ) : null}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            GitHub Release (tag <code>mobile-v*</code>) si{" "}
            <code>MOBILE_GITHUB_RELEASES_ENABLED=true</code> — ne merge pas automatiquement <code>main</code>.
          </p>
        </section>
      ) : null}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Journal de session</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={activityLog.length === 0}
              onClick={() => void handleCopy(formatActivityLog(activityLog), "Journal")}
              className="text-xs text-blue-600 hover:underline disabled:opacity-40"
            >
              Copier
            </button>
            <button type="button" onClick={clearLog} className="text-xs text-blue-600 hover:underline">
              Effacer
            </button>
          </div>
        </div>
        {activityLog.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400">Les actions en cours s’affichent ici en temps réel.</p>
        ) : (
          <ul className="max-h-72 overflow-auto px-3 py-2 font-mono text-[13px] leading-relaxed">
            {activityLog.map((line, i) => (
              <li key={`${line.ts}-${i}`} className={`break-words py-0.5 ${BUILD_LOG_LEVEL_CLASS[line.level]}`}>
                <span className="text-gray-400">[{line.ts}]</span> {line.msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Historique des builds ({buildHistory.length})
          </span>
          <button
            type="button"
            onClick={() => void loadBuildHistory()}
            className="text-xs text-blue-600 hover:underline"
          >
            Actualiser
          </button>
        </div>
        {buildHistory.length === 0 ? (
          <p className="px-3 py-4 text-sm text-gray-400">
            Aucun build enregistré — lancez un build ; les 30 derniers sont conservés côté contrôleur.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {buildHistory.map((entry) => {
              const expanded = selectedHistoryId === entry.id;
              const detailText = [entry.stderrTail, entry.stdoutTail].filter(Boolean).join("\n\n");
              return (
                <div key={entry.id} className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryId(expanded ? null : entry.id)}
                    className="flex w-full flex-wrap items-center gap-2 text-left text-sm"
                  >
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        entry.success
                          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                          : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100"
                      }`}
                    >
                      {entry.success ? "OK" : "KO"}
                    </span>
                    <span className="font-medium">
                      v{entry.version ?? "?"} +{entry.buildNumber ?? "?"}
                    </span>
                    <span className="text-xs text-gray-500">{formatWhen(entry.finishedAt)}</span>
                    {entry.warningCount ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        {entry.warningCount} warn
                      </span>
                    ) : null}
                    <span className="text-xs text-blue-600">{expanded ? "Masquer" : "Journal"}</span>
                  </button>
                  {expanded ? (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-gray-600 dark:text-gray-400">{entry.message}</p>
                      {entry.warnings?.length ? (
                        <ul className="rounded border border-amber-200 bg-amber-50/50 p-2 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/20">
                          {entry.warnings.map((w, wi) => (
                            <li key={wi} className="font-mono break-words py-0.5">
                              {w}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {detailText ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-gray-900 p-2 font-mono text-[11px] leading-relaxed text-gray-100">
                          {detailText}
                        </pre>
                      ) : (
                        <p className="text-xs text-gray-400">Pas de log stderr/stdout conservé.</p>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleCopy(detailText || entry.message || "", "Historique build")}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Copier le journal
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
