// Exit code 0 when the MongoDB in server/.env (or the local default) answers within 4 seconds.
// Used by run.bat to decide between the real database and the in-memory demo database.
import 'dotenv/config';
import mongoose from 'mongoose';

const uri = (process.env.MONGODB_URI || '').trim() || 'mongodb://127.0.0.1:27017/fuji_restaurant';
const where = uri.replace(/\/\/[^@/]*@/, '//***@');

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
  await mongoose.connection.db.admin().ping();
  console.log(`[check-db] connected: ${where}`);
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.log(`[check-db] not reachable: ${where} (${err.message.split('\n')[0]})`);
  process.exit(1);
}
