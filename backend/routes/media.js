const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const https   = require('https');
const http    = require('http');

const { protect }    = require('../middleware/auth');
const mediaService   = require('../services/mediaService');
const Media          = require('../models/Media');
const Message        = require('../models/Message');

// ── Multer: memory storage (stream to Cloudinary) ─────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 100 * 1024 * 1024 },  // hard cap at 100 MB
  fileFilter: (req, file, cb) => cb(null, true), // type validated in service
});

// ── POST /api/media/upload ────────────────────────────────────────────────────
// Upload a file, create a Media doc + linked Message doc.
// Returns the fully-populated message and media for immediate UI update.
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' });

    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ message: 'receiverId is required' });

    // Block self-sends
    if (receiverId === req.user.id) {
      return res.status(400).json({ message: 'Cannot send media to yourself' });
    }

    // Upload file + create Media record
    const media = await mediaService.uploadMedia({
      buffer:       req.file.buffer,
      originalname: req.file.originalname,
      mimetype:     req.file.mimetype,
      size:         req.file.size,
      senderId:     req.user.id,
      receiverId,
    });

    // Create the chat Message record linked to this media
    const message = await Message.create({
      from:   req.user.id,
      to:     receiverId,
      text:   '',          // empty — UI uses media object
      type:   'media',
      media:  media._id,
      status: 'sent',
    });

    // Back-link the message into the media doc
    await Media.findByIdAndUpdate(media._id, { messageId: message._id });

    // Populate for response (receiver needs sender info immediately)
    const populated = await Message.findById(message._id)
      .populate('from', 'username name avatar')
      .populate({ path: 'media' });

    res.status(201).json({ message: populated, media });
  } catch (err) {
    console.error('[media/upload]', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/media/download/:id ───────────────────────────────────────────────
// Auth-proxied download — prevents direct public URL sharing.
// MUST be declared before /:id so Express doesn't swallow 'download' as an id.
router.get('/download/:id', protect, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ message: 'Media not found' });

    // Only sender or receiver can download
    const uid = req.user.id;
    if (media.senderId.toString() !== uid && media.receiverId.toString() !== uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Stream from Cloudinary through our server
    const proto = media.storageUrl.startsWith('https') ? https : http;
    const ext   = media.originalFileName.split('.').pop();
    const safeFilename = encodeURIComponent(media.originalFileName);

    proto.get(media.storageUrl, (stream) => {
      if (stream.statusCode !== 200) {
        return res.status(502).json({ message: 'Upstream fetch failed' });
      }
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
      res.setHeader('Content-Type', media.mimeType);
      if (stream.headers['content-length']) {
        res.setHeader('Content-Length', stream.headers['content-length']);
      }
      stream.pipe(res);
    }).on('error', () => res.status(502).json({ message: 'Download failed' }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/media/chat/:chatId ───────────────────────────────────────────────
// Paginated, filtered, sortable gallery for a chat conversation.
router.get('/chat/:chatId', protect, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { fileType = 'all', page = '1', sort = 'newest', q = '' } = req.query;

    // Security: caller must be one of the chat participants
    const uid   = req.user.id;
    const parts = chatId.split('_');
    if (parts.length !== 2 || !parts.includes(uid)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const result = await mediaService.getChatMedia({
      chatId,
      fileType,
      page:  Math.max(1, parseInt(page) || 1),
      limit: 24,
      sort,
      q,
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/media/:id ────────────────────────────────────────────────────────
// Retrieve single media metadata (e.g. for viewer init).
router.get('/:id', protect, async (req, res) => {
  try {
    const media = await Media.findById(req.params.id)
      .populate('senderId', 'username name avatar');
    if (!media) return res.status(404).json({ message: 'Media not found' });

    const uid = req.user.id;
    if (media.senderId._id.toString() !== uid && media.receiverId.toString() !== uid) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(media);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/media/:id ─────────────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    await mediaService.deleteMedia(req.params.id, req.user.id);
    res.json({ message: 'Media deleted' });
  } catch (err) {
    const status = err.message === 'Unauthorized' ? 403
                 : err.message === 'Media not found' ? 404 : 500;
    res.status(status).json({ message: err.message });
  }
});

module.exports = router;
