import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

router.post('/register', async (req, res) => {
  try {
    const { email, password, role, profile } = req.body;
    // Basic validation
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already in use' });

    const newUser = new User({
      email,
      passwordHash: password, // Pre-save hook will hash this
      role: role || 'homeowner',
      profile
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, is_verified: user.is_verified },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: user.role, is_verified: user.is_verified });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
