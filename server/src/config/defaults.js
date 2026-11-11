// Facts supplied by the owner's brief. Do not add anything here that hasn't been confirmed.

export const DEFAULT_SETTINGS = Object.freeze({
  contact: {
    phone: '020 7254 6093',
    phoneIntl: '+442072546093',
    email: 'info@fujirestaurant.co.uk',
    addressLines: ['15 Stoke Newington Church Street', 'London', 'N16 0NX'],
  },
  hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: '12:00', close: '22:00', closed: false })),
  hoursNote: 'Published hours — please confirm with the restaurant. Booking service hours may differ.',
  deliveryFee: null,
  minimumOrder: null,
  orderingMode: 'demo',
  bookingMode: 'demo',
  announcement: '',
});

export const DEFAULT_OFFER = Object.freeze({
  title: '20% off delivery & collection',
  badge: '20% OFF',
  description: "The restaurant's official homepage has advertised 20% off delivery and collection orders.",
  terms:
    'Eligibility, exclusions, dates and any promo code are to be confirmed with the restaurant before this offer is relied upon.',
  source: 'Official homepage (fujirestaurant.co.uk)',
  verified: false,
  active: true,
  startsAt: null,
  endsAt: null,
});
