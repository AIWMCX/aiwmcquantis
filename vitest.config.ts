import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // CI has no .env file; tests that import the supabase client only need
    // the client to construct (network calls are mocked), so provide inert
    // placeholder values. Local .env still overrides where present.
    env: {
      VITE_SUPABASE_URL: "https://test-placeholder.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_placeholder",
      VITE_SUPABASE_PROJECT_ID: "test-placeholder",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Deno edge functions (supabase/functions/**) import decimal.js via an
      // esm.sh URL specifier, which Node/Vitest can't resolve on its own.
      // Golden-case tests (Handbook §19 item 8) import the real engine
      // directly from those files, so redirect the URL to the same
      // decimal.js already in package.json — same library, same version
      // family, resolved the way Node actually resolves packages.
      "https://esm.sh/decimal.js@10.4.3": "decimal.js",
      // Since 2026-10-30 they use an npm: specifier instead (esm.sh kept
      // returning 520 to Supabase's bundler and blocked deploys).
      "npm:decimal.js@10.4.3": "decimal.js",
    },
  },
});
