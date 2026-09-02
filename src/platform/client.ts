import { createAuthClient } from 'better-auth/react';

const envApiUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_API_URL as string | undefined) : undefined;
export const API_BASE_URL = envApiUrl ? envApiUrl.replace(/\/+$/, '') : '';

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanEndpoint}` : cleanEndpoint;
}

export const authClient = createAuthClient({ 
  baseURL: API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '') 
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
