
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const MarketingPage = lazy(() => import('./pages/MarketingPage').then(module => ({ default: module.MarketingPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(module => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const EditorPage = lazy(() => import('./pages/EditorPage').then(module => ({ default: module.EditorPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then(module => ({ default: module.DocsPage })));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppLoading />}>
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-muted)] grid place-items-center">
      <div className="font-mono text-[12px] tracking-[0.12em] uppercase">Loading SeqCraft…</div>
    </div>
  );
}
