# Facts to confirm with the restaurant owner

Everything on the website comes from the research brief (`Fuji_Japanese_Restaurant_Complete_Profile_and_Website_Brief.pdf`, snapshot 10 Nov 2026).
Items below are shown on the site with a "to be confirmed" / "demonstration" label until the owner signs them off.
Most can then be updated in the **admin dashboard** without a developer.

| # | Item | Where it appears | How to update |
|---|---|---|---|
| 1 | Legal business name and registered company details | Privacy policy | Edit `client/src/pages/Policies.jsx` |
| 2 | Establishment year (2009 has been published) and the restaurant's story | About page ("awaiting the owner's words") | Edit `client/src/pages/About.jsx` |
| 3 | Opening hours, kitchen hours, last orders, holiday closures | Header status, home, footer, contact, booking time slots, JSON-LD | Admin → Settings (and `index.html` JSON-LD) |
| 4 | Phone, email, reservation URL | Everywhere | Admin → Settings · `client/src/data/site.js` |
| 5 | Delivery areas, provider, minimum order, delivery fee | Cart / checkout ("To be confirmed") | Admin → Settings |
| 6 | Whether the **20% off delivery & collection** offer is live, and its exact terms | Home → Special offers (marked unverified) | Admin → Offers → set *verified* or deactivate |
| 7 | Dish availability, descriptions, portion sizes and **prices** | Menu, ordering, catering examples | Admin → Menu (see `docs/MENU.md` for the full list) |
| 8 | Allergen matrix, cross-contamination procedures, dietary suitability | Allergen notices, dietary badges | Admin → Menu (allergens per dish) · `menu.json` notice |
| 9 | Food hygiene rating and latest inspection date | Not shown yet (not verified) | Add once confirmed |
| 10 | Permission to use restaurant photos, logo, menu text and reviews | All 160 dishes show a photo: 141 are Fuji's own (website, ordering menu, Deliveroo), 19 are labelled stock photos (see `docs/PHOTOS.md`) | Dish photos: Admin → Menu → edit the dish → upload a photo (background removed automatically). Storefront, dining room and gallery: `photos/` + `npm run photos` |
| 11 | Catering packages, minimum order, lead time, service area | Catering page note | Edit `client/src/pages/Catering.jsx` |
| 12 | Payment methods, venue accessibility, seating capacity, private events | Allergens & accessibility page, catering | Edit policy pages |
| 13 | Online ordering: connect a provider or use the built-in order queue? | Order page is labelled *Demonstration* | Admin → Settings → Ordering mode `live` only when ready |
| 14 | Table booking: booking widget, existing provider, or built-in request form? | Reservations page is labelled *Demo* | Admin → Settings → Booking mode `live` only when ready |
| 15 | Verified social media accounts | None shown (none verified) | Add to the footer once confirmed |
| 16 | Reviews / testimonials | Not shown — links to Google Maps and OpenTable instead | Add only real, attributable reviews with permission |
| 17 | Approval of the homepage copy ("A Taste of Japan in the Heart of Stoke Newington.") | Hero, footer | `client/src/data/site.js` |

### About the images
- Photos visible on the Google Maps listing (https://maps.app.goo.gl/FXFZLCuatCsL3KYt5) were **not** copied: most are uploaded by customers and belong to them. Supply restaurant-owned files (or written permission) and they can be dropped in as above.
- **Dish images** are the restaurant's own photos; the 19 stock photos are labelled *"Illustrative image"* until replaced.
- **The chef and waiter characters** are illustrated mascots based on the two character reference images supplied with the brief (`docs/reference/`). They are labelled as illustrations wherever they appear and are never presented as real Fuji staff. Confirm you hold the rights to the reference artwork before publishing.
- Interior / exterior photo slots show labelled placeholders until approved photography is supplied.
