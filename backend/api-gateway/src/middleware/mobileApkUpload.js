const multer = require('multer');
const path = require('path');
const { releasesDir } = require('../services/mobileReleaseStore');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, releasesDir());
  },
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname || 'upload.apk').replace(/[^a-zA-Z0-9._+-]/g, '_');
    cb(null, safe.toLowerCase().endsWith('.apk') ? safe : `${safe}.apk`);
  },
});

const mobileApkUpload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.apk')) {
      cb(new Error('Seuls les fichiers .apk sont acceptés'));
      return;
    }
    cb(null, true);
  },
});

module.exports = { mobileApkUpload };
