import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['homeowner', 'designer', 'admin'], default: 'homeowner' },
  is_verified: { type: Boolean, default: false }, // Specific to designers
  profile: {
    firstName: String,
    lastName: String,
    company: String,
    portfolioUrl: String
  }
}, { timestamps: true });


// Method to verify password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model('User', userSchema);
