import express from 'express';
import mongoose from 'mongoose';
import { initializePayment, processWebhook, releaseFunds, verifyPayment, verifyWebhookSignature } from '../services/chapa.js';
import { Transaction } from '../models/Transaction.js';
import { PremiumPurchase } from '../models/PremiumPurchase.js';
import { UserDesignLibrary } from '../models/UserDesignLibrary.js';
import { AIRecommendation } from '../models/AIRecommendation.js';
import { CustomRequest } from '../models/CustomRequest.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/initialize', async (req, res) => {
  try {
    const { amount, email, firstName, lastName, homeownerId, designerId, sessionId } = req.body;
    
    // Validate required fields
    if (!homeownerId || homeownerId === '') {
      return res.status(400).json({ error: 'Valid homeownerId is required' });
    }
    
    // Validate ObjectId format for homeownerId
    if (!mongoose.Types.ObjectId.isValid(homeownerId)) {
      return res.status(400).json({ error: 'Invalid homeownerId format' });
    }
    
    const tx_ref = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Handle special case for AI system designer
    let finalDesignerId = null;
    let purchaseType = 'designer_service';
    
    if (designerId === 'ai-system') {
      // AI design purchase
      purchaseType = 'ai_design';
      finalDesignerId = null;
    } else if (designerId && mongoose.Types.ObjectId.isValid(designerId)) {
      // Designer service purchase
      purchaseType = 'designer_service';
      finalDesignerId = designerId;
    } else {
      return res.status(400).json({ error: 'Valid designerId is required' });
    }
    
    const tx = new Transaction({
      homeownerId,
      designerId: finalDesignerId,
      amount,
      tx_ref,
      purchaseType,
      sessionId
    });
    await tx.save();

    const paymentLink = await initializePayment(amount, email, firstName, lastName, tx_ref, sessionId);
    res.json({ checkoutUrl: paymentLink.data.checkout_url, tx_ref });
  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    // Accept sessionId from request body as a reliable fallback
    const { tx_ref, sessionId: bodySessionId } = req.body;
    if (!tx_ref) return res.status(400).json({ error: 'tx_ref is required' });

    // Verify with Chapa
    const verification = await verifyPayment(tx_ref);

    if (verification.status === 'success' && verification.data.status === 'success') {
      const tx = await Transaction.findOne({ tx_ref });
      if (!tx) return res.status(404).json({ error: 'Transaction not found' });

      // Use sessionId from transaction or fall back to the one sent by the client
      const sessionId = tx.sessionId || bodySessionId || null;
      console.log(`Verify: tx_ref=${tx_ref}, tx.sessionId=${tx.sessionId}, bodySessionId=${bodySessionId}, resolved=${sessionId}`);

      // If already processed, still ensure library is populated (idempotent)
      if (tx.status === 'held_in_escrow' || tx.status === 'released_to_designer') {
        console.log('Transaction already verified — ensuring library is populated');
        if (tx.purchaseType === 'ai_design' && sessionId) {
          await savePaidDesignToLibrary(tx, sessionId);
        }
        return res.json({ success: true, status: tx.status, message: 'Already verified' });
      }

      // Process it
      const commissionRate = 0.15; // 15%
      tx.commissionAmount = tx.amount * commissionRate;
      tx.designerPayout = tx.amount - tx.commissionAmount;
      tx.status = 'held_in_escrow';
      tx.webhookData = verification.data;
      if (sessionId && !tx.sessionId) tx.sessionId = sessionId; // back-fill if missing
      await tx.save();

      // Grant premium access based on purchase type
      if (tx.purchaseType === 'ai_design') {
        await PremiumPurchase.create({
          userId: tx.homeownerId,
          purchaseType: 'ai_design',
          itemId: tx_ref,
          transactionId: tx._id,
          amount: tx.amount,
          status: 'completed'
        });
        console.log(`Premium AI design access granted for user ${tx.homeownerId}`);
        if (sessionId) {
          await savePaidDesignToLibrary(tx, sessionId);
        } else {
          console.warn('No sessionId available — cannot save designs to library');
        }
      } else {
        await PremiumPurchase.create({
          userId: tx.homeownerId,
          purchaseType: 'designer_service',
          itemId: tx_ref,
          transactionId: tx._id,
          amount: tx.amount,
          status: 'completed'
        });
        console.log(`Designer service access granted for user ${tx.homeownerId}`);
        
        // Update the custom request status to Completed
        if (sessionId) {
          try {
            await CustomRequest.findByIdAndUpdate(sessionId, { status: 'Completed' });
            console.log(`CustomRequest ${sessionId} marked as Completed following payment.`);
          } catch (err) {
            console.error('Error updating CustomRequest status:', err);
          }
        }
      }

      return res.json({ success: true, status: 'held_in_escrow', transaction: tx });
    } else {
      // Payment failed or is still pending
      return res.status(400).json({ success: false, error: 'Payment not successful', details: verification.data });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    // Verify webhook signature for security
    const chapaSignature = req.headers['chapa-signature'];
    const xChapaSignature = req.headers['x-chapa-signature'];
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    
    console.log('Webhook headers debug:');
    console.log('- chapa-signature:', chapaSignature);
    console.log('- x-chapa-signature:', xChapaSignature);
    
    if (webhookSecret) {
      // Use x-chapa-signature first (the correct one), fallback to chapa-signature
      const signatureToVerify = xChapaSignature || chapaSignature;
      
      if (!signatureToVerify) {
        console.error('No webhook signature provided in headers');
        return res.status(401).send('Invalid signature');
      }
      
      const isValidSignature = verifyWebhookSignature(req.body, signatureToVerify, webhookSecret);
      if (!isValidSignature) {
        console.error('Invalid webhook signature - rejecting request');
        return res.status(401).send('Invalid signature');
      }
      console.log('Webhook signature verified successfully');
    } else {
      console.warn('No webhook secret configured - proceeding without verification');
    }

    const result = await processWebhook(req.body);
    
    // If payment was successful and transaction was updated, grant premium access
    if (result && result.status === 'held_in_escrow') {
      const { homeownerId, designerId, tx_ref, amount } = result;
      
      // Determine purchase type and grant access
      if (designerId === 'ai-system') {
        // AI design purchase
        await PremiumPurchase.create({
          userId: homeownerId,
          purchaseType: 'ai_design',
          itemId: tx_ref, // Use transaction reference as item ID
          transactionId: result._id,
          amount,
          status: 'completed'
        });
        console.log(`Premium AI design access granted for user ${homeownerId}`);
      } else {
        // Designer service purchase
        await PremiumPurchase.create({
          userId: homeownerId,
          purchaseType: 'designer_service',
          itemId: tx_ref, // Use transaction reference as item ID
          transactionId: result._id,
          amount,
          status: 'completed'
        });
        console.log(`Designer service access granted for user ${homeownerId}`);
        
        // Update the custom request status to Completed
        if (result.sessionId) {
          try {
            await CustomRequest.findByIdAndUpdate(result.sessionId, { status: 'Completed' });
            console.log(`CustomRequest ${result.sessionId} marked as Completed via webhook.`);
          } catch (err) {
            console.error('Error updating CustomRequest status via webhook:', err);
          }
        }
      }
    }
    
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing error');
  }
});

// Function to save ALL paid designs from a session permanently to UserDesignLibrary
async function savePaidDesignToLibrary(transaction, sessionId) {
  try {
    const aiRecommendation = await AIRecommendation.findOne({ 
      sessionId,
      status: 'active'
    });

    if (!aiRecommendation) {
      console.warn(`No AI recommendation found for session ${sessionId}`);
      return null;
    }

    const saved = [];
    for (const rec of aiRecommendation.recommendations) {
      const designId = `design-${transaction.tx_ref}-${rec.id}`;

      // Skip if already in library
      const exists = await UserDesignLibrary.findOne({ designId });
      if (exists) {
        console.log(`Design already in library: ${designId}`);
        continue;
      }

      // Ensure designId is properly formatted
      if (!designId) {
        designId = `design-${transaction._id}-${rec.id || Date.now()}`;
      }

      const libraryDesign = new UserDesignLibrary({
        userId: transaction.homeownerId,
        designId,
        transactionId: transaction._id,
        designData: {
          name: rec.name || 'Premium AI Design',
          description: rec.description || 'Custom AI-generated interior design',
          style: rec.style || 'Modern',
          roomType: aiRecommendation.metadata?.roomType || 'Living Room',
          budget: aiRecommendation.metadata?.budget || '$1,000–$2,500',
          products: rec.products || [],
          imageUrl: rec.imageUrl,
          confidence: rec.confidence,
          isPremium: true,
          recommendationId: rec.id, // Original ID to match UI cards
          metadata: {
            style: rec.style,
            roomType: aiRecommendation.metadata?.roomType
          }
        },
        sessionData: {
          sessionId: aiRecommendation.sessionId,
          originalImageUrl: aiRecommendation.imageUrl,
          userPreferences: {
            roomType: aiRecommendation.metadata?.roomType,
            styles: aiRecommendation.metadata?.styles || [],
            budget: aiRecommendation.metadata?.budget
          },
          generatedAt: aiRecommendation.createdAt
        },
        purchaseInfo: {
          amount: transaction.amount,
          purchaseDate: new Date(),
          paymentMethod: 'chapa',
          transactionRef: transaction.tx_ref
        }
      });

      await libraryDesign.save();
      saved.push(libraryDesign.designId);
    }

    console.log(`✅ Saved ${saved.length} designs to library for user ${transaction.homeownerId}:`, saved);
    return saved;
  } catch (error) {
    console.error('Error saving paid designs to library:', error);
    return null;
  }
}

// Webhook for Chapa payment completion - releases funds to designers
router.post('/payment-completed', async (req, res) => {
  try {
    // Verify webhook signature for security
    const chapaSignature = req.headers['chapa-signature'];
    const xChapaSignature = req.headers['x-chapa-signature'];
    const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    
    console.log('Webhook headers debug:');
    console.log('- chapa-signature:', chapaSignature);
    console.log('- x-chapa-signature:', xChapaSignature);
    
    if (webhookSecret) {
      // Use x-chapa-signature first (the correct one), fallback to chapa-signature
      const signatureToVerify = xChapaSignature || chapaSignature;
      
      if (!signatureToVerify) {
        console.error('No webhook signature provided in headers');
        return res.status(401).send('Invalid signature');
      }
      
      const isValidSignature = verifyWebhookSignature(req.body, signatureToVerify, webhookSecret);
      if (!isValidSignature) {
        console.error('Invalid webhook signature - rejecting request');
        return res.status(401).send('Invalid signature');
      }
      console.log('Payment-completed webhook signature verified successfully');
    } else {
      console.warn('No webhook secret configured - proceeding without verification');
    }

    const { tx_ref, status, data } = req.body;
    
    if (!tx_ref || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find the transaction
    const transaction = await Transaction.findOne({ tx_ref });
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // If payment is completed and transaction is in escrow, release funds
    if (status === 'success' && transaction.status === 'held_in_escrow') {
      // Calculate commission and designer payout
      const commissionRate = 0.12; // 12% platform commission
      const commissionAmount = Math.round(transaction.amount * commissionRate);
      const designerPayout = transaction.amount - commissionAmount;

      // Update transaction status and amounts
      transaction.status = 'released_to_designer';
      transaction.commissionAmount = commissionAmount;
      transaction.designerPayout = designerPayout;
      transaction.projectStatus = 'completed';
      transaction.webhookData = data;
      
      await transaction.save();
      
      console.log(`Payment completed for ${tx_ref}. Released $${designerPayout} to designer ${transaction.designerId}`);
      
      // Save paid design permanently to UserDesignLibrary
      if (transaction.purchaseType === 'ai_design' && transaction.sessionId) {
        await savePaidDesignToLibrary(transaction, transaction.sessionId);
      }
      
      // Send notification to designer
      await sendNotification(transaction.designerId, {
        title: 'Payment Received',
        message: `Payment of $${designerPayout} has been released to your account for project ${tx_ref}`,
        type: 'payment_received',
        metadata: {
          transactionId: transaction._id,
          amount: designerPayout,
          tx_ref
        }
      });
      
      return res.json({ 
        success: true, 
        status: 'released_to_designer',
        commissionAmount,
        designerPayout
      });
    } else {
      return res.json({ 
        success: true, 
        message: 'Transaction already processed or not in escrow',
        currentStatus: transaction.status
      });
    }
  } catch (error) {
    console.error('Payment completion webhook error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

router.post('/complete-project', async (req, res) => {
  try {
    const { tx_ref } = req.body;
    const tx = await Transaction.findOne({ tx_ref });
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });
    
    // Mark project as completed
    tx.projectStatus = 'completed';
    await tx.save();

    // Trigger escrow release
    const result = await releaseFunds(tx_ref);
    res.json({ message: 'Funds released to designer', transaction: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get transactions for a user
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 20 } = req.query;
    
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

    const transactions = await Transaction.find(query)
      .populate('homeownerId', 'profile.firstName profile.lastName email')
      .populate('designerId', 'profile.firstName profile.lastName email profile.profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user has access to premium content
router.get('/check-access/:purchaseType/:itemId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { purchaseType, itemId } = req.params;
    
    const purchase = await PremiumPurchase.findOne({
      userId,
      purchaseType,
      itemId,
      status: 'completed',
      expiresAt: { $gt: new Date() }
    });
    
    res.json({ 
      hasAccess: !!purchase,
      purchase
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user premium purchases
router.get('/premium/purchases', authenticateToken, async (req, res) => {
  try {
    const { userId, purchaseType } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const query = { userId };
    if (purchaseType) {
      query.purchaseType = purchaseType;
    }
    
    const purchases = await PremiumPurchase.find(query)
      .populate('transactionId', 'tx_ref amount status')
      .sort({ createdAt: -1 });
    
    res.json({ purchases });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant premium access after successful payment
router.post('/grant-access', async (req, res) => {
  try {
    const { userId, purchaseType, itemId, transactionId, amount } = req.body;
    
    // Create premium purchase record
    const purchase = new PremiumPurchase({
      userId,
      purchaseType,
      itemId,
      transactionId,
      amount,
      status: 'completed'
    });
    
    await purchase.save();
    
    res.json({ 
      message: 'Premium access granted',
      purchaseId: purchase._id,
      expiresAt: purchase.expiresAt
    });
  } catch (error) {
    console.error('Grant access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user premium purchases
router.get('/premium/purchases', async (req, res) => {
  try {
    const { userId, purchaseType } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const query = { userId };
    if (purchaseType) {
      query.purchaseType = purchaseType;
    }
    
    const purchases = await PremiumPurchase.find(query)
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(purchases);
  } catch (error) {
    console.error('Get premium purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
