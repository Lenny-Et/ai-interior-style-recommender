import mongoose from 'mongoose';

const aiRecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true }, // To group recommendations from same generation
  imageUrl: { type: String, required: true }, // Original uploaded image
  metadata: {
    roomType: { type: String, required: true },
    styles: [String],
    budget: String,
    creativity: String,
    generatedAt: { type: Date, default: Date.now }
  },
  recommendations: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    style: { type: String, required: true },
    price: { type: String, required: true },
    imageUrl: { type: String, required: true },
    products: [String],
    confidence: { type: Number, required: true },
    isPremium: { type: Boolean, default: false },
    details: {
      materials: [String],
      dimensions: String,
      colorPalette: [String],
      implementationTips: [String]
    }
  }],
  similarDesigns: [{
    id: String,
    name: String,
    imageUrl: String,
    designer: {
      name: String,
      id: String
    },
    similarity: Number
  }],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes for efficient queries
aiRecommendationSchema.index({ userId: 1, status: 1 });
aiRecommendationSchema.index({ userId: 1, sessionId: 1 });
aiRecommendationSchema.index({ createdAt: -1 });

export const AIRecommendation = mongoose.model('AIRecommendation', aiRecommendationSchema);
