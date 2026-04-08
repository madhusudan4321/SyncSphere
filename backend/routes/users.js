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

// GET /api/users/follow-requests — get my pending follow requests
router.get('/follow-requests/list', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('followRequests', '_id username name avatar');
    res.json(me.followRequests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/privacy — toggle private/public
router.put('/privacy/toggle', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    user.isPrivate = !user.isPrivate;
    await user.save();
    res.json({ isPrivate: user.isPrivate });
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
    const hasPendingRequest = target.followRequests.includes(me._id);

    if (isFollowing) {
      // Unfollow
      me.following.pull(target._id);
      target.followers.pull(me._id);
      await me.save();
      await target.save();
      return res.json({ status: 'unfollowed', followersCount: target.followers.length });
    }

    if (hasPendingRequest) {
      // Cancel follow request
      target.followRequests.pull(me._id);
      await target.save();
      return res.json({ status: 'request_cancelled', followersCount: target.followers.length });
    }

    if (target.isPrivate) {
      // Send follow request
      target.followRequests.push(me._id);
      await target.save();
      return res.json({ status: 'request_sent', followersCount: target.followers.length });
    }

    // Public account — follow directly
    me.following.push(target._id);
    target.followers.push(me._id);
    await me.save();
    await target.save();
    res.json({ status: 'following', followersCount: target.followers.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/follow-requests/:id/accept
router.put('/follow-requests/:id/accept', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const requester = await User.findById(req.params.id);
    if (!requester) return res.status(404).json({ message: 'User not found' });
    me.followRequests.pull(requester._id);
    me.followers.push(requester._id);
    requester.following.push(me._id);
    await me.save();
    await requester.save();
    res.json({ message: 'Follow request accepted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/users/follow-requests/:id/decline
router.put('/follow-requests/:id/decline', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.followRequests.pull(req.params.id);
    await me.save();
    res.json({ message: 'Follow request declined' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/users/blocked/list
router.get('/blocked/list', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id)
      .populate('blockedUsers', '_id username name avatar');
    res.json(me.blockedUsers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/:id/block
router.post('/:id/block', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me.blockedUsers.includes(req.params.id)) {
      me.blockedUsers.push(req.params.id);
      me.following.pull(req.params.id);
      const target = await User.findById(req.params.id);
      if (target) {
        target.followers.pull(me._id);
        target.following.pull(me._id);
        me.followers.pull(target._id);
        await target.save();
      }
      await me.save();
    }
    res.json({ message: 'User blocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/:id/unblock
router.post('/:id/unblock', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.blockedUsers.pull(req.params.id);
    await me.save();
    res.json({ message: 'User unblocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/:id/report
router.post('/:id/report', protect, async (req, res) => {
  const { reason } = req.body;
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    target.reports.push({ reason, reportedBy: req.user.id });
    await target.save();
    res.json({ message: 'Report submitted' });
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

// POST /api/users/:id/block
router.post('/:id/block', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me.blockedUsers.includes(req.params.id)) {
      me.blockedUsers.push(req.params.id);
      // also unfollow if following
      me.following.pull(req.params.id);
      const target = await User.findById(req.params.id);
      if (target) {
        target.followers.pull(me._id);
        target.following.pull(me._id);
        me.followers.pull(target._id);
        await target.save();
      }
      await me.save();
    }
    res.json({ message: 'User blocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/users/:id/report
router.post('/:id/report', protect, async (req, res) => {
  const { reason } = req.body;
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'User not found' });
    target.reports.push({ reason, reportedBy: req.user.id });
    await target.save();
    res.json({ message: 'Report submitted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;