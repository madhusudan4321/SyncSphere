const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Post       = require('../models/Post');
const User       = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Cloudinary storage for multer ────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'syncsphere/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1080, crop: 'limit', quality: 'auto' }],
  },
});
const upload = multer({ storage });

// GET /api/posts/feed
router.get('/feed', protect, async (req, res) => {
  try {
    const me  = await User.findById(req.user.id);
    const ids = [...me.following, me._id];
    const posts = await Post.find({ user: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar')
      .populate('tags', 'username');
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/posts
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    // Cloudinary returns the full URL in req.file.path
    const imageUrl = req.file ? req.file.path : '';
    const publicId = req.file ? req.file.filename : '';

    const post = await Post.create({
      user:     req.user.id,
      image:    imageUrl,
      publicId,
      emoji:    req.body.emoji || '📷',
      caption:  req.body.caption || ''
    });
    await post.populate('user', 'username name avatar');
    res.status(201).json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/posts/:id/like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const liked = post.likes.includes(req.user.id);
    if (liked) post.likes.pull(req.user.id);
    else       post.likes.push(req.user.id);
    await post.save();
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    // Delete image from Cloudinary if it exists
    if (post.publicId) {
      await cloudinary.uploader.destroy(post.publicId).catch(err =>
        console.error('Cloudinary delete error:', err.message)
      );
    }

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/posts/:id — edit caption and/or tags
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    if (req.body.caption !== undefined) post.caption = req.body.caption;
    if (req.body.tags   !== undefined) post.tags    = req.body.tags;
    await post.save();
    await post.populate('user', 'username name avatar');
    res.json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;