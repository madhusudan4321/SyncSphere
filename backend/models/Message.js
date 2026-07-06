const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:          { type: String, required: true },
  edited:        { type: Boolean, default: false },
  deletedForAll: { type: Boolean, default: false },
  reactions:     [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
  // ── WhatsApp-style status ──────────────────────────────────────
  // 'sent'      → stored in DB, not yet delivered to receiver's device
  // 'delivered' → receiver's socket received it (device online)
  // 'seen'      → receiver opened the conversation
  status:        { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent', index: true },
  deliveredAt:   { type: Date, default: null },
  seenAt:        { type: Date, default: null },
}, { timestamps: true });

// Index for fast pending-delivery queries on reconnect
messageSchema.index({ to: 1, status: 1 });

module.exports = mongoose.model('Message', messageSchema);