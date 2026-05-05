import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['ai_ready', 'new_request', 'payment_confirmed', 'system', 'new_message', 'request_update', 'new_follower', 'new_like'], default: 'system' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);
