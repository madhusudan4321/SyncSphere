const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const dotenv    = require('dotenv');
const cors      = require('cors');
const path      = require('path');
const rateLimit = require('express-rate-limit');
const jwt       = require('jsonwebtoken');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

// ── Allowed origins ───────────────────────────────────────────
const allowedOrigins = [
  'https://syncsphere-frontend.onrender.com',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting (auth routes) ───────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' }
});

// ── Health check (keep-alive ping from frontend) ──────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/forgot',   authLimiter, require('./routes/forgot'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/posts',    require('./routes/posts'));
app.use('/api/stories',  require('./routes/stories'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/calls',    require('./routes/calls'));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Socket.io — real-time chat + presence ────────────────────
const io = new Server(server, {
  cors:              { origin: allowedOrigins, methods: ['GET', 'POST'] },
  pingTimeout:       30000,
  pingInterval:      10000,
  connectTimeout:    20000,
  transports:        ['websocket', 'polling'],
});

// ── JWT auth middleware for sockets ───────────────────────────
io.use((socket, next) => {
  try {
    const token   = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Socket auth failed'));
  }
});

// ── In-memory multi-device session map ───────────────────────
// userSessions: Map<userId(string) → Set<socketId(string)>>
// A user is "online" as long as Set.size > 0.
// When they close all tabs/devices, Set becomes empty → offline.
const userSessions = new Map();

function addSession(userId, socketId) {
  if (!userSessions.has(userId)) userSessions.set(userId, new Set());
  userSessions.get(userId).add(socketId);
}

function removeSession(userId, socketId) {
  const sessions = userSessions.get(userId);
  if (!sessions) return;
  sessions.delete(socketId);
  if (sessions.size === 0) userSessions.delete(userId);
}

function isUserOnline(userId) {
  const s = userSessions.get(userId?.toString());
  return !!(s && s.size > 0);
}

// ── In-memory call session tracking ──────────────────────────
// callSessions: Map<callId, { callerId, receiverId, callType, startedAt, timeoutId, answeredAt }>
// activeCalls:  Map<userId, callId> — who is currently in/ringing a call
const callSessions = new Map();
const activeCalls  = new Map();

function endCallSession(callId) {
  const session = callSessions.get(callId);
  if (!session) return;
  clearTimeout(session.timeoutId);
  activeCalls.delete(session.callerId);
  activeCalls.delete(session.receiverId);
  callSessions.delete(callId);
}

// ── Helper: deliver pending 'sent' messages to a newly-online user ──
async function deliverPendingMessages(userId) {
  const User    = require('./models/User');
  const Message = require('./models/Message');
  try {
    const pending = await Message.find({ to: userId, status: 'sent' }).lean();
    if (!pending.length) return;
    const now = new Date();
    const ids = pending.map(m => m._id);
    await Message.updateMany({ _id: { $in: ids } }, { $set: { status: 'delivered', deliveredAt: now } });
    // Notify each sender that their message was delivered
    const senderGroups = {};
    pending.forEach(m => {
      const sid = m.from.toString();
      if (!senderGroups[sid]) senderGroups[sid] = [];
      senderGroups[sid].push(m._id.toString());
    });
    for (const [senderId, msgIds] of Object.entries(senderGroups)) {
      io.to(senderId).emit('message:delivered', { msgIds });
    }
  } catch (e) { console.error('deliverPendingMessages error:', e.message); }
}

// ── Main connection handler ───────────────────────────────────
io.on('connection', async (socket) => {
  const userId = socket.userId;

  // 1. Register session
  addSession(userId, socket.id);

  // 2. Join personal room (so other sockets can reach this user by userId)
  socket.join(userId);

  // 3. Mark online in DB
  const User    = require('./models/User');
  const Message = require('./models/Message');
  await User.findByIdAndUpdate(userId, { isOnline: true }).catch(() => {});

  // 4. Deliver any pending messages (user was offline when they were sent)
  await deliverPendingMessages(userId);

  // 5. Broadcast online status to everyone who has this user in their threads
  socket.broadcast.emit('user:online', { userId });

  // ── Presence: client requests online/lastSeen of a specific user ──
  socket.on('presence:request', async ({ targetId }) => {
    try {
      const target = await User.findById(targetId).select('isOnline lastSeen').lean();
      if (!target) return;
      socket.emit('presence:update', {
        userId:   targetId,
        isOnline: isUserOnline(targetId),
        lastSeen: target.lastSeen,
      });
    } catch {}
  });

  // ── Chat rooms ─────────────────────────────────────────────
  socket.on('join-chat', ({ partnerId }) => {
    const room = [userId, partnerId].sort().join('_');
    socket.join(room);
  });

  socket.on('leave-chat', ({ partnerId }) => {
    const room = [userId, partnerId].sort().join('_');
    socket.leave(room);
  });

  // ── Typing indicator ────────────────────────────────────────
  // Server simply relays — debouncing is handled on the client
  socket.on('typing:start', ({ to }) => {
    io.to(to).emit('typing:start', { from: userId });
  });

  socket.on('typing:stop', ({ to }) => {
    io.to(to).emit('typing:stop', { from: userId });
  });

  // ── Recording indicator ─────────────────────────────────────
  socket.on('recording:start', ({ to }) => {
    io.to(to).emit('recording:start', { from: userId });
  });

  socket.on('recording:stop', ({ to }) => {
    io.to(to).emit('recording:stop', { from: userId });
  });

  // ── Message sent (after REST API save) ─────────────────────
  socket.on('message-sent', async ({ to, message }) => {
    const room = [userId, to].sort().join('_');
    // Relay message to partner
    socket.to(room).emit('receive-message', message);

    // If partner is online right now → upgrade status to delivered immediately
    if (message._id && isUserOnline(to)) {
      try {
        const now = new Date();
        await Message.findByIdAndUpdate(message._id, { status: 'delivered', deliveredAt: now });
        // Tell sender: double grey ticks
        socket.emit('message:delivered', { msgIds: [message._id.toString()] });
      } catch {}
    }
  });

  // ── Mark all messages as seen (receiver opened chat) ───────
  socket.on('messages:mark-seen', async ({ partnerId }) => {
    try {
      const now     = new Date();
      const updated = await Message.updateMany(
        { from: partnerId, to: userId, status: { $in: ['sent', 'delivered'] } },
        { $set: { status: 'seen', seenAt: now } }
      );
      if (updated.modifiedCount > 0) {
        // Tell the sender: all ticks → blue
        io.to(partnerId).emit('message:seen', { by: userId });
      }
    } catch {}
  });

  // ── Legacy events (unsend, edit, react) ────────────────────
  socket.on('message-unsent', ({ msgId, to }) => {
    const room = [userId, to].sort().join('_');
    socket.to(room).emit('message-unsent', { msgId });
  });

  socket.on('message-edited', ({ msgId, to, text }) => {
    const room = [userId, to].sort().join('_');
    socket.to(room).emit('message-edited', { msgId, text });
  });

  socket.on('message-reacted', ({ msgId, to, reactions }) => {
    const room = [userId, to].sort().join('_');
    socket.to(room).emit('message-reacted', { msgId, reactions });
  });

  // ════════════════════════════════════════════════════════════
  // ── CALL SIGNALING ──────────────────────────────────────────
  // ════════════════════════════════════════════════════════════
  const Call = require('./models/Call');

  // call:start — caller initiates, server routes to receiver
  socket.on('call:start', ({ callId, to, callType }) => {
    if (!callId || !to || !['voice','video'].includes(callType)) return;

    // Prevent duplicate call initiation
    if (activeCalls.has(userId)) {
      socket.emit('call:error', { message: 'You are already in a call' });
      return;
    }

    // Check if receiver is online
    if (!isUserOnline(to)) {
      socket.emit('call:error', { message: 'User is offline' });
      // Save missed call immediately
      Call.create({ callId, callerId: userId, receiverId: to, callType, status: 'missed', startedAt: new Date() }).catch(() => {});
      return;
    }

    // Check if receiver is already in a call → busy
    if (activeCalls.has(to)) {
      socket.emit('call:busy', { callId });
      return;
    }

    const startedAt = new Date();
    // Mark both as busy
    activeCalls.set(userId, callId);
    activeCalls.set(to, callId);

    // 30-second missed-call timeout
    const timeoutId = setTimeout(async () => {
      const session = callSessions.get(callId);
      if (!session) return;
      endCallSession(callId);
      // Notify both sides
      io.to(userId).emit('call:missed', { callId, by: to });
      io.to(to).emit('call:missed',     { callId, by: userId });
      // Save missed call record
      try {
        await Call.create({ callId, callerId: userId, receiverId: to, callType, status: 'missed', startedAt, endedAt: new Date() });
      } catch {}
    }, 30000);

    callSessions.set(callId, { callerId: userId, receiverId: to, callType, startedAt, timeoutId, answeredAt: null });

    // Notify receiver
    io.to(to).emit('call:incoming', { callId, from: userId, callType });
  });

  // call:ringing — receiver's device is ringing, relay to caller
  socket.on('call:ringing', ({ callId, to }) => {
    io.to(to).emit('call:ringing', { callId });
  });

  // call:accepted — receiver accepted, relay to caller, record answeredAt
  socket.on('call:accepted', ({ callId, to }) => {
    const session = callSessions.get(callId);
    if (!session) return;
    clearTimeout(session.timeoutId); // Cancel missed-call timeout
    session.answeredAt = new Date();
    io.to(to).emit('call:accepted', { callId });
  });

  // call:rejected — receiver declined, relay to caller, save record
  socket.on('call:rejected', async ({ callId, to }) => {
    const session = callSessions.get(callId);
    if (!session) { endCallSession(callId); return; }
    endCallSession(callId);
    io.to(to).emit('call:rejected', { callId });
    try {
      await Call.create({
        callId, callerId: session.callerId, receiverId: session.receiverId,
        callType: session.callType, status: 'rejected',
        startedAt: session.startedAt, endedAt: new Date(),
      });
    } catch {}
  });

  // call:busy — relay busy signal from server to caller
  // (handled above in call:start, but client can also emit for UI feedback)
  socket.on('call:busy', ({ callId, to }) => {
    io.to(to).emit('call:busy', { callId });
  });

  // call:offer — WebRTC SDP offer, relay to receiver
  socket.on('call:offer', ({ callId, to, offer }) => {
    io.to(to).emit('call:offer', { callId, offer, from: userId });
  });

  // call:answer — WebRTC SDP answer, relay to caller
  socket.on('call:answer', ({ callId, to, answer }) => {
    io.to(to).emit('call:answer', { callId, answer });
  });

  // call:iceCandidate — relay ICE candidates bidirectionally
  socket.on('call:iceCandidate', ({ callId, to, candidate }) => {
    io.to(to).emit('call:iceCandidate', { callId, candidate });
  });

  // call:ended — either side ended the call, finalize DB record
  socket.on('call:ended', async ({ callId, to }) => {
    const session = callSessions.get(callId);
    if (to) io.to(to).emit('call:ended', { callId });

    if (!session) return;
    const endedAt  = new Date();
    const duration = session.answeredAt
      ? Math.round((endedAt - session.answeredAt) / 1000)
      : 0;
    const status   = session.answeredAt ? 'answered' : 'cancelled';
    endCallSession(callId);

    try {
      // Avoid duplicate if already saved (missed/rejected)
      const existing = await Call.findOne({ callId });
      if (!existing) {
        await Call.create({
          callId, callerId: session.callerId, receiverId: session.receiverId,
          callType: session.callType, status, duration,
          startedAt: session.startedAt, answeredAt: session.answeredAt, endedAt,
        });
      } else {
        await Call.findOneAndUpdate({ callId }, { $set: { endedAt, duration, status } });
      }
      // Notify both sides to refresh call history
      io.to(session.callerId.toString()).emit('call:historyUpdated');
      io.to(session.receiverId.toString()).emit('call:historyUpdated');
    } catch {}
  });

  // call:reconnect — client signals it wants to re-establish
  socket.on('call:reconnect', ({ callId, to }) => {
    io.to(to).emit('call:reconnect', { callId, from: userId });
  });

  // ── Disconnect ──────────────────────────────────────────────
  socket.on('disconnect', async () => {
    removeSession(userId, socket.id);
    // Only go offline when ALL sessions (tabs/devices) are closed
    if (!isUserOnline(userId)) {
      const now = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now }).catch(() => {});
      socket.broadcast.emit('user:offline', { userId, lastSeen: now });

      // ── Auto-end any active call on disconnect ──────────────
      const activeCallId = activeCalls.get(userId);
      if (activeCallId) {
        const session = callSessions.get(activeCallId);
        if (session) {
          const partnerId = session.callerId === userId ? session.receiverId : session.callerId;
          io.to(partnerId.toString()).emit('call:ended', { callId: activeCallId, reason: 'disconnected' });
          // Save the call log
          const endedAt  = new Date();
          const duration = session.answeredAt ? Math.round((endedAt - session.answeredAt) / 1000) : 0;
          const status   = session.answeredAt ? 'answered' : 'missed';
          endCallSession(activeCallId);
          Call.findOne({ callId: activeCallId }).then(existing => {
            if (!existing) {
              Call.create({ callId: activeCallId, callerId: session.callerId, receiverId: session.receiverId, callType: session.callType, status, duration, startedAt: session.startedAt, answeredAt: session.answeredAt, endedAt }).catch(() => {});
            }
          }).catch(() => {});
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));