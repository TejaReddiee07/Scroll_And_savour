/** API shape of a menu item's photo (admin + public). */
export function serializeImage(image) {
  if (!image?.url) return null;
  const out = {
    url: image.url,
    publicId: image.publicId ?? '',
    illustrative: Boolean(image.illustrative),
    display: image.display === 'photo' ? 'photo' : 'cutout',
  };
  if (image.width && image.height) Object.assign(out, { width: image.width, height: image.height });
  if (image.cutout?.url) {
    out.cutout = { url: image.cutout.url, publicId: image.cutout.publicId ?? '' };
    if (image.cutout.width && image.cutout.height) Object.assign(out.cutout, { width: image.cutout.width, height: image.cutout.height });
  }
  return out;
}
