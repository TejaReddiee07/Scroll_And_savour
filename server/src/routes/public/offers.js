import { Router } from 'express';
import { Offer, serializeOffer } from '../../models/Offer.js';

const router = Router();

router.get('/offers', async (_req, res) => {
  const now = new Date();
  const offers = await Offer.find({
    active: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  })
    .sort({ createdAt: 1 })
    .lean();
  res.set('Cache-Control', 'no-cache');
  res.json(offers.map(serializeOffer));
});

export default router;
