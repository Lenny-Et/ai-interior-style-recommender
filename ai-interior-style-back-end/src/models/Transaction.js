import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  homeownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  designerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // Total amount paid by homeowner
  currency: { type: String, default: 'ETB' },
  tx_ref: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'held_in_escrow', 'released_to_designer', 'refunded'], default: 'pending' },
  projectStatus: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  commissionAmount: { type: Number, default: 0 },
  designerPayout: { type: Number, default: 0 },
  webhookData: { type: Object }
}, { timestamps: true });

export const Transaction = mongoose.model('Transaction', transactionSchema);
