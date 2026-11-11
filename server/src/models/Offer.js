import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    terms: { type: String, default: '', trim: true, maxlength: 2000 },
    badge: { type: String, default: '', trim: true, maxlength: 40 },
    verified: { type: Boolean, default: false },
    source: { type: String, default: '', trim: true, maxlength: 300 },
    active: { type: Boolean, default: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export const Offer = mongoose.model('Offer', offerSchema);

/** Public projection of an offer. */
export function serializeOffer(o) {
  return {
    _id: o._id,
    title: o.title,
    description: o.description,
    terms: o.terms,
    badge: o.badge,
    verified: o.verified,
    source: o.source,
    active: o.active,
    startsAt: o.startsAt ?? null,
    endsAt: o.endsAt ?? null,
  };
}
