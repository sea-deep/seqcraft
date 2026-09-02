import { initializeSeqCraftWebMCPRuntime } from './webmcp/initialize-webmcp';

// Filter dev-time extension noise in development
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const msg = args.join(' ');
    if (msg.includes('Download the React DevTools') || msg.includes('THREE.Clock')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

initializeSeqCraftWebMCPRuntime();

// Auto-reload if a stale chunk hash is requested after a new deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', () => {
    window.location.reload();
  });
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
)
