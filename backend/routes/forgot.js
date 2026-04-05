const express    = require('express');
const router     = express.Router();
const nodemailer = require('nodemailer');
const User       = require('../models/User');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    family: 4
  });

// POST /api/forgot/send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOTP       = otp;
    user.resetOTPExpiry = expiry;
    await user.save();

    // Send email
    await transporter.sendMail({
      from:    `"SyncSphere" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'SyncSphere — Password Reset OTP',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fafafa;border-radius:12px">
          <h2 style="color:#262626;margin-bottom:8px">Reset your password</h2>
          <p style="color:#8e8e8e;margin-bottom:24px">Use the OTP below to reset your SyncSphere password. It expires in <strong>10 minutes</strong>.</p>
          <div style="background:#fff;border:1px solid #dbdbdb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
            <p style="font-size:40px;font-weight:700;letter-spacing:12px;color:#262626;margin:0">${otp}</p>
          </div>
          <p style="color:#8e8e8e;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          <p style="color:#8e8e8e;font-size:13px;margin-top:16px">— The SyncSphere Team</p>
        </div>
      `
    });

    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP. Try again.' });
  }
});

// POST /api/forgot/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found' });
    if (!user.resetOTP || !user.resetOTPExpiry)
      return res.status(400).json({ message: 'No OTP requested' });
    if (user.resetOTP !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });

    res.json({ message: 'OTP verified', verified: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/forgot/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({ message: 'All fields required' });
  if (newPassword.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found' });
    if (!user.resetOTP || user.resetOTP !== otp)
      return res.status(400).json({ message: 'Invalid OTP' });
    if (new Date() > user.resetOTPExpiry)
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });

    user.password       = newPassword;
    user.resetOTP       = undefined;
    user.resetOTPExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;