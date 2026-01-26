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
          
          // Heavy visualization library - lazy loaded
          'charts': ['recharts'],
          
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
    sourcemap: mode === 'development',
    target: 'esnext',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Optimize asset inlining
    assetsInlineLimit: 4096,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    // Exclude heavy deps from pre-bundling for faster dev server start
    exclude: ['@react-pdf/renderer'],
  },
}));
