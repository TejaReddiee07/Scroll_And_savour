import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    jp: { type: String, default: '', trim: true, maxlength: 50 },
    intro: { type: String, default: '', trim: true, maxlength: 500 },
    note: { type: String, default: null, trim: true, maxlength: 500 },
    order: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

export const MenuCategory = mongoose.model('MenuCategory', menuCategorySchema);
