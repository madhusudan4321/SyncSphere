const mongoose = require('mongoose');

// ── Media schema ──────────────────────────────────────────────────────────────
// Stores metadata for every file shared inside one-to-one chats.
// Actual bytes live in Cloudinary; this doc carries everything the UI needs.
const mediaSchema = new mongoose.Schema({
  // Participants
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Sorted "uid1_uid2" — enables fast chat-level media gallery queries
  chatId: { type: String, required: true, index: true },

  // File identity
  originalFileName: { type: String, required: true },      // preserved for download
  fileName:         { type: String, required: true },      // unique storage key
  fileType: {
    type: String,
    enum: ['image', 'video', 'document', 'audio', 'archive', 'text', 'other'],
    required: true,
    index: true,
  },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },              // bytes

  // Cloudinary references
  storagePath: { type: String, required: true },           // public_id
  storageUrl:  { type: String, required: true },           // secure_url
  thumbnailPath: { type: String, default: null },          // public_id of thumb
  thumbnailUrl:  { type: String, default: null },          // optimised preview URL

  // Message linkage
  messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

  // Lifecycle
  status:     { type: String, enum: ['uploading', 'uploaded', 'failed'], default: 'uploading' },
  uploadedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
// Gallery queries: filter by chat + type + sort by date
mediaSchema.index({ chatId: 1, fileType: 1, createdAt: -1 });
// Cross-user queries
mediaSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('Media', mediaSchema);
