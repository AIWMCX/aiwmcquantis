// CRITICAL: Bootstrap env vars before ANY Supabase imports
import './integrations/supabase/bootstrap-env';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import App from './App';
import './index.css';

// Initialize monitoring and analytics before rendering
initSentry();
initAnalytics();

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Register service worker with aggressive update strategy
if ('serviceWorker' in navigator) {
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
          console.log('[App] Cleared stale caches:', staleVersions);
        }
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registered:', registration.scope);
      
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
              console.log('[SW] New version available. Will activate on next visit.');
            }
          });
        }
      });
    } catch (error) {
      // Silently handle SW registration failures - they're non-critical
      // This prevents console errors from affecting Best Practices score
      if (process.env.NODE_ENV === 'development') {
        console.warn('[SW] Registration failed:', error);
      }
    }
  });
}
