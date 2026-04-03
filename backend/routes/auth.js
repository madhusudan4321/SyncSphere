const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id, username) =>
  jwt.sign({ id, username }, process.env.JWT_SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields required' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  try {
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: exists.email === email ? 'Email already registered' : 'Username already taken' });
    const user = await User.create({ username, email, password, name: username });
    res.status(201).json({ token: generateToken(user._id, user.username), user: { _id: user._id, username: user.username, name: user.name, bio: user.bio, website: user.website, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    res.json({ token: generateToken(user._id, user.username), user: { _id: user._id, username: user.username, name: user.name, bio: user.bio, website: user.website, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;