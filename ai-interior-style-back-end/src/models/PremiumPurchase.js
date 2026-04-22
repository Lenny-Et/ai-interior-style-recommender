import mongoose from 'mongoose';

const premiumPurchaseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purchaseType: { 
    type: String, 
    enum: ['ai_design', 'designer_service'], 
    required: true 
  },
  itemId: { type: String, required: true }, // AI design ID or request ID
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'expired'], 
    default: 'pending' 
  },
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for efficient lookups
premiumPurchaseSchema.index({ userId: 1, itemId: 1 });
premiumPurchaseSchema.index({ userId: 1, purchaseType: 1, status: 1 });

export const PremiumPurchase = mongoose.model('PremiumPurchase', premiumPurchaseSchema);
