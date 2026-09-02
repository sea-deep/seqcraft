import { createAuthClient } from 'better-auth/react';

const defaultRemoteBackend = 'https://seqcraft.up.railway.app';
const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined;

export const API_BASE_URL = envApiUrl 
  ? envApiUrl.replace(/\/+$/, '') 
  : (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com') ? defaultRemoteBackend : '');

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

export const authClient = createAuthClient({ 
  baseURL: API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
  fetchOptions: {
    auth: {
      type: 'Bearer',
      token: () => (typeof window !== 'undefined' ? (window.localStorage.getItem('better-auth_token') || '') : ''),
    },
    onResponse(context) {
      if (typeof window !== 'undefined') {
        const token = context.response.headers.get('set-auth-token');
        if (token) {
          window.localStorage.setItem('better-auth_token', token);
        }
      }
    },
  },
});

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
