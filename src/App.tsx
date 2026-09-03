
import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SeqCraftLogo } from './components/ui/SeqCraftLogo';
import { initializeDocumentPersistence, hydrateWorkspaceFromStorage } from './storage/document-persistence';
import { consumeAuthRedirectToken } from './platform/client';

function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('seqcraft-chunk-reload')
      : null;
    try {
      const component = await factory();
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('seqcraft-chunk-reload');
      }
      return component;
    } catch (error: any) {
      const isDynamicImportError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.name === 'TypeError';

      if (isDynamicImportError && !pageHasBeenForceRefreshed && typeof window !== 'undefined') {
        window.sessionStorage.setItem('seqcraft-chunk-reload', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}

const MarketingPage = lazyWithRetry(() => import('./pages/MarketingPage').then(module => ({ default: module.MarketingPage })));
const AuthPage = lazyWithRetry(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const EditorPage = lazyWithRetry(() => import('./pages/EditorPage').then(module => ({ default: module.EditorPage })));
const DocsPage = lazyWithRetry(() => import('./pages/DocsPage').then(module => ({ default: module.DocsPage })));

export default function App() {
  useEffect(() => {
    consumeAuthRedirectToken();
    const stop = initializeDocumentPersistence();
    void hydrateWorkspaceFromStorage();
    return stop;
  }, []);

  return (
    <HashRouter>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-muted)] grid place-items-center">
      <div className="flex flex-col items-center gap-4">
        <SeqCraftLogo size={32} />
        <div className="font-mono text-[12px] tracking-[0.12em] uppercase">Loading SeqCraft…</div>
      </div>
    </div>
  );
}
