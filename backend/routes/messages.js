const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const MessageRequest = require('../models/MessageRequest');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/messages/threads
router.get('/threads', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ from: req.user.id }, { to: req.user.id }]
    }).sort({ createdAt: -1 }).populate('from to', 'username name avatar');

    const threadMap = {};
    messages.forEach(msg => {
      if (!msg.from || !msg.to) return;
      const other = msg.from._id.toString() === req.user.id ? msg.to : msg.from;
      if (!other || !other._id) return;
      const key = other._id.toString();
      if (!threadMap[key]) threadMap[key] = { user: other, lastMsg: msg };
    });
    res.json(Object.values(threadMap));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/messages/requests — get all pending requests for me
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await MessageRequest.find({
      to: req.user.id,
      status: 'pending'
    }).populate('from', 'username name avatar');
    res.json(requests);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/messages/request-status/:userId — check request status
router.get('/request-status/:userId', protect, async (req, res) => {
  try {
    const request = await MessageRequest.findOne({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ]
    });
    res.json({ request });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/messages/request — send a message request
router.post('/request', protect, async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ message: 'Recipient and text required' });
  try {
    // check if already following — if following, no request needed
    const me = await User.findById(req.user.id);
    const isFollowing = me.following.includes(to);
    if (isFollowing) return res.status(400).json({ message: 'Already following, send message directly' });

    // check if request already exists
    const existing = await MessageRequest.findOne({ from: req.user.id, to });
    if (existing && existing.status === 'pending')
      return res.status(400).json({ message: 'Request already sent' });

    // check if other person already accepted a previous request
    const accepted = await MessageRequest.findOne({ from: req.user.id, to, status: 'accepted' });
    if (accepted) return res.status(400).json({ message: 'Already connected, send message directly' });

    const request = await MessageRequest.create({ from: req.user.id, to, text });
    await request.populate('from', 'username name avatar');
    res.status(201).json(request);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/messages/request/:id/accept
router.put('/request/:id/accept', protect, async (req, res) => {
  try {
    const request = await MessageRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.to.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    request.status = 'accepted';
    await request.save();
    // create the first message from the request text
    await Message.create({ from: request.from, to: request.to, text: request.text });
    res.json({ message: 'Request accepted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/messages/request/:id/decline
router.put('/request/:id/decline', protect, async (req, res) => {
  try {
    const request = await MessageRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.to.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    request.status = 'declined';
    await request.save();
    res.json({ message: 'Request declined' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET /api/messages/:userId
router.get('/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ],
      deletedForAll: { $ne: true }
    }).sort({ createdAt: 1 }).populate('from to', 'username name avatar');
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/messages/seen/:partnerId — mark all messages from partner as seen
// Called when receiver opens the chat window (REST fallback alongside socket)
router.put('/seen/:partnerId', protect, async (req, res) => {
  try {
    const now = new Date();
    const result = await Message.updateMany(
      { from: req.params.partnerId, to: req.user.id, status: { $in: ['sent', 'delivered'] } },
      { $set: { status: 'seen', seenAt: now } }
    );
    res.json({ updated: result.modifiedCount });
  } catch (err) { res.status(500).json({ message: err.message }); }
});


// POST /api/messages — send message (only if following or accepted request)
router.post('/', protect, async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ message: 'Recipient and text required' });
  try {
    const me = await User.findById(req.user.id);
    const isFollowing = me.following.includes(to);
    const acceptedRequest = await MessageRequest.findOne({
      $or: [
        { from: req.user.id, to, status: 'accepted' },
        { from: to, to: req.user.id, status: 'accepted' }
      ]
    });
    if (!isFollowing && !acceptedRequest)
      return res.status(403).json({ message: 'Send a message request first' });

    const msg = await Message.create({ from: req.user.id, to, text });
    await msg.populate('from to', 'username name');
    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE /api/messages/:id — unsend message (sender only, deletes for both)
router.delete('/:id', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.from.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only the sender can unsend a message' });
    msg.deletedForAll = true;
    msg.text = 'This message was unsent';
    await msg.save();
    res.json({ message: 'Message unsent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PUT /api/messages/:id — edit message text (sender only)
router.put('/:id', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.from.toString() !== req.user.id)
      return res.status(403).json({ message: 'Only the sender can edit a message' });
    if (!req.body.text || !req.body.text.trim())
      return res.status(400).json({ message: 'Text cannot be empty' });
    msg.text = req.body.text.trim();
    msg.edited = true;
    await msg.save();
    await msg.populate('from to', 'username name');
    res.json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/messages/:id/react — add or toggle emoji reaction
router.post('/:id/react', protect, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'Emoji required' });
    const idx = msg.reactions.findIndex(r => r.user.toString() === req.user.id);
    if (idx >= 0) {
      if (msg.reactions[idx].emoji === emoji) {
        msg.reactions.splice(idx, 1); // toggle off same emoji
      } else {
        msg.reactions[idx].emoji = emoji; // change to different emoji
      }
    } else {
      msg.reactions.push({ user: req.user.id, emoji });
    }
    await msg.save();
    res.json({ reactions: msg.reactions });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;