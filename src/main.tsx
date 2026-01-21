import { createRoot } from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import App from './App.tsx';
import './index.css';

// Initialize monitoring and analytics before rendering
initSentry();
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker with aggressive update strategy
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // First, clear any stale caches on startup
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const staleVersions = cacheNames.filter(name => 
          !name.includes('v2.1.0') // Current version
        );
        await Promise.all(staleVersions.map(name => caches.delete(name)));
        if (staleVersions.length > 0) {
          console.log('[App] Cleared stale caches:', staleVersions);
        }
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Registered:', registration.scope);
      
      // Check for updates immediately
      registration.update();
      
      // Listen for new service worker
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available - activate immediately
              console.log('[SW] New version available, activating...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        }
      });
      
      // Reload when new SW takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          console.log('[SW] New version activated, reloading...');
          window.location.reload();
        }
      });
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}
