import crypto from 'crypto';
import { PasswordResetToken } from '../models/PasswordResetToken.js';

export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const generatePasswordResetToken = async (userId) => {
  // Clean up any existing tokens for this user
  await PasswordResetToken.deleteMany({ userId });
  
  // Generate new token with 1-hour expiry (Task 2.3)
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  const resetToken = new PasswordResetToken({
    userId,
    token,
    expiresAt
  });
  
  await resetToken.save();
  return token;
};

export const validatePasswordResetToken = async (token) => {
  const resetToken = await PasswordResetToken.findOne({
    token,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!resetToken) {
    return null;
  }
  
  return resetToken;
};

export const markTokenAsUsed = async (token) => {
  await PasswordResetToken.updateOne(
    { token },
    { isUsed: true }
  );
};
