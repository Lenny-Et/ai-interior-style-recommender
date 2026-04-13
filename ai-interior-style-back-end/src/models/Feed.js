import mongoose from 'mongoose';

const feedItemSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  content: {
    type: {
      type: String, 
      enum: ['portfolio', 'design', 'trending', 'recommendation'], 
      required: true 
    },
    targetId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true 
    },
    relevanceScore: { 
      type: Number, 
      default: 1.0,
      min: 0,
      max: 10
    },
    metadata: {
      designerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      style: String,
      roomType: String,
      description: String,
      imageUrl: String
    }
  },
  interactionType: { 
    type: String, 
    enum: ['new', 'liked_by_following', 'trending', 'recommended'], 
    default: 'new' 
  }
}, { 
  timestamps: true 
});

// Compound index for efficient feed queries
feedItemSchema.index({ userId: 1, createdAt: -1 });

// Index for content-based queries
feedItemSchema.index({ 'content.type': 1, 'content.targetId': 1 })

// Index for relevance scoring
feedItemSchema.index({ userId: 1, 'content.relevanceScore': -1, createdAt: -1 });

// TTL index to automatically remove old feed items (30 days)
feedItemSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const FeedItem = mongoose.model('FeedItem', feedItemSchema);
