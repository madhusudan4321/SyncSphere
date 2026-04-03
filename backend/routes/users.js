const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// GET /api/users/search?q=
router.get('/search', protect, async (req, res) => {
  const q = req.query.q || '';
  try {
    const users = await User.find({
      _id: { $ne: req.user.id },
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { name:     { $regex: q, $options: 'i' } }
      ]
    }).select('_id username name bio avatar followers following');
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/:username
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('followers', '_id username name')
      .populate('following', '_id username name');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });
    res.json({ user, posts });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/profile/update
router.put('/profile/update', protect, async (req, res) => {
  const { name, bio, website } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio, website },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/:id/follow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    const me = await User.findById(req.user.id);
    if (!target || !me) return res.status(404).json({ message: 'User not found' });
    const isFollowing = me.following.includes(target._id);
    if (isFollowing) {
      me.following.pull(target._id);
      target.followers.pull(me._id);
    } else {
      me.following.push(target._id);
      target.followers.push(me._id);
    }
    await me.save();
    await target.save();
    res.json({ following: !isFollowing, followersCount: target.followers.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;