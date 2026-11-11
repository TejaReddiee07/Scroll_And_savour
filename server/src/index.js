import { assertRuntimeConfig, env } from './config/env.js';
import { connectInBackground, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { cutoutsAvailable } from './services/cutout.js';

assertRuntimeConfig();

const app = createApp();

const server = app.listen(env.port, (err) => {
  if (err) {
    console.error(`[server] failed to listen on port ${env.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`[server] Fuji Restaurant API v${env.version} listening on http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(
    env.cloudinaryEnabled
      ? '[server] Photo uploads → Cloudinary.'
      : `[server] Photo uploads → this computer (${env.uploadsDir}).`,
  );
  console.log(
    cutoutsAvailable()
      ? '[server] Uploaded dish photos get an automatic cut-out (food on black).'
      : '[server] Automatic photo cut-outs are off (no model file — run `npm run cutout-model`).',
  );
});

// Connect (and keep retrying) in the background so /api/health works without MongoDB.
connectInBackground(env.mongoUri);

let shuttingDown = false;
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} — shutting down gracefully…`);
  const force = setTimeout(() => {
    console.error('[server] forced exit after 10s');
    process.exit(1);
  }, 10_000);
  force.unref();
  try {
    // Stop accepting connections; in-flight requests finish, idle keep-alive sockets are closed.
    await new Promise((resolve) => server.close(() => resolve()));
    await disconnectDb();
    console.log('[server] closed.');
    process.exit(exitCode);
  } catch (err) {
    console.error('[server] error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('[server] unhandled rejection:', reason));
process.on('uncaughtException', (err) => {
  console.error('[server] uncaught exception:', err);
  void shutdown('uncaughtException', 1);
});
