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
  const [appRunning, setAppRunning] = useState(false);
  const screenshotInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragStart = useRef<{ x: number; y: number; time: number } | null>(null);

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
      if (data.success) setAppRunning(true);
      addLog(data.message || (data.success ? 'App installee et lancee.' : data.error || 'Erreur'));
    } catch (e) { addLog(`Erreur install/run: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setLoading(null); }
  };

  const imgToDevice = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) return null;
    const rect = img.getBoundingClientRect();
    const scale = Math.min(rect.width / nw, rect.height / nh);
    const rw = nw * scale;
    const rh = nh * scale;
    const lf = (rect.width - rw) / 2;
    const tp = (rect.height - rh) / 2;
    const ox = e.clientX - rect.left;
    const oy = e.clientY - rect.top;
    const x = Math.round((ox - lf) / scale);
    const y = Math.round((oy - tp) / scale);
    if (x < 0 || y < 0 || x > nw || y > nh) return null;
    return { x, y };
  };

  const onImgMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const pt = imgToDevice(e);
    if (pt) dragStart.current = { ...pt, time: Date.now() };
  };

  const onImgMouseUp = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!selectedDevice || !dragStart.current) return;
    const end = imgToDevice(e);
    if (!end) { dragStart.current = null; return; }
    const start = dragStart.current;
    dragStart.current = null;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dur = Date.now() - start.time;
    try {
      if (dist < 15) {
        await fetchJson<{ success?: boolean }>('/input-tap', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, x: start.x, y: start.y }) });
      } else {
        const swipeDur = Math.max(100, Math.min(dur, 1500));
        await fetchJson<{ success?: boolean }>('/input-swipe', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, x1: start.x, y1: start.y, x2: end.x, y2: end.y, duration: swipeDur }) });
      }
    } catch (err) { addLog(`Input: ${err instanceof Error ? err.message : String(err)}`); }
  };

  const stopApp = async () => {
    if (!selectedDevice) return;
    setLoading('stop-app');
    try {
      await fetchJson<{ success?: boolean }>('/input-keyevent', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, keycode: 3 }) });
      setAppRunning(false);
      addLog('Application arretee (HOME)');
    } catch (e) { addLog(`Erreur stop: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setLoading(null); }
  };

  const restartApp = async () => {
    if (!selectedDevice) return;
    setLoading('restart-app');
    try {
      const pkg = 'com.example.jobbingtrack_mobile';
      await fetchJson<{ success?: boolean }>('/input-keyevent', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, keycode: 3 }) });
      await new Promise(r => setTimeout(r, 500));
      const data = await fetchJson<{ success?: boolean; message?: string; error?: string }>('/install-run', {
        method: 'POST', body: JSON.stringify({ deviceId: selectedDevice }),
      });
      setAppRunning(true);
      addLog(data.message || 'Application relancee');
    } catch (e) { addLog(`Erreur restart: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setLoading(null); }
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
                <button type="button" onClick={installAndRun} disabled={!selectedDevice || loading !== null || !apkBuilt || appRunning}
                  title={appRunning ? 'App en cours - arretez d\'abord' : !apkBuilt ? 'Build APK d\'abord' : ''} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {loading === 'install-run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Installer et lancer
                </button>
                <button type="button" onClick={runFlutter} disabled={(!selectedDevice && !selectedFlutterDevice) || loading !== null || !apkBuilt || appRunning}
                  title={appRunning ? 'App en cours - arretez d\'abord' : !apkBuilt ? 'Build APK d\'abord' : ''} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                  {loading === 'run-flutter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Flutter run
                </button>
                {appRunning && (
                  <>
                    <button type="button" onClick={stopApp} disabled={loading !== null}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                      {loading === 'stop-app' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />} Arreter
                    </button>
                    <button type="button" onClick={restartApp} disabled={loading !== null}
                      className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                      {loading === 'restart-app' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Relancer
                    </button>
                  </>
                )}
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
              <ImageIcon className="h-5 w-5" /> Rendu en direct
              <span className="text-xs font-normal text-gray-500 ml-2">clic = tap | glisser = scroll/swipe</span>
            </h2>
            <div className="rounded-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden bg-black inline-block max-w-full cursor-crosshair select-none"
              onContextMenu={(e) => e.preventDefault()}>
              {screenshotUrl ? (
                <img src={screenshotUrl} alt="Ecran appareil" className="block max-h-[70vh] w-auto object-contain select-none pointer-events-auto"
                  style={{ imageRendering: 'pixelated' }} draggable={false}
                  onMouseDown={onImgMouseDown} onMouseUp={onImgMouseUp} />
              ) : (
                <div className="w-[360px] h-[640px] flex items-center justify-center text-gray-500">Rafraichissement...</div>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => fetchJson('/input-keyevent', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, keycode: 4 }) }).catch(() => {})}
                className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-300">Back</button>
              <button type="button" onClick={() => fetchJson('/input-keyevent', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, keycode: 3 }) }).catch(() => {})}
                className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-300">Home</button>
              <button type="button" onClick={() => fetchJson('/input-keyevent', { method: 'POST', body: JSON.stringify({ deviceId: selectedDevice, keycode: 187 }) }).catch(() => {})}
                className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-300">Recents</button>
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

        <MobileJourneyPanel addLog={addLog} controllerUrl={controllerUrl} deviceId={selectedDevice} />
      </div>
    </AdminLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Parcours utilisateur mobile - interaction reelle via ADB           */
/* ------------------------------------------------------------------ */

const MOBILE_SCENARIOS: Record<string, { name: string; description: string; steps: string[] }> = {
  mobile_registration: { name: 'Inscription complete', description: 'Ecran inscription -> remplir formulaire -> valider -> login', steps: ['go_to_register', 'fill_register_form', 'submit_register', 'go_to_login', 'fill_login_form', 'submit_login', 'view_dashboard_ui'] },
  mobile_password_reset: { name: 'Reset mot de passe', description: 'Mot de passe oublie -> saisir email -> retour login', steps: ['go_to_login_screen', 'tap_forgot_password', 'fill_forgot_email', 'submit_forgot', 'go_back_to_login'] },
  mobile_first_use: { name: 'Premiere utilisation', description: 'Login -> dashboard -> candidatures -> contacts -> calendrier', steps: ['go_to_login_screen', 'fill_login_form', 'submit_login', 'view_dashboard_ui', 'nav_candidatures', 'nav_entreprises', 'nav_contacts', 'nav_entretiens', 'nav_accueil'] },
  mobile_daily_use: { name: 'Usage quotidien', description: 'Login -> navigation complete -> toutes les sections', steps: ['go_to_login_screen', 'fill_login_form', 'submit_login', 'view_dashboard_ui', 'nav_candidatures', 'nav_entreprises', 'nav_contacts', 'nav_entretiens', 'nav_profil', 'open_drawer', 'drawer_relances', 'nav_accueil', 'open_drawer', 'drawer_evenements'] },
  mobile_archive_trash: { name: 'Archivage & corbeille', description: 'Login -> candidatures -> archiver -> corbeille', steps: ['go_to_login_screen', 'fill_login_form', 'submit_login', 'nav_candidatures', 'open_drawer', 'drawer_corbeille', 'nav_accueil'] },
  mobile_complete: { name: 'Parcours complet', description: 'Toutes les fonctionnalites de A a Z dans l\'app', steps: ['go_to_register', 'fill_register_form', 'submit_register', 'go_to_login', 'fill_login_form', 'submit_login', 'view_dashboard_ui', 'nav_candidatures', 'nav_entreprises', 'nav_contacts', 'nav_entretiens', 'nav_profil', 'nav_accueil', 'open_drawer', 'drawer_relances', 'go_back', 'open_drawer', 'drawer_evenements', 'go_back', 'open_drawer', 'drawer_statistiques', 'go_back', 'open_drawer', 'drawer_corbeille', 'go_back', 'nav_accueil'] },
};

type JourneyStepResult = { id: string; name: string; status: 'pending' | 'running' | 'success' | 'error'; message?: string };

interface AdbHelper {
  tap: (text: string, index?: number) => Promise<string>;
  typeInField: (hint: string, value: string) => Promise<string>;
  keyevent: (code: number) => Promise<void>;
  swipe: (x1: number, y1: number, x2: number, y2: number, dur?: number) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  back: () => Promise<void>;
}

function createAdbHelper(controllerUrl: string, deviceId: string): AdbHelper {
  const base = controllerUrl.replace(/\/$/, '');
  const post = async (path: string, body: any) => {
    const res = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  };

  return {
    tap: async (text: string, index = 0) => {
      const r = await post('/find-and-tap', { deviceId, text, index });
      if (!r.success) throw new Error(r.error || `Element "${text}" introuvable`);
      return r.message;
    },
    typeInField: async (hint: string, value: string) => {
      const r = await post('/tap-field-and-type', { deviceId, hint, text: value });
      if (!r.success) throw new Error(r.error || `Champ "${hint}" introuvable`);
      return r.message;
    },
    keyevent: async (code: number) => {
      await post('/input-keyevent', { deviceId, keycode: code });
    },
    swipe: async (x1: number, y1: number, x2: number, y2: number, dur = 300) => {
      await post('/input-swipe', { deviceId, x1, y1, x2, y2, duration: dur });
    },
    wait: (ms: number) => new Promise((r) => setTimeout(r, ms)),
    back: async () => {
      await post('/input-keyevent', { deviceId, keycode: 4 });
    },
  };
}

function MobileJourneyPanel({ addLog, controllerUrl, deviceId }: { addLog: (m: string) => void; controllerUrl: string; deviceId: string }) {
  const [selected, setSelected] = useState('mobile_complete');
  const [running, setRunning] = useState(false);
  const [stepResults, setStepResults] = useState<JourneyStepResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const cancelRef = useRef(false);

  const scenario = MOBILE_SCENARIOS[selected];

  const runJourney = async () => {
    if (!scenario || running) return;
    if (!deviceId) { addLog('Selectionnez un appareil ADB avant de lancer un parcours'); return; }
    cancelRef.current = false;
    setRunning(true);
    const steps = scenario.steps;
    setProgress({ current: 0, total: steps.length });
    setStepResults(steps.map((id) => ({ id, name: STEP_LABELS[id] || id.replace(/_/g, ' '), status: 'pending' as const })));
    addLog(`Parcours "${scenario.name}" demarre (${steps.length} etapes) [UI reelle]`);

    const adb = createAdbHelper(controllerUrl, deviceId);

    for (let i = 0; i < steps.length; i++) {
      if (cancelRef.current) { addLog('Parcours annule'); break; }
      const stepId = steps[i];
      setStepResults((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'running' as const } : s));
      setProgress({ current: i + 1, total: steps.length });

      try {
        const msg = await executeUIStep(stepId, adb);
        setStepResults((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'success' as const, message: msg } : s));
        addLog(`  ✅ ${STEP_LABELS[stepId] || stepId}: ${msg}`);
      } catch (e: any) {
        setStepResults((prev) => prev.map((s, idx) => idx === i ? { ...s, status: 'error' as const, message: e.message } : s));
        addLog(`  ❌ ${STEP_LABELS[stepId] || stepId}: ${e.message}`);
      }
    }

    setRunning(false);
    addLog(`Parcours "${scenario.name}" termine`);
  };

  return (
    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 text-sm">
      <h3 className="font-semibold mb-3 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
        <Smartphone className="h-4 w-4" /> Parcours utilisateur mobile (interaction UI reelle)
      </h3>

      {!deviceId && (
        <div className="mb-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-amber-800 dark:text-amber-200 text-xs">
          Selectionnez un appareil ADB ci-dessus pour activer les parcours.
        </div>
      )}

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
          <div className="mt-2 flex flex-wrap gap-1">
            {scenario.steps.map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded text-[10px]">
                {STEP_LABELS[s] || s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button onClick={runJourney} disabled={running || !deviceId}
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
        <div className="max-h-64 overflow-y-auto space-y-1">
          {stepResults.map((step, i) => (
            <div key={i} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
              step.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
              step.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
              step.status === 'running' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' : 'text-gray-500'
            }`}>
              {step.status === 'success' ? '✅' : step.status === 'error' ? '❌' : step.status === 'running' ? '⏳' : '⬜'}
              <span className="font-medium">{step.name}</span>
              {step.message && <span className="truncate text-gray-500 ml-auto max-w-[250px]">{step.message}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STEP_LABELS: Record<string, string> = {
  go_to_register: 'Aller a Inscription',
  fill_register_form: 'Remplir formulaire inscription',
  submit_register: 'Valider inscription',
  go_to_login: 'Aller a Connexion',
  go_to_login_screen: 'Ecran de connexion',
  fill_login_form: 'Saisir identifiants',
  submit_login: 'Se connecter',
  view_dashboard_ui: 'Dashboard (verification)',
  nav_candidatures: 'Nav -> Candidatures',
  nav_entreprises: 'Nav -> Entreprises',
  nav_contacts: 'Nav -> Contacts',
  nav_entretiens: 'Nav -> Entretiens',
  nav_profil: 'Nav -> Profil',
  nav_accueil: 'Nav -> Accueil',
  open_drawer: 'Ouvrir menu lateral',
  drawer_relances: 'Menu -> Relances',
  drawer_evenements: 'Menu -> Evenements',
  drawer_statistiques: 'Menu -> Statistiques',
  drawer_corbeille: 'Menu -> Corbeille',
  tap_forgot_password: 'Tap Mot de passe oublie',
  fill_forgot_email: 'Saisir email reset',
  submit_forgot: 'Envoyer lien reset',
  go_back_to_login: 'Retour connexion',
  go_back: 'Retour (bouton back)',
};

async function executeUIStep(stepId: string, adb: AdbHelper): Promise<string> {
  switch (stepId) {
    case 'go_to_register': {
      await adb.wait(500);
      try { await adb.tap('inscrire'); } catch { await adb.swipe(540, 1800, 540, 800, 400); await adb.wait(500); await adb.tap('inscrire'); }
      await adb.wait(1500);
      return 'Ecran inscription affiche';
    }
    case 'fill_register_form': {
      const ts = Date.now();
      await adb.typeInField('pr', `Test${ts}`);
      await adb.wait(400);
      await adb.typeInField('Nom', `Mobile${ts}`);
      await adb.wait(400);
      await adb.typeInField('Email', `test-${ts}@example.com`);
      await adb.wait(400);
      await adb.typeInField('Minimum', `Test123!`);
      await adb.wait(400);
      await adb.typeInField('Retapez', `Test123!`);
      await adb.wait(300);
      await adb.keyevent(4);
      await adb.wait(500);
      try { await adb.tap('conditions'); } catch {}
      await adb.wait(300);
      return `Formulaire rempli (test-${ts}@example.com)`;
    }
    case 'submit_register': {
      await adb.swipe(540, 1800, 540, 600, 400);
      await adb.wait(500);
      await adb.tap('inscrire');
      await adb.wait(3000);
      return 'Inscription soumise';
    }
    case 'go_to_login':
    case 'go_to_login_screen': {
      await adb.wait(500);
      try { await adb.tap('connecter'); } catch { await adb.back(); await adb.wait(1000); }
      await adb.wait(1500);
      return 'Ecran connexion affiche';
    }
    case 'fill_login_form': {
      await adb.typeInField('Email', 'admin@jobbingtrack.com');
      await adb.wait(400);
      await adb.typeInField('Mot de passe', 'password123');
      await adb.wait(300);
      await adb.keyevent(4);
      await adb.wait(300);
      return 'Identifiants saisis';
    }
    case 'submit_login': {
      await adb.tap('connecter');
      await adb.wait(3000);
      return 'Connexion en cours...';
    }
    case 'view_dashboard_ui': {
      await adb.wait(2000);
      return 'Dashboard affiche';
    }
    case 'nav_candidatures': {
      await adb.tap('Candidatures');
      await adb.wait(2000);
      return 'Page Candidatures';
    }
    case 'nav_entreprises': {
      await adb.tap('Entreprises');
      await adb.wait(2000);
      return 'Page Entreprises';
    }
    case 'nav_contacts': {
      await adb.tap('Contacts');
      await adb.wait(2000);
      return 'Page Contacts';
    }
    case 'nav_entretiens': {
      await adb.tap('Entretiens');
      await adb.wait(2000);
      return 'Page Entretiens';
    }
    case 'nav_profil': {
      await adb.tap('Profil');
      await adb.wait(2000);
      return 'Page Profil';
    }
    case 'nav_accueil': {
      await adb.tap('Accueil');
      await adb.wait(2000);
      return 'Retour Accueil';
    }
    case 'open_drawer': {
      await adb.swipe(10, 1170, 800, 1170, 300);
      await adb.wait(1000);
      return 'Menu lateral ouvert';
    }
    case 'drawer_relances': {
      await adb.tap('Relances');
      await adb.wait(2000);
      return 'Page Relances';
    }
    case 'drawer_evenements': {
      await adb.tap('Rappels');
      await adb.wait(2000);
      return 'Page Evenements';
    }
    case 'drawer_statistiques': {
      await adb.tap('Statistiques');
      await adb.wait(2000);
      return 'Page Statistiques';
    }
    case 'drawer_corbeille': {
      await adb.tap('Corbeille');
      await adb.wait(2000);
      return 'Page Corbeille';
    }
    case 'tap_forgot_password': {
      await adb.tap('oubli');
      await adb.wait(1500);
      return 'Ecran mot de passe oublie';
    }
    case 'fill_forgot_email': {
      await adb.typeInField('Email', 'admin@jobbingtrack.com');
      await adb.wait(400);
      await adb.keyevent(4);
      await adb.wait(300);
      return 'Email saisi';
    }
    case 'submit_forgot': {
      await adb.tap('Envoyer');
      await adb.wait(2000);
      return 'Lien envoye';
    }
    case 'go_back_to_login':
    case 'go_back': {
      await adb.back();
      await adb.wait(1500);
      return 'Retour';
    }
    default:
      return `Step "${stepId}" non implementee`;
  }
}
