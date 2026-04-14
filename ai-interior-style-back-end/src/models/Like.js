import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetType: { 
    type: String, 
    enum: ['portfolio', 'design'], 
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }
}, { 
  timestamps: true 
});

// Compound index to prevent duplicate likes and for efficient queries
likeSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

// Index for finding likes on specific content
likeSchema.index({ targetType: 1, targetId: 1 });

// Index for finding user's likes
likeSchema.index({ userId: 1 });

export const Like = mongoose.model('Like', likeSchema);
