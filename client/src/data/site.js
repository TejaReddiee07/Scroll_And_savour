// Restaurant facts — sourced ONLY from the owner-supplied PDF brief.
// Anything marked `toConfirm` must be verified with the owner before launch.

export const SITE = {
  name: 'Fuji Japanese Restaurant',
  shortName: 'Fuji',
  tagline: 'A Taste of Japan in the Heart of Stoke Newington.',
  heroLine: 'Fresh sushi, sashimi and comforting Japanese favourites in London N16.',
  cuisine: 'Japanese, Sushi and Sashimi',
  url: 'https://fujirestaurant.co.uk/',
  address: {
    street: '15 Stoke Newington Church Street',
    locality: 'London',
    postcode: 'N16 0NX',
    country: 'United Kingdom',
    countryCode: 'GB',
  },
  phone: '020 7254 6093',
  phoneIntl: '+442072546093',
  phoneDisplayIntl: '+44 20 7254 6093',
  email: 'info@fujirestaurant.co.uk',
  // Published opening hours: daily 12:00–22:00 (to confirm; booking service hours may differ)
  hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '12:00', close: '22:00', closed: false })),
  hoursNote: 'Published hours — please confirm with the restaurant. Booking service hours may differ.',
  services: ['Dine-in', 'Delivery', 'Collection / takeaway', 'Table booking', 'Catering'],
  links: {
    maps: 'https://maps.app.goo.gl/FXFZLCuatCsL3KYt5',
    mapsOriginal: 'https://maps.app.goo.gl/NDsaEXkmU8daxPW37',
    mapsEmbed:
      'https://www.google.com/maps?q=Fuji+Japanese+Restaurant,+15+Stoke+Newington+Church+Street,+London+N16+0NX&ll=51.5619484,-0.0744792&z=17&output=embed',
    officialSite: 'https://fujirestaurant.co.uk/',
    officialMenu: 'https://fujirestaurant.co.uk/menu',
    officialReservations: 'https://fujirestaurant.co.uk/reservations',
    officialContact: 'https://fujirestaurant.co.uk/contact',
    deliveroo: 'https://deliveroo.co.uk/menu/london/stoke-newington/fuji-japanese-restaurant',
    uberEats: 'https://www.ubereats.com/gb/store/fuji-japanese-restaurant/u2NJycR3R6SrjcxeOZTHCA',
    openTable: 'https://www.opentable.co.uk/r/fuji-restaurant',
    foodHygiene: 'https://ratings.food.gov.uk/business/1910935',
    tfl: 'https://tfl.gov.uk/plan-a-journey/',
  },
  toConfirm: [
    'Legal business name and registered company details',
    'Founding / established year (2009 has been published) and how the history should be described',
    'Opening hours, kitchen hours, last orders and holiday closures',
    'Phone number, email address and reservation URL',
    'Delivery areas, collection process, provider, minimum order and delivery fee',
    'Whether the 20% delivery/collection promotion is active and its exact terms',
    'Dish availability, descriptions, portion sizes and prices',
    'Allergen matrix, cross-contamination procedures and dietary suitability',
    'Food hygiene rating and latest inspection date',
    'Permission to use restaurant photos, logo, menu text and reviews',
    'Catering packages, minimum order, lead time and service area',
    'Payment methods, accessibility, seating capacity and private-event availability',
  ],
};

// The only published offer in the brief — shown with its verification caveat.
export const DEFAULT_OFFERS = [
  {
    _id: 'offer-20-off',
    title: '20% off delivery & collection',
    badge: '20% OFF',
    description:
      "The restaurant's official homepage has advertised 20% off delivery and collection orders.",
    terms:
      'Eligibility, exclusions, dates and any promo code are to be confirmed with the restaurant before this offer is relied upon.',
    source: 'Official homepage (fujirestaurant.co.uk)',
    verified: false,
    active: true,
  },
];

// Dishes the restaurant itself highlights as signatures (PDF §3).
export const SIGNATURE_IDS = [
  'delux-sashimi',
  'chicken-karage',
  'chicken-katsu-curry',
  'prawn-tempura-soba-soup',
  'sirloin-steak-bento',
  'fuji-roll',
];

// Dishes the hero animation rotates through.
export const HERO_DISH_IDS = [
  'chicken-katsu-curry',
  'prawn-tempura',
  'salmon-sashimi',
  'sirloin-steak-bento',
  'miso-ramen',
  'rainbow-roll',
];

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/menu', label: 'Menu' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/catering', label: 'Catering' },
  { to: '/contact', label: 'Contact' },
];

export const DIETARY = {
  vegetarian: { short: 'V', label: 'Vegetarian', className: 'bg-emerald-700/90 text-white' },
  vegan: { short: 'VG', label: 'Vegan', className: 'bg-green-800 text-white' },
  'gluten-free': { short: 'GF', label: 'Gluten-free (as labelled)', className: 'bg-amber-700 text-white' },
};

export const TAGS = {
  popular: { label: 'Popular', className: 'bg-[#7d5a1c] text-white' },
  'chefs-pick': { label: "Chef's pick", className: 'bg-fuji-red text-white' },
  spicy: { label: 'Spicy', className: 'bg-orange-600/90 text-white' },
};
