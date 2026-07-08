const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const axios   = require('axios');
const User    = require('../models/User');

const generateToken = (id, username) =>
  jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── Email helper (same Brevo pattern as forgot.js) ────────────────────────────
async function sendVerificationEmail(toEmail, otp, username) {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender:  { email: process.env.EMAIL_USER, name: 'SyncSphere' },
    to:      [{ email: toEmail }],
    subject: 'SyncSphere — Verify Your Email',
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fafafa;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="font-size:24px;color:#262626;margin:0">SyncSphere</h1>
          <p style="color:#8e8e8e;margin:8px 0 0">Connect. Share. Sync.</p>
        </div>
        <h2 style="color:#262626;margin-bottom:8px">Welcome, @${username}!</h2>
        <p style="color:#8e8e8e;margin-bottom:24px">
          Thanks for signing up. Enter this OTP to verify your email address.
          It expires in <strong>10 minutes</strong>.
        </p>
        <div style="background:#fff;border:1px solid #dbdbdb;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
          <p style="font-size:44px;font-weight:700;letter-spacing:14px;color:#262626;margin:0">${otp}</p>
        </div>
        <p style="color:#8e8e8e;font-size:13px">
          If you didn't create a SyncSphere account, you can safely ignore this email.
        </p>
        <p style="color:#8e8e8e;font-size:13px;margin-top:16px">— The SyncSphere Team</p>
      </div>
    `
  }, {
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function otpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 min
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Creates an unverified user and sends OTP. No token returned yet.
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });

  try {
    // Check for existing verified users
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });

    if (existing) {
      // If there's an unverified account with the same email, allow re-registration (resend OTP)
      if (!existing.isVerified && existing.email === email.toLowerCase()) {
        const otp = generateOTP();
        existing.verifyOTP       = otp;
        existing.verifyOTPExpiry = otpExpiry();
        await existing.save();
        await sendVerificationEmail(email, otp, existing.username);
        return res.status(200).json({ message: 'OTP resent to your email.', email });
      }
      return res.status(400).json({
        message: existing.email === email.toLowerCase()
          ? 'Email already registered' : 'Username already taken'
      });
    }

    const otp  = generateOTP();
    const user = await User.create({
      username: username.toLowerCase(),
      email:    email.toLowerCase(),
      password,
      name:     username,
      isVerified:      false,
      verifyOTP:       otp,
      verifyOTPExpiry: otpExpiry(),
    });

    await sendVerificationEmail(email, otp, username);
    res.status(201).json({ message: 'OTP sent to your email. Please verify.', email });
  } catch (err) {
    console.error('[auth/register]', err.message);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
// Verifies OTP and returns auth token — completes the signup flow.
router.post('/verify-email', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: 'Email and OTP are required' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found' });

    if (user.isVerified)
      return res.status(400).json({ message: 'Email already verified. Please log in.' });

    if (!user.verifyOTP || !user.verifyOTPExpiry)
      return res.status(400).json({ message: 'No verification OTP found. Please register again.' });

    if (user.verifyOTP !== otp)
      return res.status(400).json({ message: 'Invalid OTP. Please check your email.' });

    if (new Date() > user.verifyOTPExpiry)
      return res.status(400).json({ message: 'OTP expired. Click Resend to get a new one.' });

    // Mark verified and clear OTP fields
    user.isVerified      = true;
    user.verifyOTP       = undefined;
    user.verifyOTPExpiry = undefined;
    await user.save();

    res.json({
      message: 'Email verified! Welcome to SyncSphere.',
      token:   generateToken(user._id, user.username),
      user: {
        _id:      user._id,
        username: user.username,
        name:     user.name,
        bio:      user.bio,
        website:  user.website,
        avatar:   user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/resend-verify ──────────────────────────────────────────────
router.post('/resend-verify', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified. Please log in.' });

    const otp = generateOTP();
    user.verifyOTP       = otp;
    user.verifyOTPExpiry = otpExpiry();
    await user.save();

    await sendVerificationEmail(email, otp, user.username);
    res.json({ message: 'New OTP sent to your email.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to resend OTP. Try again.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password)
    return res.status(400).json({ message: 'All fields required' });

  try {
    const user = await User.findOne({
      $or: [
        { email:    identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ]
    });

    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    // Block unverified accounts
    if (!user.isVerified)
      return res.status(403).json({
        message: 'Email not verified.',
        needsVerification: true,
        email: user.email,
      });

    res.json({
      token: generateToken(user._id, user.username),
      user: {
        _id:      user._id,
        username: user.username,
        name:     user.name,
        bio:      user.bio,
        website:  user.website,
        avatar:   user.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;