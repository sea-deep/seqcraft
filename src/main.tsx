import { initializeSeqCraftWebMCPRuntime } from './webmcp/initialize-webmcp';

// Suppress noisy upstream library warnings (Three.js, React Three Fiber, Firefox internals)
const originalWarn = console.warn;
console.warn = (...args) => {
  const msg = args.join(' ');
  if (
    msg.includes('THREE.Clock') ||
    msg.includes('mozPressure') ||
    msg.includes('mozInputSource') ||
    msg.includes('drawElementsInstanced') ||
    msg.includes('THREE.WebGLRenderer: Context Lost') ||
    msg.includes('Download the React DevTools')
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

const originalError = console.error;
console.error = (...args) => {
  const msg = args.join(' ');
  if (
    msg.includes('THREE.WebGLRenderer: Context Lost') ||
    msg.includes('may not load or link to file:///') ||
    msg.includes('WebGL context was lost')
  ) {
    return;
  }
  originalError.apply(console, args);
};

initializeSeqCraftWebMCPRuntime();

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
