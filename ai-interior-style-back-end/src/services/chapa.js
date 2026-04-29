import axios from 'axios';
import { Transaction } from '../models/Transaction.js';

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST_placeholder';

export const initializePayment = async (amount, email, firstName, lastName, tx_ref) => {
  try {
    const response = await axios.post(
      'https://api.chapa.co/v1/transaction/initialize',
      {
        amount: amount.toString(),
        currency: 'ETB',
        email: email,
        first_name: firstName,
        last_name: lastName,
        tx_ref: tx_ref,
        callback_url: 'https://webhook.site/placeholder', // Update to real callback
        return_url: 'http://localhost:3000/payment/success',
        customization: {
          title: 'Design Project Escrow',
          description: 'Payment held in escrow until project completion'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Chapa init error:', error.response?.data || error.message);
    throw new Error('Payment initialization failed');
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
