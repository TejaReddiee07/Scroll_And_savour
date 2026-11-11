import { Router } from 'express';
import { Setting, serializeSettings } from '../../models/Setting.js';

const router = Router();

router.get('/settings', async (_req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.json(serializeSettings(await Setting.getSite()));
});

export default router;
