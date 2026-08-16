// Standalone Vitest config to run investment-verdict.test.ts in isolation.
//
// The repo's root vitest.config.ts only includes src/**/*.test.ts (this
// directory is Deno edge-function code, outside that glob, and there is no
// Deno test harness wired up for it -- see investment-verdict.test.ts's
// header). This file exists solely so deriveInvestmentVerdict()'s pure-function
// test matrix is actually runnable, without touching the shared root config
// or its src/ test suite.
//
// Run: bunx vitest run --config supabase/functions/analyze-business/vitest.investment-verdict.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["supabase/functions/analyze-business/investment-verdict.test.ts"],
  },
});
