import mongoose from 'mongoose';

export const RESERVATION_STATUSES = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no-show'];

const reservationSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    guests: { type: Number, required: true, min: 1, max: 20 },
    // London calendar date and wall-clock time, stored as strings to avoid timezone drift.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    requests: { type: String, default: '', trim: true },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'pending', index: true },
    adminNotes: { type: String, default: '', trim: true },
    isDemo: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

reservationSchema.index({ date: 1, time: 1 });

export const Reservation = mongoose.model('Reservation', reservationSchema);
