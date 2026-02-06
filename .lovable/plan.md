

# Emoji Removal Plan - AIWMC Quantis™ Docs Studio
## Professional Document Templates Cleanup

---

## Issue Summary

Multiple document template forms contain emojis in their HTML preview output. This is unprofessional for business documents and needs to be corrected.

---

## Complete Emoji Inventory

After analyzing all 10 template files, here are all emojis that must be removed:

### 1. BusinessPlanForm.tsx (Lines ~142-280)

| Location (Line) | Current | Replace With |
|-----------------|---------|--------------|
| ~143 | `📋 Executive Summary` | `Executive Summary` |
| ~151 | `🎯 Problem & Solution` | `Problem & Solution` |
| ~171 | `📊 Market Analysis` | `Market Analysis` |
| ~196 | `💼 Business Model` | `Business Model` |
| ~214 | `💰 Financial Projections` | `Financial Projections` |
| ~253 | `👥 Team` | `Team` |
| ~263 | `🎯 Risks & Milestones` | `Risks & Milestones` |
| ~267 | `⚠️ Key Risks` | `Key Risks` |
| ~271 | `🎯 Key Milestones` | `Key Milestones` |
| ~280 | `💵 Funding Request` | `Funding Request` |

### 2. OnePagePlanForm.tsx (Lines ~130-204)

| Location (Line) | Current | Replace With |
|-----------------|---------|--------------|
| ~130 | `🎯 VISION` | `VISION` |
| ~135 | `🚀 MISSION` | `MISSION` |
| ~141 | `⚠️ PROBLEM` | `PROBLEM` |
| ~146 | `✅ SOLUTION` | `SOLUTION` |
| ~152 | `👥 TARGET CUSTOMER` | `TARGET CUSTOMER` |
| ~159 | `💎 VALUE PROPOSITION` | `VALUE PROPOSITION` |
| ~166 | `💰 REVENUE MODEL` | `REVENUE MODEL` |
| ~175 | `📊 KEY METRICS` | `KEY METRICS` |
| ~194 | `👤 TEAM` | `TEAM` |
| ~201 | `🎯 GOALS` | `GOALS` |

### 3. FinancialForecastForm.tsx (Lines ~135-265)

| Location (Line) | Current | Replace With |
|-----------------|---------|--------------|
| ~135 | `📊 Current State` | `Current State` |
| ~158 | `📈 Revenue Projections (3 Scenarios)` | `Revenue Projections (3 Scenarios)` |
| ~171 | `🔴 Pessimistic` | `Pessimistic` |
| ~178 | `🔵 Base Case` | `Base Case` |
| ~185 | `🟢 Optimistic` | `Optimistic` |
| ~197 | `🔍 Key Assumptions` | `Key Assumptions` |
| ~232 | `💰 Cost Structure` | `Cost Structure` |
| ~251 | `🎯 Target Metrics` | `Target Metrics` |

### 4. MarketAnalysisForm.tsx (Lines ~141-270)

| Location (Line) | Current | Replace With |
|-----------------|---------|--------------|
| ~142 | `📊 Market Overview` | `Market Overview` |
| ~155 | `💰 Market Size` | `Market Size` |
| ~177 | `📈` (growth indicator) | Remove entirely or use text |
| ~183 | `👥 Target Customer` | `Target Customer` |
| ~197 | `⚔️ Competitive Landscape` | `Competitive Landscape` |
| ~210 | `🏆 Our Competitive Advantages` | `Our Competitive Advantages` |
| ~216 | `🔮 Market Trends` | `Market Trends` |
| ~229 | `💡 Opportunities` | `Opportunities` |
| ~235 | `⚠️ Threats` | `Threats` |
| ~263 | `🎯 Recommendations` | `Recommendations` |

### 5. FounderAgreementForm.tsx (Line ~244)

| Location (Line) | Current | Replace With |
|-----------------|---------|--------------|
| ~244 | `⚠️ Legal Disclaimer:` | `LEGAL DISCLAIMER:` |

---

## Files Requiring Modification

| File | Emoji Count | Severity |
|------|-------------|----------|
| `src/components/docs/forms/BusinessPlanForm.tsx` | 10 | High |
| `src/components/docs/forms/OnePagePlanForm.tsx` | 10 | High |
| `src/components/docs/forms/FinancialForecastForm.tsx` | 8 | High |
| `src/components/docs/forms/MarketAnalysisForm.tsx` | 10 | High |
| `src/components/docs/forms/FounderAgreementForm.tsx` | 1 | Low |
| **Total** | **39 emojis** | |

---

## Files Already Clean (No Emojis Found)

The following templates are already professional with no emojis:
- `InvoiceForm.tsx` - Clean
- `NDAForm.tsx` - Clean
- `QuarterlySummaryForm.tsx` - Clean
- `PartnershipForm.tsx` - Clean

---

## Implementation Approach

For each file, I will:

1. **Remove all emoji characters** from the HTML preview template strings
2. **Keep section headers descriptive** but professional (text-only)
3. **Use visual styling instead of emojis** for visual hierarchy (colors, borders, font-weight already exist)
4. **Maintain accessibility** by relying on semantic HTML structure

### Example Change

**Before:**
```html
<h2 style="...">📊 Market Analysis</h2>
```

**After:**
```html
<h2 style="...">Market Analysis</h2>
```

---

## Specific Changes Per File

### BusinessPlanForm.tsx
- Lines 143, 151, 171, 196, 214, 253, 263, 267, 271, 280
- Remove 10 emojis from section headers

### OnePagePlanForm.tsx  
- Lines 130, 135, 141, 146, 152, 159, 166, 175, 194, 201
- Remove 10 emojis from section headers

### FinancialForecastForm.tsx
- Lines 135, 158, 171, 178, 185, 197, 232, 251
- Remove 8 emojis from section headers and table cells

### MarketAnalysisForm.tsx
- Lines 142, 155, 177, 183, 197, 210, 216, 229, 235, 263
- Remove 10 emojis from section headers

### FounderAgreementForm.tsx
- Line 244
- Remove 1 emoji from legal disclaimer, use "LEGAL DISCLAIMER:" instead

---

## Quality Assurance

After implementation:
- All document previews will display text-only headers
- Visual hierarchy maintained through existing CSS styling (colors, borders, backgrounds)
- Professional appearance suitable for bank documents, investor decks, and legal agreements
- No changes to form functionality or validation logic

