/**
 * Contextual Upgrade Trigger Matrix
 *
 * Maps user behavior signals to upgrade prompt copy + timing.
 * Derived from the Quantis Strategic Conversion Playbook (T1–T7).
 *
 * Triggers are evaluated against the user's activation event counts.
 * Each trigger has:
 *  - `id` for dedupe (we don't show the same trigger twice in 24h)
 *  - `condition(events)` — the rule
 *  - `headline` and `body` — copy
 *  - `cta` — primary button label
 *  - `priority` — higher wins when multiple triggers fire (1–10)
 *  - `delayMs` — how long to wait after the triggering event before showing
 */

import type { ActivationEventType } from './activationTracking';

export interface UpgradeTrigger {
  id: string;
  priority: number;
  delayMs: number;
  headline: string;
  body: string;
  cta: string;
  condition: (events: Record<string, number>, isPlus: boolean) => boolean;
}

const c = (events: Record<string, number>, key: ActivationEventType) =>
  events[key] ?? 0;

export const TRIGGERS: UpgradeTrigger[] = [
  // T1 — first PDF export → highest signal of intent
  {
    id: 'T1_first_pdf_export',
    priority: 9,
    delayMs: 1500,
    headline: 'Loved the report? Lock in the full pack.',
    body: 'Plus unlocks unlimited PDFs, Monte Carlo, the full P&L, and investor-ready exports — for $0.56/day.',
    cta: 'Start 14-days free trial',
    condition: (e, isPlus) =>
      !isPlus && c(e, 'pdf_exported') >= 1 && c(e, 'pdf_exported') <= 1,
  },

  // T2 — 3 calculations completed → committed user
  {
    id: 'T2_three_analyses',
    priority: 8,
    delayMs: 2000,
    headline: 'You\'re on a roll. Stop hitting limits.',
    body: 'You\'ve run 3 analyses — most founders need 5–10 before they\'re confident. Plus removes the ceiling.',
    cta: 'Upgrade to unlimited',
    condition: (e, isPlus) => !isPlus && c(e, 'calculation_completed') >= 3,
  },

  // T3 — return visit + at least one analysis → habit forming
  {
    id: 'T3_returning_user',
    priority: 6,
    delayMs: 3000,
    headline: 'You came back. That\'s the moment.',
    body: 'Plus members run 4× more scenarios — because they don\'t have to ration analyses.',
    cta: 'See Plus benefits',
    condition: (e, isPlus) =>
      !isPlus && c(e, 'return_visit') >= 1 && c(e, 'calculation_completed') >= 1,
  },

  // T4 — scenario edited → power-user behavior
  {
    id: 'T4_scenario_iteration',
    priority: 7,
    delayMs: 2500,
    headline: 'Stress-testing assumptions? Plus is built for that.',
    body: 'Inline assumption editor + Monte Carlo gives you 10,000 scenarios per analysis — not just 3.',
    cta: 'Unlock Monte Carlo',
    condition: (e, isPlus) => !isPlus && c(e, 'scenario_edited') >= 2,
  },

  // T5 — invoice attempt as free user → blocked feature
  {
    id: 'T5_invoice_intent',
    priority: 10,
    delayMs: 0,
    headline: 'Invoices are a Plus feature.',
    body: 'Generate branded invoices, track payments, and link them to your business analysis — start your trial.',
    cta: 'Start free trial',
    condition: (e, isPlus) => !isPlus && c(e, 'invoice_created') >= 1,
  },

  // T6 — doc generation attempted → high-value feature usage
  {
    id: 'T6_doc_generation',
    priority: 8,
    delayMs: 1500,
    headline: 'Documents are unlimited on Plus.',
    body: 'Pre-mortems, pitch decks, financial models — all included. No per-doc fees.',
    cta: 'Get unlimited docs',
    condition: (e, isPlus) => !isPlus && c(e, 'doc_generated') >= 1,
  },

  // T7 — high engagement, no conversion → champion who hasn't converted
  {
    id: 'T7_champion_holdout',
    priority: 5,
    delayMs: 4000,
    headline: 'You\'re using Quantis like a Plus member.',
    body: 'Champions like you save 8+ hours per week vs. spreadsheets. Make it official — first 14 days free.',
    cta: 'Upgrade to Plus',
    condition: (e, isPlus) => {
      if (isPlus) return false;
      const total =
        c(e, 'calculation_completed') +
        c(e, 'pdf_exported') * 2 +
        c(e, 'return_visit') +
        c(e, 'scenario_edited');
      return total >= 8;
    },
  },
];

/**
 * Choose the best trigger to show right now.
 * Returns null if none apply or all have been shown in the dedupe window.
 */
export function selectTrigger(
  events: Record<string, number>,
  isPlus: boolean,
): UpgradeTrigger | null {
  if (isPlus || typeof window === 'undefined') return null;

  const candidates = TRIGGERS.filter((t) => t.condition(events, isPlus))
    .filter((t) => !wasRecentlyShown(t.id))
    .sort((a, b) => b.priority - a.priority);

  return candidates[0] ?? null;
}

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function wasRecentlyShown(id: string): boolean {
  try {
    const raw = localStorage.getItem(`quantis_trigger_${id}`);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < DEDUPE_WINDOW_MS;
  } catch {
    return false;
  }
}

export function markTriggerShown(id: string): void {
  try {
    localStorage.setItem(`quantis_trigger_${id}`, String(Date.now()));
  } catch {
    // ignore quota errors
  }
}

/**
 * Permanently dismiss a trigger (user clicked "Not now" or X).
 * Sets a far-future timestamp so dedupe blocks it for ~7 days.
 */
export function dismissTrigger(id: string): void {
  try {
    const sevenDays = Date.now() + 6 * 24 * 60 * 60 * 1000;
    localStorage.setItem(`quantis_trigger_${id}`, String(sevenDays));
  } catch {
    // ignore
  }
}
