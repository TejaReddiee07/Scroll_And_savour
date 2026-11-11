import { Router } from 'express';
import multer from 'multer';
import { cloudinaryEnabled, uploadImageBuffer } from '../../config/cloudinary.js';
import { cutoutWebp, processPhoto, saveLocalImage } from '../../services/localUploads.js';
import { HttpError } from '../../utils/httpError.js';

const router = Router();

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 5, parts: 10 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, WebP or AVIF images are allowed.'));
  },
});

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'NO_FILE', 'Attach an image in the "image" form field.');

  if (!cloudinaryEnabled) {
    const saved = await saveLocalImage(req.file.buffer, req.file.mimetype);
    return res.status(201).json({ ...saved, storage: 'local' });
  }

  // Cloudinary: the original goes up as-is (Cloudinary makes the sizes); the cut-out is made here.
  const processed = await processPhoto(req.file.buffer);
  let result;
  let cut = null;
  try {
    result = await uploadImageBuffer(req.file.buffer);
    if (processed?.cut) cut = await uploadImageBuffer(await cutoutWebp(processed));
  } catch (err) {
    console.error('[uploads] Cloudinary upload failed:', err?.message ?? err);
    throw new HttpError(502, 'UPLOAD_FAILED', 'The image could not be uploaded. Please try again.');
  }
  res.status(201).json({
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    ...(cut ? { cutout: { url: cut.secure_url, publicId: cut.public_id, width: cut.width, height: cut.height } } : {}),
    storage: 'cloudinary',
  });
});

export default router;
