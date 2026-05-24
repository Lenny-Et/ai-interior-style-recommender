import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { AIRecommendation } from '../models/AIRecommendation.js';
import { Board } from '../models/Board.js';
import { CustomRequest } from '../models/CustomRequest.js';

const router = express.Router();

/**
 * GET /api/homeowner/stats
 * Returns real-time counts of Total Designs, Saved Boards, and Pending Requests
 * for the authenticated user (homeowner).
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [totalDesigns, savedBoards, pendingRequests] = await Promise.all([
      // Count all non-archived AI recommendation sessions for this user
      AIRecommendation.countDocuments({
        userId: userId.toString(),
        status: { $in: ['active', 'permanent'] }
      }),
      // Count all boards owned by this user
      Board.countDocuments({ userId }),
      // Count all custom requests this user submitted that are still pending
      CustomRequest.countDocuments({
        homeownerId: userId,
        status: { $in: ['pending', 'open'] }
      })
    ]);

    res.json({
      totalDesigns,
      savedBoards,
      pendingRequests
    });
  } catch (error) {
    console.error('Get homeowner stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
