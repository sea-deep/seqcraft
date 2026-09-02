import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({ baseURL: window.location.origin });

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
    const response = await fetch('/api/config', { signal, credentials: 'include' });
    if (!response.ok) return guestConfig;
    return await response.json() as PlatformConfig;
  } catch {
    return guestConfig;
  }
}
