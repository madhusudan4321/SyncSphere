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

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/forgot',   authLimiter, require('./routes/forgot'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/posts',    require('./routes/posts'));
app.use('/api/messages', require('./routes/messages'));

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Socket.io — real-time chat ────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
});

// JWT auth middleware for sockets
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

io.on('connection', (socket) => {
  // Join personal room so we can notify this user from anywhere
  socket.join(socket.userId);

  // Join a chat room with a specific partner
  socket.on('join-chat', ({ partnerId }) => {
    const room = [socket.userId, partnerId].sort().join('_');
    socket.join(room);
  });

  socket.on('leave-chat', ({ partnerId }) => {
    const room = [socket.userId, partnerId].sort().join('_');
    socket.leave(room);
  });

  // Frontend emits this after a message is saved via REST API
  socket.on('message-sent', ({ to, message }) => {
    const room = [socket.userId, to].sort().join('_');
    // Send to the partner (not back to sender — sender already has it)
    socket.to(room).emit('receive-message', message);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));