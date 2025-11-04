import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken } from '../config/jwt.js';
import { registerValidation, loginValidation } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { User } from '../models/User.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email }).select('_id');
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await User.create({ email, name, passwordHash });
    const token = generateToken(String(created._id));

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: String(created._id), email: created.email, name: created.name },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(String(user._id));

    res.json({
      message: 'Login successful',
      token,
      user: { id: String(user._id), email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', authenticate, async (req, res) => {
  res.json({ message: 'Logout successful' });
});

export default router;
