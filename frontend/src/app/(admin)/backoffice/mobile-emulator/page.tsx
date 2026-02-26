'use client';

import { useState, useEffect, useRef } from 'react';
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
      if (data.ok) addLog('Contrôleur d’émulateur connecté.');
      else addLog('Contrôleur a répondu mais ok=false.');
    } catch (e) {
      setControllerOk(false);
      addLog('Contrôleur injoignable. Lancez-le sur la machine hôte : cd tools/emulator-controller && node server.js');
    }
  };

  const loadAvds = async () => {
    if (!controllerOk) return;
    setLoading('avds');
    try {
      const data = await fetchJson<{ avds: Avd[] }>('/avds');
      setAvds(data.avds || []);
      addLog(`AVD trouvés : ${(data.avds || []).length}`);
    } catch (e) {
      addLog(`Erreur AVD: ${e}`);
    } finally {
      setLoading(null);
    }
  };

  const loadDevices = async () => {
    if (!controllerOk) return;
    setLoading('devices');
    try {
      const data = await fetchJson<{ devices: Device[] }>('/devices');
      setDevices(data.devices || []);
      addLog(`Appareils ADB : ${(data.devices || []).length}`);
    } catch (e) {
      addLog(`Erreur appareils: ${e}`);
    } finally {
      setLoading(null);
    }
  };

  const loadFlutterDevices = async () => {
    if (!controllerOk) return;
    setLoading('flutter-devices');
    try {
      const res = await fetch(`${base()}/flutter-devices`, { headers: { 'Content-Type': 'application/json' } });
      const data = (await res.json()) as { devices?: FlutterDevice[]; error?: string };
      if (!res.ok) {
        setFlutterDevices([]);
        if (res.status === 404) addLog('Route /flutter-devices non disponible (contrôleur à mettre à jour).');
        else addLog(`Flutter devices: ${data.error || res.statusText}`);
        return;
      }
      setFlutterDevices(data.devices || []);
      if (data.error) addLog(`Flutter devices: ${data.error}`);
    } catch (e) {
      setFlutterDevices([]);
      addLog('Impossible de charger les appareils Flutter.');
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    checkHealth();
  }, [controllerUrl]);

  useEffect(() => {
    if (controllerOk) {
      loadAvds();
      loadDevices();
      loadFlutterDevices();
    }
  }, [controllerOk]);

  const startAvd = async () => {
    if (!selectedAvd) {
      addLog('Sélectionnez un AVD.');
      return;
    }
    setLoading('start-avd');
    try {
      await fetchJson('/start-avd', {
        method: 'POST',
        body: JSON.stringify({ avd: selectedAvd }),
      });
      addLog(`Démarrage AVD : ${selectedAvd}. Attendez 30–60 s puis rafraîchissez les appareils.`);
      setTimeout(loadDevices, 5000);
    } catch (e) {
      addLog(`Erreur démarrage AVD: ${e}`);
    } finally {
      setLoading(null);
    }
  };

  const buildApk = async () => {
    setLoading('build');
    addLog('Build APK en cours… (peut prendre 1–2 min)');
    try {
      const res = await fetch(`${base()}/build-apk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
        stdout?: string;
        stderr?: string;
        exitCode?: number;
      };
      addLog(data.message || (data.success ? 'Build réussi.' : data.error || 'Build échoué.'));
      if (!data.success && data.stderr) addLog(`stderr: ${data.stderr.slice(-800)}`);
      if (!data.success && data.stdout) addLog(`stdout: ${data.stdout.slice(-500)}`);
      if (!res.ok) addLog(`Réponse serveur: ${res.status}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Erreur build: ${msg}`);
    } finally {
      setLoading(null);
    }
  };

  const installAndRun = async () => {
    if (!selectedDevice) {
      addLog('Sélectionnez un appareil.');
      return;
    }
    setLoading('install-run');
    try {
      const data = await fetchJson<{ success?: boolean; message?: string; error?: string }>('/install-run', {
        method: 'POST',
        body: JSON.stringify({ deviceId: selectedDevice }),
      });
      addLog(data.message || (data.success ? 'App installée et lancée.' : data.error || 'Erreur'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Erreur install/run: ${msg}`);
    } finally {
      setLoading(null);
    }
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
      await fetchJson<{ success?: boolean; error?: string }>('/input-tap', {
        method: 'POST',
        body: JSON.stringify({ deviceId: selectedDevice, x, y }),
      });
    } catch (err) {
      addLog(`Tap: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const runFlutter = async () => {
    const deviceId = selectedFlutterDevice || selectedDevice;
    if (!deviceId) {
      addLog('Sélectionnez un appareil (ou un appareil Flutter pour « Flutter run »).');
      return;
    }
    setLoading('run-flutter');
    addLog('Lancement Flutter (build + run)…');
    try {
      const data = await fetchJson<{ success?: boolean; error?: string; stdout?: string; stderr?: string }>(
        '/run-flutter',
        { method: 'POST', body: JSON.stringify({ deviceId }) }
      );
      addLog(data.success ? 'Flutter run démarré. Logs dans le terminal du contrôleur.' : data.error || 'Erreur');
      if (data.stdout) addLog(data.stdout.slice(-500));
      if (data.stderr) addLog(data.stderr.slice(-500));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog(`Erreur run: ${msg}`);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (!selectedDevice || !controllerOk) {
      if (screenshotInterval.current) {
        clearInterval(screenshotInterval.current);
        screenshotInterval.current = null;
      }
      setScreenshotUrl(null);
      return;
    }
    const url = `${base()}/screenshot?device=${encodeURIComponent(selectedDevice)}&t=`;
    setScreenshotUrl(url + Date.now());
    screenshotInterval.current = setInterval(() => {
      setScreenshotUrl((prev) => (prev ? url + Date.now() : null));
    }, 1500);
    return () => {
      if (screenshotInterval.current) {
        clearInterval(screenshotInterval.current);
        screenshotInterval.current = null;
      }
    };
  }, [selectedDevice, controllerOk, controllerUrl]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Émulateur mobile – Android réel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sélectionnez un <strong>émulateur</strong> ou un <strong>téléphone déjà connecté</strong> (USB / adb), lancez l’app et voyez le <strong>rendu en direct</strong> dans cette page, comme dans Android Studio.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                URL du contrôleur d’émulateur (machine hôte)
              </label>
              <input
                type="text"
                value={controllerUrl}
                onChange={(e) => setControllerUrl(e.target.value)}
                placeholder="http://localhost:5055"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              {controllerOk === true && <Wifi className="h-5 w-5 text-green-600" title="Connecté" />}
              {controllerOk === false && <WifiOff className="h-5 w-5 text-red-600" title="Hors ligne" />}
              <button
                type="button"
                onClick={checkHealth}
                disabled={loading !== null}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Vérifier
              </button>
            </div>
          </div>

          {controllerOk && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    AVD (images Android – plusieurs API)
                  </label>
                  <select
                    value={selectedAvd}
                    onChange={(e) => setSelectedAvd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                  >
                    <option value="">— Choisir un AVD —</option>
                    {avds.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={loadAvds}
                    disabled={loading === 'avds'}
                    className="mt-1 text-xs text-blue-600 dark:text-blue-400"
                  >
                    {loading === 'avds' ? 'Chargement…' : 'Rafraîchir AVD'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Appareil (ADB – install APK / screenshot)
                  </label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                  >
                    <option value="">— Choisir un appareil —</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} ({d.status})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={loadDevices}
                    disabled={loading === 'devices'}
                    className="mt-1 text-xs text-blue-600 dark:text-blue-400"
                  >
                    {loading === 'devices' ? 'Chargement…' : 'Rafraîchir'}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Appareil pour « Flutter run » (reconnu par Flutter)
                  </label>
                  <select
                    value={selectedFlutterDevice}
                    onChange={(e) => setSelectedFlutterDevice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-100 text-sm"
                  >
                    <option value="">— Même que ci‑dessus ou choisir —</option>
                    {flutterDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={loadFlutterDevices}
                    disabled={loading === 'flutter-devices'}
                    className="mt-1 text-xs text-blue-600 dark:text-blue-400"
                  >
                    {loading === 'flutter-devices' ? 'Chargement…' : 'Rafraîchir'}
                  </button>
                  {flutterDevices.length === 0 && controllerOk && !loading && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Aucun appareil Flutter. Lancez le contrôleur avec ANDROID_HOME défini (ex. terminal).
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startAvd}
                  disabled={!selectedAvd || loading !== null}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading === 'start-avd' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Démarrer l’émulateur (AVD)
                </button>
                <button
                  type="button"
                  onClick={buildApk}
                  disabled={loading !== null}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading === 'build' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Build APK
                </button>
                <button
                  type="button"
                  onClick={installAndRun}
                  disabled={!selectedDevice || loading !== null}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading === 'install-run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Installer et lancer l’app
                </button>
                <button
                  type="button"
                  onClick={runFlutter}
                  disabled={(!selectedDevice && !selectedFlutterDevice) || loading !== null}
                  className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {loading === 'run-flutter' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Flutter run (build + run)
                </button>
              </div>
            </>
          )}

          {controllerOk === false && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Contrôleur non connecté</p>
              <p className="mt-1">
                Le contrôleur démarre normalement avec <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">make up-full</code>. Sinon, lancez manuellement : <code className="bg-amber-100 dark:bg-amber-900/40 px-1 rounded">make emulator-controller</code>
              </p>
              <p className="mt-2">Depuis Docker, utilisez l’URL du host (ex. http://host.docker.internal:5055).</p>
            </div>
          )}
        </div>

        {controllerOk && selectedDevice && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5" />
              Rendu en direct – clic = tap sur l’appareil
            </h2>
            <div className="rounded-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden bg-black inline-block max-w-full cursor-crosshair">
              {screenshotUrl ? (
                <img
                  src={screenshotUrl}
                  alt="Écran appareil (cliquez pour interagir)"
                  className="block max-h-[70vh] w-auto object-contain select-none"
                  style={{ imageRendering: 'pixelated' }}
                  onClick={sendTap}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLImageElement).click()}
                />
              ) : (
                <div className="w-[360px] h-[640px] flex items-center justify-center text-gray-500">
                  Rafraîchissement…
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Logs
            </h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (logs.length === 0) return;
                  const text = logs.join('\n');
                  try {
                    await navigator.clipboard.writeText(text);
                    setLogsCopied(true);
                    setTimeout(() => setLogsCopied(false), 2000);
                  } catch {
                    addLog('Impossible de copier (autorisez l’accès au presse-papier).');
                  }
                }}
                disabled={logs.length === 0}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logsCopied ? 'Copié !' : 'Copier'}
              </button>
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Effacer
              </button>
            </div>
          </div>
          <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-48 overflow-y-auto select-text">
            {logs.length === 0 ? (
              <div className="text-gray-500">Aucun log.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-0.5">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-6 text-sm text-indigo-800 dark:text-indigo-200">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Parcours utilisateur mobile
          </h3>
          <p className="mb-3">Lancez un parcours utilisateur pendant que l’émulateur affiche l’app en direct pour observer le comportement réel.</p>
          <div className="flex flex-wrap gap-3">
            <a href="/backoffice/user-journey" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Play className="h-4 w-4" /> Parcours prédéfinis
            </a>
            <a href="/backoffice/user-journey/custom" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Monitor className="h-4 w-4" /> Parcours personnalisé
            </a>
            <a href="/backoffice/user-journey/reports" className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Monitor className="h-4 w-4" /> Rapports
            </a>
          </div>
          <p className="mt-3 text-xs text-indigo-600 dark:text-indigo-400">
            Scénarios recommandés : <strong>Mobile — Inscription complète</strong>, <strong>Mobile — Usage quotidien</strong>, <strong>Mobile — Parcours complet</strong>
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-sm text-blue-800 dark:text-blue-200">
          <h3 className="font-semibold mb-2">Démarrer tout en un (make up-full)</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>Un seul terminal</strong> : <code>make up-full &amp;&amp; make db-push-all &amp;&amp; make status</code>. Le contrôleur d’émulateur démarre automatiquement (si Node et tools/emulator-controller sont présents).</li>
            <li>Ouvrez cette page (Backoffice → Émulateur mobile). Si la connexion au contrôleur est OK, vous pouvez continuer.</li>
            <li><strong>Sélectionnez un appareil</strong> : AVD (plusieurs niveaux API) ou <strong>téléphone déjà connecté en USB</strong> (adb). Si besoin, démarrez un AVD puis rafraîchissez les appareils.</li>
            <li>Build APK → Installer et lancer l’app. Le <strong>rendu en direct</strong> de l’écran s’affiche ci-dessus (comme Android Studio).</li>
          </ol>
        </div>
      </div>
    </AdminLayout>
  );
}
