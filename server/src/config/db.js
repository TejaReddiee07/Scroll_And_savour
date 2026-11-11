import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

let retryTimer = null;
let stopped = false;
let attempt = 0;
let listenersAttached = false;
let everConnected = false;

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export function dbStatus() {
  return isDbConnected() ? 'connected' : 'disconnected';
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  const conn = mongoose.connection;
  conn.on('connected', () => {
    everConnected = true;
  });
  // An 'error' listener must exist or the EventEmitter would throw. Failures of the initial
  // connection are already reported by the retry loop, so only log errors after we were connected.
  conn.on('error', (err) => {
    if (everConnected) console.error(`[db] ${err.message}`);
  });
  conn.on('disconnected', () => {
    if (everConnected && !stopped) console.warn('[db] disconnected — the driver will try to reconnect.');
  });
  conn.on('reconnected', () => console.log('[db] reconnected'));
}

/** Connects once (throws on failure). Used by scripts such as the seed. */
export async function connectOnce(uri) {
  attachListeners();
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

/**
 * Connects in the background and keeps retrying with backoff, so the HTTP server can boot
 * (and answer /api/health) even when MongoDB is unreachable.
 */
export function connectInBackground(uri) {
  if (!uri) {
    console.warn('[db] MONGODB_URI is not set — running without a database. Every route except /api/health returns 503.');
    return;
  }
  attachListeners();
  stopped = false;

  const tryConnect = async () => {
    retryTimer = null;
    attempt += 1;
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      attempt = 0;
      console.log(`[db] connected to ${mongoose.connection.host}/${mongoose.connection.name}`);
    } catch (err) {
      if (stopped) return;
      const delay = Math.min(30_000, 2_000 * 2 ** Math.min(attempt - 1, 4));
      console.warn(`[db] connection attempt ${attempt} failed (${err.message}). Retrying in ${delay / 1000}s.`);
      retryTimer = setTimeout(tryConnect, delay);
    }
  };

  void tryConnect();
}

export async function disconnectDb() {
  stopped = true;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}
