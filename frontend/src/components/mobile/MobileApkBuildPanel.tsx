"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildApkFromBackoffice,
  DEFAULT_EMULATOR_CONTROLLER_URL,
  fetchApkInfo,
  fetchAdbDevices,
  fetchEmulatorHealth,
  installApkOnDevice,
  localApkDownloadHref,
  type ApkInfo,
} from "@/lib/mobile/emulatorControllerClient";

const START_CONTROLLER_CMD = "bash scripts/mobile/setup/restart-emulator-controller.sh";

type MobileApkBuildPanelProps = {
  onBuilt?: (info: { version: string; buildNumber: string }) => void;
  onPublishRequest?: () => void;
  publishing?: boolean;
};

export function MobileApkBuildPanel({
  onBuilt,
  onPublishRequest,
  publishing,
}: MobileApkBuildPanelProps) {
  const [controllerOk, setControllerOk] = useState<boolean | null>(null);
  const [apkInfo, setApkInfo] = useState<ApkInfo | null>(null);
  const [devices, setDevices] = useState<{ id: string; status: string }[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [building, setBuilding] = useState(false);
  const [buildSeconds, setBuildSeconds] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const buildAbortRef = useRef<AbortController | null>(null);

  const addLog = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-12), line]);
  }, []);

  const refreshStatus = useCallback(async () => {
    const health = await fetchEmulatorHealth();
    setControllerOk(!!health?.ok);
    const info = await fetchApkInfo();
    setApkInfo(info);
    const devs = await fetchAdbDevices();
    setDevices(devs);
    if (devs.length && !selectedDevice) {
      setSelectedDevice(devs[0]!.id);
    }
  }, [selectedDevice]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!building) return;
    const id = window.setInterval(() => setBuildSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [building]);

  const runBuild = async () => {
    setBuilding(true);
    setBuildSeconds(0);
    addLog("Build APK en cours (1–3 min)…");
    buildAbortRef.current = new AbortController();
    try {
      const { ok, data, via } = await buildApkFromBackoffice(
        DEFAULT_EMULATOR_CONTROLLER_URL,
        buildAbortRef.current.signal,
      );
      addLog(data.message || (ok ? "Build réussi." : data.error || "Build échoué."));
      if (data.stderr) addLog(`stderr: ${data.stderr.slice(-400)}`);
      if (!ok && data._hint) addLog(data._hint);
      addLog(`Canal: ${via === "direct" ? "contrôleur local" : "proxy backoffice"}`);
      if (ok) {
        await refreshStatus();
        const version = data.version || apkInfo?.version || "1.0.0";
        const buildNumber = String(data.buildNumber || apkInfo?.buildNumber || "1");
        onBuilt?.({ version, buildNumber });
      }
    } catch (e) {
      addLog(e instanceof Error ? e.message : String(e));
      addLog(`Démarrer le contrôleur : ${START_CONTROLLER_CMD}`);
    } finally {
      setBuilding(false);
      buildAbortRef.current = null;
    }
  };

  const runInstall = async () => {
    if (!selectedDevice) return;
    setInstalling(true);
    addLog(`Installation sur ${selectedDevice}…`);
    try {
      const result = await installApkOnDevice(selectedDevice);
      addLog(result.message || result.error || "Terminé.");
    } finally {
      setInstalling(false);
    }
  };

  return (
    <section className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900 dark:from-emerald-950/30 dark:to-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Étape 1 — Build APK depuis le backoffice
      </h2>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Compile l’APK debug sur <strong>votre machine</strong> (Flutter + Android SDK) via le
        contrôleur local ({DEFAULT_EMULATOR_CONTROLLER_URL}). Sur VPS/Portainer sans Flutter :
        build en CI ou sur poste dev, puis upload étape 3.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            controllerOk
              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
              : controllerOk === false
                ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          Contrôleur : {controllerOk ? "connecté" : controllerOk === false ? "absent" : "…"}
        </span>
        {apkInfo?.exists ? (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            APK prêt — v{apkInfo.version}+{apkInfo.buildNumber}
            {apkInfo.sizeBytes
              ? ` (${Math.round(apkInfo.sizeBytes / 1024 / 1024)} Mo)`
              : ""}
          </span>
        ) : (
          <span className="text-xs text-amber-700 dark:text-amber-300">Aucun APK local</span>
        )}
        <button
          type="button"
          onClick={() => void refreshStatus()}
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
        >
          Actualiser
        </button>
      </div>

      {controllerOk === false ? (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">Contrôleur non démarré</p>
          <p className="mt-1">Dans un terminal à la racine du dépôt :</p>
          <code className="mt-1 block break-all">{START_CONTROLLER_CMD}</code>
          <p className="mt-2">
            Puis rechargez cette page. Le frontend Docker utilise{" "}
            <code>EMULATOR_CONTROLLER_URL=http://host.docker.internal:5055</code> dans{" "}
            <code>.env</code>.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={building || controllerOk === false}
          onClick={() => void runBuild()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {building ? `Build en cours… ${buildSeconds}s` : "Lancer le build APK"}
        </button>
        {apkInfo?.exists ? (
          <>
            <a
              href={localApkDownloadHref()}
              className="rounded-lg border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
            >
              Télécharger l’APK sur mon PC
            </a>
            {onPublishRequest ? (
              <button
                type="button"
                disabled={publishing}
                onClick={onPublishRequest}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {publishing ? "Publication…" : "Publier sur canal dev (étape 3)"}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {devices.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="block text-sm">
            <span className="font-medium">Appareil ADB</span>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="mt-1 block rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!apkInfo?.exists || installing || !selectedDevice}
            onClick={() => void runInstall()}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            {installing ? "Installation…" : "Installer sur l’appareil (ADB)"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">
          Branchez un téléphone USB (adb devices) ou démarrez un émulateur pour installer depuis
          ici.
        </p>
      )}

      {logs.length > 0 ? (
        <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
          {logs.join("\n")}
        </pre>
      ) : null}
    </section>
  );
}
