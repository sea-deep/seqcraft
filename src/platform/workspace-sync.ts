import { useEffect, useState } from 'react';
import type { SequenceDocument } from '../domain/document';
import type { WorkspaceView } from '../state/workspace-store';
import { useWorkspaceStore } from '../state/workspace-store';
import { useThemeStore } from '../state/theme-store';
import { consumeAuthRedirectToken, fetchSession, getApiUrl, loadToken, type SessionUser } from './client';

export type CloudSyncStatus = 'checking' | 'guest' | 'syncing' | 'synced' | 'error';

type ProjectMetadataInput = {
  name: string;
  documents: Array<{
    id: string;
    name: string;
    length: number;
    alphabet: 'dna' | 'rna' | 'mixed' | 'unknown';
    topology: 'linear' | 'circular';
    localStorageKey: string;
  }>;
  activeDocumentId: string | null;
  preferences: { theme: 'light' | 'dark' | 'system'; activeView: WorkspaceView };
};

export function toProjectMetadataInput(
  documents: SequenceDocument[],
  activeDocumentId: string | null,
  activeView: WorkspaceView,
): ProjectMetadataInput {
  return {
    name: 'My SeqCraft workspace',
    documents: documents.map(document => ({
      id: document.id,
      name: document.name,
      length: document.length,
      alphabet: document.alphabet.toLowerCase() as ProjectMetadataInput['documents'][number]['alphabet'],
      topology: document.topology,
      localStorageKey: document.storageMode === 'chunked'
        ? `opfs:${document.storageRef!.key}`
        : `indexeddb:doc-meta-${document.id}`,
    })),
    activeDocumentId,
    preferences: { theme: useThemeStore.getState().preference, activeView },
  };
}

export async function syncWorkspaceMetadata(input: ProjectMetadataInput, signal?: AbortSignal) {
  const token = loadToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(getApiUrl('/api/projects/default-workspace'), {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(input),
    signal,
  });
  if (!response.ok) throw new Error(`Metadata sync failed with status ${response.status}.`);
}

export function useWorkspaceCloudSync() {
  const [status, setStatus] = useState<CloudSyncStatus>('checking');
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let unsubscribe: (() => void) | undefined;
    let syncTimer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      // Capture the one-time OAuth redirect handoff before validating the session.
      // Both the legacy query-string form and the fragment form are accepted.
      consumeAuthRedirectToken();

      // fetchSession() uses GET /api/auth/get-session with Authorization: Bearer <token>.
      // This is the only reliable method for cross-origin session validation —
      // authClient.getSession() relies on cookies which are blocked cross-origin.
      const user = await fetchSession(controller.signal);
      if (!user || controller.signal.aborted) {
        setStatus('guest');
        return;
      }
      setUser(user);

      const scheduleSync = () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          const workspace = useWorkspaceStore.getState();
          setStatus('syncing');
          void syncWorkspaceMetadata(
            toProjectMetadataInput(workspace.documents, workspace.activeDocumentId, workspace.activeView),
            controller.signal,
          ).then(() => setStatus('synced')).catch(() => {
            if (!controller.signal.aborted) setStatus('error');
          });
        }, 700);
      };

      scheduleSync();
      unsubscribe = useWorkspaceStore.subscribe(scheduleSync);
    })().catch(() => {
      if (!controller.signal.aborted) setStatus('error');
    });

    return () => {
      controller.abort();
      if (syncTimer) clearTimeout(syncTimer);
      unsubscribe?.();
    };
  }, []);

  return { status, user, accountName: user?.name || user?.email || null };
}
