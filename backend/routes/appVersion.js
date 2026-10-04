const express = require('express');
const router = express.Router();

router.get('/version', (req, res) => {
  res.json({
    version: '1.0.0',
    versionCode: 1,
    apkUrl: 'https://YOUR-APK-URL/syncsphere-1.0.0.apk',
    mandatory: false,
    releaseNotes: [
      'Initial SyncSphere release'
    ]
  });
});

module.exports = router;