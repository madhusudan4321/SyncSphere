const mongoose = require('mongoose');

module.exports = mongoose.model('AppVersion', new mongoose.Schema({
  versionCode: { type: Number, required: true },
  versionName: String,
  apkUrl: { type: String, required: true },
  releaseNotes: String,
  mandatory: { type: Boolean, default: false },
}, { timestamps: true }));