
# Mobile Signup Form Tests and Conversion Tracking

## Overview

This plan adds comprehensive mobile-specific tests for the simplified signup form and implements conversion tracking to measure the improvement from the recent friction-reducing changes.

---

## Part 1: Test Infrastructure Setup

### Create Vitest Configuration

Since `vitest.config.ts` doesn't exist, create one with proper test environment settings:

```typescript
// vitest.config.ts
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
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Create Test Setup File

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";

// Mock matchMedia for responsive tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: query.includes("max-width: 767px"), // Simulate mobile
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

---

## Part 2: Mobile Signup Form Tests

### New Test File: `src/__tests__/signup-mobile.test.tsx`

| Test Category | Test Cases |
|---------------|------------|
| **Mobile UI Elements** | Progress indicator visible on mobile, touch target sizes (48px+), Google button prominence |
| **Simplified Password** | 8-character minimum only, no complexity requirements, always-enabled submit button |
| **Form Validation** | Inline error display, password character counter, implicit terms consent |
| **Analytics Tracking** | Field focus events, form start events, conversion tracking |

### Key Test Cases

```text
Mobile-Specific UX Tests
├── Shows "Step 1 of 1" progress indicator on mobile viewports
├── Hides progress indicator on desktop viewports
├── Google login button uses primary variant with proper styling
├── Submit button is never disabled by password strength
├── Password hint shows remaining characters needed
├── Form fields have proper touch target sizes (48px+)
└── Implicit terms text displays instead of checkbox

Simplified Validation Tests
├── Accepts passwords with exactly 8 characters
├── Rejects passwords with 7 characters
├── Does not require uppercase letters
├── Does not require lowercase letters
├── Does not require numbers
├── Does not require special characters
└── Validation triggers on submit, not on blur

Conversion Tracking Tests
├── Tracks signup_started on first field focus
├── Tracks signup_field_focus for each field
├── Tracks signup_attempt on form submission
├── Tracks lead_converted_to_signup for returning leads
└── Tracks signup_error with reason on failure
```

---

## Part 3: Conversion Improvement Tracking

### Add New Analytics Events

| Event Name | Description | Properties |
|------------|-------------|------------|
| `mobile_signup_started` | User begins signup on mobile | `viewport_width`, `is_touch_device` |
| `mobile_signup_completed` | Successful signup on mobile | `time_to_complete`, `fields_refilled` |
| `password_validation_passed` | Password meets requirements | `password_length`, `validation_mode` |
| `simplified_form_conversion` | A/B test conversion tracking | `form_version`, `time_to_submit` |

### Update Analytics Module

Add mobile-specific tracking helpers:

```typescript
// New functions in src/lib/analytics.ts
export function trackMobileSignupStarted(viewportWidth: number): void;
export function trackMobileSignupCompleted(timeToCompleteMs: number): void;
export function trackSimplifiedFormConversion(formVersion: string): void;
```

---

## Part 4: A/B Test Integration

### Track Simplified vs Complex Form Performance

Since the form was just simplified, add tracking to compare:

| Metric | Old Form (Baseline) | New Form (Target) |
|--------|---------------------|-------------------|
| Conversion Rate | 18% | 35-40% |
| Password Abandonment | High | Low |
| Mobile Completion Time | Unknown | Track |

### Implementation

1. Add `form_version: 'simplified_v2'` to all signup events
2. Track time from first field focus to successful submission
3. Track password retry count (how many times user re-types)

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `vitest.config.ts` | Create | Test configuration with jsdom environment |
| `src/test/setup.ts` | Create | Test setup with matchMedia mock |
| `src/__tests__/signup-mobile.test.tsx` | Create | 25+ mobile-specific signup tests |
| `src/lib/analytics.ts` | Modify | Add mobile conversion tracking functions |
| `src/components/auth/SignupForm.tsx` | Modify | Add form version tracking, time tracking |
| `tsconfig.app.json` | Modify | Add vitest globals type |

---

## Test Structure

```text
src/__tests__/signup-mobile.test.tsx
├── describe('Mobile Signup Form')
│   ├── describe('Mobile UI Rendering')
│   │   ├── it('displays mobile progress indicator on small screens')
│   │   ├── it('hides mobile progress indicator on desktop')
│   │   ├── it('renders Google button with primary variant')
│   │   └── it('shows trust signals with proper sizing')
│   │
│   ├── describe('Simplified Password Validation')
│   │   ├── it('accepts 8+ character passwords without complexity')
│   │   ├── it('rejects passwords under 8 characters')
│   │   ├── it('shows character count hint while typing')
│   │   └── it('submit button is always enabled')
│   │
│   ├── describe('Touch-Friendly Interactions')
│   │   ├── it('input fields have minimum 48px touch targets')
│   │   ├── it('buttons have adequate touch spacing')
│   │   └── it('password toggle is easily tappable')
│   │
│   ├── describe('Form Submission Flow')
│   │   ├── it('submits successfully with valid data')
│   │   ├── it('displays inline errors for invalid fields')
│   │   └── it('shows success state after signup')
│   │
│   └── describe('Conversion Analytics')
│       ├── it('tracks signup_started on first interaction')
│       ├── it('tracks field focus events')
│       └── it('tracks form version for A/B comparison')
```

---

## Expected Outcomes

After implementing these tests and tracking:

1. **Test Coverage**: 25+ new tests specifically for mobile signup UX
2. **Regression Prevention**: Any future changes that break mobile signup will fail tests
3. **Conversion Visibility**: Clear metrics to compare before/after simplified form
4. **A/B Data**: Form version tracking enables future optimization decisions

---

## Technical Notes

- Tests use `@testing-library/react` for component rendering
- Mock `window.matchMedia` to simulate mobile/desktop viewports
- Mock `supabase.auth.signUp` to test form behavior without network calls
- Mock `trackEvent` to verify analytics calls without sending data
