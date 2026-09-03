import { createAuthClient } from 'better-auth/react';

// ---------------------------------------------------------------------------
// API base URL resolution
// Priority: VITE_API_URL build env > onrender.com hostname detection > same-origin
// ---------------------------------------------------------------------------
const defaultRemoteBackend = 'https://seqcraft.up.railway.app';
const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined;

export const API_BASE_URL: string = envApiUrl
  ? envApiUrl.replace(/\/+$/, '')
  : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')
    ? defaultRemoteBackend
    : '');

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

// ---------------------------------------------------------------------------
// Token storage — single source of truth for the Better Auth Bearer token.
// localStorage  → survives browser restarts  (gives persistent login)
// sessionStorage → fallback for private/incognito tabs within the same session
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'seqcraft_auth_token';
const AUTH_TOKEN_PARAMS = ['auth_token', 'token'] as const;

export function loadToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem(TOKEN_KEY) ||
    window.sessionStorage.getItem(TOKEN_KEY) ||
    // Migrate the old key written by a previous version
    window.localStorage.getItem('better-auth_token') ||
    null
  );
}

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
  // Remove the old key name written by previous versions
  window.localStorage.removeItem('better-auth_token');
  window.sessionStorage.removeItem('better-auth_token');
}

export function buildAuthCallbackUrl(origin: string, route: '/auth' | '/dashboard'): string {
  return `${origin.replace(/\/+$/, '')}/#${route}`;
}

export function extractAuthRedirectToken(url: string): { token: string | null; cleanedUrl: string } {
  const parsed = new URL(url);
  let token: string | null = null;

  for (const key of AUTH_TOKEN_PARAMS) {
    token ??= parsed.searchParams.get(key);
    parsed.searchParams.delete(key);
  }

  const rawHash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;
  const separatorIndex = rawHash.indexOf('?');
  if (separatorIndex >= 0) {
    const route = rawHash.slice(0, separatorIndex);
    const hashParams = new URLSearchParams(rawHash.slice(separatorIndex + 1));
    for (const key of AUTH_TOKEN_PARAMS) {
      token ??= hashParams.get(key);
      hashParams.delete(key);
    }
    const remainingHashParams = hashParams.toString();
    parsed.hash = `${route}${remainingHashParams ? `?${remainingHashParams}` : ''}`;
  }

  return {
    token,
    cleanedUrl: `${parsed.pathname}${parsed.search}${parsed.hash}`,
  };
}

export function consumeAuthRedirectToken(): string | null {
  if (typeof window === 'undefined') return null;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const { token, cleanedUrl } = extractAuthRedirectToken(window.location.href);
  if (token) {
    // Guard against session fixation: only accept token if an OAuth flow was legitimately initiated
    const isPending = window.sessionStorage.getItem('seqcraft_oauth_pending');
    if (isPending) {
      saveToken(token);
      window.sessionStorage.removeItem('seqcraft_oauth_pending');
    }
  }
  if (cleanedUrl !== currentUrl) {
    window.history.replaceState(window.history.state, '', cleanedUrl);
  }
  return token;
}

// ---------------------------------------------------------------------------
// authClient — used for sign-in, sign-up, sign-out, and Google OAuth.
// The Bearer token is injected on every request via the `token` callback so
// the server can identify the session without relying on cross-origin cookies.
// ---------------------------------------------------------------------------
export const authClient = createAuthClient({
  baseURL: API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  fetchOptions: {
    credentials: 'include',
    auth: {
      type: 'Bearer',
      token: () => loadToken() ?? undefined,
    },
    onResponse(context) {
      // Better Auth sets "set-auth-token" on sign-in responses.
      // Persist it immediately so subsequent requests include it.
      if (typeof window !== 'undefined') {
        const token = context.response.headers.get('set-auth-token');
        if (token) {
          saveToken(token);
        }
      }
    },
  },
});

// ---------------------------------------------------------------------------
// fetchSession — validates the session cross-origin.
//
// Sends the Bearer token if present, and also passes credentials: 'include'
// so that cross-site cookies can serve as a fallback. If a session token
// is returned in the payload, it is persisted to storage immediately.
// ---------------------------------------------------------------------------
export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

export async function fetchSession(signal?: AbortSignal): Promise<SessionUser | null> {
  const token = loadToken();
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const response = await fetch(getApiUrl('/api/auth/get-session'), {
      headers,
      credentials: 'include',
      signal,
    });
    if (!response.ok) {
      if (response.status === 401 && token) clearToken();
      return null;
    }
    const data = await response.json() as { user?: SessionUser; session?: { token?: string } } | null;
    if (data?.session?.token) {
      saveToken(data.session.token);
    }
    return data?.user ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------
export type PlatformConfig = {
  auth: { enabled: boolean; googleEnabled: boolean };
  privacy: { sequenceStorage: 'browser-only'; cloudStoresSequence: false };
  limits: { requestBytes: number; projectsPerResponse: number; documentsPerProject: number };
};

const guestConfig: PlatformConfig = {
  auth: { enabled: false, googleEnabled: false },
  privacy: { sequenceStorage: 'browser-only', cloudStoresSequence: false },
  limits: { requestBytes: 32_768, projectsPerResponse: 250, documentsPerProject: 250 },
};

export async function loadPlatformConfig(signal?: AbortSignal): Promise<PlatformConfig> {
  try {
    const response = await fetch(getApiUrl('/api/config'), { signal, credentials: 'include' });
    if (!response.ok) return guestConfig;
    return await response.json() as PlatformConfig;
  } catch {
    return guestConfig;
  }
}
