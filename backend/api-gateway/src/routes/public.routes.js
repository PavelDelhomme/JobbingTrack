const express = require('express');
const { getPublicReleaseInfo } = require('../services/mobileReleaseStore');
const { getPublicReleaseInfoPayload } = require('../services/platformReleaseInfo');

const router = express.Router();

router.get('/release-info', (req, res) => {
  const payload = getPublicReleaseInfoPayload(getPublicReleaseInfo);
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.json(payload);
});

module.exports = router;
