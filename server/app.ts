import cors from 'cors';
import express, { type ErrorRequestHandler, type Request, type RequestHandler } from 'express';
import path from 'node:path';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { ZodError } from 'zod';
import type { ServerConfig } from './config.js';
import type { SeqCraftAuth } from './auth.js';
import { projectIdSchema, projectMetadataInputSchema } from './privacy/project-metadata.js';
import type { ProjectRepository } from './repositories/project-repository.js';

type AppDependencies = {
  config: ServerConfig;
  projects: ProjectRepository;
  auth?: SeqCraftAuth;
  resolveUserId?: (request: Request) => Promise<string | null>;
  staticDir?: string;
};

const requestUserId = Symbol('requestUserId');
type AuthenticatedRequest = Request & { [requestUserId]?: string };

export function createApp({ config, projects, auth, resolveUserId, staticDir }: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((_request, response, next) => {
    response.setHeader('Origin-Agent-Cluster', '?1');
    response.setHeader('Permissions-Policy', 'tools=(self)');
    next();
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  
  const isAllowedOrigin = (origin: string | undefined): boolean => {
    if (!origin) return true;
    if (origin === config.APP_ORIGIN) return true;
    if (origin === 'https://seqcraft.onrender.com') return true;
    if (origin.endsWith('.onrender.com') || origin.endsWith('.railway.app') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
    const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    return extra.includes(origin);
  };

  app.use(cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'PUT', 'DELETE', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Origin', 'Accept', 'X-Requested-With'],
  }));
  app.use(rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));

  if (auth) {
    app.all('/api/auth/{*path}', rateLimit({ windowMs: 10 * 60_000, limit: 60 }), toNodeHandler(auth));
  }

  app.use(express.json({ limit: '32kb', strict: true }));

  app.get('/api/health', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json({ status: 'ok', service: 'seqcraft-api', mode: config.authEnabled ? 'connected' : 'guest' });
  });

  app.get('/api/config', (_request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.json({
      auth: { enabled: config.authEnabled, googleEnabled: config.googleEnabled },
      privacy: { sequenceStorage: 'browser-only', cloudStoresSequence: false },
      limits: { requestBytes: 32_768, projectsPerResponse: 250, documentsPerProject: 250 },
    });
  });

  const requireUser: RequestHandler = async (request: AuthenticatedRequest, response, next) => {
    try {
      const userId = resolveUserId
        ? await resolveUserId(request)
        : auth
          ? (await auth.api.getSession({ headers: fromNodeHeaders(request.headers) }))?.user.id ?? null
          : null;
      if (!userId) {
        response.status(config.authEnabled ? 401 : 503).json({
          error: config.authEnabled ? 'AUTHENTICATION_REQUIRED' : 'AUTH_NOT_CONFIGURED',
          message: config.authEnabled
            ? 'Sign in to sync project metadata.'
            : 'Cloud sync is unavailable; the local scientific workspace remains fully functional.',
        });
        return;
      }
      request[requestUserId] = userId;
      next();
    } catch (error) {
      next(error);
    }
  };

  app.get('/api/projects', requireUser, async (request: AuthenticatedRequest, response, next) => {
    try {
      response.setHeader('Cache-Control', 'no-store');
      response.json({ projects: await projects.list(requireRequestUser(request)) });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/projects/:projectId', requireUser, async (request: AuthenticatedRequest, response, next) => {
    try {
      const projectId = projectIdSchema.parse(request.params.projectId);
      const input = projectMetadataInputSchema.parse(request.body);
      response.setHeader('Cache-Control', 'no-store');
      response.json({ project: await projects.upsert(requireRequestUser(request), projectId, input) });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/projects/:projectId', requireUser, async (request: AuthenticatedRequest, response, next) => {
    try {
      const projectId = projectIdSchema.parse(request.params.projectId);
      const deleted = await projects.delete(requireRequestUser(request), projectId);
      response.setHeader('Cache-Control', 'no-store');
      response.status(deleted ? 204 : 404).end();
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'NOT_FOUND', message: 'API route not found.' });
  });

  if (staticDir) {
    app.use(express.static(staticDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', config.isProduction ? 'public, max-age=3600' : 'no-cache');
        }
      },
    }));
    app.get('/{*path}', (_request, response) => {
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
      response.sendFile(path.join(staticDir, 'index.html'));
    });
  } else {
    app.get('/', (_request, response) => {
      response.setHeader('Cache-Control', 'no-store');
      response.json({
        service: 'seqcraft-api',
        status: 'online',
        mode: config.authEnabled ? 'connected' : 'guest',
        health: '/api/health',
        config: '/api/config',
      });
    });
  }

  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    void _next;
    if (error instanceof ZodError) {
      response.status(400).json({
        error: 'INVALID_INPUT',
        message: 'Request validation failed.',
        issues: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      });
      return;
    }
    if (error instanceof SyntaxError) {
      response.status(400).json({ error: 'INVALID_JSON', message: 'Request body must be valid JSON.' });
      return;
    }
    console.error('SeqCraft API request failed', error instanceof Error ? error.message : 'Unknown error');
    response.status(500).json({ error: 'INTERNAL_ERROR', message: 'The request could not be completed.' });
  };
  app.use(handleError);
  return app;
}

function requireRequestUser(request: AuthenticatedRequest) {
  const userId = request[requestUserId];
  if (!userId) throw new Error('Authenticated user context is missing.');
  return userId;
}
