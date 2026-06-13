const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:           { type: String, required: true },
  edited:         { type: Boolean, default: false },
  deletedForAll:  { type: Boolean, default: false },
  reactions:      [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, emoji: String }],
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);