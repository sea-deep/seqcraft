import { useEffect, useState } from 'react';
import type { SequenceDocument } from '../domain/document';
import type { WorkspaceView } from '../state/workspace-store';
import { useWorkspaceStore } from '../state/workspace-store';
import { useThemeStore } from '../state/theme-store';
import { authClient, getApiUrl, loadPlatformConfig } from './client';

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
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('better-auth_token') : null;
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
  const [accountName, setAccountName] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let unsubscribe: (() => void) | undefined;
    let syncTimer: ReturnType<typeof setTimeout> | undefined;

    void (async () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        if (urlToken) {
          window.localStorage.setItem('better-auth_token', urlToken);
          params.delete('token');
          const newSearch = params.toString() ? `?${params.toString()}` : '';
          window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`);
        }
      }

      const platform = await loadPlatformConfig(controller.signal);
      if (!platform.auth.enabled || controller.signal.aborted) {
        setStatus('guest');
        return;
      }
      const session = await authClient.getSession();
      if (!session.data?.user || controller.signal.aborted) {
        setStatus('guest');
        return;
      }
      setAccountName(session.data.user.name || session.data.user.email);

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

  return { status, accountName };
}
