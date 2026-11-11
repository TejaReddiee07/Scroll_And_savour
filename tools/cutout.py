"""Cut each dish out of its photo background so only the food sits on black.

    python tools/cutout.py            # new / changed photos only
    python tools/cutout.py --force    # redo everything

Needs:  pip install "rembg[cpu]" pillow numpy   (first run downloads the ~170 MB model)
Input:  photos/<menu-section>/<dish-id>.<jpg|png|webp>
Output: cutouts/<menu-section>/<dish-id>.png  (full-resolution, transparent background)
Then run `npm run photos` to build the web versions.
"""
import json
import os
import sys
import time

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'photos')
OUT = os.path.join(ROOT, 'cutouts')
SKIP_FOLDERS = {'restaurant', 'instagram', 'branding', 'catering', 'unsorted'}
EXT = ('.jpg', '.jpeg', '.png', '.webp')
force = '--force' in sys.argv
only = [a for a in sys.argv[1:] if not a.startswith('--')]

menu = json.load(open(os.path.join(ROOT, 'server', 'src', 'data', 'menu.json'), encoding='utf-8'))
dish_ids = {it['id'] for c in menu['categories'] for it in c['items']}

session = new_session('isnet-general-use')


def cut(src, dst):
    im = Image.open(src)
    im.load()
    rgb = im.convert('RGB')
    # mask from the model (it works at 1024 px internally), cleaned up at full size
    mask = remove(rgb, session=session, only_mask=True, post_process_mask=True)
    mask = mask.convert('L').resize(rgb.size, Image.LANCZOS)
    m = np.asarray(mask).astype(np.float32) / 255.0
    # tighten the edge by ~1px at 1024-scale and soften it, so no background halo shows on black
    sw = 1024
    small = mask.resize((sw, max(1, round(sw * rgb.size[1] / rgb.size[0]))), Image.BILINEAR)
    small = small.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))
    tight = np.asarray(small.resize(rgb.size, Image.BILINEAR)).astype(np.float32) / 255.0
    alpha = np.minimum(m, tight)
    alpha[alpha < 0.04] = 0
    # colour decontamination: darken semi-transparent edge pixels toward black
    a3 = alpha[..., None]
    col = np.asarray(rgb).astype(np.float32)
    col = col * np.clip(0.55 + 0.45 * a3, 0, 1)
    out = np.dstack([col, alpha * 255]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    bbox = img.getchannel('A').point(lambda v: 255 if v > 10 else 0).getbbox()
    if not bbox:
        return None
    pad = int(max(img.size) * 0.03)
    l, t, r, b = bbox
    img = img.crop((max(0, l - pad), max(0, t - pad), min(img.width, r + pad), min(img.height, b + pad)))
    coverage = float((alpha > 0.5).mean())
    img.save(dst, compress_level=3)
    return img.size, coverage


done = 0
report = []
start = time.time()
for folder in sorted(os.listdir(SRC)):
    fdir = os.path.join(SRC, folder)
    if folder in SKIP_FOLDERS or not os.path.isdir(fdir):
        continue
    for f in sorted(os.listdir(fdir)):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in EXT or stem not in dish_ids or (only and stem not in only):
            continue
        src = os.path.join(fdir, f)
        os.makedirs(os.path.join(OUT, folder), exist_ok=True)
        dst = os.path.join(OUT, folder, stem + '.png')
        if not force and os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        try:
            res = cut(src, dst)
        except Exception as e:  # noqa: BLE001
            print(f'  x {folder}/{f}: {e}')
            continue
        if res:
            size, cov = res
            done += 1
            report.append((cov, f'{folder}/{stem}'))
            print(f'  ok {folder}/{stem}  {size[0]}x{size[1]}  food covers {cov:.0%} of the photo', flush=True)
print(f'cut out {done} photos in {time.time() - start:.0f}s')
low = [r for r in report if r[0] < 0.08 or r[0] > 0.9]
if low:
    print('check these (mask may be off):', ', '.join(n for _, n in low))
