import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
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
  },
  content: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 1000
  }
}, { 
  timestamps: true 
});

// Index for quickly retrieval of comments for a specific post/design
commentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', commentSchema);
