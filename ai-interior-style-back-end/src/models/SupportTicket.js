import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  subject: { 
    type: String, 
    required: true,
    maxlength: 200
  },
  description: { 
    type: String, 
    required: true,
    maxlength: 2000
  },
  category: { 
    type: String, 
    enum: ['technical', 'billing', 'account', 'feature_request', 'bug_report', 'other'],
    required: true 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'pending_user', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  responses: [{
    message: { type: String, required: true },
    sender: { 
      type: String, 
      enum: ['user', 'admin', 'system'],
      required: true 
    },
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    },
    createdAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  resolvedAt: Date,
  closedAt: Date
}, { 
  timestamps: true 
});

// Indexes for efficient queries
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ category: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
