import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['homeowner', 'designer', 'admin'], default: 'homeowner' },

  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // For designers
  isPro: { type: Boolean, default: false }, // Indicates if user has a forever pro account
  profile: {
    firstName: String,
    lastName: String,
    company: String,
    portfolioUrl: String,
    workHistory: [{
      title: String,
      description: String,
      startDate: Date,
      endDate: Date,
    }],
    cvUrl: String,
  }
}, { timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.passwordHash;
      return ret;
    },
  },
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('passwordHash')) return;
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  } catch (error) {
    throw error;
  }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Virtual for isDesigner
userSchema.virtual('isDesigner').get(function() {
  return this.role === 'designer';
});

// Virtual for isAdmin
userSchema.virtual('isAdmin').get(function() {
  return this.role === 'admin';
});

// Virtual for isHomeowner
userSchema.virtual('isHomeowner').get(function() {
  return this.role === 'homeowner';
});

// Virtual for isApprovedDesigner
userSchema.virtual('isApprovedDesigner').get(function() {
  return this.role === 'designer' && this.approvalStatus === 'approved';
});

// Virtual for isPendingDesigner
userSchema.virtual('isPendingDesigner').get(function() {
  return this.role === 'designer' && this.approvalStatus === 'pending';
});

// Virtual for isRejectedDesigner
userSchema.virtual('isRejectedDesigner').get(function() {
  return this.role === 'designer' && this.approvalStatus === 'rejected';
});

// Virtual for isProAccount
userSchema.virtual('isProAccount').get(function() {
  return this.isPro;
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
