import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100
  },
  description: { 
    type: String, 
    maxlength: 500 
  },
  tags: [{
    type: String,
    trim: true
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  coverImage: {
    type: String
  }
}, { 
  timestamps: true 
});

// Index for finding user's boards
boardSchema.index({ userId: 1 });

// Index for public boards
boardSchema.index({ isPublic: 1, createdAt: -1 });

export const Board = mongoose.model('Board', boardSchema);
