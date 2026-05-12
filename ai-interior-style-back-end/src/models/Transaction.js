import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  homeownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  designerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Optional for AI system purchases
  amount: { type: Number, required: true }, // Total amount paid by homeowner
  currency: { type: String, default: 'ETB' },
  tx_ref: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'held_in_escrow', 'released_to_designer', 'refunded'], default: 'pending' },
  projectStatus: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  commissionAmount: { type: Number, default: 0 },
  designerPayout: { type: Number, default: 0 },
  webhookData: { type: Object },
  purchaseType: { type: String, enum: ['ai_design', 'designer_service'], default: 'designer_service' }, // Track purchase type
  sessionId: { type: String } // For AI design purchases
}, { timestamps: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
