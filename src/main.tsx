import { createRoot } from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { initAnalytics } from './lib/analytics';
import App from './App.tsx';
import './index.css';

// Initialize monitoring and analytics before rendering
initSentry();
initAnalytics();

createRoot(document.getElementById("root")!).render(<App />);
