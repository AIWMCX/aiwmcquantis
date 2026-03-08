

# Document Template Renderer — `src/lib/doc-renderer.ts`

## What gets built

A single new file: `src/lib/doc-renderer.ts` — the HTML template rendering engine that transforms report data + brand profile into production-ready HTML strings for PDF conversion.

## Core Functions

### 1. `renderDocumentHTML(data, templateId)` → string
Main entry point. Looks up template from `TEMPLATE_REGISTRY`, runs `interpolateTemplate`, returns final HTML.

### 2. `interpolateTemplate(html, data)` → string
Custom Handlebars-like engine supporting:
- `{{variable.path}}` — dot-notation lookup with HTML escaping
- `{{format.currency(var)}}` — QMath-rounded currency formatting ($12,450.00)
- `{{format.percent(var)}}` — percentage formatting (23.4%)
- `{{format.date(var)}}` — locale date formatting (March 8, 2026)
- `{{#if condition}}...{{/if}}` — simple boolean conditionals
- `{{#each array}}...{{/each}}` — iteration for line items (inner `{{this.field}}` access)
- All outputs HTML-escaped via `escapeHTML` from existing `htmlSanitizer.ts`

### 3. Formatting helpers
- `formatCurrency(value, currency?)` — uses `QMath.round(value, 2)`, adds `$` prefix + comma grouping
- `formatPercent(value, decimals?)` — QMath-rounded percentage
- `formatDate(dateStr)` — `Intl.DateTimeFormat` with long month format

### 4. `TEMPLATE_REGISTRY` — 3 production HTML templates

**`invoice_standard_v1`**: Professional A4 invoice
- Branded header with logo/company name + primary color
- FROM/TO sections, invoice number, dates, payment terms
- Line items table with description/qty/unit price/total columns
- Subtotal → Tax → Discount → Total breakdown
- Rate intelligence insight box (conditional)
- Notes section, Quantis footer
- Print-ready CSS with system fonts

**`investor_snapshot_v2`**: 2-page investor brief
- Page 1: Company header, executive summary, 4-metric grid (Market Size, Revenue M12, Break-Even Month, LTV:CAC), simplified stress map
- Page 2: Financial projections table (months 1/3/6/12/24), top 3 risk flags with severity, Quantis confidence badge

**`executive_summary_v1`**: Single-page overview
- Business name + location header
- Executive summary paragraph
- 6 key metrics in 2-column grid
- Top action item
- Confidence badge footer

## Technical details

- Imports `QuantisMath` from `quantis-math.ts` for all number formatting
- Imports `escapeHTML` from `htmlSanitizer.ts` for XSS prevention
- Uses `QuantisReport` type from `report-schema.ts` for type safety
- CSS embedded inline (no external dependencies) — system fonts only, A4 page sizing
- No emoji in document output per design standards (use text labels instead)

## Files

| File | Action |
|------|--------|
| `src/lib/doc-renderer.ts` | New |

