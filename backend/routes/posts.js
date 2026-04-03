const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// GET /api/posts/feed
router.get('/feed', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const ids = [...me.following, me._id];
    const posts = await Post.find({ user: { $in: ids } })
      .sort({ createdAt: -1 })
      .populate('user', 'username name avatar');
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/posts
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    const post = await Post.create({
      user: req.user.id,
      image: imageUrl,
      emoji: req.body.emoji || '📷',
      caption: req.body.caption || ''
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
    else post.likes.push(req.user.id);
    await post.save();
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;