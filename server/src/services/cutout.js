// Cuts the food out of an uploaded photo so it sits on black like every other dish on the site.
// Same model and steps as tools/cutout.py (rembg "isnet-general-use", MIT/Apache-licensed), run with
// onnxruntime-node. Optional: without the runtime or the model file, uploads simply keep the full photo.
//
// Model file (~170 MB), first match wins:
//   CUTOUT_MODEL=<path>  →  server/models/isnet-general-use.onnx  →  ~/.u2net/isnet-general-use.onnx
// `npm run cutout-model` (server/) downloads it to server/models/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { env } from '../config/env.js';

const SIZE = 1024; // the model's input size
const MODEL_FILE = 'isnet-general-use.onnx';

export function cutoutModelPath() {
  const candidates = [
    env.cutouts.model,
    path.join(env.serverRoot, 'models', MODEL_FILE),
    path.join(os.homedir(), '.u2net', MODEL_FILE),
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

let runtime; // Promise<{ ort, session } | null>
function loadRuntime() {
  if (runtime) return runtime;
  runtime = (async () => {
    const model = env.cutouts.enabled ? cutoutModelPath() : null;
    if (!model) return null;
    const ort = await import('onnxruntime-node');
    const session = await ort.InferenceSession.create(model, { graphOptimizationLevel: 'all' });
    return { ort, session };
  })().catch((err) => {
    console.warn('[cutout] background removal unavailable:', err?.message ?? err);
    return null;
  });
  return runtime;
}

/** True when uploads will get an automatic cut-out (checked without loading the model). */
export function cutoutsAvailable() {
  return env.cutouts.enabled && Boolean(cutoutModelPath());
}

/** Runs a raw single-channel buffer through one sharp step and returns the raw result. */
async function gray(sharp, buf, width, height, step) {
  const { data, info } = await step(sharp(buf, { raw: { width, height, channels: 1 } }))
    .toColourspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels === 1) return data;
  const out = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < out.length; i += 1) out[i] = data[i * info.channels];
  return out;
}

/**
 * rgb: raw RGB buffer (width × height). Resolves with
 * { data: raw RGBA buffer, width, height, coverage } cropped to the food, or null when nothing was found.
 */
export async function cutOutFood(sharp, rgb, width, height) {
  const rt = await loadRuntime();
  if (!rt) return null;
  const { ort, session } = rt;

  // 1. Model input: 1024×1024, scaled by the brightest value, minus 0.5 (rembg DisSession.normalize)
  const small = await sharp(rgb, { raw: { width, height, channels: 3 } })
    .resize(SIZE, SIZE, { fit: 'fill', kernel: 'lanczos3' })
    .raw()
    .toBuffer();
  let max = 1;
  for (let i = 0; i < small.length; i += 1) if (small[i] > max) max = small[i];
  const n = SIZE * SIZE;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i += 1) {
    input[i] = small[i * 3] / max - 0.5;
    input[n + i] = small[i * 3 + 1] / max - 0.5;
    input[2 * n + i] = small[i * 3 + 2] / max - 0.5;
  }
  const output = await session.run({ [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, SIZE, SIZE]) });
  const pred = output[session.outputNames[0]].data;

  // 2. Normalise the prediction to 0–255
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i += 1) {
    if (pred[i] < lo) lo = pred[i];
    if (pred[i] > hi) hi = pred[i];
  }
  if (!(hi > lo)) return null;
  const mask1024 = Buffer.alloc(n);
  for (let i = 0; i < n; i += 1) mask1024[i] = Math.floor(((pred[i] - lo) / (hi - lo)) * 255);

  // 3. Full-size mask, cleaned like rembg's post_process: open → blur → threshold
  let mask = await gray(sharp, mask1024, SIZE, SIZE, (s) => s.resize(width, height, { fit: 'fill', kernel: 'lanczos3' }));
  mask = await gray(sharp, mask, width, height, (s) => s.erode(1));
  mask = await gray(sharp, mask, width, height, (s) => s.dilate(1));
  mask = await gray(sharp, mask, width, height, (s) => s.blur(2));
  mask = await gray(sharp, mask, width, height, (s) => s.threshold(127));

  // 4. Tighten the edge by ~1 px at 1024-px scale and soften it, so no background halo shows on black
  const tw = 1024;
  const th = Math.max(1, Math.round((tw * height) / width));
  let tight = await gray(sharp, mask, width, height, (s) => s.resize(tw, th, { fit: 'fill', kernel: 'linear' }));
  tight = await gray(sharp, tight, tw, th, (s) => s.erode(1));
  tight = await gray(sharp, tight, tw, th, (s) => s.blur(1));
  tight = await gray(sharp, tight, tw, th, (s) => s.resize(width, height, { fit: 'fill', kernel: 'linear' }));

  // 5. Alpha + darken semi-transparent edge pixels toward black; find the food's bounding box
  const rgba = Buffer.alloc(width * height * 4);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let solid = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      let a = Math.min(mask[i], tight[i]);
      if (a < 10) a = 0; // ≈ 0.04
      const k = 0.55 + 0.45 * (a / 255);
      rgba[i * 4] = rgb[i * 3] * k;
      rgba[i * 4 + 1] = rgb[i * 3 + 1] * k;
      rgba[i * 4 + 2] = rgb[i * 3 + 2] * k;
      rgba[i * 4 + 3] = a;
      if (a > 10) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
      if (a > 127) solid += 1;
    }
  }
  const coverage = solid / (width * height);
  if (right < 0 || coverage < 0.02) return null; // the model found no dish

  const pad = Math.round(Math.max(width, height) * 0.03);
  const crop = {
    left: Math.max(0, left - pad),
    top: Math.max(0, top - pad),
    width: Math.min(width, right + pad + 1) - Math.max(0, left - pad),
    height: Math.min(height, bottom + pad + 1) - Math.max(0, top - pad),
  };
  const { data, info } = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract(crop)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, coverage };
}
