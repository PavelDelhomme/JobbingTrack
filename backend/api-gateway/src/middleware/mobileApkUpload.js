const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

function releasesDir() {
  return process.env.MOBILE_RELEASES_DIR?.trim() || path.join(process.cwd(), 'mobile-releases');
}

function ensureReleasesDir() {
  const dir = releasesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function safeApkFilename(originalName) {
  const base = path.basename(String(originalName || 'release.apk'));
  const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-');
  const stem = cleaned.toLowerCase().endsWith('.apk')
    ? cleaned.slice(0, -4)
    : cleaned.replace(/\.apk$/i, '');
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${stem || 'jobbingtrack'}-${Date.now()}-${suffix}.apk`;
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    try {
      cb(null, ensureReleasesDir());
    } catch (error) {
      cb(error);
    }
  },
  filename(_req, file, cb) {
    cb(null, safeApkFilename(file.originalname));
  },
});

const mobileApkUpload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const name = String(file.originalname || '').toLowerCase();
    const mime = String(file.mimetype || '').toLowerCase();
    const apkMime =
      mime === 'application/vnd.android.package-archive'
      || mime === 'application/octet-stream'
      || mime === 'application/zip';
    if (!name.endsWith('.apk') && !apkMime) {
      return cb(new Error('Seuls les fichiers APK (.apk) sont acceptés'));
    }
    cb(null, true);
  },
});

module.exports = { mobileApkUpload, releasesDir, safeApkFilename };
