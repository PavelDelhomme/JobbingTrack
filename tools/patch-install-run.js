const fs = require('fs');
const path = require('path');

try {
const filePath = path.join(__dirname, '../frontend/src/app/(admin)/backoffice/mobile-emulator/page.tsx');
let s = fs.readFileSync(filePath, 'utf8');

// Replace entire ensureBuildAndInstall function
const funcStart = "  const ensureBuildAndInstall = async (): Promise<boolean> => {";
const funcEnd = "    } finally {\n      setLoading(null);\n    }\n  };";
const startIdx = s.indexOf(funcStart);
if (startIdx === -1) {
  console.error('ensureBuildAndInstall start not found');
  process.exit(1);
}
const endIdx = s.indexOf(funcEnd, startIdx);
if (endIdx === -1) {
  console.error('ensureBuildAndInstall end not found. funcEnd repr:', JSON.stringify(funcEnd));
  console.error('Around line 450:', s.slice(startIdx, startIdx + 800));
  process.exit(1);
}
const before = s.slice(0, startIdx);
const after = s.slice(endIdx + funcEnd.length);

const newBlock = `  const ensureBuildAndInstall = async (): Promise<boolean> => {
    if (!selectedDevice) return false;
    const controllerBase = base();
    const doInstallRun = async (): Promise<{ success: boolean; error?: string; needBuild?: boolean }> => {
      try {
        const data = await fetchJson<{ success?: boolean; message?: string; error?: string }>('/install-run', {
          method: 'POST',
          body: JSON.stringify({ deviceId: selectedDevice }),
        });
        return { success: !!data.success, error: data.error };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const needBuild = /APK non trouvé|non trouvé|Build APK/i.test(msg);
        return { success: false, error: msg, needBuild };
      }
    };

    try {
      setLoading('install-run');
      let result = await doInstallRun();

      if (result.success) {
        setAppRunning(true);
        setApkBuilt(true);
        addLog('App installée et lancée (adb reverse activé sur ports API).');
        return true;
      }

      if (result.needBuild || (result.error != null && /APK|build/i.test(result.error))) {
        addLog('APK absent ou obsolète. Build en cours...');
        setLoading('build');
        const buildSuccess = await buildApk();
        setLoading(null);
        if (!buildSuccess) {
          addLog('Build APK a échoué. Lancez « Build APK » manuellement puis « Installer et lancer ».');
          return false;
        }
        addLog('Build OK. Attente du redémarrage du contrôleur (si lancé)...');
        const maxWaitMs = 18000;
        const pollMs = 1500;
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
          await new Promise((r) => setTimeout(r, pollMs));
          try {
            const res = await fetch(\`\${controllerBase}/health\`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
            const data = await res.json().catch(() => ({}));
            if (data?.ok) {
              addLog('Contrôleur de nouveau disponible. Installation...');
              setControllerOk(true);
              break;
            }
          } catch {
            /* pas encore prêt */
          }
        }
        setLoading('install-run');
        result = await doInstallRun();
      }

      if (result.success) {
        setAppRunning(true);
        setApkBuilt(true);
        addLog('App installée, fermée puis relancée (adb reverse activé sur ports API).');
        return true;
      }

      addLog(result.error ?? 'Installation ou lancement échoué. Vérifiez qu'un appareil ADB est sélectionné et que le contrôleur tourne (make emulator-controller).');
      return false;
    } catch (e) {
      addLog(\`Erreur install/run: \${e instanceof Error ? e.message : String(e)}\`);
      return false;
    } finally {
      setLoading(null);
    }
  };`;

const out = before + newBlock + after;
fs.writeFileSync(filePath, out);
console.log('Patch applied successfully.');
} catch (err) {
  console.error(err);
  process.exit(1);
}
