import React from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import { initClarity } from './lib/clarity';
import { scheduleAnonymousResultsSweep } from './lib/anonResultsCleanup';
import './i18n'; // Side-effect import: initializes i18next before any component mounts
import App from './App.tsx';
import { logger } from '@/lib/logger';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './index.css';

// Initialize monitoring and analytics before rendering
initSentry();
initAnalytics();
initClarity(); // Session replay + heatmaps. No-op unless VITE_CLARITY_PROJECT_ID is set.
scheduleAnonymousResultsSweep(); // Idle-time TTL + cap eviction for anon /r/:id cache.

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Register service worker with aggressive update strategy.
// PREVIEW GUARD: skip registration inside Lovable iframe / preview hosts to avoid
// stale-cache pollution that breaks live editing. Production hosts only.
const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
const isPreviewHost =
  window.location.hostname.includes('id-preview--') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('lovable.app');

if ('serviceWorker' in navigator && (isInIframe || isPreviewHost)) {
  // Clean up any previously-registered SW in preview environments.
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
}

if ('serviceWorker' in navigator && !isInIframe && !isPreviewHost) {
  window.addEventListener('load', async () => {
    try {
      // First, clear any stale caches on startup
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const staleVersions = cacheNames.filter(name => 
          !name.includes('v3.0.0') // Current version
        );
        await Promise.all(staleVersions.map(name => caches.delete(name)));
        if (staleVersions.length > 0) {
          logger.info('[App] Cleared stale caches:', staleVersions);
        }
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      logger.info('[SW] Registered:', registration.scope);
      
      // Check for updates immediately
      registration.update().catch(() => {
        // Silently ignore update errors - they're non-critical
      });
      
      // Listen for new service worker — notify only, no auto-reload
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              logger.info('[SW] New version available. Will activate on next visit.');
            }
          });
        }
      });
    } catch (error) {
      // Silently handle SW registration failures - they're non-critical
      // This prevents console errors from affecting Best Practices score
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[SW] Registration failed:', error);
      }
    }
  });
}
