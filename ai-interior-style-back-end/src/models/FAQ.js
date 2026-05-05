import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  question: { 
    type: String, 
    required: true,
    maxlength: 500
  },
  answer: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  category: { 
    type: String, 
    enum: ['getting_started', 'account', 'billing', 'ai_features', 'designers', 'technical', 'general'],
    required: true 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  tags: [String],
  views: { 
    type: Number, 
    default: 0 
  },
  helpful: { 
    type: Number, 
    default: 0 
  },
  notHelpful: { 
    type: Number, 
    default: 0 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  }
}, { 
  timestamps: true 
});

// Indexes for efficient queries
faqSchema.index({ category: 1, order: 1, isActive: 1 });
faqSchema.index({ isActive: 1 });
faqSchema.index({ tags: 1 });

// Text search index
faqSchema.index({ question: 'text', answer: 'text', tags: 'text' });

export const FAQ = mongoose.model('FAQ', faqSchema);
