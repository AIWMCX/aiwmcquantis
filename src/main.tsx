import { createRoot } from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import App from './App.tsx';
import './index.css';

// Initialize monitoring and analytics before rendering
initSentry();
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker in production for offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}
