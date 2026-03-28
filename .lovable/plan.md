

# Fix PDF Text Overlap + Eliminate All Generic Content

## 4 Changes, 4 Files

### 1. Fix PDF Header Text Overflow
**Files: `src/components/pdf/pdfStyles.ts` + `src/components/pdf/ReportPageElements.tsx`**

**pdfStyles.ts** — Update `pageHeaderLeft` to add `overflow: 'hidden'`, `flex: 1`, `minWidth: 0`. Update `pageHeaderTitle` to add `maxWidth: '60%'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`, `whiteSpace: 'nowrap'`.

**ReportPageElements.tsx** — Add `title={idea}` attribute on the `pageHeaderTitle` span so full text is available on hover. Add `style={{ ...pdfStyles.pageHeaderSection, flexShrink: 0 }}` on the section title span so it never gets pushed off screen.

### 2. Add Zero-Tolerance Anti-Generic Policy to Master Prompt
**File: `supabase/functions/analyze-business/narrator-prompt.ts`**

Append a new section to `MASTER_PROMPT_DIRECTIVES` (after line 115):

```
## ZERO-TOLERANCE ANTI-GENERIC POLICY

Every element of your analysis must relate to the specific business idea, location, and inputs provided:
- NO generic phrases like "Total addressable market for X in the region"
- NO generic trends like "Digital transformation" or "Increasing customer expectations"
- NO generic competitive landscape like "moderately competitive market"
- NO placeholder competitors like "Established Local Provider" or "National Chain"
- TAM/SAM/SOM MUST include dollar figures with derivation methodology
- Competitors must be specific to the industry and location
- Trends must reference the specific industry and geography with directional data
- If you cannot provide specificity, state "Insufficient data for specific [X]" rather than generic filler

Generic AI filler is a system failure.
```

### 3. Strengthen TAM/SAM/SOM Schema Descriptions
**File: `supabase/functions/analyze-business/narrator-prompt.ts`** — Update `market_analysis_json` description (line 157-159) to:
```
"JSON: tam (dollar value with methodology, e.g. '$2.4B — US specialty coffee market'), sam (narrowed by geography and format with dollar value), som (capacity-constrained dollar value tied to user's unit economics), trends array (industry+location specific, with directional data), competitors array (name, strengths, weaknesses — specific to location/industry), competitive_landscape, market_gaps, barriers_to_entry, growth_opportunities. NO generic descriptions. Every field must reference the specific business idea, industry, and location."
```

Update OUTPUT REQUIREMENTS section (line 321) to: `"8. **Market Analysis**: TAM/SAM/SOM must be dollar values with derivation methodology. Example: 'TAM: $X.XB based on [source/logic]'. Never output vague phrases. Trends must be industry and location specific. Competitors must be named real-world entities or specific archetypes with location context."`

**File: `supabase/functions/ai-narrator/index.ts`** — Update `market_json` description (line 160-162) with the same specificity requirements.

### 4. Rewrite All Fallback Content to Eliminate Generic Text
**File: `supabase/functions/analyze-business/narrator-prompt.ts`** — Rewrite `generateFallbackNarrator()` market_analysis (lines 556-568):

- **TAM**: Compute from `metrics.mrr * 12 * 500` (assumes business captures ~0.2% of addressable market) with explanation: `"Estimated TAM: $X based on [industry] annual revenue potential × market multiplier for [location]. This is a benchmark-derived estimate — replace with actual market research."`
- **SAM**: `metrics.mrr * 12 * 50` — narrowed by location: `"Estimated SAM: $X for the [location] [industry] market, narrowed from TAM by geography and format."`
- **SOM**: `metrics.mrr * 12` — actual capacity: `"SOM: $X — first-year revenue target based on ${metrics.clientsActive} active customers at $${metrics.averageCheck} average transaction."`
- **Trends**: Replace generic list with industry-derived trends using `benchmarks.name` and `location`. Build 3 trends dynamically: `["{benchmarks.name} demand patterns in {location}", "Labor and operational cost trends for {benchmarks.name}", "Customer acquisition dynamics in {location} {benchmarks.name} market"]`
- **Competitors**: Replace generic placeholders with `[{ name: "Direct {benchmarks.name} competitors in {location}", strengths: "Established customer base", weaknesses: "Potential for differentiation" }]` — honest about lack of specific data
- **competitive_landscape**: `"The {benchmarks.name} market in {location} — specific competitive data not available without market research. This is a placeholder requiring validation."`
- **market_gaps / barriers_to_entry / growth_opportunities**: Make industry and location specific using `benchmarks.name`, `location`, and computed metrics

**File: `supabase/functions/ai-narrator/index.ts`** — Apply same pattern to `generateFallbackContent()` (lines 237-255): rewrite TAM/SAM/SOM with dollar computations, replace generic trends and competitors.

## Files Modified

| File | Change |
|------|--------|
| `src/components/pdf/pdfStyles.ts` | Fix header overflow styles |
| `src/components/pdf/ReportPageElements.tsx` | Add title attr, prevent section title from being pushed off |
| `supabase/functions/analyze-business/narrator-prompt.ts` | Anti-generic policy, TAM/SAM/SOM schema, rewrite fallback market analysis |
| `supabase/functions/ai-narrator/index.ts` | TAM/SAM/SOM schema, rewrite fallback market content |

## Implementation Order
1. PDF header fix (visual, immediate)
2. Anti-generic policy in master prompt
3. TAM/SAM/SOM schema strengthening (both files)
4. Fallback content rewrite (both files)

