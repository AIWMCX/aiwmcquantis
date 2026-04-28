import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // Strip noisy debug calls in production but KEEP console.error/warn so
    // Sentry + production debugging still surface real failures.
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info', 'console.trace'] : [],
    drop: mode === 'production' ? ['debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem - always needed
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI components - frequently used
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
          ],
          
          // Supabase - auth and database
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // React Query - data fetching
          'query-vendor': ['@tanstack/react-query'],
          
          // Note: recharts is NOT in manualChunks — it naturally code-splits
          // into the lazy-loaded AdminDashboard chunk where it's actually used
          
          // PDF generation - only used for exports
          'pdf': ['@react-pdf/renderer'],
          
          // Form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Date utilities
          'date-utils': ['date-fns'],
          
          // Animation and carousel
          'animation': ['embla-carousel-react'],
        },
      },
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 500,
    // Emit source maps in all builds so Lighthouse, Sentry, and DevTools can
    // map minified bundles back to original source. .map files are served as
    // separate requests and do not affect runtime performance.
    sourcemap: true,
    target: 'esnext',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096,
    // Faster builds - skip compressed size calculation
    reportCompressedSize: false,
    // Better handling of mixed ES/CJS modules
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    // Note: @react-pdf/renderer must be pre-bundled to fix base64-js module format issues
  },
}));
