import express from 'express';
import { initializePayment, processWebhook, releaseFunds } from '../services/chapa.js';
import { Transaction } from '../models/Transaction.js';

const router = express.Router();

router.post('/initialize', async (req, res) => {
  try {
    const { amount, email, firstName, lastName, homeownerId, designerId } = req.body;
    const tx_ref = `tx-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const tx = new Transaction({
      homeownerId,
      designerId,
      amount,
      tx_ref
    });
    await tx.save();

    const paymentLink = await initializePayment(amount, email, firstName, lastName, tx_ref);
    res.json({ checkoutUrl: paymentLink.data.checkout_url, tx_ref });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    await processWebhook(req.body);
    res.status(200).send('Webhook received');
  } catch (error) {
    res.status(500).send('Webhook processing error');
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

export default router;
