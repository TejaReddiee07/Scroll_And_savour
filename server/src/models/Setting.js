import mongoose from 'mongoose';
import { DEFAULT_SETTINGS } from '../config/defaults.js';

export const MODES = ['demo', 'live'];
const SITE_KEY = 'site';

const hoursSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, required: true },
    close: { type: String, required: true },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: SITE_KEY },
    contact: {
      phone: { type: String, default: '' },
      phoneIntl: { type: String, default: '' },
      email: { type: String, default: '' },
      addressLines: { type: [String], default: [] },
    },
    hours: { type: [hoursSchema], default: [] },
    hoursNote: { type: String, default: '' },
    deliveryFee: { type: Number, default: null, min: 0 },
    minimumOrder: { type: Number, default: null, min: 0 },
    orderingMode: { type: String, enum: MODES, default: 'demo' },
    bookingMode: { type: String, enum: MODES, default: 'demo' },
    announcement: { type: String, default: '' },
  },
  { timestamps: true, versionKey: false },
);

/**
 * Returns the single site settings document (lean). If the seed hasn't run yet it is created
 * from the confirmed defaults so the site always has consistent settings.
 */
settingSchema.statics.getSite = async function getSite() {
  const existing = await this.findOne({ key: SITE_KEY }).lean();
  if (existing) return existing;
  try {
    return (await this.create({ key: SITE_KEY, ...structuredClone(DEFAULT_SETTINGS) })).toObject();
  } catch (err) {
    if (err?.code === 11000) return this.findOne({ key: SITE_KEY }).lean();
    throw err;
  }
};

settingSchema.statics.updateSite = async function updateSite(values) {
  return this.findOneAndUpdate(
    { key: SITE_KEY },
    { $set: values },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true, lean: true },
  );
};

export const Setting = mongoose.model('Setting', settingSchema);

/** Public/admin settings shape from docs/API.md. */
export function serializeSettings(doc) {
  const hours = [...(doc.hours ?? [])]
    .sort((a, b) => a.day - b.day)
    .map(({ day, open, close, closed }) => ({ day, open, close, closed: Boolean(closed) }));
  return {
    contact: {
      phone: doc.contact?.phone ?? '',
      phoneIntl: doc.contact?.phoneIntl ?? '',
      email: doc.contact?.email ?? '',
      addressLines: [...(doc.contact?.addressLines ?? [])],
    },
    hours,
    hoursNote: doc.hoursNote ?? '',
    deliveryFee: doc.deliveryFee ?? null,
    minimumOrder: doc.minimumOrder ?? null,
    orderingMode: doc.orderingMode ?? 'demo',
    bookingMode: doc.bookingMode ?? 'demo',
    announcement: doc.announcement ?? '',
  };
}
