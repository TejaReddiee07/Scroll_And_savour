// Dish photos uploaded from the admin.
//   processPhoto()   EXIF-rotates, strips metadata, resizes (never upscales) and — when the model is
//                    available — cuts the food out of its background (services/cutout.js).
//   saveLocalImage() stores the result on the server's own disk (UPLOADS_DIR, default server/uploads),
//                    served at /api/uploads/…, used when Cloudinary is not configured:
//                      <name>.webp       full photo        (+ <name>-640/-1280/-1920.webp)
//                      <name>-cut.webp   food on transparent (+ <name>-cut-640/-1280/-1920.webp)
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { cutOutFood } from './cutout.js';

export const LOCAL_URL_PREFIX = '/api/uploads/';
const FOLDER = 'menu';
const MAX_EDGE = 2560;
export const LOCAL_WIDTHS = [640, 1280, 1920];
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

/** "/api/uploads/menu/<name>[-cut].webp" — the only shape of local URL the API accepts on menu items. */
export const LOCAL_URL_RE = /^\/api\/uploads\/menu\/[a-z0-9]+-[a-f0-9]{12}(-cut)?\.(webp|jpg|png|avif)$/;
const PUBLIC_ID_RE = /^local:menu\/([a-z0-9]+-[a-f0-9]{12})$/;

let sharpLoader;
export function loadSharp() {
  sharpLoader ??= import('sharp').then((m) => m.default).catch(() => null);
  return sharpLoader;
}

const folderPath = () => path.join(env.uploadsDir, FOLDER);

/**
 * Resolves with { sharp, rgb, width, height, cut } (cut = { data RGBA, width, height } | null),
 * or null when no image library is installed.
 */
export async function processPhoto(buffer) {
  const sharp = await loadSharp();
  if (!sharp) return null;
  let decoded;
  try {
    decoded = await sharp(buffer, { failOn: 'error', limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#000000' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new HttpError(400, 'INVALID_IMAGE', 'That file could not be read as an image. Please try another photo.');
  }
  const { width, height } = decoded.info;
  let cut = null;
  try {
    cut = await cutOutFood(sharp, decoded.data, width, height);
  } catch (err) {
    console.warn('[uploads] cut-out failed, keeping the full photo:', err?.message ?? err);
  }
  return { sharp, rgb: decoded.data, width, height, cut };
}

/** WebP of the cut-out (for Cloudinary, which makes its own sizes). */
export function cutoutWebp(processed) {
  const { sharp, cut } = processed;
  return sharp(cut.data, { raw: { width: cut.width, height: cut.height, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100, effort: 5 })
    .toBuffer();
}

async function writeSizes(sharp, raw, base, dir) {
  const input = () => sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: raw.channels } });
  const alpha = raw.channels === 4;
  const webp = (s, q) => s.webp(alpha ? { quality: q, alphaQuality: 100, effort: 5 } : { quality: q, effort: 5 });
  await webp(input(), 86).toFile(path.join(dir, `${base}.webp`));
  for (const w of LOCAL_WIDTHS.filter((v) => v < raw.width)) {
    await webp(input().resize({ width: w }), 82).toFile(path.join(dir, `${base}-${w}.webp`));
  }
}

/** Saves an uploaded image buffer. Resolves with { url, publicId, width?, height?, cutout? }. */
export async function saveLocalImage(buffer, mimetype) {
  const dir = folderPath();
  await fs.mkdir(dir, { recursive: true });
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;
  const publicId = `local:${FOLDER}/${name}`;
  const processed = await processPhoto(buffer);

  if (!processed) {
    // No image library available: store the original bytes unchanged.
    const ext = EXT[mimetype] ?? 'jpg';
    await fs.writeFile(path.join(dir, `${name}.${ext}`), buffer, { flag: 'wx' });
    return { url: `${LOCAL_URL_PREFIX}${FOLDER}/${name}.${ext}`, publicId };
  }

  const { sharp, rgb, width, height, cut } = processed;
  await writeSizes(sharp, { data: rgb, width, height, channels: 3 }, name, dir);
  const result = { url: `${LOCAL_URL_PREFIX}${FOLDER}/${name}.webp`, publicId, width, height };
  if (cut) {
    await writeSizes(sharp, { ...cut, channels: 4 }, `${name}-cut`, dir);
    result.cutout = { url: `${LOCAL_URL_PREFIX}${FOLDER}/${name}-cut.webp`, width: cut.width, height: cut.height };
  }
  return result;
}

/** Removes a locally stored image (all sizes, cut-out included). Ignores Cloudinary ids and missing files. */
export async function deleteLocalImage(publicId) {
  const match = PUBLIC_ID_RE.exec(String(publicId ?? ''));
  if (!match) return;
  const name = match[1];
  const dir = folderPath();
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return;
  }
  await Promise.all(
    files
      .filter((f) => f.startsWith(`${name}.`) || f.startsWith(`${name}-`))
      .map((f) => fs.unlink(path.join(dir, f)).catch(() => {})),
  );
}
