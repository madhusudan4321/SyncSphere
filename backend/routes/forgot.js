const express = require('express');
const router  = require('express').Router();
const axios   = require('axios');
const User    = require('../models/User');

async function sendOTPEmail(toEmail, otp) {
  await axios.post('https://api.brevo.com/v3/smtp/email', {
    sender:   { email: process.env.EMAIL_USER, name: 'SyncSphere' },
    to:       [{ email: toEmail }],
    subject:  'SyncSphere — Password Reset OTP',
    htmlContent: `
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
  }, {
    headers: {
      'api-key':     process.env.BREVO_API_KEY,
      'Content-Type': 'application/json'
    }
  });
}

// POST /api/forgot/send-otp
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    const otp    = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);
    user.resetOTP       = otp;
    user.resetOTPExpiry = expiry;
    await user.save();
    await sendOTPEmail(email, otp);
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('OTP error:', err.response?.data || err.message);
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