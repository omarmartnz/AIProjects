import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Filter benign Vite websocket disconnection logs ONLY in development mode (AI Studio sandbox where HMR is disabled)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const origError = console.error;
  const origWarn = console.warn;
  const isViteLog = (...args: unknown[]) => {
    for (const item of args) {
      if (typeof item === 'string' && (item.includes('[vite]') || item.includes('websocket') || item.includes('WebSocket'))) {
        return true;
      }
      if (item && typeof item === 'object') {
        const str = String((item as Record<string, unknown>).message || (item as Record<string, unknown>).stack || '');
        if (str.includes('[vite]') || str.includes('websocket') || str.includes('WebSocket')) {
          return true;
        }
      }
    }
    return false;
  };

  console.error = (...args: unknown[]) => {
    if (isViteLog(...args)) return;
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    if (isViteLog(...args)) return;
    origWarn(...args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event && event.reason;
    const msg = (reason && (reason.message || reason.stack || String(reason))) || '';
    if (typeof msg === 'string' && (msg.includes('[vite]') || msg.includes('websocket') || msg.includes('WebSocket'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

// Register PWA service worker only in production.
// In development, remove existing registrations to avoid stale cache/HMR conflicts.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      // Benign in development / iframe preview environments
      console.debug('ServiceWorker registration skipped or unsupported in environment:', error);
    },
  });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  }).catch(() => {
    // ignore cleanup errors in restricted environments
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
