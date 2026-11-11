// URLs for dish photos uploaded from the admin.
// Two kinds: Cloudinary (https://res.cloudinary.com/…/upload/…) or stored by the API itself
// (/api/uploads/menu/<name>.webp, with <name>-640/-1280/-1920.webp copies for srcset).

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const LOCAL_WIDTHS = [640, 1280, 1920];
const CLOUDINARY_WIDTHS = [640, 1280, 1920, 3840];

export const isLocalUpload = (url) => typeof url === 'string' && url.startsWith('/api/uploads/');
const isCloudinary = (url) => typeof url === 'string' && url.includes('/upload/');

/** Absolute URL for an uploaded image (the API may live on another origin in production). */
export function mediaUrl(url) {
  return isLocalUpload(url) ? `${API_ORIGIN}${url}` : url;
}

/** Cloudinary-aware image URL (adds f_auto/q_auto/width); other URLs are returned as they are. */
export function cdn(url, w) {
  if (!isCloudinary(url)) return mediaUrl(url);
  return url.replace('/upload/', `/upload/f_auto,q_auto,c_limit,w_${w}/`);
}

function localSized(url, w) {
  return mediaUrl(url.replace(/\.webp$/, `-${w}.webp`));
}

function sized({ url, width, height }) {
  let srcset;
  if (isCloudinary(url)) {
    srcset = CLOUDINARY_WIDTHS.map((w) => `${cdn(url, w)} ${w}w`).join(', ');
  } else if (isLocalUpload(url) && url.endsWith('.webp') && width) {
    srcset = [
      ...LOCAL_WIDTHS.filter((w) => w < width).map((w) => `${localSized(url, w)} ${w}w`),
      `${mediaUrl(url)} ${width}w`,
    ].join(', ');
  }
  return {
    src: cdn(url, 1280),
    srcset,
    width: width || 1600,
    height: height || 1067,
  };
}

/** True when the website shows the uploaded photo as a cut-out (food on black). */
export const showsCutout = (image) => Boolean(image?.cutout?.url) && image.display !== 'photo';

/**
 * Photo object ({ src, srcset, width, height, illustrative, cutout? }) for an uploaded image, or null —
 * the same shape as the restaurant photos in photos.generated.json.
 */
export function uploadedPhoto(image) {
  if (!image?.url) return null;
  const photo = { ...sized(image), illustrative: Boolean(image.illustrative) };
  if (showsCutout(image)) photo.cutout = sized(image.cutout);
  return photo;
}

function thumb({ url, width }) {
  if (isCloudinary(url)) return cdn(url, 640);
  if (isLocalUpload(url) && url.endsWith('.webp') && width > 640) return localSized(url, 640);
  return mediaUrl(url);
}

/** Small version of an uploaded image for admin thumbnails/previews (the cut-out when that is shown). */
export function uploadedThumb(image, { cutout = showsCutout(image) } = {}) {
  if (!image?.url) return '';
  return cutout && image.cutout?.url ? thumb(image.cutout) : thumb(image);
}
