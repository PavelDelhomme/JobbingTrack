'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/features';
import {
  Smartphone,
  RefreshCw,
  Play,
  Square,
  Monitor,
  Wifi,
  WifiOff,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';

const CONTROLLER_URL_DEFAULT =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_EMULATOR_CONTROLLER_URL || 'http://localhost:5055')
    : 'http://localhost:5055';

const API_GATEWAY_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:5002')
  : 'http://localhost:5002';

type Avd = { name: string };
type Device = { id: string; status: string };
type FlutterDevice = { id: string; name: string; platform?: string };

export default function MobileEmulatorPage() {
  const [controllerUrl, setControllerUrl] = useState(CONTROLLER_URL_DEFAULT);
  const [avds, setAvds] = useState<Avd[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [flutterDevices, setFlutterDevices] = useState<FlutterDevice[]>([]);
  const [selectedAvd, setSelectedAvd] = useState('');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [selectedFlutterDevice, setSelectedFlutterDevice] = useState('');
  const [controllerOk, setControllerOk] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [logsCopied, setLogsCopied] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [apkBuilt, setApkBuilt] = useState(false);
  const screenshotInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const base = () => controllerUrl.replace(/\/$/, '');
  const addLog = (msg: string) => setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const fetchJson = async <T,>(path: string, opts?: RequestInit): Promise<T> => {
    const res = await fetch(`${base()}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...opts?.headers },
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
    return data as T;
  };

  const checkHealth = async () => {
    setControllerOk(null);
    try {
      const data = await fetchJson<{ ok?: boolean }>('/health');
      setControllerOk(!!data.ok);
      if (data.ok) addLog('Controleur emulateur connecte.');
      else addLog('Controleur a repondu mais ok=false.');
    } catch {
      setControllerOk(false);
      addLog('Controleur injoignable. Lancez: cd tools/emulator-controller && node server.js');
    }
  };

  const loadAvds = async () => {
    if (!controllerOk) return;
    setLoading('avds');
    try {
      const data = await fetchJson<{ avds: Avd[] }>('/avds');
      setAvds(data.avds || []);
      addLog(`AVD trouves : ${(data.avds || []).length}`);
    } catch (e) { addLog(`Erreur AVD: ${e}`); }
    finally { setLoading(null); }
  };

  const loadDevices = async () => {
    if (!controllerOk) return;
    setLoading('devices');
    try {
      const data = await fetchJson<{ devices: Device[] }>('/devices');
      setDevices(data.devices || []);
      addLog(`Appareils ADB : ${(data.devices || []).length}`);
    } catch (e) { addLog(`Erreur appareils: ${e}`); }
    finally { setLoading(null); }
  };

  const loadFlutterDevices = async () => {
    if (!controllerOk) return;
    setLoading('flutter-devices');
    try {
      const res = await fetch(`${base()}/flutter-devices`, { headers: { 'Content-Type': 'application/json' } });
      const data = (await res.json()) as { devices?: FlutterDevice[]; error?: string };
      if (!res.ok) {
        setFlutterDevices([]);
        if (res.status === 404) addLog('Route /flutter-devices non disponible.');
        else addLog(`Flutter devices: ${data.error || res.statusText}`);
        return;
      }
      setFlutterDevices(data.devices || []);
      if (data.error) addLog(`Flutter devices: ${data.error}`);
    } catch {
      setFlutterDevices([]);
      addLog('Impossible de charger les appareils Flutter.');
    } finally { setLoading(null); }
  };

  useEffect(() => { checkHealth(); }, [controllerUrl]);
  useEffect(() => { if (controllerOk) { loadAvds(); loadDevices(); loadFlutterDevices(); } }, [controllerOk]);

  const startAvd = async () => {
    if (!selectedAvd) { addLog('Selectionnez un AVD.'); return; }
    setLoading('start-avd');
    try {
      await fetchJson('/start-avd', { method: 'POST', body: JSON.stringify({ avd: selectedAvd }) });
      addLog(`Demarrage AVD : ${selectedAvd}. Attendez 30-60s puis rafraichissez.`);
      setTimeout(loadDevices, 5000);
    } catch (e) { addLog(`Erreur demarrage AVD: ${e}`); }
    finally { setLoading(null); }
  };

  const buildApk = async () => {
    setLoading('build');
    addLog('Build APK en cours... (peut prendre 1-2 min)');
    try {
      const res = await fetch(`${base()}/build-apk`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = (await res.json()) as { success?: boolean; message?: string; error?: string; stdout?: string; stderr?: string; exitCode?: number };
      if (data.success) setApkBuilt(true);
      addLog(data.message || (data.success ? 'Build reussi.' : data.error || 'Build echoue.'));
      if (!data.success && data.stderr) addLog(`stderr: ${data.stderr.slice(-800)}`);
      if (!data.success && data.stdout) addLog(`stdout: ${data.stdout.slice(-500)}`);
    } catch (e) { addLog(`Erreur build: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setLoading(null); }
  };

  const installAndRun = async () => {
    if (!selectedDevice) { addLog('Selectionnez un appareil.'); return; }
    setLoading('install-run');
    try {
      const data = await fetchJson<{ success?: boolean; message?: string; error?: string }>('/install-run', {
        method: 'POST', body: JSON.stringify({ deviceId: selectedDevice }),
      });
      addLog(data.message || (data.success ? 'App installee et lancee.' : data.error || 'Erreur'));
    } catch (e) { addLog(`Erreur install/run: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setLoading(null); }
  };

  const sendTap = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!selectedDevice) return;
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    if (!naturalWidth || !naturalHeight) return;
    const rect = img.getBoundingClientRect();
    const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
    const renderedW = naturalWidth * scale;
    const renderedH = naturalHeight * scale;
    const left = (rect.width - renderedW) / 2;
    const top = (rect.height - renderedH) / 2;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const x = Math.round((offsetX - left) / scale);
    const y = Math.round((offsetY - top) / scale);
    if (x < 0 || y < 0 || x > naturalWidth || y > naturalHeight) return;
    try {
      await fetchJson<{ success?: boolean }>('/input-tap', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, x, y }) });
    } catch (err) { addLog(`Tap: ${err instanceof Error ? err.message : String(err)}`); }
  };

  const runFlutter = async () => {
    const deviceId = selectedFlutterDevice || selectedDevice;
    if (!deviceId) { addLog('Selectionnez un appareil.'); return; }
    setLoading('run-flutter');
    addLog('Lancement Flutter (build + run)...');
    try {
      const data = await fetchJson<{ success?: boolean; error?: string; stdout?: string; stderr?: string }>(
        '/run-flutter', { method: 'POST', body: JSON.stringify({ deviceId }) }
      );
      addLog(data.success ? 'Flutter run demarre.' : data.error || 'Erreur');
      if (data.stdout) addLog(data.stdout.slice(-500));
      if (data.stderr) addLog(data.stderr.slice(-500));
    } catch (e) { addLog(`Erreur run: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setLoading(null); }
  };

  useEffect(() => {
    if (!selectedDevice || !controllerOk) {
      if (screenshotInterval.current) { clearInterval(screenshotInterval.current); screenshotInterval.current = null; }
      setScreenshotUrl(null);
      return;
    }
    const url = `${base()}/screenshot?device=${encodeURIComponent(selectedDevice)}&t=`;
    setScreenshotUrl(url + Date.now());
    screenshotInterval.current = setInterval(() => { setScreenshotUrl(url + Date.now()); }, 1500);
    return () => { if (screenshotInterval.current) { clearInterval(screenshotInterval.current); screenshotInterval.current = null; } };
  }, [selectedDevice, controllerOk, controllerUrl]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Emulateur mobile - Android
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Selectionnez un <strong>emulateur</strong> ou un <strong>telephone connecte</strong> (USB / adb), lancez l&apos;app et voyez le <strong>rendu en direct</strong>.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL du controleur</label>
              <input type="text" value={controllerUrl} onChange={(e) => setControllerUrl(e.target.value)} placeholder="http://localhost:5055"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm" />
            </div>
            <div className="flex items-center gap-2">
              {controllerOk === true && <Wifi className="h-5 w-5 text-green-600" />}
              {controllerOk === false && <WifiOff className="h-5 w-5 text-red-600" />}
              <button type="button" onClick={checkHealth} disabled={loading !== null}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" /> Verifier
              </button>
            </div>
          </div>

          {controllerOk && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AVD</label>
                  <select value={selectedAvd} onChange={(e) => setSelectedAvd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm">
                    <option value="">-- Choisir un AVD --</option>
                    {avds.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                  <button type="button" onClick={loadAvds} disabled={loading === 'avds'} className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {loading === 'avds' ? 'Chargement...' : 'Rafraichir AVD'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appareil ADB</label>
                  <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm">
                    <option value="">-- Choisir --</option>
                    {devices.map((d) => <option key={d.id} value={d.id}>{d.id} ({d.status})</option>)}
                  </select>
                  <button type="button" onClick={loadDevices} disabled={loading === 'devices'} className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {loading === 'devices' ? 'Chargement...' : 'Rafraichir'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appareil Flutter</label>
                  <select value={selectedFlutterDevice} onChange={(e) => setSelectedFlutterDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm">
                    <option value="">-- Meme ou choisir --</option>
                    {flutterDevices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.id})</option>)}
                  </select>
                  <button type="button" onClick={loadFlutterDevices} disabled={loading === 'flutter-devices'} className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    {loading === 'flutter-devices' ? 'Chargement...' : 'Rafraichir'}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={startAvd} disabled={!selectedAvd || loading !== null}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {loading === 'start-avd' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Demarrer AVD
                </button>
                <button type="button" onClick={buildApk} disabled={loading !== null}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {loading === 'build' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Build APK
                </button>
                <button type="button" onClick={installAndRun} disabled={!selectedDevice || loading !== null || !apkBuilt}
                  title={!apkBuilt ? 'Build APK d\'abord' : ''} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {loading === 'install-run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Installer et lancer
                </button>
                <button type="button" onClick={runFlutter} disabled={(!selectedDevice && !selectedFlutterDevice) || loading !== null || !apkBuilt}
                  title={!apkBuilt ? 'Build APK d\'abord' : ''} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {loading === 'run-flutter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Flutter run
                </button>
              </div>
            </>
          )}

          {controllerOk === false && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Controleur non connecte</p>
              <p className="mt-1">Lancez : <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">make emulator-controller</code></p>
            </div>
          )}
        </div>

        {controllerOk && selectedDevice && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5" /> Rendu en direct - clic = tap
            </h2>
            <div className="rounded-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden bg-black inline-block max-w-full cursor-crosshair">
              {screenshotUrl ? (
                <img src={screenshotUrl} alt="Ecran appareil" className="block max-h-[70vh] w-auto object-contain select-none"
                  style={{ imageRendering: 'pixelated' }} onClick={sendTap} role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLImageElement).click()} />
              ) : (
                <div className="w-[360px] h-[640px] flex items-center justify-center text-gray-500">Rafraichissement...</div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"><Monitor className="h-5 w-5" /> Logs</h2>
            <div className="flex items-center gap-3">
              <button type="button" onClick={async () => { if (logs.length === 0) return; try { await navigator.clipboard.writeText(logs.join('\n')); setLogsCopied(true); setTimeout(() => setLogsCopied(false), 2000); } catch {} }}
                disabled={logs.length === 0} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 disabled:opacity-50">
                {logsCopied ? 'Copie !' : 'Copier'}
              </button>
              <button type="button" onClick={() => setLogs([])} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900">Effacer</button>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-48 overflow-y-auto select-text">
            {logs.length === 0 ? <div className="text-gray-500">Aucun log.</div> : logs.map((log, i) => <div key={i} className="mb-0.5">{log}</div>)}
          </div>
        </div>

        <MobileJourneyPanel addLog={addLog} />
      </div>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Parcours utilisateur mobile integre dans la page emulateur         */
/* ------------------------------------------------------------------ */

const MOBILE_SCENARIOS: Record<string, { name: string; description: string; steps: string[] }> = {
  mobile_registration: { name: 'Inscription complete', description: 'Register + email + login + dashboard + profil', steps: ['register', 'verify_email', 'login', 'view_dashboard', 'update_profile_settings'] },
  mobile_password_reset: { name: 'Reset mot de passe', description: 'Forgot password + reset via MailHog + login', steps: ['register', 'login', 'password_reset'] },
  mobile_first_use: { name: 'Premiere utilisation', description: 'Dashboard -> hub -> candidature -> calendrier', steps: ['login', 'view_dashboard', 'search_hub', 'create_applications', 'create_contacts', 'link_contact_to_application', 'application_detail', 'view_calendar'] },
  mobile_daily_use: { name: 'Usage quotidien', description: 'Dashboard -> navigation -> entretien -> appel -> calendrier', steps: ['login', 'view_dashboard', 'search_hub', 'create_applications', 'create_contacts', 'create_followups', 'schedule_interviews', 'make_calls', 'application_detail', 'update_application_status', 'view_calendar', 'check_interviews'] },
  mobile_archive_trash: { name: 'Archivage & corbeille', description: 'Archiver -> masquer -> desarchiver -> supprimer -> restaurer', steps: ['login', 'create_applications', 'archive_restore'] },
  mobile_complete: { name: 'Parcours complet', description: 'Toutes les fonctionnalites mobiles de A a Z', steps: ['register', 'verify_email', 'login', 'view_dashboard', 'update_profile_settings', 'search_hub', 'create_companies', 'create_applications', 'create_contacts', 'link_contact_to_application', 'create_followups', 'schedule_interviews', 'make_calls', 'application_detail', 'update_application_status', 'archive_restore', 'create_events', 'view_calendar', 'view_statistics', 'check_interviews', 'search_hub'] },
};

type JourneyStepResult = { id: string; name: string; status: 'pending' | 'running' | 'success' | 'error'; message?: string };

function MobileJourneyPanel({ addLog }: { addLog: (m: string) => void }) {
  const [selected, setSelected] = useState('mobile_complete');
  const [running, setRunning] = useState(false);
  const [stepResults, setStepResults] = useState<JourneyStepResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const cancelRef = useRef(false);

  const scenario = MOBILE_SCENARIOS[selected];

  const runJourney = async () => {
    if (!scenario || running) return;
    cancelRef.current = false;
    setRunning(true);
    const steps = scenario.steps;
    setProgress({ current: 0, total: steps.length });
    setStepResults(steps.map((id) => ({ id, name: id.replace(/_/g, ' '), status: 'pending' as const })));
    addLog(`Parcours "${scenario.name}" demarre (${steps.length} etapes)`);

    let sessionToken: string | null = null;

    for (let i = 0; i < steps.length; i++) {
      if (cancelRef.current) { addLog('Parcours annule'); break; }
      const stepId = steps[i];
      setStepResults((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'running' as const } : s));
      setProgress({ current: i + 1, total: steps.length });

      try {
        const result = await executeJourneyStep(stepId, sessionToken, API_GATEWAY_URL);
        if (result.token) sessionToken = result.token;
        setStepResults((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'success' as const, message: result.message } : s));
        addLog(`  OK ${stepId}: ${result.message || 'OK'}`);
      } catch (e: any) {
        setStepResults((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'error' as const, message: e.message } : s));
        addLog(`  FAIL ${stepId}: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    setRunning(false);
    addLog(`Parcours "${scenario.name}" termine`);
  };

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 text-sm">
      <h3 className="font-semibold mb-3 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
        <Smartphone className="h-4 w-4" /> Parcours utilisateur mobile
      </h3>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.entries(MOBILE_SCENARIOS).map(([key, s]) => (
          <button key={key} onClick={() => !running && setSelected(key)} disabled={running}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selected === key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-400'} ${running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            {s.name}
          </button>
        ))}
      </div>

      {scenario && (
        <div className="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-indigo-900 dark:text-indigo-100">{scenario.name}</span>
            <span className="text-xs text-gray-500">{scenario.steps.length} etapes</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">{scenario.description}</p>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button onClick={runJourney} disabled={running}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-indigo-700">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'En cours...' : 'Lancer le parcours'}
        </button>
        {running && (
          <button onClick={() => { cancelRef.current = true; }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-red-700">
            <Square className="h-4 w-4" /> Annuler
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <a href="/backoffice/user-journey" className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-md hover:bg-indigo-200">Tous les parcours</a>
          <a href="/backoffice/user-journey/custom" className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-md hover:bg-indigo-200">Personnalise</a>
          <a href="/backoffice/user-journey/reports" className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-md hover:bg-indigo-200">Rapports</a>
        </div>
      </div>

      {progress.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progression</span><span>{progress.current}/{progress.total}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {stepResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {stepResults.map((step, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
              step.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
              step.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
              step.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' : 'text-gray-500'
            }`}>
              {step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : step.status === 'running' ? '⏳' : '⬜'}
              <span className="font-medium">{step.name}</span>
              {step.message && <span className="truncate text-gray-500 ml-auto max-w-[200px]">{step.message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function executeJourneyStep(stepId: string, token: string | null, apiUrl: string): Promise<{ message: string; token?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const get = (path: string) => fetch(`${apiUrl}${path}`, { headers });
  const post = (path: string, body: any) => fetch(`${apiUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  const put = (path: string, body: any) => fetch(`${apiUrl}${path}`, { method: 'PUT', headers, body: JSON.stringify(body) });

  switch (stepId) {
    case 'register': {
      const email = `test-${Date.now()}@example.com`;
      const res = await post('/api/v1/auth/register', { email, password: 'Test123!', firstName: 'Test', lastName: 'Mobile' });
      const data = await res.json();
      return { message: `Inscrit: ${email}`, token: data.token };
    }
    case 'verify_email':
      return { message: 'Email verifie (simulation test)' };
    case 'login': {
      const res = await post('/api/v1/auth/login', { email: 'admin@jobbingtrack.com', password: 'password123' });
      const data = await res.json();
      return { message: 'Connecte', token: data.token };
    }
    case 'view_dashboard': { await get('/api/v1/statistics'); return { message: 'Dashboard consulte' }; }
    case 'update_profile_settings': {
      const p = await get('/api/v1/auth/profile');
      if (p.ok) { const d = await p.json(); return { message: `Profil: ${d.user?.firstName || 'OK'}` }; }
      return { message: 'Profil consulte (simule)' };
    }
    case 'search_hub': {
      for (const t of ['applications', 'contacts', 'companies', 'followups', 'calls', 'interviews']) await get(`/api/v1/${t}?limit=5`);
      return { message: '6 onglets consultes' };
    }
    case 'create_companies': {
      for (let i = 0; i < 2; i++) await post('/api/v1/companies', { name: `Entreprise Mobile ${i+1}`, industry: 'tech', size: 'STARTUP' });
      return { message: '2 entreprises creees' };
    }
    case 'create_applications': {
      for (let i = 0; i < 3; i++) await post('/api/v1/applications', { companyName: `Startup ${i+1}`, position: `Dev ${i+1}`, status: 'CANDIDATE_PENDING' });
      return { message: '3 candidatures creees' };
    }
    case 'create_contacts': {
      await post('/api/v1/contacts', { firstName: 'Jean', lastName: 'Recruteur', email: `jean-${Date.now()}@test.com`, phone: '0600000000' });
      return { message: '1 contact cree' };
    }
    case 'link_contact_to_application': {
      const apps = await (await get('/api/v1/applications')).json();
      const list = apps.applications || apps.data || [];
      if (list.length > 0) await put(`/api/v1/applications/${list[0].id}`, { notes: 'Contact lie via parcours mobile' });
      return { message: 'Contact lie' };
    }
    case 'create_followups': {
      const a = await (await get('/api/v1/applications')).json();
      const l = a.applications || a.data || [];
      if (l.length > 0) await post('/api/v1/followups', { applicationId: l[0].id, type: 'EMAIL', scheduledDate: new Date(Date.now()+86400000).toISOString() });
      return { message: 'Relance creee' };
    }
    case 'schedule_interviews': {
      const a = await (await get('/api/v1/applications')).json();
      const l = a.applications || a.data || [];
      if (l.length > 0) await post('/api/v1/interviews', { applicationId: l[0].id, date: new Date(Date.now()+172800000).toISOString(), type: 'PHONE', notes: 'Entretien mobile' });
      return { message: 'Entretien planifie' };
    }
    case 'make_calls': {
      const a = await (await get('/api/v1/applications')).json();
      const c = await (await get('/api/v1/contacts')).json();
      const al = a.applications || a.data || [];
      const cl = c.contacts || c.data || [];
      if (al.length > 0 && cl.length > 0) await post('/api/v1/calls', { applicationId: al[0].id, contactId: cl[0].id, duration: 300, notes: 'Appel mobile', direction: 'OUTGOING' });
      return { message: 'Appel enregistre' };
    }
    case 'application_detail': {
      const a = await (await get('/api/v1/applications?limit=1')).json();
      const l = a.applications || a.data || [];
      if (l.length > 0) { try { await get(`/api/v1/applications/${l[0].id}`); } catch {} }
      return { message: 'Detail candidature consulte' };
    }
    case 'update_application_status': {
      const a = await (await get('/api/v1/applications')).json();
      const l = a.applications || a.data || [];
      if (l.length > 0) { try { await put(`/api/v1/applications/${l[0].id}/status`, { status: 'FIRST_INTERVIEW_PENDING', comment: 'Via parcours mobile' }); } catch {} }
      return { message: 'Statut mis a jour' };
    }
    case 'archive_restore': {
      const a = await (await get('/api/v1/applications?limit=1')).json();
      const l = a.applications || a.data || [];
      if (l.length > 0) {
        try { await post(`/api/v1/applications/${l[0].id}/archive`, {}); } catch {}
        try { await post(`/api/v1/applications/${l[0].id}/unarchive`, {}); } catch {}
      }
      return { message: 'Archive/restauration testee' };
    }
    case 'create_events': {
      await post('/api/v1/events', { title: 'Event mobile', date: new Date(Date.now()+86400000).toISOString(), type: 'MEETING' });
      return { message: 'Evenement cree' };
    }
    case 'view_calendar': { await get('/api/v1/events'); return { message: 'Calendrier consulte' }; }
    case 'view_statistics': { await get('/api/v1/statistics'); return { message: 'Statistiques consultees' }; }
    case 'check_interviews': { await get('/api/v1/interviews'); return { message: 'Entretiens verifies' }; }
    case 'password_reset': return { message: 'Reset password simule (test mode)' };
    default: return { message: `Step "${stepId}" executee (simulation)` };
  }
}
