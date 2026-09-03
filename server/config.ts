import { z } from 'zod';

const optionalTrimmed = z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().optional(),
);

const rawRailwayDomain = typeof process !== 'undefined'
  ? (process.env?.RAILWAY_PUBLIC_DOMAIN || process.env?.RAILWAY_STATIC_URL)
  : undefined;

const isRailwayEnvironment = typeof process !== 'undefined' && Boolean(
  process.env?.RAILWAY_ENVIRONMENT ||
  process.env?.RAILWAY_SERVICE_ID ||
  process.env?.RAILWAY_PROJECT_ID ||
  rawRailwayDomain
);

const defaultRailwayUrl = rawRailwayDomain
  ? (rawRailwayDomain.startsWith('http') ? rawRailwayDomain : `https://${rawRailwayDomain}`)
  : (isRailwayEnvironment ? 'https://seqcraft.up.railway.app' : undefined);

const defaultAppOrigin = isRailwayEnvironment
  ? 'https://seqcraft.onrender.com'
  : (defaultRailwayUrl || 'http://localhost:5173');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default(isRailwayEnvironment ? 'production' : 'development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(8787),
  APP_ORIGIN: z.string().url().default(defaultAppOrigin),
  MONGODB_URI: optionalTrimmed,
  MONGODB_DB: z.string().trim().min(1).max(64).default('seqcraft'),
  BETTER_AUTH_SECRET: optionalTrimmed,
  BETTER_AUTH_URL: z.string().url().default(defaultRailwayUrl || 'http://localhost:8787'),
  GOOGLE_CLIENT_ID: optionalTrimmed,
  GOOGLE_CLIENT_SECRET: optionalTrimmed,
  ALLOWED_ORIGINS: z.string().default(''),
}).superRefine((value, context) => {
  const authFields = [value.MONGODB_URI, value.BETTER_AUTH_SECRET];
  if (authFields.some(Boolean) && !authFields.every(Boolean)) {
    context.addIssue({
      code: 'custom',
      path: ['MONGODB_URI'],
      message: 'MONGODB_URI and BETTER_AUTH_SECRET must be configured together.',
    });
  }
  if (value.BETTER_AUTH_SECRET && value.BETTER_AUTH_SECRET.length < 32) {
    context.addIssue({
      code: 'custom',
      path: ['BETTER_AUTH_SECRET'],
      message: 'BETTER_AUTH_SECRET must contain at least 32 characters.',
    });
  }
  const googleFields = [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET];
  if (googleFields.some(Boolean) && !googleFields.every(Boolean)) {
    context.addIssue({
      code: 'custom',
      path: ['GOOGLE_CLIENT_ID'],
      message: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together.',
    });
  }
});

export type ServerConfig = ReturnType<typeof loadConfig>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const resolvedMongoUri = environment.MONGODB_URI || environment.MONGO_URL || environment.MONGODB_URL;
  const mergedEnvironment = {
    ...environment,
    ...(resolvedMongoUri ? { MONGODB_URI: resolvedMongoUri } : {}),
  };
  const env = environmentSchema.parse(mergedEnvironment);
  const authEnabled = Boolean(env.MONGODB_URI && env.BETTER_AUTH_SECRET);
  const googleEnabled = authEnabled && Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const allowedOrigins = env.ALLOWED_ORIGINS
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
    .map(origin => new URL(origin).origin);

  return {
    ...env,
    allowedOrigins,
    authEnabled,
    googleEnabled,
    isProduction: env.NODE_ENV === 'production',
  } as const;
}
