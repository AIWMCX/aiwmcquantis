// Supabase environment configuration with resilient fallbacks
// These are PUBLIC (anon) keys - safe to include in client-side code

export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://gafxacjhkqsdzwwzhbor.supabase.co';

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZnhhY2poa3FzZHp3d3poYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjUwMTUsImV4cCI6MjA3OTg0MTAxNX0.d7lRtUFSzVdeq4oiX2JC_iogXeP4J5G_WXkT3tgVTew';

export const SUPABASE_PROJECT_ID = 
  import.meta.env.VITE_SUPABASE_PROJECT_ID || 
  'gafxacjhkqsdzwwzhbor';
