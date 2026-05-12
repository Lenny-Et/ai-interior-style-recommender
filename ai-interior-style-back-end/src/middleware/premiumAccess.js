import { PremiumPurchase } from '../models/PremiumPurchase.js';

// Middleware to check if user has premium access for chat functionality
export const requirePremiumAccess = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Designers don't need premium access to chat
    if (userRole === 'designer') {
      return next();
    }

    // Check if user has any active premium purchase
    const hasPremiumAccess = await PremiumPurchase.findOne({
      userId,
      status: 'completed',
      expiresAt: { $gt: new Date() }
    });

    if (!hasPremiumAccess) {
      return res.status(403).json({
        error: 'Premium access required',
        message: 'Chat with designers requires a premium subscription',
        requiresPremium: true
      });
    }

    next();
  } catch (error) {
    console.error('Premium access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to check premium access (for internal use)
export const checkPremiumAccess = async (userId) => {
  try {
    const premiumPurchase = await PremiumPurchase.findOne({
      userId,
      status: 'completed',
      expiresAt: { $gt: new Date() }
    });
    return !!premiumPurchase;
  } catch (error) {
    console.error('Premium access check error:', error);
    return false;
  }
};
