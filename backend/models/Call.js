const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  // Unique call identifier (generated client-side for correlation)
  callId:     { type: String, required: true, unique: true },

  callerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // 'voice' or 'video'
  callType:   { type: String, enum: ['voice', 'video'], required: true },

  // Final call outcome
  status: {
    type: String,
    enum: ['answered', 'missed', 'rejected', 'cancelled'],
    required: true
  },

  startedAt:  { type: Date, required: true },   // When call:start was emitted
  answeredAt: { type: Date, default: null },     // When receiver accepted
  endedAt:    { type: Date, default: null },     // When call:ended was emitted
  duration:   { type: Number, default: 0 },     // Seconds (0 for missed/rejected)
}, { timestamps: true });

// ── Indexes for fast queries ───────────────────────────────────
callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ receiverId: 1, createdAt: -1 });
callSchema.index({ callerId: 1, receiverId: 1, createdAt: -1 });
callSchema.index({ callId: 1 }, { unique: true });

module.exports = mongoose.model('Call', callSchema);
