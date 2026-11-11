# Photos

All photography is Fuji's own: downloaded from the official website (fujirestaurant.co.uk) and the restaurant's online-ordering menu (orderdirectly.biz) at original resolution. `photos/sources.json` records where every file came from. Confirm with the owner before publishing.

## Folders

```
photos/                    originals (up to 4855 px wide, 93 of 139 are 4K or larger)
  starters/ maki-rolls/ uramaki-rolls/ sashimi/ … beers-and-sake/   one folder per menu section, file = dish id
  restaurant/              storefront, interior, hero-sushi-platter
  catering/  instagram/  branding/
cutouts/                   the same dishes with the background removed (transparent PNG, full size)
client/public/photos/      web versions of the originals (WebP, 640/1280/1920/3840 px)
client/public/cutouts/     web versions of the cut-outs (transparent WebP, up to 3840 px)
```

The site shows **cut-outs on black** for dishes (menu, cards, hero, detail view) and the **full natural photos** in the gallery, About page and Visit section. Images are never upscaled: a phone gets the 640/1280 px file, a 4K screen gets the 3840 px file when the original is that large.

## Adding or replacing a photo

1. Put the file in `photos/<menu-section>/<dish-id>.jpg` (the dish id is in `docs/MENU.md`, e.g. `photos/desserts/mango-mochi-ice-cream.jpg`).
2. Cut out the background (once):
   ```
   pip install "rembg[cpu]" pillow numpy
   python tools/cutout.py
   ```
3. Build the web versions: `npm run photos`
4. Refresh the site.

**All 160 dishes have a photo.** 141 are Fuji's own (official website, ordering menu, Deliveroo). For 19 dishes the restaurant has never published a photo anywhere, so free-licence **Unsplash** stock photos (4K, commercial use allowed) stand in, and the site labels them **"Illustrative image"**: yaki soba ×4, yaki udon ×4, dorayaki ×3, mochi ice cream ×3, vegetable ramen ×2, apple / orange / pineapple juice. They are marked `"illustrative": true` in `photos/sources.json`. Replace them with real photos as soon as the restaurant has them (same file name, then `python tools/cutout.py` and `npm run photos`).

## Photos uploaded in the admin

**Admin → Menu items → Add dish / edit a dish → Photo** — drag a photo in (JPEG, PNG, WebP or AVIF, up to 5 MB). It replaces the website photo for that dish straight away.

- The server rotates it, strips the camera data, resizes it (max 2560 px, never upscaled) and saves WebP copies at 640/1280/1920 px.
- It also **cuts the food out of its background automatically** (same model as `tools/cutout.py`), so the dish sits on black like the rest of the menu. Untick *Show only the food, on black* in the dish editor to show the full photo instead.
- Files are stored in `server/uploads/menu/` (or on Cloudinary when it is configured). Replacing or removing a dish's photo, or deleting the dish, deletes its files.
- The cut-out needs the model file once: `cd server && npm run cutout-model` (~170 MB). On this PC it is already in `%USERPROFILE%\.u2net\`. Without it, uploads still work and show the full photo.
