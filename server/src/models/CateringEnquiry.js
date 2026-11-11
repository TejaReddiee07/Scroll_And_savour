import mongoose from 'mongoose';

export const EVENT_TYPES = ['corporate', 'birthday', 'wedding', 'private-event', 'other'];
export const PLATTERS = ['sushi', 'sashimi', 'bento', 'hot-food'];
export const CATERING_STATUSES = ['new', 'contacted', 'quoted', 'booked', 'closed'];

const cateringEnquirySchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    date: { type: String, default: null },
    guests: { type: Number, default: null, min: 1 },
    budget: { type: String, default: '', trim: true },
    platters: { type: [{ type: String, enum: PLATTERS }], default: [] },
    message: { type: String, default: '', trim: true },
    status: { type: String, enum: CATERING_STATUSES, default: 'new', index: true },
    adminNotes: { type: String, default: '', trim: true },
  },
  { timestamps: true, versionKey: false },
);

cateringEnquirySchema.index({ createdAt: -1 });

export const CateringEnquiry = mongoose.model('CateringEnquiry', cateringEnquirySchema);
