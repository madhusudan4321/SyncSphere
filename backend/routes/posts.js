const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const Post       = require('../models/Post');
const Comment    = require('../models/Comment');
const User       = require('../models/User');
const { protect } = require('../middleware/auth');

// ── Cloudinary storage ────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'syncsphere/posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1080, crop: 'scale', quality: 'auto:best' }],
  },
});
const upload = multer({ storage });

// ── Helper: attach comment counts to posts ────────────────────
async function withCommentCounts(posts) {
  const ids = posts.map(p => p._id);
  const counts = await Comment.aggregate([
    { $match: { post: { $in: ids } } },
    { $group: { _id: '$post', count: { $sum: 1 } } }
  ]);
  const map = {};
  counts.forEach(c => { map[c._id.toString()] = c.count; });
  return posts.map(p => {
    const obj = p.toObject ? p.toObject() : p;
    obj.commentCount = map[p._id.toString()] || 0;
    return obj;
  });
}

// GET /api/posts/feed?page=1&limit=10
router.get('/feed', protect, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const me  = await User.findById(req.user.id);
    const ids = [...me.following, me._id];

    const [posts, total] = await Promise.all([
      Post.find({ user: { $in: ids } })
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit)
        .populate('user', 'username name avatar')
        .populate('tags', 'username'),
      Post.countDocuments({ user: { $in: ids } })
    ]);

    const postsWithCounts = await withCommentCounts(posts);
    res.json({ posts: postsWithCounts, hasMore: skip + posts.length < total, page });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/posts/:id  — single post (for lightbox)
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username name avatar')
      .populate('tags', 'username');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const [enriched] = await withCommentCounts([post]);
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/posts
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const imageUrl = req.file ? req.file.path     : '';
    const publicId = req.file ? req.file.filename  : '';
    const post = await Post.create({
      user: req.user.id, image: imageUrl, publicId,
      emoji: req.body.emoji || '📷', caption: req.body.caption || ''
    });
    await post.populate('user', 'username name avatar');
    const [enriched] = await withCommentCounts([post]);
    res.status(201).json(enriched);
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
    if (post.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (post.publicId) await cloudinary.uploader.destroy(post.publicId).catch(() => {});
    await Comment.deleteMany({ post: post._id }); // clean up comments
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/posts/:id — edit caption/tags
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    if (req.body.caption !== undefined) post.caption = req.body.caption;
    if (req.body.tags    !== undefined) post.tags    = req.body.tags;
    await post.save();
    await post.populate('user', 'username name avatar');
    res.json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Mount comment routes
router.use('/:id/comments', require('./comments'));

module.exports = router;