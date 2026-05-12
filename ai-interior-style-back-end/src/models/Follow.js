import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
  followerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  followingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true 
});

// Compound index to prevent duplicate follows and for efficient queries
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Index for finding followers
followSchema.index({ followingId: 1 });

// Index for finding following
followSchema.index({ followerId: 1 });

export const Follow = mongoose.model('Follow', followSchema);
