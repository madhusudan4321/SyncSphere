const express  = require('express');
const router   = express.Router();
const Call     = require('../models/Call');
const { protect } = require('../middleware/auth');

// ── GET /api/calls — paginated global call history ────────────
router.get('/', protect, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(50, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const { type, status } = req.query;

    const filter = {
      $or: [{ callerId: req.user.id }, { receiverId: req.user.id }]
    };
    if (type   && ['voice', 'video'].includes(type))   filter.callType = type;
    if (status && ['missed', 'answered', 'rejected', 'cancelled'].includes(status))
      filter.status = status;

    const [calls, total] = await Promise.all([
      Call.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('callerId',   'username name avatar')
        .populate('receiverId', 'username name avatar')
        .lean(),
      Call.countDocuments(filter),
    ]);

    res.json({ calls, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/calls/with/:userId — call history with one user ──
router.get('/with/:userId', protect, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {
      $or: [
        { callerId: req.user.id,       receiverId: req.params.userId },
        { callerId: req.params.userId, receiverId: req.user.id       },
      ]
    };

    const [calls, total] = await Promise.all([
      Call.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('callerId',   'username name avatar')
        .populate('receiverId', 'username name avatar')
        .lean(),
      Call.countDocuments(filter),
    ]);

    res.json({ calls, total, page, pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/calls/:id — remove single call log ────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) return res.status(404).json({ message: 'Call not found' });
    const myId = req.user.id;
    if (call.callerId.toString() !== myId && call.receiverId.toString() !== myId)
      return res.status(403).json({ message: 'Not authorized' });
    await Call.findByIdAndDelete(req.params.id);
    res.json({ message: 'Call log deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/calls — clear entire call history ─────────────
router.delete('/', protect, async (req, res) => {
  try {
    await Call.deleteMany({
      $or: [{ callerId: req.user.id }, { receiverId: req.user.id }]
    });
    res.json({ message: 'Call history cleared' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
