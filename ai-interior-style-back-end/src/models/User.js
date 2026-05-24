import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['homeowner', 'designer', 'admin'], default: 'homeowner' },

  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }, // For designers
  isPro: { type: Boolean, default: false }, // Indicates if user has a forever pro account
  isBlocked: { type: Boolean, default: false },
  blockReason: { type: String },
  profile: {
    firstName: String,
    lastName: String,
    company: String,
    portfolioUrl: String, // Optional — designer's external portfolio link
    specialization: { type: String }, // e.g. 'Modern', 'Scandinavian' — used for style-based designer search
    portfolioTags: [String],         // Additional style tags e.g. ['Minimalist', 'Industrial']
    workHistory: [{
      title: String,
      description: String,
      startDate: Date,
      endDate: Date,
    }],
    // cv_experience: required for designer registration (can be a URL to CV/resume or uploaded file path)
    cvUrl: {
      type: String,
      validate: {
        validator: function(v) {
          // Required only when role is 'designer'
          if (this.role === 'designer') {
            return !!(v && v.trim().length > 0);
          }
          return true;
        },
        message: 'CV / experience link is required for designer accounts.'
      }
    },
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
