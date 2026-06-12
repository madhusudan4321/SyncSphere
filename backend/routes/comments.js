const express  = require('express');
const router   = express.Router({ mergeParams: true });
const Comment  = require('../models/Comment');
const { protect } = require('../middleware/auth');

// GET /api/posts/:id/comments
router.get('/', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate('user', '_id username name');
    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/posts/:id/comments
router.post('/', protect, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ message: 'Comment cannot be empty' });
  try {
    const comment = await Comment.create({ post: req.params.id, user: req.user.id, text: text.trim() });
    await comment.populate('user', '_id username name');
    res.status(201).json(comment);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/posts/:id/comments/:commentId
router.delete('/:commentId', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
