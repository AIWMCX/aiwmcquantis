

## Icon System Implementation Plan

### Overview
Create 32 custom SVG icon components in `src/components/icons/` following strict design rules (1.5px stroke, 2px corner radius, currentColor inheritance). Then replace emoji usage across the codebase.

### New Files

**`src/components/icons/index.ts`** — barrel export for all 32 icons

**32 icon components** in `src/components/icons/`, each following this pattern:
```tsx
interface QIconProps {
  size?: number;
  className?: string;
}
export const QIconRevenue = ({ size = 24, className }: QIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" 
    fill="none" stroke="currentColor" strokeWidth={1.5} 
    strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* paths */}
  </svg>
);
```

Icons grouped into one file each for maintainability:
- `QIconNavigation.tsx` — Dashboard, Analysis, Documents, Settings, Close, Chevron, Search (7)
- `QIconFinancial.tsx` — Revenue, Profit, Cost, Margin, Cashflow, Breakeven, Runway (7)
- `QIconStatus.tsx` — RiskLow, RiskMed, RiskHigh, Verified, Warning, Blocked (6)
- `QIconAI.tsx` — AI, Consensus, Benchmark, Confidence (4)
- `QIconScenario.tsx` — StressMap, Scenario, Recession, Tornado (4)
- `QIconAction.tsx` — Generate, Download, Share, Explain (4)

### Emoji Replacements

| File | Current | Replacement |
|------|---------|-------------|
| `ViralCard.tsx` | `💰 📈 📊 ⏱️` | QIconProfit, QIconRevenue, QIconMargin, QIconRunway |
| `AnalysisHistory.tsx` | `💡 🌍` | QIconAnalysis, QIconDashboard |
| `DualEngineBadge.tsx` | `⚡ ✓ ~ ⚠ ✗` | QIconVerified, QIconRiskLow, QIconAI, QIconWarning, QIconBlocked |
| `QConfidenceBadge.tsx` | `⚡` prefix | QIconVerified inline |
| `DemoPreview.tsx` | `☕ 💻 🛍️` | Replace with styled icon orbs per branded-icon-system memory |
| `AnalysisProgress.tsx` | `☕ 📊 🏪 💡 📈 🎯 🌍 ⏱️ 🤖 💰` | Matching QIcon components |

### Design Decisions
- Group icons by domain into 6 files (not 32 separate files) for maintainability
- All SVGs are 24×24 viewBox, scaled via `size` prop
- Stroke weight fixed at 1.5px per spec
- No fill colors — all currentColor inheritance
- Consistent `QIconProps` interface across all icons

### Files Modified
| File | Change |
|------|--------|
| `src/components/icons/QIconNavigation.tsx` | **New** — 7 navigation icons |
| `src/components/icons/QIconFinancial.tsx` | **New** — 7 financial icons |
| `src/components/icons/QIconStatus.tsx` | **New** — 6 status icons |
| `src/components/icons/QIconAI.tsx` | **New** — 4 AI icons |
| `src/components/icons/QIconScenario.tsx` | **New** — 4 scenario icons |
| `src/components/icons/QIconAction.tsx` | **New** — 4 action icons |
| `src/components/icons/index.ts` | **New** — barrel export |
| `src/components/viral/ViralCard.tsx` | Replace emojis with QIcons |
| `src/components/AnalysisHistory.tsx` | Replace emojis with QIcons |
| `src/components/analysis/DualEngineBadge.tsx` | Replace emoji strings with QIcons |
| `src/components/analysis/QConfidenceBadge.tsx` | Replace ⚡ prefix with QIconVerified |
| `src/components/landing/DemoPreview.tsx` | Replace emojis with styled icon orbs |
| `src/components/analysis/AnalysisProgress.tsx` | Replace emojis with QIcons |

