const router = require('express').Router();
const AppVersion = require('../models/AppVersion');

// Public: the app calls this
router.get('/version', async (req, res) => {
  const latest = await AppVersion.findOne().sort({ versionCode: -1 }).lean();
  if (!latest) return res.status(404).json({ message: 'No release found' });
  res.json(latest);
});

// Private: you call this when you publish a release
router.post('/version', async (req, res) => {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { versionCode, versionName, apkUrl, releaseNotes, mandatory } = req.body;
  const doc = await AppVersion.create({ versionCode, versionName, apkUrl, releaseNotes, mandatory });
  res.status(201).json(doc);
});

module.exports = router;