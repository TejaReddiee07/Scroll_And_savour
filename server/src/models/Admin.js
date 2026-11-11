import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const ADMIN_ROLES = ['owner', 'staff'];
export const BCRYPT_COST = 12;
export const MIN_PASSWORD_LENGTH = 10;

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: 'staff' },
    lastLoginAt: { type: Date, default: null },
    // Tokens issued before this instant are rejected (set when the password changes).
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

adminSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_COST);
  // Back-dated by 1s so a token issued in the same second as the change stays valid.
  this.passwordChangedAt = new Date(Date.now() - 1000);
};

adminSchema.methods.checkPassword = function checkPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminSchema.methods.toPublic = function toPublic() {
  return { id: String(this._id), email: this.email, name: this.name, role: this.role };
};

export const Admin = mongoose.model('Admin', adminSchema);
