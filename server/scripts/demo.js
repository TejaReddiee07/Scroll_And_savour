// Zero-install demo backend for presentations:
//   npm run demo                   in-memory MongoDB + seed + API on :5000 (data resets on every start)
//   npm run demo -- --no-samples   skip the clearly-labelled sample orders/bookings
//
// Requires only `npm install` (mongodb-memory-server downloads a MongoDB binary once).
// NOT for production — use MongoDB Atlas and `npm start` there.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const samples = !process.argv.includes('--no-samples');
const PORT = Number(process.env.PORT || 5000);

const DEMO_ADMIN = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'owner@fuji.demo',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'FujiDemo2026!',
  ADMIN_NAME: process.env.ADMIN_NAME || 'Demo Owner',
};


console.log('[demo] starting in-memory MongoDB…');
const mongo = await MongoMemoryServer.create({ instance: { dbName: 'fuji_demo' } });
const MONGODB_URI = mongo.getUri('fuji_demo');
const env = { ...process.env, ...DEMO_ADMIN, MONGODB_URI, PORT: String(PORT), NODE_ENV: 'development' };

const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited with ${code}`))));
  });

await run(['src/seed/seed.js']);

const server = spawn(process.execPath, ['src/index.js'], { cwd: root, env, stdio: 'inherit' });

async function waitForHealth() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`http://localhost:${PORT}/api/health`);
      const j = await r.json();
      if (j.db === 'connected') return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function post(p, body) {
  const r = await fetch(`http://localhost:${PORT}/api${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.warn('[demo] sample', p, r.status, await r.text());
}

if (await waitForHealth()) {
  if (samples) {
    // Clearly-labelled SAMPLE records so the dashboard has something to show. Not real customers.
    const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    await post('/orders', { fulfilment: 'collection', items: [{ itemId: 'chicken-katsu-curry', quantity: 2 }, { itemId: 'salmon-sashimi', quantity: 1 }], customer: { name: 'Sample Customer A', phone: '07700 900001', email: 'sample-a@example.com', notes: 'SAMPLE ORDER — demo data' } });
    await post('/orders', { fulfilment: 'delivery', items: [{ itemId: 'miso-ramen', quantity: 1 }, { itemId: 'chicken-karage', quantity: 1 }], customer: { name: 'Sample Customer B', phone: '07700 900002', email: 'sample-b@example.com', address: { line1: '1 Sample Street', line2: '', postcode: 'N16 0AA' }, notes: 'SAMPLE ORDER — demo data' } });
    await post('/reservations', { name: 'Sample Guest', phone: '07700 900003', email: 'guest@example.com', guests: 4, date: day(1), time: '19:00', requests: 'SAMPLE BOOKING — demo data' });
    await post('/reservations', { name: 'Sample Party', phone: '07700 900004', email: 'party@example.com', guests: 8, date: day(3), time: '18:30', requests: 'SAMPLE BOOKING — birthday (demo data)' });
    await post('/catering', { name: 'Sample Company Ltd', email: 'events@example.com', phone: '07700 900005', eventType: 'corporate', date: day(14), guests: 30, budget: '£400–£600', platters: ['sushi', 'hot-food'], message: 'SAMPLE ENQUIRY — demo data. Office lunch for 30 people.' });
    await post('/contact', { name: 'Sample Visitor', email: 'visitor@example.com', subject: 'Sample message', message: 'SAMPLE MESSAGE — demo data. Do you have high chairs?' });
    console.log('[demo] created clearly-labelled SAMPLE records.');
  }
  console.log('\n────────────────────────────────────────────────────────');
  console.log(' Fuji demo backend ready');
  console.log(`  API:    http://localhost:${PORT}/api/health`);
  console.log('  Site:   run `npm run dev` in /client → http://localhost:5173');
  console.log('  Admin:  http://localhost:5173/admin');
  console.log(`          ${DEMO_ADMIN.ADMIN_EMAIL} / ${DEMO_ADMIN.ADMIN_PASSWORD}  (demo only)`);
  console.log('────────────────────────────────────────────────────────\n');
} else {
  console.error('[demo] API did not become healthy — see logs above.');
}

const stop = async () => {
  server.kill('SIGINT');
  await mongo.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.on('exit', async (code) => {
  await mongo.stop();
  process.exit(code ?? 0);
});
