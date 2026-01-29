
# AIWMC Quantis Knowledge Base - Implementation Status

## ✅ COMPLETED

### Database Tables Created
- `location_data` - 100+ cities with cost indices
- `scenario_library` - AI training scenarios  
- `risk_factors` - Business risk templates
- `launch_checklists` - Industry-specific launch steps
- `marketing_channels` - Channel performance benchmarks

### TypeScript Interfaces
- `src/types/knowledgeBase.ts` - Full type definitions for all 6 dataset types

### Edge Functions
- `manage-knowledge-base` - CRUD operations for all knowledge base tables

### Security
- RLS policies: Anonymous denied, Service role manages, Plus users can read
- Performance indexes on all key columns

---



## PROMPT FOR KNOWLEDGE BASE CONSTRUCTION

```
You are building a comprehensive Knowledge Base for AIWMC Quantis - a 2-minute business analysis SaaS platform. This knowledge base must power deterministic financial calculations, AI-enhanced business recommendations, and location-specific cost adjustments.

## CONTEXT

The platform analyzes business ideas by combining:
1. User input (idea, location, financial projections)
2. Industry benchmarks (margins, CAC, LTV, churn rates)
3. Location intelligence (cost multipliers for 50+ cities)
4. AI-generated qualitative insights

Current data sources:
- Kerry Dataset: 1,000 business scenarios (see structure below)
- Embedded benchmarks: 50+ industry types
- Location database: 50+ global cities with cost indices
- AI safety guardrails: 7-layer validation system

## KNOWLEDGE BASE STRUCTURE

### Dataset 1: Industry Benchmarks (Required)

Create records for 100+ industries following this schema:

```json
{
  "industry_id": "string (snake_case, unique)",
  "industry_name": "string (human readable)",
  "region": "global | north_america | europe | asia_pacific | latin_america | middle_east | africa | cis",
  
  "margins": {
    "gross_margin_min": "number (0-100%)",
    "gross_margin_max": "number (0-100%)",
    "gross_margin_avg": "number (0-100%)",
    "net_margin_min": "number (-50 to 80%)",
    "net_margin_max": "number (-50 to 80%)",
    "net_margin_avg": "number (-50 to 80%)",
    "cogs_percent_avg": "number (0-100%)"
  },
  
  "unit_economics": {
    "cac_min": "number (USD, typical customer acquisition cost floor)",
    "cac_max": "number (USD, typical CAC ceiling)",
    "cac_typical": "number (USD, median CAC)",
    "ltv_min": "number (USD, lifetime value floor)",
    "ltv_max": "number (USD, LTV ceiling)",
    "ltv_typical": "number (USD, median LTV)",
    "ltv_cac_ratio_min": "number (healthy minimum, typically 2-3)",
    "ltv_cac_ratio_max": "number (excellent, typically 5-10)"
  },
  
  "transaction_metrics": {
    "average_check_min": "number (USD, minimum transaction value)",
    "average_check_max": "number (USD, maximum transaction value)",
    "orders_per_client": "number (annual average)",
    "client_lifetime_months": "number (average retention period)"
  },
  
  "fixed_costs": {
    "salaries_fixed": "number (USD/month, baseline staffing)",
    "rent_fixed": "number (USD/month, typical commercial rent)",
    "utilities_fixed": "number (USD/month)",
    "other_fixed": "number (USD/month, insurance, software, etc.)"
  },
  
  "market_context": {
    "market_size_usd": "number (total addressable market)",
    "growth_rate_percent": "number (annual industry growth)",
    "competition_level": "low | medium | high | very_high"
  },
  
  "churn_metrics": {
    "churn_rate_monthly": "number (0-30%)",
    "churn_rate_annual": "number (0-100%)"
  },
  
  "seasonality": {
    "jan": "number (1.0 = baseline, 1.2 = 20% above)",
    "feb": "number",
    "...": "...",
    "dec": "number"
  },
  
  "keywords": ["array", "of", "matching", "terms"],
  "sample_size": "number (data points used)",
  "confidence_score": "number (0-100)",
  "source": "kerry_dataset | industry_report | government_data | proprietary"
}
```

### Dataset 2: Location Intelligence (Required)

Create records for 100+ cities following this schema:

```json
{
  "city_id": "string (snake_case)",
  "city": "string (human readable)",
  "country": "string",
  "region": "north_america | europe | asia_pacific | middle_east | latin_america | africa | cis",
  
  "cost_indices": {
    "overall_cost_index": "number (1.0 = US average)",
    "salary_multiplier": "number (1.0 = US average)",
    "rent_multiplier": "number (1.0 = US average)",
    "utility_multiplier": "number (1.0 = US average)"
  },
  
  "business_environment": {
    "tax_burden": "number (0-1, effective rate)",
    "regulatory_complexity": "number (1-5, 1=easy, 5=complex)",
    "market_maturity": "number (1-5, 1=emerging, 5=saturated)"
  },
  
  "locale": {
    "currency_code": "string (ISO 4217)",
    "currency_symbol": "string",
    "locale_code": "string (BCP 47)",
    "timezone": "string (IANA)",
    "primary_language": "string"
  }
}
```

### Dataset 3: Business Scenarios (Training Data)

Expand Kerry dataset format for AI training:

```json
{
  "scenario_id": "string (unique identifier)",
  "category": "financial_planning | growth_strategy | operations | marketing | product",
  "subcategory": "string",
  "business_type": "string (maps to industry_id)",
  
  "business_context": {
    "type": "string",
    "mrr": "number (monthly recurring revenue)",
    "growth_rate": "number (MoM percentage)",
    "churn_rate": "number (monthly percentage)",
    "customers": "number",
    "team_size": "number",
    "stage": "pre_seed | seed | series_a | series_b | growth | mature"
  },
  
  "user_query": "string (sample business question)",
  
  "expert_analysis": {
    "situation_assessment": "string (2-3 paragraphs)",
    "key_insights": ["string", "string", "string"],
    "priority_level": "low | medium | high | critical"
  },
  
  "recommendations": [
    {
      "priority": "number (1-5)",
      "category": "string",
      "action": "string (specific action item)",
      "expected_impact": "string (quantified outcome)",
      "implementation": "string (how to execute)",
      "timeline": "string (e.g., '2-3 months')"
    }
  ],
  
  "industry_benchmarks": {
    "healthy_growth_rate": "string (e.g., '15-20% MoM')",
    "acceptable_churn": "string (e.g., '3-5% monthly')",
    "target_ltv_cac_ratio": "string (e.g., '3:1 minimum')",
    "gross_margin_target": "string (e.g., '70-80%')"
  },
  
  "tags": ["array", "of", "keywords"],
  "difficulty_level": "beginner | intermediate | advanced | expert",
  "urgency": "low | medium | high | critical"
}
```

### Dataset 4: Risk Factors (New)

Create a comprehensive risk database:

```json
{
  "risk_id": "string",
  "risk_category": "market | financial | operational | regulatory | competitive | technology",
  "risk_name": "string",
  "description": "string (100-200 words)",
  
  "applicability": {
    "industries": ["array of industry_ids or 'all'"],
    "business_stages": ["pre_seed", "seed", "growth", "mature"],
    "regions": ["array of region codes or 'global'"]
  },
  
  "impact_assessment": {
    "probability": "number (0-100%)",
    "financial_impact": "low | medium | high | critical",
    "time_to_materialize": "immediate | short_term | medium_term | long_term"
  },
  
  "mitigation_strategies": [
    {
      "strategy": "string",
      "cost_estimate": "number (USD)",
      "effectiveness": "number (0-100%)",
      "implementation_time": "string"
    }
  ],
  
  "warning_signs": ["string", "string"],
  "related_risks": ["risk_id", "risk_id"]
}
```

### Dataset 5: Launch Checklist Templates (New)

Industry-specific launch requirements:

```json
{
  "template_id": "string",
  "industry_id": "string (foreign key)",
  "template_name": "string",
  
  "phases": [
    {
      "phase_number": 1,
      "phase_name": "Pre-Launch",
      "duration_weeks": 4,
      "tasks": [
        {
          "task_id": "string",
          "task_name": "string",
          "description": "string",
          "estimated_cost": "number (USD)",
          "required_time_hours": "number",
          "dependencies": ["task_id"],
          "regulatory_requirement": "boolean",
          "priority": "must_have | should_have | nice_to_have"
        }
      ]
    }
  ],
  
  "region_specific_requirements": {
    "us": ["task_ids requiring US compliance"],
    "eu": ["task_ids requiring EU compliance"],
    "global": ["universally applicable task_ids"]
  },
  
  "total_estimated_cost": "number (USD)",
  "total_estimated_weeks": "number"
}
```

### Dataset 6: Marketing Channel Benchmarks (New)

```json
{
  "channel_id": "string",
  "channel_name": "string",
  "channel_category": "paid | organic | referral | partnerships | outbound",
  
  "benchmarks_by_industry": [
    {
      "industry_id": "string",
      "cac_range": {"min": "number", "max": "number"},
      "conversion_rate": {"min": "number", "max": "number"},
      "time_to_first_conversion_days": "number",
      "scalability": "low | medium | high",
      "recommended_budget_percent": "number (0-100%)"
    }
  ],
  
  "best_practices": ["string", "string"],
  "common_mistakes": ["string", "string"],
  "tools_recommended": ["string", "string"]
}
```

---

## DATA QUALITY REQUIREMENTS

### Accuracy Standards
- All financial figures must be sourced from verifiable data
- Confidence scores required for each record
- Update frequency noted for time-sensitive data

### Coverage Requirements
- 100+ industries with full benchmark data
- 100+ cities with cost indices
- 1,000+ business scenarios for AI training
- 50+ risk factor templates
- 25+ launch checklist templates
- 15+ marketing channel benchmarks

### Validation Rules
- Margins must sum correctly (gross_margin = revenue - cogs)
- LTV must exceed CAC for healthy businesses (ratio > 1)
- Location multipliers must be relative to a consistent baseline
- All percentages must be 0-100 (or -100 to +100 for net margins)

---

## OUTPUT FORMAT

Deliver datasets as:
1. JSON files (one per dataset type)
2. SQL migration scripts for Supabase
3. TypeScript interfaces for type safety
4. Validation test suite

---

## INTEGRATION POINTS

The knowledge base must integrate with:

1. **Financial Engine** (`financial-engine.ts`)
   - Consumes industry benchmarks for margin validation
   - Uses location multipliers for cost adjustments
   - References churn/LTV data for projections

2. **AI Narrator** (`narrator-prompt.ts`)
   - References scenarios for recommendation patterns
   - Uses risk factors for warning generation
   - Follows launch checklists for action items

3. **Industry Matching** (`embedded-benchmarks.ts`)
   - Keyword-based industry detection
   - Confidence scoring for match quality
   - Fallback hierarchy when exact match not found

4. **Location Intelligence** (`location-intelligence.ts`)
   - City/region matching from user input
   - Cost adjustment calculations
   - Currency and locale handling

---

## PRIORITY ORDER

1. **Critical (Week 1)**: Industry benchmarks + Location data
2. **High (Week 2)**: Business scenarios + Risk factors
3. **Medium (Week 3)**: Launch checklists + Marketing channels
4. **Enhancement (Week 4)**: Seasonality data + Sub-industry variations

---

## EXISTING DATA TO EXPAND

### Current Kerry Dataset Structure (1,000 records)
Located at: `public/data/kerry_full_dataset_1000.json`

Sample record:
- scenario_id, category, subcategory, business_type
- business_context (MRR, growth, churn, customers, team size)
- industry_benchmarks (growth targets, margin targets, LTV:CAC ratios)
- recommendations with priority, action, impact, timeline
- tags for keyword matching

### Current Embedded Benchmarks (50+ industries)
Located at: `supabase/functions/analyze-business/embedded-benchmarks.ts`

Covers: SaaS, E-commerce, Restaurants, Consulting, Fitness, Education, Healthcare, Real Estate, and more.

### Current Location Database (50+ cities)
Located at: `supabase/functions/analyze-business/location-intelligence.ts`

Covers: North America (11), Europe (15), Asia-Pacific (12), CIS (5), Middle East (4), Latin America (3), Africa (2)

---

## SUCCESS CRITERIA

1. Zero hardcoded magic numbers in financial calculations
2. Every metric traceable to a knowledge base source
3. Confidence scoring for all AI-influenced outputs
4. <3 second lookup time for any benchmark query
5. 95%+ industry match rate for common business types
6. 90%+ city match rate for major global markets
```

---

## Implementation Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE BASE ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             PRIMARY DATA SOURCES                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│   │
│  │  │ Kerry       │ │ Industry    │ │ Government/Public   ││   │
│  │  │ Dataset     │ │ Reports     │ │ Economic Data       ││   │
│  │  │ (1000 recs) │ │ (IBISWorld) │ │ (Census, BLS)       ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             TRANSFORMATION LAYER                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│   │
│  │  │ Kerry       │ │ Benchmark   │ │ Location            ││   │
│  │  │ Transformer │ │ Normalizer  │ │ Geocoder            ││   │
│  │  │ (TS util)   │ │             │ │                     ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             STORAGE LAYER (Supabase)                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│   │
│  │  │ industry_   │ │ location_   │ │ scenario_           ││   │
│  │  │ benchmarks  │ │ data        │ │ library             ││   │
│  │  │ (100+ recs) │ │ (100+ recs) │ │ (1000+ recs)        ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘│   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│   │
│  │  │ risk_       │ │ launch_     │ │ marketing_          ││   │
│  │  │ factors     │ │ checklists  │ │ channels            ││   │
│  │  │ (50+ recs)  │ │ (25+ recs)  │ │ (15+ recs)          ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             ACCESS LAYER (Edge Functions)                │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│   │
│  │  │ Benchmark   │ │ Location    │ │ Scenario            ││   │
│  │  │ Resolver    │ │ Matcher     │ │ Recommender         ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             CONSUMER LAYER                               │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│   │
│  │  │ Financial   │ │ AI Narrator │ │ Report              ││   │
│  │  │ Engine      │ │ Prompt      │ │ Generator           ││   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Tables to Create

| Table | Purpose | Record Count |
|-------|---------|--------------|
| `industry_benchmarks` | Financial metrics by industry | 100+ |
| `location_data` | City-level cost indices | 100+ |
| `scenario_library` | AI training scenarios | 1,000+ |
| `risk_factors` | Business risk templates | 50+ |
| `launch_checklists` | Industry-specific launch steps | 25+ |
| `marketing_channels` | Channel performance benchmarks | 15+ |
| `seasonality_patterns` | Monthly adjustment factors | 50+ |
| `compliance_requirements` | Regional regulatory needs | 100+ |

---

## Deliverables

1. **Data Files**
   - `datasets/industry_benchmarks_v2.json` (100+ industries)
   - `datasets/location_intelligence_v2.json` (100+ cities)
   - `datasets/scenario_library.json` (1,000+ scenarios)
   - `datasets/risk_factors.json` (50+ risks)
   - `datasets/launch_checklists.json` (25+ templates)
   - `datasets/marketing_channels.json` (15+ channels)

2. **Database Migrations**
   - SQL scripts for all new tables
   - Seed data for initial population
   - Indexes for performance

3. **TypeScript Types**
   - Interface definitions for all datasets
   - Zod schemas for runtime validation
   - Type guards for safe parsing

4. **Documentation**
   - Data dictionary with field descriptions
   - Source attribution for all data
   - Update procedures and schedules

5. **Admin Tools**
   - Bulk upload endpoint for each dataset
   - Validation reports
   - Data quality dashboard

