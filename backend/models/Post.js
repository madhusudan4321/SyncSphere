const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image:   { type: String, default: '' },
  emoji:   { type: String, default: '📷' },
  caption: { type: String, default: '' },
  likes:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);