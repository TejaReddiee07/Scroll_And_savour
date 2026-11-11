import mongoose from 'mongoose';

export const MESSAGE_STATUSES = ['unread', 'read', 'archived'];

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    subject: { type: String, default: '', trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: MESSAGE_STATUSES, default: 'unread', index: true },
  },
  { timestamps: true, versionKey: false },
);

contactMessageSchema.index({ createdAt: -1 });

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
