// Downloads the background-removal model used for automatic dish cut-outs (~170 MB, once).
//   npm run cutout-model
// Source: rembg's public release of IS-Net (general use). Saved to server/models/.
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const URL_ = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx';
const dir = fileURLToPath(new URL('../models/', import.meta.url));
const dest = path.join(dir, 'isnet-general-use.onnx');

if (fs.existsSync(dest) && fs.statSync(dest).size > 100_000_000) {
  console.log(`Model already present: ${dest}`);
  process.exit(0);
}
fs.mkdirSync(dir, { recursive: true });
console.log('Downloading the cut-out model (~170 MB)…');
const res = await fetch(URL_, { redirect: 'follow' });
if (!res.ok || !res.body) {
  console.error(`Download failed: HTTP ${res.status}`);
  process.exit(1);
}
const tmp = `${dest}.part`;
await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
fs.renameSync(tmp, dest);
console.log(`Saved ${dest} (${(fs.statSync(dest).size / 1e6).toFixed(0)} MB). Restart the API to use it.`);
