import { createServer } from 'node:http';
import path from 'node:path';
import { createApp } from './app.js';
import { createSeqCraftAuth } from './auth.js';
import { loadConfig } from './config.js';
import { connectMongo } from './db/mongo.js';
import { InMemoryProjectRepository, MongoProjectRepository } from './repositories/project-repository.js';
import type { ProjectRepository } from './repositories/project-repository.js';

const config = loadConfig();
let closeDatabase: (() => Promise<void>) | undefined;
let projects: ProjectRepository = new InMemoryProjectRepository();
let auth;

if (config.authEnabled) {
  const { client, db } = await connectMongo(config);
  closeDatabase = () => client.close();
  const mongoProjects = new MongoProjectRepository(db);
  await mongoProjects.ensureIndexes();
  projects = mongoProjects;
  auth = createSeqCraftAuth(config, db, client);
}

const serveStatic = process.env.API_ONLY !== 'true';

const server = createServer(createApp({
  config,
  projects,
  auth,
  staticDir: (config.isProduction && serveStatic) ? path.resolve(process.cwd(), 'dist') : undefined,
}));
server.listen(config.PORT, '0.0.0.0', () => {
  console.log(`SeqCraft API listening on 0.0.0.0:${config.PORT} (${config.authEnabled ? 'connected' : 'guest'} mode)`);
});

async function shutdown(signal: string) {
  console.log(`SeqCraft API received ${signal}; shutting down.`);
  server.close();
  await closeDatabase?.();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
