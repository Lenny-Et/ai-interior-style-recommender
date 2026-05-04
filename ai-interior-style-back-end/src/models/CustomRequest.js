import mongoose from 'mongoose';

const customRequestSchema = new mongoose.Schema({
  homeownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  designerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  roomType: {
    type: String,
    required: true,
    enum: ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Bathroom', 'Office', 'Home Office', 'Outdoor', 'Other']
  },
  budget: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  urgency: {
    type: String,
    enum: ['Low', 'Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  // Designers who have expressed interest in this public request.
  // The request stays 'Pending' / designerId=null until the homeowner picks one.
  applicants: [{
    designerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, maxlength: 500, default: '' },
    appliedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['Pending', 'In-Progress', 'Review', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  timeline: {
    startDate: Date,
    endDate: Date,
    milestones: [{
      title: String,
      description: String,
      dueDate: Date,
      completed: { type: Boolean, default: false },
      completedAt: Date
    }]
  },
  messages: [{
    sender: {
      type: String,
      enum: ['homeowner', 'designer', 'system'],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    attachments: [{
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String
    }],
    createdAt: { type: Date, default: Date.now }
  }],
  escrow: {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    amount: Number,
    status: {
      type: String,
      enum: ['pending', 'held', 'released', 'refunded'],
      default: 'pending'
    },
    releasedAt: Date
  },
  ratings: {
    homeownerRating: {
      rating: { type: Number, min: 1, max: 5 },
      review: String,
      createdAt: Date
    },
    designerRating: {
      rating: { type: Number, min: 1, max: 5 },
      review: String,
      createdAt: Date
    }
  },
  tags: [String],
  completedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
customRequestSchema.index({ homeownerId: 1, status: 1 });
customRequestSchema.index({ designerId: 1, status: 1 });
customRequestSchema.index({ status: 1, urgency: 1 });
customRequestSchema.index({ createdAt: -1 });

export const CustomRequest = mongoose.model('CustomRequest', customRequestSchema);
