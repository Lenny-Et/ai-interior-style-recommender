import express from 'express';
import { SupportTicket } from '../models/SupportTicket.js';
import { FAQ } from '../models/FAQ.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';
import { parser } from '../services/cloudinary.js';

const router = express.Router();

// Use sendNotification directly from the notification service

// ===== FAQ ENDPOINTS =====

// Get all FAQs (public)
router.get('/faq', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const faqs = await FAQ.find(query)
      .sort({ category: 1, order: 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await FAQ.countDocuments(query);

    res.json({
      faqs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get FAQs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get FAQ categories
router.get('/faq/categories', async (req, res) => {
  try {
    const categories = await FAQ.distinct('category', { isActive: true });
    
    const categoryInfo = await Promise.all(
      categories.map(async (category) => {
        const count = await FAQ.countDocuments({ category, isActive: true });
        return { category, count };
      })
    );

    res.json({ categories: categoryInfo });
  } catch (error) {
    console.error('Get FAQ categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single FAQ
router.get('/faq/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findById(id);
    if (!faq || !faq.isActive) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    // Increment view count
    await FAQ.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.json({ faq });
  } catch (error) {
    console.error('Get FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate FAQ as helpful/not helpful
router.post('/faq/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Helpful rating must be a boolean' });
    }

    const updateField = helpful ? 'helpful' : 'notHelpful';
    const faq = await FAQ.findByIdAndUpdate(
      id,
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({
      message: 'FAQ rated successfully',
      helpful: faq.helpful,
      notHelpful: faq.notHelpful
    });
  } catch (error) {
    console.error('Rate FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== SUPPORT TICKETS =====

// Create new support ticket
router.post('/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { subject, description, category, priority = 'medium', tags = [] } = req.body;

    if (!subject || !description || !category) {
      return res.status(400).json({ error: 'Subject, description, and category are required' });
    }

    const ticket = new SupportTicket({
      userId,
      subject,
      description,
      category,
      priority,
      tags
    });

    await ticket.save();

    // Send notification to user
    await sendNotification(userId, {
      title: 'Support Ticket Created',
      message: `Your support ticket "${subject}" has been created successfully.`,
      type: 'system',
      metadata: { ticketId: ticket._id }
    });

    // Send notification to admins (in a real implementation)
    // This would notify support staff about the new ticket

    res.status(201).json({
      message: 'Support ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's support tickets
router.get('/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = { userId };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await SupportTicket.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('assignedTo', 'profile.firstName profile.lastName');

    const total = await SupportTicket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single support ticket
router.get('/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const ticket = await SupportTicket.findById(id)
      .populate('assignedTo', 'profile.firstName profile.lastName')
      .populate('responses.senderId', 'profile.firstName profile.lastName');

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Get support ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add response to support ticket
router.post('/tickets/:id/respond', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sender = req.user.role === 'admin' ? 'admin' : 'user';
    
    ticket.responses.push({
      message,
      sender,
      senderId: userId
    });

    // Update ticket status based on who is responding
    if (sender === 'user' && ticket.status === 'pending_user') {
      ticket.status = 'in_progress';
    } else if (sender === 'admin' && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    await ticket.save();

    // Send notification to the other party
    const recipientId = sender === 'admin' ? ticket.userId : null;
    if (recipientId) {
      await sendNotification(recipientId, {
        title: 'New Response to Support Ticket',
        message: `You have a new response to your support ticket "${ticket.subject}"`,
        type: 'system',
        metadata: { ticketId: ticket._id }
      });
    }

    res.json({
      message: 'Response added successfully',
      ticket
    });
  } catch (error) {
    console.error('Add response error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload attachment to support ticket
router.post('/tickets/:id/attachments', authenticateToken, parser.single('file'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: req.file.path
    };

    ticket.attachments.push(attachment);
    await ticket.save();

    res.json({
      message: 'Attachment uploaded successfully',
      attachment
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
});

// Close support ticket
router.post('/tickets/:id/close', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { reason = '' } = req.body;

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Check if user owns this ticket or is admin
    if (ticket.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();

    if (reason) {
      ticket.responses.push({
        message: `Ticket closed. Reason: ${reason}`,
        sender: 'system',
        senderId: null
      });
    }

    await ticket.save();

    res.json({
      message: 'Support ticket closed successfully',
      ticket
    });
  } catch (error) {
    console.error('Close support ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===== ADMIN SUPPORT ENDPOINTS =====

// Get all support tickets (admin only)
router.get('/admin/tickets', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      category,
      priority,
      assignedTo,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = {};

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await SupportTicket.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('userId', 'profile.firstName profile.lastName email')
      .populate('assignedTo', 'profile.firstName profile.lastName');

    const total = await SupportTicket.countDocuments(query);

    res.json({
      tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get admin tickets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign support ticket (admin only)
router.post('/admin/tickets/:id/assign', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { 
        assignedTo,
        status: 'in_progress'
      },
      { new: true }
    ).populate('assignedTo', 'profile.firstName profile.lastName');

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Send notification to assigned admin
    if (assignedTo) {
      await sendNotification(assignedTo, {
        title: 'Support Ticket Assigned',
        message: `Support ticket "${ticket.subject}" has been assigned to you.`,
        type: 'system',
        metadata: { ticketId: ticket._id }
      });
    }

    res.json({
      message: 'Support ticket assigned successfully',
      ticket
    });
  } catch (error) {
    console.error('Assign support ticket error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create FAQ (admin only)
router.post('/admin/faq', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const createdBy = req.user.userId;
    const { question, answer, category, order = 0, tags = [] } = req.body;

    if (!question || !answer || !category) {
      return res.status(400).json({ error: 'Question, answer, and category are required' });
    }

    const faq = new FAQ({
      question,
      answer,
      category,
      order,
      tags,
      createdBy
    });

    await faq.save();

    res.status(201).json({
      message: 'FAQ created successfully',
      faq
    });
  } catch (error) {
    console.error('Create FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update FAQ (admin only)
router.put('/admin/faq/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.userId;
    const { question, answer, category, order, tags, isActive } = req.body;

    const faq = await FAQ.findByIdAndUpdate(
      id,
      {
        question,
        answer,
        category,
        order,
        tags,
        isActive,
        updatedBy
      },
      { new: true }
    );

    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({
      message: 'FAQ updated successfully',
      faq
    });
  } catch (error) {
    console.error('Update FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete FAQ (admin only)
router.delete('/admin/faq/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);
    if (!faq) {
      return res.status(404).json({ error: 'FAQ not found' });
    }

    res.json({
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    console.error('Delete FAQ error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
