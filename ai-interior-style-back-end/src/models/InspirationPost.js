import mongoose from 'mongoose';

const inspirationPostSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  cloudinaryId: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String,
    maxlength: 1000
  },
  metadata: {
    style: { type: String, default: 'Modern' },
    roomType: { type: String, default: 'Living Room' },
    title: { type: String, default: 'Inspiration' },
    tags: [{ type: String }]
  },
  likesCount: {
    type: Number,
    default: 0
  },
  savesCount: {
    type: Number,
    default: 0
  },
  isApproved: { type: Boolean, default: true },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  rejectionReason: { type: String },
  editRequestedAt: { type: Date },
  editRequestNote: { type: String }
}, { timestamps: true });

// Index for efficient feed queries
inspirationPostSchema.index({ createdAt: -1 });
inspirationPostSchema.index({ userId: 1, createdAt: -1 });

export const InspirationPost = mongoose.model('InspirationPost', inspirationPostSchema);
