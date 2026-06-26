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
      // Clear stale caches from older deploys on startup.
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const staleVersions = cacheNames.filter(
          (name) => !name.includes('v3.1.0'),
        );
        await Promise.all(staleVersions.map((name) => caches.delete(name)));
        if (staleVersions.length > 0) {
          logger.info('[App] Cleared stale caches:', staleVersions);
        }
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      logger.info('[SW] Registered:', registration.scope);

      // Toast helper — lazy import so SW path stays out of critical bundle.
      const promptReload = async (label = 'A new version is available.') => {
        try {
          const { toast } = await import('sonner');
          toast(label, {
            duration: Infinity,
            action: {
              label: 'Reload',
              onClick: () => window.location.reload(),
            },
          });
        } catch {
          /* sonner not yet mounted — next visit will pick up new chunks */
        }
      };

      // 1) Immediate update check.
      registration.update().catch(() => {});

      // 2) Periodic update poll — catches deploys that happen while a tab is open.
      const POLL_MS = 60_000;
      setInterval(() => {
        registration.update().catch(() => {});
      }, POLL_MS);

      // 3) Re-check whenever the tab becomes visible again.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });

      // 4) New worker found → prompt to reload as soon as it's installed.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.info('[SW] New version installed — prompting reload');
            // Activate the new SW immediately so the next reload serves new chunks.
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            promptReload('A newer version of the app is available.');
          }
        });
      });

      // 5) New SW broadcast — fired from the activate handler in sw.js.
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NEW_VERSION_ACTIVE') {
          logger.info('[SW] New version active:', event.data.version);
          promptReload('App updated — reload to get the latest version.');
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('[SW] Registration failed:', error);
      }
    }
  });
}
