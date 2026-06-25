/** Helpers ADB BlueMail (install APK, Play Store). @used-by scripts/mobile/lib/bluemail-setup-flow.js, scripts/mobile/setup/install-emulator-bluemail.js, scripts/mobile/setup/setup-emulator-bluemail.js */
const fs = require('fs');
const path = require('path');
const { BLUEMAIL_PACKAGES, PLAY_STORE_PACKAGE } = require('./bluemail-packages');

const ROOT = path.resolve(__dirname, '../../..');
const APK_DIR = path.join(ROOT, 'tools/apk');

async function isPlayStoreLaunchable(phone) {
  const out = await phone.shellCommand(
    `cmd package resolve-activity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER ${PLAY_STORE_PACKAGE} 2>/dev/null || true`,
  );
  return Boolean(out && out.includes('name='));
}

async function isBlueMailInstalled(phone) {
  for (const pkg of BLUEMAIL_PACKAGES) {
    const out = await phone.shellCommand(`pm path ${pkg} 2>/dev/null || true`);
    if (out && out.includes('package:')) return pkg;
  }
  return null;
}

async function openBlueMail(phone, pkg) {
  const id = pkg || (await isBlueMailInstalled(phone));
  if (!id) throw new Error('BlueMail non installé');
  const activities = [
    `${id}/com.trtf.blue.MainActivity`,
    `${id}/.activity.WelcomeActivity`,
  ];
  for (const act of activities) {
    try {
      await phone.shellCommand(`am start -n ${act}`);
      await phone.wait(1500);
      return;
    } catch {
      /* activité suivante */
    }
  }
  await phone.shellCommand(`am start -a android.intent.action.MAIN -p ${id}`);
  await phone.wait(1500);
}

function resolveLocalApkPath() {
  const fromEnv = process.env.BLUEMAIL_APK_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  const candidates = [
    path.join(APK_DIR, 'me.bluemail.mail.apk'),
    path.join(APK_DIR, 'com.bluemail.mail.apk'),
    path.join(APK_DIR, 'bluemail.apk'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  const dirFiles = fs.existsSync(APK_DIR)
    ? fs.readdirSync(APK_DIR).filter((f) => f.endsWith('.apk'))
    : [];
  if (dirFiles.length === 1) return path.join(APK_DIR, dirFiles[0]);
  return null;
}

async function pullApkFromDevice(sourceDeviceId, destPath = path.join(APK_DIR, 'me.bluemail.mail.apk')) {
  const { execSync } = require('child_process');
  for (const pkg of BLUEMAIL_PACKAGES) {
    let raw = '';
    try {
      raw = execSync(`adb -s ${sourceDeviceId} shell pm path ${pkg} 2>/dev/null`, {
        encoding: 'utf8',
      }).trim();
    } catch {
      continue;
    }
    const remote = raw.split('\n').map((l) => l.replace(/^package:/, '').trim()).find(Boolean);
    if (!remote) continue;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    console.log(`Pull BlueMail depuis ${sourceDeviceId} (${pkg})…`);
    execSync(`adb -s ${sourceDeviceId} pull "${remote}" "${destPath}"`, { stdio: 'inherit' });
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000) {
      return destPath;
    }
  }
  return null;
}

async function findDeviceWithBlueMail(excludeDeviceId) {
  const { execSync } = require('child_process');
  const lines = execSync('adb devices', { encoding: 'utf8' })
    .split('\n')
    .slice(1)
    .map((l) => l.split('\t')[0])
    .filter((id) => id && id !== excludeDeviceId);
  for (const id of lines) {
    for (const pkg of BLUEMAIL_PACKAGES) {
      try {
        const out = execSync(`adb -s ${id} shell pm path ${pkg} 2>/dev/null`, { encoding: 'utf8' });
        if (out.includes('package:')) return id;
      } catch {
        /* suivant */
      }
    }
  }
  return null;
}

async function ensureBlueMailApk(phone) {
  const local = resolveLocalApkPath();
  if (local) return local;
  const source = process.env.BLUEMAIL_APK_SOURCE_DEVICE?.trim() || (await findDeviceWithBlueMail(phone.deviceId));
  if (!source) return null;
  return pullApkFromDevice(source);
}

async function sideloadBlueMail(phone) {
  let apk = resolveLocalApkPath();
  if (!apk) {
    apk = await ensureBlueMailApk(phone);
  }
  if (!apk) return false;
  console.log(`Sideload APK : ${apk}`);
  const id = phone.deviceId || '';
  const prefix = id ? `adb -s ${id}` : 'adb';
  const { execSync } = require('child_process');
  execSync(`${prefix} install -r "${apk}"`, { stdio: 'inherit' });
  return Boolean(await isBlueMailInstalled(phone));
}

async function installViaPlayStore(phone) {
  const storePkg = 'me.bluemail.mail';
  if (!(await isPlayStoreLaunchable(phone))) {
    return false;
  }
  console.log('Play Store détecté — ouverture fiche BlueMail…');
  await phone.shellCommand(
    `am start -a android.intent.action.VIEW -d "market://details?id=${storePkg}"`,
  );
  await phone.wait(4000);

  const installLabels = ['Installer', 'Install', 'UPDATE', 'Mettre à jour', 'Get'];
  for (const label of installLabels) {
    if (!(await phone.uiContains(label))) continue;
    try {
      await phone.tapReliable(label);
      console.log(`Tap « ${label} » — téléchargement en cours sur l’émulateur…`);
      break;
    } catch {
      /* suivant */
    }
  }

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    const pkg = await isBlueMailInstalled(phone);
    if (pkg) {
      console.log(`BlueMail installé via Play Store (${pkg})`);
      return pkg;
    }
    await phone.wait(5000);
  }
  return null;
}

module.exports = {
  isPlayStoreLaunchable,
  isBlueMailInstalled,
  openBlueMail,
  resolveLocalApkPath,
  pullApkFromDevice,
  findDeviceWithBlueMail,
  ensureBlueMailApk,
  sideloadBlueMail,
  installViaPlayStore,
  APK_DIR,
};
