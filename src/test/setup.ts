import "@testing-library/jest-dom";

// Golden-case tests (Handbook §19 item 8) import the real edge-function
// engine directly from supabase/functions/analyze-business/*.ts. Those
// files reference the Deno global (e.g. _shared/logger.ts reads
// Deno.env.get(...) eagerly at module load for Sentry config), which
// doesn't exist under Node/Vitest. This is a test-environment-only shim —
// it never ships to production, where the real Deno runtime provides it.
if (typeof (globalThis as Record<string, unknown>).Deno === "undefined") {
  (globalThis as Record<string, unknown>).Deno = {
    env: { get: () => undefined },
  };
}

// Mock matchMedia for responsive tests
let mockMobile = false;

export function setMockMobile(isMobile: boolean) {
  mockMobile = isMobile;
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: mockMobile && query.includes("max-width"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = MockIntersectionObserver as any;
