// Bootstrap Supabase environment variables with resilient fallbacks
// These are PUBLIC (anon/publishable) keys - safe for client-side code
// This file must be imported BEFORE any Supabase client usage

const FALLBACK_URL = 'https://gafxacjhkqsdzwwzhbor.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZnhhY2poa3FzZHp3d3poYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjUwMTUsImV4cCI6MjA3OTg0MTAxNX0.d7lRtUFSzVdeq4oiX2JC_iogXeP4J5G_WXkT3tgVTew';
const FALLBACK_PROJECT_ID = 'gafxacjhkqsdzwwzhbor';

if (!import.meta.env.VITE_SUPABASE_URL) {
  (import.meta.env as Record<string, string>).VITE_SUPABASE_URL = FALLBACK_URL;
}
if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  (import.meta.env as Record<string, string>).VITE_SUPABASE_PUBLISHABLE_KEY = FALLBACK_KEY;
}
if (!import.meta.env.VITE_SUPABASE_PROJECT_ID) {
  (import.meta.env as Record<string, string>).VITE_SUPABASE_PROJECT_ID = FALLBACK_PROJECT_ID;
}

export {};
