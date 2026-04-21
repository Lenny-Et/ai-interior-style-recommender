import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  token: { 
    type: String, 
    required: true,
    unique: true
  },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

// Index for cleanup
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
