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
  },
  // User-curated color palette for this board (hex strings, e.g. "#F5E6D3")
  // Used by the AI personalization engine to inform generation with preferred colors.
  colorPalette: [{
    type: String,
    trim: true,
    match: /^#[0-9A-Fa-f]{6}$/ // Enforce valid hex
  }],
  items: [{
    imageUrl:    { type: String, required: true },
    name:        { type: String, default: '' },
    style:       { type: String, default: '' },
    roomType:    { type: String, default: '' },
    description: { type: String, default: '' },
    source:      { type: String, default: 'ai_recommendation' },
    addedAt:     { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

// Index for finding user's boards
boardSchema.index({ userId: 1 });

// Index for public boards
boardSchema.index({ isPublic: 1, createdAt: -1 });

export const Board = mongoose.model('Board', boardSchema);
