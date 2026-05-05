import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
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
  },
  shareMethod: { 
    type: String, 
    enum: ['link', 'social', 'email'], 
    default: 'link' 
  },
  platform: { 
    type: String, 
    enum: ['facebook', 'twitter', 'instagram', 'pinterest', 'whatsapp', 'other'], 
    default: 'other' 
  }
}, { 
  timestamps: true 
});

// Index for finding shares on specific content
shareSchema.index({ targetType: 1, targetId: 1 });

// Index for finding user's shares
shareSchema.index({ userId: 1 });

// Index for analytics
shareSchema.index({ shareMethod: 1, platform: 1 });

export const Share = mongoose.model('Share', shareSchema);
