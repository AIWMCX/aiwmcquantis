/**
 * Static (no-JavaScript) bodies for the interactive demo pages.
 *
 * Crawlers that do not run JavaScript (Bing, OAI-SearchBot, PerplexityBot,
 * ClaudeBot, Google's first pass) read the HTML exactly as served. This module
 * writes that HTML for the four engine-driven demos and the sample memo from
 * the same fixtures and the same engine the React pages run on first load, so
 * every number matches what a visitor sees before touching a slider. The copy
 * is the pages' own copy.
 *
 * Not imported by the app. `scripts/generate-static-bodies.mjs` (plain Node,
 * no TS loader) reads the committed `scripts/static-bodies/demo-bodies.json`;
 * `src/__tests__/demo-static-bodies.test.ts` fails if that file drifts from
 * this module. Regenerate with:
 *   UPDATE_DEMO_BODIES=1 npx vitest run src/__tests__/demo-static-bodies.test.ts
 */
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';
import {
  HIRING_DEMO_FIXTURE,
  HIRING_LEVER_SEARCH,
  runHiringDemo,
  solveHiringRequiredToWork,
  type HiringDemoAssumptions,
  type HiringDemoResult,
} from '@/lib/demo/hiring-decision-demo';
import {
  FOUNDER_DEMO_FIXTURE,
  LEVER_SEARCH as FOUNDER_LEVER_SEARCH,
  runFounderDemo,
  solveRequiredToWork,
  type FounderDemoAssumptions,
} from '@/lib/demo/founder-decision-demo';
import {
  CONSULTANT_DEMO_FIXTURE,
  runConsultantDemo,
  type ConsultantDemoAssumptions,
} from '@/lib/demo/consultant-capacity-demo';

export interface StaticBody {
  h1: string;
  /** HTML fragment placed after the <h1>. */
  body: string;
}

const esc = (s: string | number) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const price = (code: 'founder_decision_review' | 'consultant_founding_pilot') =>
  ENGAGEMENT_OFFERS.find((o) => o.code === code)!.price;

const li = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;

// Number formats copied from each page so the static text reads identically.
const fmtUsd1 = (v: number) => { // HiringDecisionDemo
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};
const fmtUsd0 = (v: number) => { // FounderDecisionDemo, ConsultantCapacityDemo
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};
const usd = (v: number) => `${v < 0 ? '-' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`; // SampleDecisionMemo
const pct = (v: number) => `${Math.round(v * 100)}%`;
const n = (v: number) => v.toLocaleString('en-US');

// ---------------------------------------------------------------------------
// /demo/hiring-decision
// ---------------------------------------------------------------------------
type HiringLever = keyof HiringDemoAssumptions;
const HIRING_LABEL: Record<HiringLever, string> = {
  newClientsPerMonth: 'New clients won per month',
  hireMonthlyCost: 'Hire: fully loaded cost / month',
  collectionLagMonths: 'Clients pay after',
  grossMargin: 'Gross margin on client work',
};
const HIRING_FORMAT: Record<HiringLever, (v: number) => string> = {
  newClientsPerMonth: (v) => v.toFixed(1),
  hireMonthlyCost: (v) => `$${Math.round(v).toLocaleString('en-US')}`,
  collectionLagMonths: (v) => (Math.round(v) === 0 ? 'on delivery' : `${Math.round(v)} month${Math.round(v) === 1 ? '' : 's'}`),
  grossMargin: (v) => `${(v * 100).toFixed(0)}%`,
};

function hiringBody(): StaticBody {
  const f = HIRING_DEMO_FIXTURE;
  const a = f.base;
  const r = runHiringDemo(a, f);
  const required = solveHiringRequiredToWork(a, f);
  const currentCap = f.currentHoursMonthly / f.hoursPerClientMonthly;
  const firstFullMonth = r.months.find((m) => m.hireUtilization >= 0.999)?.month ?? null;

  const failures = r.holds ? '' : `<p>${[
    r.failures.includes('cash_floor') ? `Cash falls below the ${fmtUsd1(f.criteria.cashFloor)} floor in month ${r.floorBreachMonth}.` : '',
    r.failures.includes('payback_too_slow') ? `The hire takes ${r.paybackMonth} months to pay for itself, past the ${f.criteria.maxPaybackMonths}-month limit.` : '',
    r.failures.includes('no_payback') ? 'The hire does not pay for itself within 18 months.' : '',
  ].filter(Boolean).join(' ')} Under these assumptions the business is carrying payroll ahead of demand for too long.</p>`;

  const body = [
    '<p class="q-lede">Can the business carry another employee before demand catches up? Payroll starts on day one; revenue only follows as new clients fill the new hours. Every number below comes from the same deterministic engine behind every Quantis Decision Run.</p>',
    '<p><strong>Interactive demo · illustrative example, not your business.</strong></p>',
    `<p><strong>Illustrative example.</strong> A services business with ${f.startingClients} clients at $${n(f.avgMonthlyFee)}/month, already at capacity (${f.currentHoursMonthly} delivery hours = ${currentCap} clients), $${n(f.startingCash)} in the bank. The hire adds ${f.hireAddsHoursMonthly} client hours per month (room for ${f.hireAddsHoursMonthly / f.hoursPerClientMonthly} more clients) and costs $${n(f.hireOneTimeCost)} up front to recruit and onboard. Decision rule: cash stays above $${n(f.criteria.cashFloor)} and the hire pays for itself within ${f.criteria.maxPaybackMonths} months.</p>`,
    '<h2>The example assumptions</h2>',
    li((Object.keys(HIRING_LABEL) as HiringLever[]).map((k) => `${HIRING_LABEL[k]}: ${esc(HIRING_FORMAT[k](a[k]))}`)),
    `<p>To cover this hire alone at ${HIRING_FORMAT.grossMargin(a.grossMargin)} margin, the business needs ${fmtUsd1(r.revenueToCoverHire)} of new revenue per month (≈ ${r.clientsToCoverHire.toFixed(1)} clients): ${HIRING_FORMAT.hireMonthlyCost(a.hireMonthlyCost)} ÷ ${HIRING_FORMAT.grossMargin(a.grossMargin)}.</p>`,
    `<h2>${r.holds ? 'The business can carry this hire' : 'This hire is financially fragile'}</h2>`,
    li([
      `Hire pays for itself: ${r.paybackMonth ? `Month ${r.paybackMonth}` : 'Not in 18 mo'}`,
      `Lowest cash: ${fmtUsd1(r.lowestCash)} (month ${r.lowestCashMonth})`,
      `New hours fully used: ${firstFullMonth ? `Month ${firstFullMonth}` : 'Not in 18 mo'}`,
    ]),
    failures,
    `<p>Without the hire the team stays capped at ${currentCap} clients: new demand above that is not served.</p>`,
    '<h2>What must be true for this hire to work?</h2>',
    '<p>Holding every other assumption at its current value, here is the boundary for each one.</p>',
    li(required.map((x) => {
      const cmp = HIRING_LEVER_SEARCH[x.lever].worseWhen === 'higher' ? '≤' : '≥';
      const v = x.threshold === null ? 'Never holds' : x.unbounded ? 'Holds across full range' : `${cmp} ${HIRING_FORMAT[x.lever](x.threshold)}`;
      return `${HIRING_LABEL[x.lever]}: ${esc(v)}`;
    })),
    '<p>Quantis does not make the hiring decision for you. It shows the cash commitment, how long payroll runs ahead of demand, and which assumption the decision depends on most. Your own numbers will differ from this example.</p>',
    '<p><a href="/decision-review">Discuss my decision</a> · <a href="/demo/sample-decision-memo">Sample Decision Memo</a> · <a href="/demo/price-change">Price change decision</a></p>',
  ].join('');
  return { h1: 'Before the next hire, understand the cash commitment.', body };
}

// ---------------------------------------------------------------------------
// /demo/sample-decision-memo
// ---------------------------------------------------------------------------
// Same three scenarios as MEMO_SCENARIOS in src/pages/SampleDecisionMemo.tsx
// (the test checks they stay equal).
export function memoScenarios(): { key: string; label: string; a: HiringDemoAssumptions }[] {
  const f = HIRING_DEMO_FIXTURE;
  return [
    { key: 'downside', label: 'Downside', a: { ...f.base, newClientsPerMonth: 0.75, collectionLagMonths: 2, grossMargin: 0.5 } },
    { key: 'base', label: 'Base', a: f.base },
    { key: 'upside', label: 'Upside', a: { ...f.base, newClientsPerMonth: 2.5, grossMargin: 0.58 } },
  ];
}

function memoBody(): StaticBody {
  const f = HIRING_DEMO_FIXTURE;
  const lag = (v: number) => (Math.round(v) === 0 ? 'on delivery' : `${Math.round(v)} month${Math.round(v) === 1 ? '' : 's'} after the work`);
  const verdict = (r: HiringDemoResult) => {
    if (r.holds) return 'Holds';
    const parts: string[] = [];
    if (r.failures.includes('cash_floor')) parts.push(`cash falls below ${usd(f.criteria.cashFloor)} in month ${r.floorBreachMonth}`);
    if (r.failures.includes('no_payback')) parts.push('the hire never pays back within 18 months');
    if (r.failures.includes('payback_too_slow')) parts.push(`payback slower than ${f.criteria.maxPaybackMonths} months`);
    return `Fails: ${parts.join('; ')}`;
  };
  const LEVER_TEXT: Record<HiringLever, (t: number) => string> = {
    newClientsPerMonth: (t) => `New clients won per month stay at or above ${(Math.ceil(t * 100) / 100).toFixed(2)} (assumed ${f.base.newClientsPerMonth}).`,
    hireMonthlyCost: (t) => `The hire's fully loaded cost stays at or below ${usd(Math.floor(t / 10) * 10)} a month (assumed ${usd(f.base.hireMonthlyCost)}).`,
    collectionLagMonths: (t) => `Clients pay no later than ${lag(t)} (assumed ${lag(f.base.collectionLagMonths)}).${Math.round(t) === Math.round(f.base.collectionLagMonths) ? ' No slack: one month later breaks the rule.' : ''}`,
    grossMargin: (t) => `Gross margin on client work stays at or above ${(Math.ceil(t * 1000) / 10).toFixed(1)}% (assumed ${pct(f.base.grossMargin)}).`,
  };
  const results = memoScenarios().map((s) => ({ ...s, r: runHiringDemo(s.a) }));
  const required = solveHiringRequiredToWork(f.base);
  const base = results.find((s) => s.key === 'base')!.r;
  const downside = results.find((s) => s.key === 'downside')!.r;
  const fixedCosts = Object.values(f.fixedOpexMonthly).reduce((s, v) => s + v, 0);
  const review = price('founder_decision_review');

  const conclusion = base.holds && !downside.holds
    ? 'Conditional go. The hire meets the rule in the base and upside cases but not in the downside. Before committing, confirm the pipeline supports the new-client threshold above and that clients pay on current terms; review again after three months of actual wins.'
    : base.holds
      ? 'Go. The hire meets the rule in every scenario tested.'
      : 'Wait. The hire does not meet the rule in the base case.';

  const body = [
    `<p class="q-lede">This is the shape of what a $${review} Founder Decision Review delivers, worked through on a made-up services firm. The numbers are calculated by the same engine as the interactive hiring demo.</p>`,
    '<p><strong>Fictional example.</strong> The business, owner and figures are invented to show the memo format. It is not a forecast, a client case or advice.</p>',
    '<h2>1. The decision</h2>',
    `<p>Hire one more delivery person at ${usd(f.base.hireMonthlyCost)} a month fully loaded, plus ${usd(f.hireOneTimeCost)} to recruit and onboard, or wait. The owner's rule: cash never drops below ${usd(f.criteria.cashFloor)}, and the hire pays for itself within ${f.criteria.maxPaybackMonths} months.</p>`,
    '<h2>2. Facts, assumptions and unknowns</h2>',
    '<p>Facts (supplied by the owner):</p>',
    li([
      `${f.startingClients} clients at ${usd(f.avgMonthlyFee)} a month`,
      `Team delivers ${f.currentHoursMonthly} hours a month: full at ${f.currentHoursMonthly / f.hoursPerClientMonthly} clients`,
      `${usd(f.startingCash)} in the bank`,
      `Fixed costs ${usd(fixedCosts)} a month`,
    ]),
    '<p>Assumptions (estimates):</p>',
    li([
      `${f.base.newClientsPerMonth} new clients won per month`,
      `Clients pay ${lag(f.base.collectionLagMonths)}`,
      `Gross margin ${pct(f.base.grossMargin)}`,
      `The hire adds ${f.hireAddsHoursMonthly} client hours a month`,
      `${pct(f.churnMonthly)} of clients leave each month`,
    ]),
    '<p>Unknowns (not modeled):</p>',
    li([
      'How many weeks until the hire is fully productive',
      'Whether demand holds past the first six months',
      'Whether current clients would leave if service slips without the hire',
    ]),
    '<h2>3. Three scenarios</h2>',
    li(results.map(({ label, a, r }) => `${label}: ${a.newClientsPerMonth} new clients a month, paid ${lag(a.collectionLagMonths)}, ${pct(a.grossMargin)} margin. Payback ${r.paybackMonth === null ? 'not within 18 months' : `month ${r.paybackMonth}`}; lowest cash ${usd(r.lowestCash)} (month ${r.lowestCashMonth}). ${verdict(r)}.`)),
    '<h2>4. Cash, break-even and payback, reconciled</h2>',
    li([
      `To cover the hire alone, the firm needs ${usd(base.revenueToCoverHire)} more revenue a month (${usd(f.base.hireMonthlyCost)} ÷ ${pct(f.base.grossMargin)} margin), about ${base.clientsToCoverHire.toFixed(1)} new clients at ${usd(f.avgMonthlyFee)}.`,
      `In the base case the hire's cumulative cash effect turns positive in month ${base.paybackMonth ?? '—'}; the lowest balance is ${usd(base.lowestCash)} in month ${base.lowestCashMonth}.`,
      `In the downside, ${downside.floorBreachMonth ? `cash breaks the ${usd(f.criteria.cashFloor)} floor in month ${downside.floorBreachMonth}` : 'cash stays above the floor'}: slower wins and later payment tie up cash while payroll runs from day one.`,
    ]),
    '<h2>5. What would change the decision</h2>',
    "<p>Each line is the point where the base case stops meeting the owner's rule, holding everything else fixed.</p>",
    `<ol>${required.map((q) => `<li>${esc(q.threshold === null ? `No value of ${q.lever} makes the plan hold.` : q.unbounded ? `${LEVER_TEXT[q.lever](q.threshold)} The plan holds across the whole tested range.` : LEVER_TEXT[q.lever](q.threshold))}</li>`).join('')}<li>How fast the hire becomes productive. Not modeled here; in a real review it is asked at intake and tested as a scenario.</li></ol>`,
    '<h2>6. Conclusion</h2>',
    `<p>${conclusion}</p>`,
    '<p>Limitations: decision support based on supplied information and stated assumptions. Not accounting, tax, legal or investment advice, and not a guarantee of any outcome.</p>',
    `<p><a href="/decision-review">Get this for your decision: $${review}</a> · <a href="/demo/hiring-decision">Move the numbers yourself</a></p>`,
  ].join('');
  return { h1: 'Should the firm hire one more delivery person now?', body };
}

// ---------------------------------------------------------------------------
// /demo/founder-decision-review
// ---------------------------------------------------------------------------
type FounderLever = keyof FounderDemoAssumptions;
const FOUNDER_LABEL: Record<FounderLever, string> = {
  cac: 'Blended CAC',
  churnMonthly: 'Monthly churn',
  price: 'Price / month',
  grossMargin: 'Gross margin',
};
const FOUNDER_FORMAT: Record<FounderLever, (v: number) => string> = {
  cac: (v) => fmtUsd0(v),
  churnMonthly: (v) => `${(v * 100).toFixed(1)}%`,
  price: (v) => fmtUsd0(v),
  grossMargin: (v) => `${(v * 100).toFixed(0)}%`,
};

function founderBody(): StaticBody {
  const fx = FOUNDER_DEMO_FIXTURE;
  const a = fx.base;
  const r = runFounderDemo(a, fx);
  const required = solveRequiredToWork(a, fx);
  const failures = r.holds ? '' : `<p>${[
    r.failures.includes('cash_floor') ? `Cash falls below the ${fmtUsd0(fx.criteria.cashFloor)} floor in month ${r.floorBreachMonth}.` : '',
    r.failures.includes('payback_too_slow') ? `Payback takes ${r.paybackMonth} months — past the ${fx.criteria.maxPaybackMonths}-month limit.` : '',
    r.failures.includes('no_payback') ? 'The investment never pays back inside the 3-year window.' : '',
  ].filter(Boolean).join(' ')} The decision is no longer financially defensible under these assumptions.</p>`;

  const body = [
    '<p class="q-lede">This is the same deterministic engine behind every Quantis Decision Run — running on one fixed, fictional example. On the live page you move a slider and watch every dependent number recompute.</p>',
    `<p><strong>Illustrative Quantis demonstration.</strong> Values are a fixed example company, not a forecast for your business. Company: ${fx.startingCustomers} existing customers, $${n(fx.startingCash)} starting cash, considering $${n(fx.decision.totalSpend)} in additional acquisition spend over months ${fx.decision.startMonth}–${fx.decision.endMonth}.</p>`,
    '<h2>Break the model</h2>',
    '<p>The base case holds. Change one assumption and see what breaks it. The example assumptions:</p>',
    li((Object.keys(FOUNDER_LABEL) as FounderLever[]).map((k) => `${FOUNDER_LABEL[k]}: ${esc(FOUNDER_FORMAT[k](a[k]))}`)),
    `<h2>${r.holds ? 'Decision holds' : 'Decision is financially fragile'}</h2>`,
    li([
      `Payback: ${r.paybackMonth ? `Month ${r.paybackMonth}` : 'Never'}`,
      `Lowest cash: ${fmtUsd0(r.lowestCash)} (month ${r.lowestCashMonth})`,
    ]),
    failures,
    `<p>The chart on the live page shows cash with and without the investment, against a ${fmtUsd0(fx.criteria.cashFloor)} cash floor.</p>`,
    '<h2>What must be true for this to work?</h2>',
    '<p>Holding every other assumption at its current value, here is the boundary for each one.</p>',
    li(required.map((x) => {
      const cmp = FOUNDER_LEVER_SEARCH[x.lever].worseWhen === 'higher' ? '≤' : '≥';
      const v = x.threshold === null ? 'Never holds' : x.unbounded ? 'Holds across full range' : `${cmp} ${FOUNDER_FORMAT[x.lever](x.threshold)}`;
      return `${FOUNDER_LABEL[x.lever]}: ${esc(v)}`;
    })),
    '<p>Quantis does not make the decision for you. It shows what must be true for the decision to remain financially defensible.</p>',
    `<p><a href="/decision-review">See the $${price('founder_decision_review')} Founder Decision Review</a> · <a href="/demo/hiring-decision">Hiring decision</a> · <a href="/demo/sample-decision-memo">Sample Decision Memo</a></p>`,
  ].join('');
  return { h1: 'Should this company put another $120K into growth?', body };
}

// ---------------------------------------------------------------------------
// /demo/consultant-founding-pilot
// ---------------------------------------------------------------------------
type ConsultantLever = keyof ConsultantDemoAssumptions;
const CONSULTANT_LABEL: Record<ConsultantLever, string> = {
  claimedMonthlyDemand: 'Client claims new customers / month',
  hoursPerCustomer: 'Hours to serve one customer / month',
  availableHoursMonthly: 'Hours your team actually has / month',
};
const CONSULTANT_FORMAT: Record<ConsultantLever, (v: number) => string> = {
  claimedMonthlyDemand: (v) => `${v.toFixed(0)}/mo`,
  hoursPerCustomer: (v) => `${v.toFixed(0)} hrs`,
  availableHoursMonthly: (v) => `${v.toFixed(0)} hrs`,
};

function consultantBody(): StaticBody {
  const fx = CONSULTANT_DEMO_FIXTURE;
  const a = fx.base;
  const r = runConsultantDemo(a, fx);
  const m12 = r.months[11];
  const body = [
    '<p class="q-lede">Same deterministic engine behind every Quantis Decision Run, applied to a services business with a fixed delivery capacity. On the live page you move a slider and watch the gap between claimed demand and real capacity recompute.</p>',
    `<p><strong>Illustrative Quantis demonstration.</strong> Values are a fixed example services business, not a forecast for your business. Company: ${fx.startingCustomers} existing customers already consuming capacity, $${fx.avgTicketSize}/mo average ticket, ${Math.round(fx.grossMargin * 100)}% gross margin.</p>`,
    '<h2>Reconcile the claim</h2>',
    '<p>Change what the client claims, or what your team can actually deliver, and see where the story breaks. The example assumptions:</p>',
    li((Object.keys(CONSULTANT_LABEL) as ConsultantLever[]).map((k) => `${CONSULTANT_LABEL[k]}: ${esc(CONSULTANT_FORMAT[k](a[k]))}`)),
    `<h2>${r.capacityBinds ? 'The claim exceeds real capacity' : 'The claim fits inside real capacity'}</h2>`,
    li([
      `Max customers you can serve: ${r.maxServableCustomers.toFixed(0)}`,
      `Hours short / month: ${r.hoursGap.toFixed(0)}, including ${fx.startingCustomers} existing customers`,
    ]),
    r.capacityBinds && m12
      ? `<p>By month 12, the plan counts ${m12.demandCustomers.toFixed(0)} customers but the team can only serve ${m12.servedCustomers.toFixed(0)} — ${fmtUsd0(r.year1RevenueGap)} in revenue this plan is counting on but cannot actually deliver.</p>`
      : '',
    '<h2>Why this happens every time</h2>',
    "<p>A claimed growth number and your team's real delivery capacity are two different numbers, computed two different ways — nobody reconciles them until the customers show up. Quantis runs the reconciliation on the same engine as your P&amp;L, every month, before you sign the engagement.</p>",
    '<p>Quantis does not tell you to turn the client down. It shows exactly how much of the plan your current capacity cannot support.</p>',
    `<p><a href="/decision-review">See the $${price('consultant_founding_pilot')} Consultant Founding Pilot</a> · <a href="/consultant-pilot">Consultant Founding Pilot</a> · <a href="/consultants">Quantis for advisors</a></p>`,
  ].join('');
  return { h1: 'Your client says 30 new customers a month. Can you actually serve that many?', body };
}

/** Static bodies keyed by route. Deterministic: same input, same output. */
export function buildDemoStaticBodies(): Record<string, StaticBody> {
  return {
    '/demo/founder-decision-review': founderBody(),
    '/demo/hiring-decision': hiringBody(),
    '/demo/sample-decision-memo': memoBody(),
    '/demo/consultant-founding-pilot': consultantBody(),
  };
}
