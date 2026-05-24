import express from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendPasswordResetEmail, sendNewDesignerSignupEmail } from '../services/emailService.js';
import { generatePasswordResetToken, validatePasswordResetToken, markTokenAsUsed } from '../utils/tokenUtils.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_develop_only_change_in_production';

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, role, profile } = req.body;
  // Basic validation
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ error: 'Email already in use' });

  const newUser = new User({
    email,
    passwordHash: password, // Pre-save hook will hash this
    role: role || 'homeowner',
    profile,
    ...(role === 'designer' && { approvalStatus: 'pending' })
  });

  await newUser.save();

  if (newUser.role === 'designer') {
    const designerName = newUser.profile?.firstName ? `${newUser.profile.firstName} ${newUser.profile.lastName || ''}`.trim() : newUser.email;
    await sendNewDesignerSignupEmail(newUser.email, designerName);
  }

  res.status(201).json({ message: 'User registered successfully', userId: newUser._id });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user._id, role: user.role, approvalStatus: user.approvalStatus, isPro: user.isPro },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token, role: user.role, approvalStatus: user.approvalStatus, isPro: user.isPro });
}));

// Forgot Password
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if email exists or not for security
    return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  }

  // Generate password reset token
  const resetToken = await generatePasswordResetToken(user._id);

  // Send password reset email — wrapped so an email failure doesn't crash the request
  try {
    await sendPasswordResetEmail(email, resetToken);
    console.log(`Password reset email sent to ${email}`);
  } catch (emailErr) {
    // Log the error but still return success — the token is saved and can be resent
    console.error('Failed to send password reset email:', emailErr.message || emailErr);
    console.log(`[DEV] Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`);
  }

  res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
}));

// Reset Password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  // Validate token
  const resetToken = await validatePasswordResetToken(token);
  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  // Find user and update password
  const user = await User.findById(resetToken.userId);
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  user.passwordHash = newPassword; // Pre-save hook will hash this
  await user.save();

  // Mark token as used
  await markTokenAsUsed(token);

  res.json({ message: 'Password reset successfully' });
}));

// Verify Reset Token
router.get('/verify-reset-token/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  const resetToken = await validatePasswordResetToken(token);
  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  res.json({ valid: true });
}));

export default router;
