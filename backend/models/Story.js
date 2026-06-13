const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:    { type: String, required: true, maxlength: 500 },
}, { timestamps: true });

const storySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media:     { type: String, required: true },       // Cloudinary URL (full quality)
  publicId:  { type: String, default: '' },          // for deletion
  likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  views:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies:   [replySchema],
  expiresAt: { type: Date, required: true },         // createdAt + 24 hrs
}, { timestamps: true });

// TTL index — MongoDB auto-deletes documents after expiresAt
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
