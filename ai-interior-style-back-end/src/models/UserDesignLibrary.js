import mongoose from 'mongoose';

const userDesignLibrarySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  designId: { type: String, required: true, unique: true }, // Unique identifier for the design
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
  
  // Complete design data that was purchased
  designData: {
    name: { type: String, required: true },
    description: { type: String, required: true },
    style: { type: String, required: true },
    roomType: { type: String, required: true },
    budget: { type: String, required: true },
    products: [{ type: String }],
    imageUrl: { type: String, required: true },
    confidence: { type: Number },
    templateType: { type: String },
    isPremium: { type: Boolean, default: true },
    recommendationId: { type: String }, // Original recommendation id (e.g. 'scandi-simplicity-001')
    metadata: {
      style: { type: String },
      roomType: { type: String },
      colorPalette: [{ type: String }],
      title: { type: String },
      featured: { type: Boolean }
    }
  },
  
  // Original AI session data
  sessionData: {
    sessionId: { type: String, required: true },
    originalImageUrl: { type: String },
    userPreferences: {
      roomType: { type: String },
      styles: [{ type: String }],
      budget: { type: String }
    },
    generatedAt: { type: Date, required: true }
  },
  
  // Purchase information
  purchaseInfo: {
    amount: { type: Number, required: true },
    purchaseDate: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: 'chapa' },
    transactionRef: { type: String, required: true }
  },
  
  // User interactions
  userInteractions: {
    isFavorite: { type: Boolean, default: false },
    isShared: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    lastViewed: { type: Date },
    notes: { type: String }
  },
  
  // Status and access
  status: { 
    type: String, 
    enum: ['active', 'archived', 'hidden'], 
    default: 'active' 
  },
  accessLevel: {
    type: String,
    enum: ['full', 'basic', 'preview'],
    default: 'full'
  },
  
  // Expiration (if any)
  expiresAt: { 
    type: Date, 
    default: null // null = permanent access
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
userDesignLibrarySchema.index({ userId: 1, status: 1 });
userDesignLibrarySchema.index({ userId: 1, designId: 1 });
userDesignLibrarySchema.index({ transactionId: 1 });
userDesignLibrarySchema.index({ 'purchaseInfo.purchaseDate': -1 });
userDesignLibrarySchema.index({ 'userInteractions.isFavorite': 1 });

// Virtual for checking if design is expired
userDesignLibrarySchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for days since purchase
userDesignLibrarySchema.virtual('daysSincePurchase').get(function() {
  return Math.floor((new Date() - this.purchaseInfo.purchaseDate) / (1000 * 60 * 60 * 24));
});

// Note: Pre-save middleware removed due to compatibility issues
// Data validation is now handled in the save functions

export const UserDesignLibrary = mongoose.model('UserDesignLibrary', userDesignLibrarySchema);
