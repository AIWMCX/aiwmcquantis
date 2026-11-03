import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isTradesBusiness,
  TRADE_TERMS,
  TRADES_INDUSTRY_ID,
} from '../../supabase/functions/analyze-business/industry-classifier-core';
import { detectSectorFromIdea } from '../../supabase/functions/analyze-business/benchmark-keywords';
import { detectSubIndustry } from '../../supabase/functions/analyze-business/sub-industry-detection';

// 2026-11-03, production: "HVAC repair company in Phoenix, AZ, 3 technicians"
// showed "Modeled as: General Business" on two runs. No edge industry list had
// a trade, and the database keywords map 'contractor' to Freelance Services.

const HVAC = 'HVAC repair company in Phoenix, AZ, 3 technicians';
const INDEX = readFileSync('supabase/functions/analyze-business/index.ts', 'utf8');

describe('trades are classified by rule, the same way every time', () => {
  it('the production HVAC idea is a trade, on every call', () => {
    const results = Array.from({ length: 25 }, () => isTradesBusiness(HVAC));
    expect(new Set(results)).toEqual(new Set([true]));
  });

  it.each([
    'Plumbing service in Austin, 2 vans',
    'Licensed plumber in Denver',
    'Residential electrician business with 4 electricians',
    'Roofing company in Dallas',
    'Handyman services for apartment landlords',
    'General contractor for kitchen remodels',
    'Heating and cooling installs in Ohio',
    'Air conditioning repair shop',
  ])('%s → trades', (idea) => {
    expect(isTradesBusiness(idea)).toBe(true);
  });

  it.each([
    'Scheduling software for HVAC contractors',
    'A marketplace app connecting homeowners with plumbers',
    'Independent contractor doing web design for startups',
    'Freelance contractor for bookkeeping',
    'Coffee shop in Portland',
    'Mobile dog grooming van',
    '',
  ])('%s → not trades', (idea) => {
    expect(isTradesBusiness(idea)).toBe(false);
  });
});

describe('index.ts wiring', () => {
  it('the rule runs before the database keywords and returns the trades benchmark', () => {
    const rule = INDEX.indexOf('if (isTradesBusiness(businessIdea)) {');
    const db = INDEX.indexOf('// ===== PHASE 1: Search database benchmarks =====');
    const userSelected = INDEX.indexOf('if (selectedIndustryId && selectedIndustryId !== \'auto\') {');
    expect(rule).toBeGreaterThan(userSelected); // a manual industry choice still wins
    expect(db).toBeGreaterThan(rule);
    expect(INDEX).toMatch(/id: 'trades',\s+name: 'Trades \/ Contractor',/);
    expect(TRADES_INDUSTRY_ID).toBe('trades');
  });

  it('the trades numbers are exactly General Business\'s (economics come from the V2 contractor rows)', () => {
    const block = (id: string) => {
      const start = INDEX.indexOf(`id: '${id}',`);
      const end = INDEX.indexOf('keywords:', start);
      return INDEX.slice(start, end).split(/\r?\n/).filter((l) => /^\s+[a-z_]+: -?\d/.test(l)).map((l) => l.trim());
    };
    const trades = block('trades');
    expect(trades.length).toBeGreaterThan(10);
    expect(trades).toEqual(block('general'));
  });
});

describe('every trade word reaches the contractor peer data', () => {
  it.each([
    ['HVAC repair company', 'Specialty Contractor (HVAC/Elec/Plumb)'],
    ['Licensed plumber in Denver', 'Specialty Contractor (HVAC/Elec/Plumb)'],
    ['Residential electrician business', 'Specialty Contractor (HVAC/Elec/Plumb)'],
    ['Air conditioning repair shop', 'Specialty Contractor (HVAC/Elec/Plumb)'],
    ['Roofing company in Dallas', 'General Contractor (Residential)'],
    ['Handyman services', 'General Contractor (Residential)'],
  ])('%s → %s', (idea, level2) => {
    const s = detectSectorFromIdea(idea);
    expect(s.matched).toBe(true);
    expect(s.level1).toBe('Construction');
    expect(s.level2).toBe(level2);
  });

  it.each([...TRADE_TERMS])('trade term "%s" maps to a Construction peer row', (term) => {
    const s = detectSectorFromIdea(`${term} business`);
    expect(s.matched).toBe(true);
    expect(s.level1).toBe('Construction');
  });

  it('trade terms are a fixed list (keywords of the trades entry)', () => {
    expect(TRADE_TERMS).toContain('hvac');
    expect(INDEX).toMatch(/keywords: \[\.\.\.TRADE_TERMS\],/);
  });

  it('no unrelated sub-industry attaches to the trades id', () => {
    expect(detectSubIndustry(HVAC, 'trades').confidence).toBeLessThanOrEqual(50);
  });
});
