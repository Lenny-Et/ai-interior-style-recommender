import express from 'express';
import mongoose from 'mongoose';
import { initializePayment, processWebhook, releaseFunds, verifyPayment, verifyWebhookSignature } from '../services/chapa.js';
import { Transaction } from '../models/Transaction.js';
import { PremiumPurchase } from '../models/PremiumPurchase.js';
import { UserDesignLibrary } from '../models/UserDesignLibrary.js';
import { AIRecommendation } from '../models/AIRecommendation.js';
import { CustomRequest } from '../models/CustomRequest.js';
import { authenticateToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { sendNotification } from '../services/notificationService.js';

console.log('Payment route loaded - sendNotification is:', typeof sendNotification);

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

// Initiate Pro Account Upgrade Payment
router.post('/initiate-pro-upgrade', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.isPro) {
      return res.status(400).json({ error: 'User already has a Pro account' });
    }

    const PRO_UPGRADE_AMOUNT = 12; // $12 for forever pro account
    const tx_ref = `pro-upgrade-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create a transaction record for the pro upgrade
    const tx = new Transaction({
      homeownerId: userId, // User upgrading is the homeowner
      amount: PRO_UPGRADE_AMOUNT,
      tx_ref,
      purchaseType: 'pro_upgrade',
      description: 'Forever Pro Account Upgrade'
    });
    await tx.save();

    const paymentLink = await initializePayment(
      PRO_UPGRADE_AMOUNT,
      user.email,
      user.profile?.firstName,
      user.profile?.lastName,
      tx_ref,
      null // No session ID for pro upgrade
    );

    res.json({ checkoutUrl: paymentLink.data.checkout_url, tx_ref });
  } catch (error) {
    console.error('Pro upgrade payment initialization error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify', async (req, res) => {
  try {
    // Accept sessionId from request body as a reliable fallback
    const { tx_ref, sessionId: bodySessionId } = req.body;
    if (!tx_ref) return res.status(400).json({ error: 'tx_ref is required' });

    // Verify with Chapa
    console.log(`Verifying payment for tx_ref: ${tx_ref}`);
    const verification = await verifyPayment(tx_ref);
    console.log(`Chapa verification response status: ${verification?.status}, data status: ${verification?.data?.status}`);

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

      const { data } = verification;
      
      // Process it
      const commissionRate = 0.12; // Standard 12% commission
      tx.commissionAmount = Math.round(tx.amount * commissionRate);
      tx.designerPayout = tx.amount - tx.commissionAmount;
      tx.webhookData = data;
      
      if (sessionId && !tx.sessionId) tx.sessionId = sessionId; // back-fill if missing
      const resolvedSessionId = tx.sessionId || sessionId;
      
      console.log(`Verify: tx_ref=${tx_ref}, tx.sessionId=${tx.sessionId}, bodySessionId=${bodySessionId}, resolved=${resolvedSessionId}`);

      // If it's a designer service, check if the request was already in "Review" 
      // which means this payment should release funds immediately
      let shouldReleaseImmediately = false;
      if (tx.purchaseType === 'designer_service' && resolvedSessionId) {
        try {
          const request = await CustomRequest.findById(resolvedSessionId);
          if (request && (request.status === 'Review' || request.status === 'Completed')) {
            shouldReleaseImmediately = true;
            tx.status = 'released_to_designer';
            tx.projectStatus = 'completed';
            console.log(`Immediate release triggered for ${tx_ref} as request ${resolvedSessionId} is in ${request.status} status.`);
          } else {
            tx.status = 'held_in_escrow';
            console.log(`Payment held in escrow for ${tx_ref}. Request status is ${request?.status || 'unknown'}.`);
          }
        } catch (err) {
          console.error('Error checking request status for immediate release:', err);
          tx.status = 'held_in_escrow';
        }
      } else if (tx.purchaseType === 'ai_design' || tx.purchaseType === 'pro_upgrade') {
        // AI and Pro upgrades are always immediate release
        tx.status = 'released_to_designer';
        tx.projectStatus = 'completed';
      } else {
        tx.status = 'held_in_escrow';
      }

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
        if (resolvedSessionId) {
          await savePaidDesignToLibrary(tx, resolvedSessionId);
        }
      } else if (tx.purchaseType === 'pro_upgrade') {
        const user = await User.findById(tx.homeownerId);
        if (user) {
          user.isPro = true;
          await user.save();
          console.log(`User ${tx.homeownerId} upgraded to Pro account.`);
        }
        await PremiumPurchase.create({
          userId: tx.homeownerId,
          purchaseType: 'pro_upgrade',
          itemId: tx_ref,
          transactionId: tx._id,
          amount: tx.amount,
          status: 'completed',
          expiresAt: null // Forever pro account
        });
        console.log(`Pro account access granted for user ${tx.homeownerId}`);
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
        
        // Update the custom request status
        if (resolvedSessionId) {
          try {
            const request = await CustomRequest.findById(resolvedSessionId);
            if (request && request.status !== 'Completed') {
              // If it was already in Review, it's now Completed
              // If it was Pending, it's now In-Progress (escrow started)
              const newStatus = request.status === 'Review' ? 'Completed' : 'In-Progress';
              request.status = newStatus;
              await request.save();
              console.log(`CustomRequest ${resolvedSessionId} status updated to ${newStatus} following payment.`);
            }
          } catch (err) {
            console.error('Error updating CustomRequest status:', err);
          }
        }

        // If funds were released, send notification to designer
        if (shouldReleaseImmediately && tx.designerId && typeof sendNotification === 'function') {
          try {
            await sendNotification(tx.designerId, {
              title: 'Payment Received',
              message: `Payment of $${tx.designerPayout} has been released to your account for project ${tx_ref}`,
              type: 'payment_received',
              metadata: {
                transactionId: tx._id,
                amount: tx.designerPayout,
                tx_ref
              }
            });
          } catch (notifErr) {
            console.error('Notification failed but payment succeeded:', notifErr);
          }
        }
      }

      return res.json({ success: true, status: tx.status, transaction: tx });
    } else {
      // Payment failed or is still pending
      console.warn(`Payment not successful for ${tx_ref}. Chapa status: ${verification?.status}, Data status: ${verification?.data?.status}`);
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
    if (result && (result.status === 'held_in_escrow' || result.status === 'released_to_designer')) {
      const { homeownerId, designerId, tx_ref, amount, sessionId } = result;
      
      // Determine purchase type and grant access
      if (result.purchaseType === 'ai_design') {
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
      } else if (result.purchaseType === 'pro_upgrade') {
        const user = await User.findById(homeownerId);
        if (user) {
          user.isPro = true;
          await user.save();
          console.log(`User ${homeownerId} upgraded to Pro account via webhook.`);
        }
        await PremiumPurchase.create({
          userId: homeownerId,
          purchaseType: 'pro_upgrade',
          itemId: tx_ref,
          transactionId: result._id,
          amount,
          status: 'completed',
          expiresAt: null // Forever pro account
        });
        console.log(`Pro account access granted for user ${homeownerId} via webhook.`);
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
        
        // Update the custom request status
        if (sessionId) {
          try {
            const request = await CustomRequest.findById(sessionId);
            if (request && request.status !== 'Completed') {
              const newStatus = request.status === 'Review' ? 'Completed' : 'In-Progress';
              request.status = newStatus;
              await request.save();
              console.log(`CustomRequest ${sessionId} status updated to ${newStatus} via webhook.`);
            }
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

    // If payment is completed, handle escrow or release
    if (status === 'success') {
      // For designer services, we move to escrow first if it was pending
      // If it's already in escrow, we might be seeing a duplicate webhook or a final release
      
      const commissionRate = 0.12; // 12% platform commission
      const commissionAmount = Math.round(transaction.amount * commissionRate);
      const designerPayout = transaction.amount - commissionAmount;

      if (transaction.status === 'pending') {
        transaction.status = 'held_in_escrow';
        transaction.commissionAmount = commissionAmount;
        transaction.designerPayout = designerPayout;
        transaction.webhookData = data;
        await transaction.save();
        
        console.log(`Payment confirmed for ${tx_ref}. Funds held in escrow. Payout will be $${designerPayout}`);
      }
      
      // If it's an AI design or Pro upgrade, release immediately
      if (transaction.purchaseType === 'ai_design' || transaction.purchaseType === 'pro_upgrade') {
        transaction.status = 'released_to_designer';
        transaction.projectStatus = 'completed';
        await transaction.save();
        
        if (transaction.purchaseType === 'ai_design' && transaction.sessionId) {
          await savePaidDesignToLibrary(transaction, transaction.sessionId);
        }
      }

      return res.json({ 
        success: true, 
        status: transaction.status,
        message: 'Payment processed successfully'
      });
    }
  } catch (error) {
    console.error('Payment completion webhook error:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

router.post('/complete-project', authenticateToken, async (req, res) => {
  try {
    const { tx_ref } = req.body;
    const userId = req.user.userId; // Authenticated user ID

    const tx = await Transaction.findOne({ tx_ref });
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Authorization: Only the homeowner who initiated the transaction can complete it
    if (tx.homeownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied: Only the homeowner can complete this project' });
    }

    // Ensure the transaction is in a state to be completed
    if (tx.status !== 'held_in_escrow') {
      return res.status(400).json({ error: `Transaction is not in 'held_in_escrow' status. Current status: ${tx.status}` });
    }

    // Calculate commission and designer payout (using 12% rate for final release)
    const commissionRate = 0.12; // 12% platform commission
    const commissionAmount = Math.round(tx.amount * commissionRate);
    const designerPayout = tx.amount - commissionAmount;

    // Update transaction status and amounts
    tx.status = 'released_to_designer';
    tx.commissionAmount = commissionAmount;
    tx.designerPayout = designerPayout;
    tx.projectStatus = 'completed'; // Mark project as completed
    
    await tx.save();

    console.log(`Project completed and funds released for ${tx_ref}. Released $${designerPayout} to designer ${tx.designerId}`);

    // Send notification to designer
    if (tx.designerId) {
      await sendNotification(tx.designerId, {
        title: 'Payment Received',
        message: `Payment of $${designerPayout} has been released to your account for project ${tx_ref}`,
        type: 'payment_received',
        metadata: {
          transactionId: tx._id,
          amount: designerPayout,
          tx_ref
        }
      });
    }
    
    res.json({ 
      message: 'Funds released to designer', 
      transaction: tx,
      commissionAmount,
      designerPayout
    });
  } catch (error) {
    console.error('Complete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

// Get transaction by sessionId
router.get('/transaction-by-session/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const transaction = await Transaction.findOne({ sessionId });

    if (!transaction) {
      return res.json({ transaction: null, message: 'No transaction found for this session' });
    }

    // Authorization: Only homeowner or designer of the transaction can view it
    if (userRole === 'homeowner' && transaction.homeownerId.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'designer' && transaction.designerId?.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction by session ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
