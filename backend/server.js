const express    = require('express');
const dotenv     = require('dotenv');
const cors       = require('cors');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// ── CORS ─────────────────────────────────────────────────────
const allowedOrigins = [
  'https://syncsphere-frontend.onrender.com',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── RATE LIMITING (brute-force protection) ───────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' }
});

app.use('/api/auth',    authLimiter, require('./routes/auth'));
app.use('/api/forgot',  authLimiter, require('./routes/forgot'));
app.use('/api/users',               require('./routes/users'));
app.use('/api/posts',               require('./routes/posts'));
app.use('/api/messages',            require('./routes/messages'));

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));