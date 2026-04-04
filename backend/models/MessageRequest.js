const mongoose = require('mongoose');

const messageRequestSchema = new mongoose.Schema({
  from:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  text:   { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('MessageRequest', messageRequestSchema);