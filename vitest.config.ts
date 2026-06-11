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
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
