

# Complete Golden Test Vector Suite

Add 7 new regression vectors to `src/lib/golden-test-vectors.ts`, expanding coverage from 3 to 10 canonical business archetypes.

## New Vectors

| Code | Business | Location | Key Inputs | Key Expected Ranges |
|------|----------|----------|------------|-------------------|
| GTV-REST-MIAMI-001 | Restaurant | Miami, FL | 80 covers/day, $42 avg ticket, $18K opex | Net margin 5–15%, break-even 6–14 mo |
| GTV-ECOM-DTC-001 | E-commerce DTC | Remote | $65 AOV, 2.1 orders/yr, $8K opex, $200 CAC | Gross margin 45–65%, LTV:CAC 2–8x |
| GTV-AGENCY-NYC-001 | Digital Agency | New York, NY | $8K avg project, 4 clients/mo, $22K opex | Net margin 15–35%, break-even 3–8 mo |
| GTV-TRUCK-ATX-001 | Food Truck | Austin, TX | 90 customers/day, $14 avg ticket, $6K opex | Net margin 8–20%, break-even 2–6 mo |
| GTV-FIT-LA-001 | Fitness Studio | Los Angeles, CA | $150 ARPU, 6% churn, 15 new/mo, $14K opex | M12 profit $1K–$5K, LTV:CAC 6–18x |
| GTV-DROP-ONLINE-001 | Dropshipping | Remote | $35 AOV, 200 orders/mo, $3K opex, $25 CAC | Gross margin 20–40%, break-even 2–5 mo |
| GTV-FINTECH-SF-001 | Fintech App | San Francisco, CA | $29 ARPU, 3% churn, 50 new/mo, $25K opex | Gross margin 80–95%, LTV:CAC 4–15x |

## File Changes

| File | Change |
|------|--------|
| `src/lib/golden-test-vectors.ts` | Append 7 new `GoldenVector` entries to the `GOLDEN_VECTORS` array |

No database changes needed — the `golden_test_vectors` DB table is for runtime tracking of pass/fail results; the canonical definitions live in this TypeScript file.

