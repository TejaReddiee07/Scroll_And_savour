import mongoose from 'mongoose';

export const DIETARY = ['vegetarian', 'vegan', 'gluten-free'];
export const TAGS = ['popular', 'chefs-pick', 'spicy'];

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, default: '', trim: true },
    illustrative: { type: Boolean, default: false },
    width: { type: Number, min: 1 },
    height: { type: Number, min: 1 },
    // The food cut out of its background (shown on black on the website), when available
    cutout: {
      type: new mongoose.Schema(
        {
          url: { type: String, required: true, trim: true },
          publicId: { type: String, default: '', trim: true },
          width: { type: Number, min: 1 },
          height: { type: Number, min: 1 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    // 'cutout' = food on black (default when a cut-out exists), 'photo' = the full photo
    display: { type: String, enum: ['cutout', 'photo'], default: 'cutout' },
  },
  { _id: false },
);

const menuItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 100 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, default: '', trim: true, maxlength: 1000 },
    price: { type: Number, required: true, min: 0 },
    dietary: { type: [{ type: String, enum: DIETARY }], default: [] },
    tags: { type: [{ type: String, enum: TAGS }], default: [] },
    hot: { type: Boolean, default: false },
    art: { type: String, default: '', trim: true, maxlength: 60 },
    image: { type: imageSchema, default: null },
    allergens: { type: [{ type: String, trim: true, maxlength: 60 }], default: [] },
    available: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

menuItemSchema.index({ category: 1, order: 1 });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);
