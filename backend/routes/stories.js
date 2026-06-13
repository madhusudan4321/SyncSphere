const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Story      = require('../models/Story');
const User       = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Cloudinary storage — NO transformation, full quality ───────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'syncsphere/stories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'],
    // No quality reduction — preserve 4K/original quality
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
  }),
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

// ── POST /api/stories — upload a new story ────────────────────
router.post('/', protect, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Media is required' });
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 hours
    const story = await Story.create({
      user:     req.user.id,
      media:    req.file.path,
      publicId: req.file.filename,
      expiresAt,
    });
    await story.populate('user', 'username name avatar');
    res.status(201).json(story);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/stories/feed — stories from me + people I follow ──
router.get('/feed', protect, async (req, res) => {
  try {
    const me  = await User.findById(req.user.id);
    const ids = [...(me.following || []), me._id];
    const now = new Date();

    const stories = await Story.find({
      user:      { $in: ids },
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar')
      .populate('replies.user', 'username name avatar')
      .lean();

    // Group by user
    const grouped = {};
    stories.forEach(s => {
      const uid = s.user._id.toString();
      if (!grouped[uid]) grouped[uid] = { user: s.user, stories: [] };
      grouped[uid].stories.push({
        ...s,
        liked:  s.likes.some(l => l.toString() === req.user.id),
        viewed: s.views.some(v => v.toString() === req.user.id),
      });
    });

    // Own stories first, then others
    const result = Object.values(grouped).sort((a, b) => {
      if (a.user._id.toString() === req.user.id) return -1;
      if (b.user._id.toString() === req.user.id) return  1;
      return 0;
    });

    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/stories/:id/view — mark story as viewed ──────────
router.put('/:id/view', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (!story.views.includes(req.user.id)) {
      story.views.push(req.user.id);
      await story.save();
    }
    res.json({ views: story.views.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/stories/:id/like — toggle like ───────────────────
router.put('/:id/like', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    const liked = story.likes.includes(req.user.id);
    if (liked) story.likes.pull(req.user.id);
    else       story.likes.push(req.user.id);
    await story.save();
    res.json({ liked: !liked, likesCount: story.likes.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/stories/:id/reply — reply to a story ───────────
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Reply text is required' });
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    story.replies.push({ user: req.user.id, text: text.trim() });
    await story.save();
    await story.populate('replies.user', 'username name avatar');
    const reply = story.replies[story.replies.length - 1];
    res.status(201).json(reply);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/stories/:id — delete own story ────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (story.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    if (story.publicId) {
      await cloudinary.uploader.destroy(story.publicId).catch(() => {});
    }
    await story.deleteOne();
    res.json({ message: 'Story deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
