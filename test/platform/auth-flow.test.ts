import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { SeqCraftAuth } from '../../server/auth';
import { buildAuthCallbackUrl, extractAuthRedirectToken } from '../../src/platform/client';
import { appendAuthTokenToRedirect, createApp } from '../../server/app';
import { loadConfig } from '../../server/config';
import { InMemoryProjectRepository } from '../../server/repositories/project-repository';

describe('cross-origin authentication flow', () => {
  it('uses hash routes so static hosting does not rewrite OAuth callbacks', () => {
    expect(buildAuthCallbackUrl('https://seqcraft.onrender.com/', '/dashboard'))
      .toBe('https://seqcraft.onrender.com/#/dashboard');
  });

  it('moves OAuth bearer handoffs into the URL fragment for trusted frontends', () => {
    const redirected = appendAuthTokenToRedirect(
      'https://seqcraft.onrender.com/#/dashboard',
      'signed.session.token',
      'https://seqcraft.onrender.com',
      new Set(['https://seqcraft.onrender.com']),
    );

    expect(redirected).toBe('https://seqcraft.onrender.com/#/dashboard?auth_token=signed.session.token');
  });

  it('never adds a session token to an untrusted redirect', () => {
    const redirected = appendAuthTokenToRedirect(
      'https://attacker.example/callback',
      'signed.session.token',
      'https://seqcraft.onrender.com',
      new Set(['https://seqcraft.onrender.com']),
    );

    expect(redirected).toBe('https://attacker.example/callback');
    expect(redirected).not.toContain('signed.session.token');
  });

  it('hands the Better Auth bearer token to the frontend regardless of response-header order', async () => {
    const config = loadConfig({
      NODE_ENV: 'test',
      APP_ORIGIN: 'https://seqcraft.onrender.com',
    });
    const auth = {
      handler: async () => new Response(null, {
        status: 302,
        headers: {
          location: 'https://seqcraft.onrender.com/#/dashboard',
          'set-auth-token': 'signed.session.token',
          'set-cookie': '__Secure-better-auth.session_token=signed.session.token; Path=/; HttpOnly; Secure',
        },
      }),
    } as unknown as SeqCraftAuth;
    const app = createApp({
      config,
      auth,
      projects: new InMemoryProjectRepository(),
    });

    const response = await request(app).get('/api/auth/callback/google').expect(302);

    expect(response.headers.location)
      .toBe('https://seqcraft.onrender.com/#/dashboard?auth_token=signed.session.token');
  });

  it('consumes fragment tokens without losing the dashboard route or other parameters', () => {
    expect(extractAuthRedirectToken('https://seqcraft.onrender.com/#/dashboard?auth_token=abc123&view=map'))
      .toEqual({ token: 'abc123', cleanedUrl: '/#/dashboard?view=map' });
  });

  it('supports and cleans the legacy query-string token handoff', () => {
    expect(extractAuthRedirectToken('https://seqcraft.onrender.com/?token=legacy#/dashboard'))
      .toEqual({ token: 'legacy', cleanedUrl: '/#/dashboard' });
  });
});
