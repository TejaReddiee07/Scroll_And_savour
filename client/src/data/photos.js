/**
 * Real photography from ./photos (built by `npm run photos`, see tools/photos.mjs).
 * Originals: Fuji's official website and its online-ordering menu (see photos/sources.json).
 * To add or replace a photo: put it in photos/<menu-section>/<dish-id>.jpg and run `npm run photos`.
 */
import generated from './photos.generated.json';

/** Photo for a dish id, or null (→ illustration fallback). */
export const photoFor = (id) => (id && generated.dishes[id]) || null;

export const PLACES = generated.places || {};
export const INSTAGRAM = generated.instagram || [];

export const PHOTOS = {
  storefront: PLACES.storefront || null,
  dining: PLACES.interior || null,
  hero: PLACES['hero-sushi-platter'] || null,
  catering: PLACES['catering-sushi-platter'] || null,
  logo: generated.branding?.['fuji-logo-white'] || null,
};

export const hasPhoto = (id) => Boolean(photoFor(id));
