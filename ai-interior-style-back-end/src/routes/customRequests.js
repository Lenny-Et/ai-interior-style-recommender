import express from 'express';
import { CustomRequest } from '../models/CustomRequest.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { requirePremiumAccess } from '../middleware/premiumAccess.js';
import { sendNotification } from '../services/notificationService.js';

const router = express.Router();

// Get all custom requests for a user (homeowner or designer)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 20, status } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (userRole === 'homeowner') {
      query.homeownerId = userId;
    } else if (userRole === 'designer') {
      query.designerId = userId;
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (status) {
      query.status = status;
    }

    const requests = await CustomRequest.find(query)
      .populate('homeownerId', 'profile.firstName profile.lastName email')
      .populate('designerId', 'profile.firstName profile.lastName email profile.profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await CustomRequest.countDocuments(query);

    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get custom requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new custom request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    if (userRole !== 'homeowner') {
      return res.status(403).json({ error: 'Only homeowners can create custom requests' });
    }

    const {
      title,
      description,
      roomType,
      budget,
      urgency,
      attachments,
      timeline,
      tags
    } = req.body;

    if (!title || !description || !roomType || !budget) {
      return res.status(400).json({ error: 'Title, description, room type, and budget are required' });
    }

    const customRequest = new CustomRequest({
      homeownerId: userId,
      title,
      description,
      roomType,
      budget,
      urgency: urgency || 'Normal',
      attachments: attachments || [],
      timeline: timeline || {},
      tags: tags || []
    });

    await customRequest.save();
    await customRequest.populate('homeownerId', 'profile.firstName profile.lastName email');

    res.status(201).json({ customRequest });
  } catch (error) {
    console.error('Create custom request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific custom request
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { requestId } = req.params;

    const request = await CustomRequest.findById(requestId)
      .populate('homeownerId', 'profile.firstName profile.lastName email')
      .populate('designerId', 'profile.firstName profile.lastName email profile.profilePicture')
      .populate('messages.senderId', 'profile.firstName profile.lastName');

    if (!request) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    // Check if user has access to this request
    if (userRole === 'homeowner' && request.homeownerId._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'designer' && request.designerId?._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Get custom request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update custom request status
router.put('/:requestId/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { requestId } = req.params;
    const { status } = req.body;

    if (!status || !['Pending', 'In-Progress', 'Review', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Valid status is required' });
    }

    const request = await CustomRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    // Check permissions
    if (userRole === 'homeowner' && request.homeownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'designer' && request.designerId?.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate status transitions
    if (userRole === 'designer' && !['In-Progress', 'Review'].includes(status)) {
      return res.status(403).json({ error: 'Designers can only set status to In-Progress or Review' });
    }
    if (userRole === 'homeowner' && !['Completed', 'Cancelled'].includes(status)) {
      return res.status(403).json({ error: 'Homeowners can only set status to Completed or Cancelled' });
    }

    request.status = status;
    if (status === 'Completed') {
      request.completedAt = new Date();
    }

    await request.save();

    // Send notification to the other party
    const otherPartyId = userRole === 'homeowner' ? request.designerId : request.homeownerId;
    if (otherPartyId) {
      await sendNotification(otherPartyId, {
        title: `Request Status Updated`,
        message: `Your custom request status has been updated to ${status}`,
        type: 'request_update'
      });
    }

    res.json({ request });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add message to custom request
router.post('/:requestId/messages', authenticateToken, requirePremiumAccess, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { requestId } = req.params;
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const request = await CustomRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    // Check if user has access to this request
    if (userRole === 'homeowner' && request.homeownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'designer' && request.designerId?.toString() !== userId) {
      console.log('Designer access check failed:', {
        requestDesignerId: request.designerId?.toString(),
        userId: userId,
        requestStatus: request.status,
        requestId: requestId
      });
      return res.status(403).json({ error: 'Access denied - You are not assigned to this request' });
    }

    const newMessage = {
      sender: userRole,
      senderId: userId,
      message,
      attachments: attachments || [],
      createdAt: new Date()
    };

    request.messages.push(newMessage);
    await request.save();

    // Send notification to the other party
    const otherPartyId = userRole === 'homeowner' ? request.designerId : request.homeownerId;
    if (otherPartyId) {
      await sendNotification(otherPartyId, {
        title: 'New Message',
        message: `You have a new message regarding your custom request`,
        type: 'new_message'
      });
    }

    res.status(201).json({ message: newMessage });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign designer to request
router.put('/:requestId/assign', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { requestId } = req.params;
    const { designerId } = req.body;

    // Validate requestId
    if (!requestId || requestId === 'undefined') {
      return res.status(400).json({ error: 'Valid request ID is required' });
    }

    const request = await CustomRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Custom request not found' });
    }

    if (userRole === 'homeowner') {
      if (request.homeownerId.toString() !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!designerId) {
        return res.status(400).json({ error: 'Designer ID is required' });
      }

      // Verify the designer exists and is actually a designer
      const designer = await User.findById(designerId);
      if (!designer || designer.role !== 'designer') {
        return res.status(404).json({ error: 'Designer not found' });
      }

      request.designerId = designerId;
      request.status = 'In-Progress';
      await request.save();

      // Send notification to designer
      await sendNotification(designerId, {
        title: 'New Custom Request',
        message: 'You have been assigned to a new custom request',
        type: 'new_request'
      });
    } else if (userRole === 'designer') {
      // Designer accepting a request
      if (designerId && designerId !== userId) {
        return res.status(403).json({ error: 'Designers can only assign themselves' });
      }
      if (request.designerId) {
        return res.status(400).json({ error: 'This request has already been assigned to a designer' });
      }

      request.designerId = userId; // Assign self
      request.status = 'In-Progress';
      await request.save();

      // Send notification to homeowner
      await sendNotification(request.homeownerId, {
        title: 'Request Accepted',
        message: 'A designer has accepted your custom request',
        type: 'request_update'
      });
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    await request.populate('designerId', 'profile.firstName profile.lastName email profile.profilePicture');

    res.json({ request });
  } catch (error) {
    console.error('Assign designer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available custom requests for designers
router.get('/available/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 20 } = req.query;

    if (userRole !== 'designer') {
      return res.status(403).json({ error: 'Only designers can view available requests' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const requests = await CustomRequest.find({
      designerId: null,
      status: 'Pending'
    })
    .populate('homeownerId', 'profile.firstName profile.lastName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

    const total = await CustomRequest.countDocuments({
      designerId: null,
      status: 'Pending'
    });

    res.json({
      requests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get available requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check premium access status for chat
router.get('/chat/premium-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Designers always have access
    if (userRole === 'designer') {
      return res.json({
        hasPremiumAccess: true,
        isDesigner: true,
        message: 'Designers have chat access'
      });
    }

    // Check homeowner premium access
    const { checkPremiumAccess } = await import('../middleware/premiumAccess.js');
    const hasPremiumAccess = await checkPremiumAccess(userId);

    res.json({
      hasPremiumAccess,
      isDesigner: false,
      message: hasPremiumAccess ? 'Premium access granted' : 'Premium access required for chat functionality'
    });
  } catch (error) {
    console.error('Premium status check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
