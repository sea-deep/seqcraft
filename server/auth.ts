import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { bearer } from 'better-auth/plugins';
import type { Db, MongoClient } from 'mongodb';
import type { ServerConfig } from './config.js';
import type { ProjectRepository } from './repositories/project-repository.js';

export function createSeqCraftAuth(
  config: ServerConfig,
  db: Db,
  client: MongoClient,
  projects: ProjectRepository,
) {
  if (!config.authEnabled || !config.BETTER_AUTH_SECRET) {
    throw new Error('Better Auth requires MongoDB and BETTER_AUTH_SECRET.');
  }

  const trustedOrigins = [
    new URL(config.APP_ORIGIN).origin,
    'https://seqcraft.onrender.com',
    'https://seqcraft.up.railway.app',
    ...config.allowedOrigins,
  ].filter(Boolean);

  const isHttps = config.isProduction || config.BETTER_AUTH_URL.startsWith('https://');

  return betterAuth({
    appName: 'SeqCraft',
    baseURL: config.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: Array.from(new Set(trustedOrigins)),
    database: mongodbAdapter(db, { client, transaction: false }),
    plugins: [
      bearer(),
    ],
    emailAndPassword: { enabled: true },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async user => {
          await projects.deleteAll(user.id);
        },
      },
    },
    socialProviders: config.googleEnabled && config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
    session: {
      // Keep users logged in for 30 days of inactivity.
      // The session is silently refreshed if the user is active within 1 day of expiry.
      expiresIn: 60 * 60 * 24 * 30,  // 30 days in seconds
      updateAge: 60 * 60 * 24,        // refresh window: 1 day in seconds
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // cache the session cookie for 5 min to reduce DB round-trips
      },
    },
    account: {
      storeStateStrategy: 'database',
      skipStateCookieCheck: true,
    },
    advanced: {
      database: { joins: true },
      useSecureCookies: isHttps,
      defaultCookieAttributes: isHttps
        ? { httpOnly: true, secure: true, sameSite: 'none', partitioned: true }
        : { httpOnly: true, secure: false, sameSite: 'lax' },
      cookies: {
        state: {
          attributes: isHttps
            ? { httpOnly: true, secure: true, sameSite: 'none', partitioned: true }
            : { httpOnly: true, secure: false, sameSite: 'lax' },
        },
        oauth_state: {
          attributes: isHttps
            ? { httpOnly: true, secure: true, sameSite: 'none', partitioned: true }
            : { httpOnly: true, secure: false, sameSite: 'lax' },
        },
        session_token: {
          attributes: isHttps
            ? { httpOnly: true, secure: true, sameSite: 'none', partitioned: true }
            : { httpOnly: true, secure: false, sameSite: 'lax' },
        },
      },
    },
  });
}

export type SeqCraftAuth = ReturnType<typeof createSeqCraftAuth>;
