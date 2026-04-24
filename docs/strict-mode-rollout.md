# TypeScript Strict-Mode Rollout

Goal: turn on `strict: true` project-wide without one massive PR. Each phase
adds files to `tsconfig.financial.json` (currency-critical modules first),
fixes any `tsc -p tsconfig.financial.json` errors, then ships.

## Order of attack

| Phase | Files | Status |
|------:|-------|--------|
| 1 | `quantis-math.ts`, `financial-engine.ts`, `reconciliation-engine.ts`, `formula-registry.ts`, `geo-calibrator.ts` | ✅ in `tsconfig.financial.json` |
| 2 | `monte-carlo.ts`, `goal-solver.ts`, `opex-calculator.ts`, `benchmark-calibrator.ts`, `consensus-evaluator.ts` | TODO |
| 3 | `src/services/**` (analysisApi, analysisDb, docs-engine, quantis-safety-agent) | TODO |
| 4 | `src/hooks/**` | TODO |
| 5 | `src/components/**` | TODO |
| 6 | Flip `strict: true` in `tsconfig.app.json` and delete this file | TODO |

## Per-file checklist

For every file you add to `tsconfig.financial.json`:

- [ ] `bun run tsc -p tsconfig.financial.json --noEmit` is green
- [ ] No new `any` introduced (grep the diff)
- [ ] No new `// @ts-expect-error` without a one-line justification
- [ ] Existing tests still pass: `bun run test -- <module-name>`
- [ ] If the file logs errors, they go through `logger.error(msg, err)` (not raw console)

## Why financial-engine first

These modules drive the numbers paying users see. Null-undefined holes here
turn into wrong dollars in PDF exports — the worst possible failure mode.
