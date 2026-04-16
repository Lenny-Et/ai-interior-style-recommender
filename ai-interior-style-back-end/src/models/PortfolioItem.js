import mongoose from 'mongoose';

const portfolioItemSchema = new mongoose.Schema({
  designerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  cloudinaryId: { type: String, required: true },
  description: { type: String },
  metadata: {
    style: { type: String, required: true, default: 'Modern' },
    colorPalette: [{ type: String }],
    roomType: { type: String, required: true, default: 'Living Room' },
  }
}, { timestamps: true });

// Basic metadata standardization pre-hook to format inputs correctly
portfolioItemSchema.pre('save', function (next) {
  if (this.metadata) {
    if (this.metadata.style) this.metadata.style = this.metadata.style.charAt(0).toUpperCase() + this.metadata.style.slice(1).toLowerCase();
    if (this.metadata.roomType) this.metadata.roomType = this.metadata.roomType.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  next();
});

export const PortfolioItem = mongoose.model('PortfolioItem', portfolioItemSchema);
