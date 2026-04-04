const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
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

// GET /api/messages/:userId
router.get('/:userId', protect, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ]
    }).sort({ createdAt: 1 }).populate('from to', 'username name');
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST /api/messages
router.post('/', protect, async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ message: 'Recipient and text required' });
  try {
    const msg = await Message.create({ from: req.user.id, to, text });
    await msg.populate('from to', 'username name');
    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;