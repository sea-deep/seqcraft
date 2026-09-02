import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import type { Db, MongoClient } from 'mongodb';
import type { ServerConfig } from './config.js';

export function createSeqCraftAuth(config: ServerConfig, db: Db, client: MongoClient) {
  if (!config.authEnabled || !config.BETTER_AUTH_SECRET) {
    throw new Error('Better Auth requires MongoDB and BETTER_AUTH_SECRET.');
  }

  const trustedOrigins = [
    new URL(config.APP_ORIGIN).origin,
    'https://seqcraft.onrender.com',
    'https://seqcraft.up.railway.app',
    ...config.allowedOrigins,
  ].filter(Boolean);

  return betterAuth({
    appName: 'SeqCraft',
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: Array.from(new Set(trustedOrigins)),
    database: mongodbAdapter(db, { client }),
    emailAndPassword: { enabled: true },
    socialProviders: config.googleEnabled && config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
    advanced: {
      database: { joins: true },
      useSecureCookies: config.isProduction,
      defaultCookieAttributes: config.isProduction
        ? { httpOnly: true, secure: true, sameSite: 'none' }
        : { httpOnly: true, secure: false, sameSite: 'lax' },
    },
  });
}

export type SeqCraftAuth = ReturnType<typeof createSeqCraftAuth>;
