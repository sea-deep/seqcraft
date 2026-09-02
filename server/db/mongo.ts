import { MongoClient } from 'mongodb';
import type { ServerConfig } from '../config.js';

export async function connectMongo(config: ServerConfig) {
  if (!config.MONGODB_URI) throw new Error('MongoDB is not configured.');

  const client = new MongoClient(config.MONGODB_URI, {
    appName: 'seqcraft-control-plane',
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5_000,
    retryReads: true,
    retryWrites: true,
  });
  await client.connect();
  const db = client.db(config.MONGODB_DB);
  await db.command({ ping: 1 });
  return { client, db };
}
