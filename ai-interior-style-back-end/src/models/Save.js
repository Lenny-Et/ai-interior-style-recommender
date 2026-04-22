import mongoose from 'mongoose';

const saveSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  targetType: { 
    type: String, 
    enum: ['design', 'portfolio'], 
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  }
}, { 
  timestamps: true 
});

// Compound index to prevent duplicate saves and for efficient queries
saveSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

// Index for finding saves on specific content
saveSchema.index({ targetType: 1, targetId: 1 });

// Index for finding user's saves
saveSchema.index({ userId: 1 });

export const Save = mongoose.model('Save', saveSchema);
