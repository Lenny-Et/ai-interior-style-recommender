import axios from 'axios';
import { Transaction } from '../models/Transaction.js';
import { createHmac, timingSafeEqual } from 'crypto';

const CHAPA_BASE_URL = 'https://api.chapa.co';

// Debug environment variables
console.log('Chapa service initialized. Key will be read at runtime.');

export const initializePayment = async (amount, email, firstName, lastName, tx_ref, sessionId = null) => {
  try {
    const secretKey = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_placeholder';
    
    // Validate email format - Chapa requires valid email
    const validEmail = email && email.includes('@') ? email : 'customer@chapa.co';
    
    const response = await axios.post(`${CHAPA_BASE_URL}/v1/transaction/initialize`, {
      amount: amount.toString(),
      currency: 'ETB',
      email: validEmail,
      first_name: firstName || 'Test',
      last_name: lastName || 'User',
      tx_ref: tx_ref,
      callback_url: 'https://webhook.site/placeholder', // Update to real callback
      return_url: `http://localhost:3000/payment/success?tx_ref=${tx_ref}${sessionId ? `&session=${sessionId}` : ''}`,
      customization: {
        title: 'Project Escrow',
        description: 'Payment held in escrow until project completion'
      }
    }, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Chapa init error:', error.response?.data || error.message);
    
    // Provide detailed error information
    const errorDetails = error.response?.data;
    if (errorDetails) {
      throw new Error(`Payment initialization failed: ${JSON.stringify(errorDetails)}`);
    } else {
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }
};

export const verifyPayment = async (tx_ref) => {
  try {
    const secretKey = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_placeholder';
    const response = await axios.get(`${CHAPA_BASE_URL}/v1/transaction/verify/${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Chapa verify error for ${tx_ref}:`, error.response?.data || error.message);
    throw new Error('Payment verification failed');
  }
};

// Verify Chapa webhook signature
export const verifyWebhookSignature = (payload, signature, secret) => {
  if (!secret) {
    console.warn('No webhook secret configured - skipping signature verification');
    return true; // Allow if no secret is configured (development mode)
  }

  if (!signature) {
    console.error('No webhook signature provided');
    return false;
  }

  try {
    // Debug: Log the actual payload and signature
    console.log('Webhook verification debug:');
    console.log('- Payload:', JSON.stringify(payload));
    console.log('- Received signature:', signature);
    console.log('- Secret length:', secret.length);
    
    // Try different payload formats for signature calculation
    const payloadFormats = [
      JSON.stringify(payload),
      JSON.stringify(payload, null, 2),
      JSON.stringify(payload, Object.keys(payload).sort()),
    ];
    
    for (const [index, payloadString] of payloadFormats.entries()) {
      const expectedSignature = createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
      
      console.log(`- Format ${index + 1} expected signature:`, expectedSignature);
      
      const isValid = timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      
      if (isValid) {
        console.log(`✅ Signature verified using format ${index + 1}`);
        return true;
      }
    }
    
    console.error('❌ Invalid webhook signature - all formats failed');
    return false;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

export const processWebhook = async (chapaPayload) => {
  // Simple escrow mechanics
  const { event, tx_ref, status } = chapaPayload;

  if (event === 'charge.success' || status === 'success') {
    const tx = await Transaction.findOne({ tx_ref });
    if (!tx) throw new Error('Transaction not found');

    // 10-15% commission calculator
    const commissionRate = 0.15; // 15%
    tx.commissionAmount = tx.amount * commissionRate;
    tx.designerPayout = tx.amount - tx.commissionAmount;
    tx.status = 'held_in_escrow';
    tx.webhookData = chapaPayload;
    
    await tx.save();
    return tx;
  }
  return null;
};

export const releaseFunds = async (tx_ref) => {
  const tx = await Transaction.findOne({ tx_ref });
  if (!tx || tx.status !== 'held_in_escrow') throw new Error('Invalid transaction state');

  if (tx.projectStatus !== 'completed') {
    throw new Error('Project must be marked as completed before funds release');
  }

  // Here you would trigger external transfer API to Designer, or just update internal state
  tx.status = 'released_to_designer';
  await tx.save();
  // Call admin revenue log
  console.log(`Admin Revenue logged: ${tx.commissionAmount} ETB`);
  return tx;
};
