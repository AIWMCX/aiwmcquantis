
# AIWMC Quantis: Anthropic-Style Accuracy & Safety Architecture
## Comprehensive Analysis & Implementation Plan

Based on deep codebase analysis, here's how to systematically implement accuracy-as-a-first-class-function for aiwmcquantis.com:

## CURRENT STATE ANALYSIS

### What's Already Production-Ready
- **QMath Precision Layer**: Full decimal.js implementation eliminating float drift
- **Reconciliation Engine**: 10-rule validation system (R-001 to R-010) with auto-correction
- **Dual-AI Consensus**: GPT-4o mini + Gemini cross-validation with 5-factor confidence scoring
- **Benchmark System**: 120+ industries with p10-p90 distributions, geo-calibration for 16 cities
- **Financial Engine**: Bottom-up 36-month P&L, cash-flow, Monte Carlo simulations
- **Audit Trail**: FormulaRegistry with versioned formulas, QuantisLogger for all operations

### Critical Gaps (Anthropic-Style)
1. **No Safety Governance**: Research Agent exists conceptually but lacks veto authority
2. **Confidence Theater**: Badges shown but no systematic accuracy measurement
3. **UX Trust Gap**: Long vertical scroll hides critical assumptions/inputs
4. **Ad-Hoc Auditing**: Manual checks instead of continuous evaluation pipeline
5. **Benchmark Staleness**: No systematic refresh/validation of industry data

## ANTHROPIC-INSPIRED ACCURACY STACK

### Phase 1: Safety-First Governance (Sprint 1)
**Quantis Safety Levels (QSL)**
- QSL-1 (Exploratory): Free-tier, confidence <70%, clear disclaimers
- QSL-2 (Planning): Plus-tier, confidence 70-85%, business planning use
- QSL-3 (Investor-Grade): confidence >85%, suitable for funding decisions
- QSL-4 (Loan-Grade): Reserved, requires human expert validation

**Research Agent Authority Structure**
```typescript
// New: src/services/quantis-safety-agent.ts
interface SafetyVeto {
  canDeploy: boolean;
  blockingIssues: SafetyIssue[];
  overrideRequired: boolean;
  confidence: SafetyLevel;
}
```

**Implementation**:
- Create `safety_evaluations` table logging every analysis against QSL criteria
- Research Agent runs on all production analyses, flagging QSL violations
- Add deployment gates: changes that degrade accuracy scores require explicit override
- Weekly "Quantis Safety Report" showing accuracy drift, outlier patterns

### Phase 2: Systematic Accuracy Infrastructure (Sprint 2)

**Golden Test Vector Library**
```typescript
// New: src/lib/golden-test-vectors.ts
interface GoldenVector {
  id: string;
  businessType: string;
  location: string;
  inputs: BusinessInputs;
  expectedRanges: {
    monthlyProfit: [number, number];
    paybackMonths: [number, number];
    grossMargin: [number, number];
  };
  confidenceThreshold: number;
}
```

**Continuous Evaluation Pipeline**
- 30+ canonical test cases across industries/locations
- Regression testing on every model/benchmark change
- Synthetic fuzzing: random input perturbations to check output stability
- A/B testing framework for prompt changes

**Benchmark Provenance & Freshness**
- Version every benchmark with source, sample size, date range
- Automated staleness detection (>6 months = warning flag)
- Systematic outlier detection using statistical process control
- Public methodology page showing data sources and limitations

### Phase 3: UX of Trust & Transparency (Sprint 3)

**Analysis Wizard Redesign** (Fix the "vertical well" problem)
- Multi-step wizard with persistent summary at top
- Key outputs visible without scrolling: profit, payback, confidence
- Inline assumption editing with live recalculation
- "Why these numbers?" expandable for each major figure

**Confidence Visualization**
- Traffic light system: Green (QSL-3), Yellow (QSL-2), Red (QSL-1)
- Sensitivity tornado showing top 3 drivers
- Range displays instead of false precision (±15% corridors)
- Benchmark percentile positioning ("75th percentile for SaaS gross margin")

**Realism Feedback Loop**
- Post-analysis: "How realistic do these projections feel?" slider
- User edits tracked as ground truth for calibration
- Systematic collection of "this seems too optimistic/pessimistic"

### Phase 4: External Credibility (Sprint 4)

**Public Methodology Transparency**
- "How Quantis Works" page with data sources, calculation methods
- Limitations clearly stated (not marketing claims)
- "Last audited" badge referencing most recent safety evaluation
- Open source key calculation modules for expert review

**Anthropic-Style Safety Reports**
- Quarterly "Quantis Reliability Report" showing accuracy metrics
- Systematic bias analysis by industry/geography
- Known failure modes and mitigation efforts
- Roadmap for accuracy improvements

## TECHNICAL IMPLEMENTATION PLAN

### Current Stack Integration
Based on codebase analysis:
- **React + TypeScript + Supabase + Edge Functions**
- **Dual-AI via Lovable gateway** (GPT-4o mini + Gemini)
- **QMath precision layer** for all financial arithmetic
- **Benchmark data** in PostgreSQL with RLS policies

### New Components Required

**1. Safety Agent Service**
```typescript
// supabase/functions/quantis-safety-agent/index.ts
export class SafetyAgent {
  async evaluateAnalysis(result: AnalysisResult): Promise<SafetyEvaluation>
  async checkBenchmarkFreshness(): Promise<FreshnessReport>
  async runGoldenVectorTests(): Promise<TestResults>
  async generateSafetyReport(): Promise<SafetyReport>
}
```

**2. Accuracy Dashboard (Admin)**
```typescript
// src/pages/admin/AccuracyDashboard.tsx
- Real-time accuracy metrics
- Golden vector test results
- Benchmark staleness alerts
- Safety level distribution
- User feedback analysis
```

**3. Enhanced Analysis UI**
```typescript
// src/components/analysis/AccuracyTransparentResults.tsx
- Wizard-style layout with persistent summary
- Inline confidence indicators
- Assumption editing with live updates
- Methodology links for each calculation
```

**4. Benchmark Management System**
```typescript
// src/services/benchmark-governance.ts
- Automated benchmark validation
- Source attribution and versioning
- Staleness detection and alerts
- Quality scoring based on sample size/recency
```

### Database Changes Required

**Safety Evaluation Schema**
```sql
CREATE TABLE safety_evaluations (
  id UUID PRIMARY KEY,
  analysis_id UUID REFERENCES analyses(id),
  safety_level INTEGER, -- 1-4 (QSL levels)
  confidence_score DECIMAL(5,2),
  blocking_issues JSONB,
  benchmark_versions JSONB,
  evaluated_at TIMESTAMP
);
```

**Golden Test Vectors**
```sql
CREATE TABLE golden_test_vectors (
  id UUID PRIMARY KEY,
  business_type TEXT,
  location TEXT,
  input_data JSONB,
  expected_ranges JSONB,
  last_passed_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0
);
```

### Deployment Pipeline Changes

**Pre-Deploy Safety Gates**
1. Run full golden vector regression suite
2. Safety Agent evaluates sample of recent outputs
3. Benchmark freshness check passes
4. No degradation in average confidence scores
5. Manual override required if any checks fail

**Continuous Monitoring**
- Real-time accuracy metrics dashboard
- Automated alerts for confidence score degradation
- Weekly safety reports to stakeholders
- Monthly external methodology updates

## MEASUREMENT & SUCCESS CRITERIA

### Accuracy Metrics (Anthropic-Style)
- **Structural Correctness**: 99%+ reconciliation rule compliance
- **Benchmark Alignment**: 85%+ outputs within p10-p90 industry ranges  
- **User Calibration**: User "realism" ratings average >3.5/5
- **Confidence Precision**: Stated confidence correlates with user feedback
- **Safety Level Compliance**: <5% of analyses require QSL downgrades

### Trust & Transparency Metrics
- **Methodology Page Views**: Track engagement with "How it works"
- **Assumption Editing**: % users who modify default assumptions
- **Confidence Understanding**: A/B testing comprehension of confidence badges
- **Expert Review**: External validation from financial professionals

### Operational Reliability
- **Golden Vector Pass Rate**: >95% on canonical test cases
- **Benchmark Freshness**: <10% of data older than 6 months
- **Safety Agent Uptime**: 99.5% availability for evaluation pipeline
- **Override Rate**: <2% of changes require safety overrides

This transforms Quantis from "AI that gives business advice" to "systematic financial modeling platform with AI assistance and continuous accuracy validation" - much closer to Anthropic's approach where safety and reliability are structural, not afterthoughts.
