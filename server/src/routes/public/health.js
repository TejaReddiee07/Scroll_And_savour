import { Router } from 'express';
import { env } from '../../config/env.js';
import { dbStatus } from '../../config/db.js';
import { cloudinaryEnabled } from '../../config/cloudinary.js';
import { cutoutsAvailable } from '../../services/cutout.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, db: dbStatus(), uploads: true, uploadStorage: cloudinaryEnabled ? 'cloudinary' : 'local', cutouts: cutoutsAvailable(), version: env.version });
});

export default router;
