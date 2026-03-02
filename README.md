## What Is AIWMC Quantis

AIWMC Quantis is a SaaS platform that delivers institutional-grade business analysis in under two minutes. Enter a business idea, select a location, and receive a complete financial projection with unit economics, risk assessment, market benchmarks, and AI-generated strategic narrative — all calibrated against 100+ industry datasets and 50+ global city cost indices.

**Built for:** Solo founders · Startup consultants · Indie builders · Accelerator cohorts · Angel investors conducting due diligence

---

## Core Capabilities

### Financial Engine
- **3-scenario projections** — base, optimistic, and pessimistic cases with monthly granularity
- **Unit economics** — CAC, LTV, LTV:CAC ratio, payback period, monthly burn rate
- **Break-even analysis** — time-to-profitability across all scenarios
- **Sensitivity modeling** — automatic stress-testing against margin and churn variations

### Location Intelligence
- **50+ global cities** with granular cost multipliers
- **Salary multiplier** — adjusts staffing costs to local labor markets
- **Rent multiplier** — commercial real estate index per city
- **Utility multiplier** — operational overhead adjustments
- **Regulatory complexity scoring** and tax burden indices

### Industry Benchmarks
- **100+ industries** with validated data points
- Gross/net margins, COGS percentages, churn rates (monthly + annual)
- Market size (TAM), growth rates, competition levels
- **Seasonality coefficients** — 12-month demand curves per industry
- Customer acquisition benchmarks, average transaction values, client lifetime

### Risk Assessment
- **9-category risk scoring** — market, financial, operational, regulatory, technology, team, competition, timing, execution
- Probability and financial impact ratings per risk
- **Mitigation strategies** with actionable recommendations
- Warning signs and time-to-materialize estimates

### AI Narrative
- Multi-model qualitative insights via **GPT-5** and **Gemini 2.5 Pro/Flash**
- 7-layer AI safety guardrails preventing hallucination, prompt injection, and toxic outputs
- Context-aware recommendations calibrated to industry and location

### Document Studio
- **10 professional templates:** Business Plan, Pitch Deck, Financial Forecast, NDA, Invoice, Partnership Agreement, Founder Agreement, Market Analysis, One-Page Plan, Quarterly Summary
- Rich text editor with AI-assisted content generation
- Export to PDF and DOCX formats

### Executive PDF Reports
- Branded, downloadable reports with cover page, executive summary, financials, market analysis, risk assessment, and action plan
- Custom branding support for Plus subscribers (logo, colors, company name)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│         React 18 · TypeScript · Vite · Tailwind         │
│              shadcn/ui · Recharts · TipTap              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 27 EDGE FUNCTIONS                        │
│              Deno Runtime · TypeScript                   │
│                                                         │
│  Analysis ─── analyze-business, analyze-preview,        │
│               calculate-financials                       │
│  AI ───────── ai-narrator, generate-document-content    │
│  Payments ─── create-checkout-session,                  │
│               create-portal-session, stripe-webhook      │
│  Email ────── send-welcome-email, send-lifecycle-email, │
│               send-weekly-insights, send-lead-magnet,   │
│               check-lifecycle-emails,                    │
│               newsletter-unsubscribe                     │
│  Documents ── generate-document, export-document,       │
│               parse-document, queue-export               │
│  Admin ────── manage-benchmarks, manage-knowledge-base, │
│               seed-benchmarks, health-check,             │
│               warm-functions, replay-webhook-events,     │
│               alert-webhook, share-report                │
└────────────────────────┬────────────────────────────────┘
                         │ Connection Pooling
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    POSTGRES                              │
│          38+ Tables · Row Level Security                 │
│        Vault Encryption · Scheduled CRON Jobs            │
│                                                         │
│  Core ──────── analyses, profiles, subscriptions        │
│  Documents ─── documents, doc_templates,                │
│                document_versions, document_exports        │
│  Knowledge ─── industry_benchmarks, location_data,      │
│                risk_factors, scenario_library,            │
│                marketing_channels, launch_checklists     │
│  Growth ────── leads, referral_codes,                   │
│                referral_conversions, user_engagement,     │
│                email_sequences, newsletter_sends         │
│  Security ──── security_logs, rate_limits,              │
│                anonymous_usage, api_keys,                │
│                api_request_logs, stripe_webhook_events    │
│  Teams ─────── teams, team_members, team_invitations    │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, TipTap |
| **Backend** | PostgreSQL, 27 Deno Edge Functions, Connection Pooling |
| **AI Models** | GPT-5, Gemini 2.5 Pro, Gemini 2.5 Flash |
| **Payments** | Stripe Subscriptions, Webhooks, Customer Portal |
| **Email** | Resend (lifecycle sequences, weekly insights, lead magnets) |
| **Monitoring** | Sentry (error tracking), Google Analytics 4 |
| **Security** | Row Level Security, Vault (pgp_sym_encrypt), CSP Headers |
| **PDF** | @react-pdf/renderer, html-to-image |

---

## Security Posture

This project follows **Airplane-Grade Security Engineering**:

| Control | Implementation |
|---------|---------------|
| **Database Access** | RESTRICTIVE `anon` deny policies on all 38+ tables |
| **PII Encryption** | Vault `pgp_sym_encrypt` for emails, phone numbers |
| **Admin Lockdown** | Database trigger blocks direct role manipulation |
| **Rate Limiting** | Multi-layer: device fingerprint, IP hash, per-user windows |
| **AI Safety** | 7-layer guardrails: input sanitization, prompt injection detection, output validation, toxicity filtering, hallucination checks, PII redaction, response capping |
| **Cron Auth** | `CRON_SECRET` header validation on all scheduled functions |
| **Payment Security** | Stripe webhook signature verification, idempotent event processing |
| **Content Security** | CSP headers, DOMPurify sanitization, XSS prevention |
| **Source Code** | Zero secrets in repository — all keys via encrypted environment variables |

---

## Feature Tiers

| Feature | Free | Plus |
|---------|:----:|:----:|
| Business analysis | 3/month | Unlimited |
| 3-scenario financial projections | Yes | Yes |
| Location intelligence (50+ cities) | Yes | Yes |
| Industry benchmarks (100+ sectors) | Yes | Yes |
| Risk assessment (9 categories) | Yes | Yes |
| AI narrative insights | Yes | Yes |
| Executive PDF reports | — | Yes |
| Document Studio (10 templates) | 1 download | Unlimited |
| Custom branding on reports | — | Yes |
| Analysis history & comparison | — | Yes |
| Team collaboration | — | Yes |
| Priority support | — | Yes |

---

## Project Structure

```
src/
├── components/
│   ├── analysis/        # Analysis form, results, financial inputs
│   ├── auth/            # Login, signup, password reset, protected routes
│   ├── docs/            # Document editor, templates, export
│   ├── landing/         # Hero, pricing, testimonials, mini-demo
│   ├── layout/          # Header, footer, navigation
│   ├── marketing/       # Exit intent, scroll triggers, popups
│   ├── onboarding/      # Welcome modal, quick start, tour
│   ├── pdf/             # Executive report renderer
│   ├── referral/        # Referral program UI
│   ├── seo/             # Structured data, page SEO
│   ├── admin/           # Admin dashboard, metrics, health
│   └── ui/              # shadcn/ui component library
├── hooks/               # 40+ custom hooks (auth, analysis, payments, etc.)
├── pages/               # Route pages (Landing, Dashboard, Auth, Pricing, etc.)
├── services/            # API clients, database services
├── types/               # TypeScript interfaces and types
├── lib/                 # Utilities, validation, analytics, security
└── styles/              # Additional CSS modules

supabase/functions/      # 27 Deno Edge Functions
```

---

## Backend Functions Reference

### Analysis & AI
| Function | Purpose |
|----------|---------|
| `analyze-business` | Core engine: financial projections, benchmarks, risk scoring, AI narrative |
| `analyze-preview` | Lightweight preview for anonymous/free-tier users |
| `calculate-financials` | Standalone financial calculation endpoint |
| `ai-narrator` | Multi-model AI narrative generation |
| `generate-document-content` | AI-assisted document section generation |

### Payments
| Function | Purpose |
|----------|---------|
| `create-checkout-session` | Stripe checkout for Plus subscriptions |
| `create-portal-session` | Stripe customer portal for billing management |
| `stripe-webhook` | Webhook handler with signature verification and idempotency |

### Email & Growth
| Function | Purpose |
|----------|---------|
| `send-welcome-email` | Onboarding email on signup |
| `send-lifecycle-email` | Drip sequence emails based on engagement |
| `check-lifecycle-emails` | Cron: evaluate and trigger lifecycle sequences |
| `send-weekly-insights` | Cron: weekly industry insights newsletter |
| `send-lead-magnet` | Deliver lead magnet assets to captured leads |
| `newsletter-unsubscribe` | One-click unsubscribe handler |
| `check-churn-signals` | Cron: detect at-risk users for re-engagement |

### Documents
| Function | Purpose |
|----------|---------|
| `generate-document` | Create documents from templates with variable injection |
| `export-document` | Export documents to PDF/DOCX |
| `parse-document` | Parse uploaded documents for analysis |
| `queue-export` | Async export job queue |

### Admin & Infrastructure
| Function | Purpose |
|----------|---------|
| `manage-benchmarks` | CRUD operations for industry benchmark data |
| `manage-knowledge-base` | Knowledge base administration |
| `seed-benchmarks` | Initial data seeding for benchmarks |
| `health-check` | System health and uptime monitoring |
| `warm-functions` | Cron: keep edge functions warm to reduce cold starts |
| `alert-webhook` | External alerting integration |
| `replay-webhook-events` | Re-process failed Stripe webhook events |
| `share-report` | Generate shareable report links with expiry |

---

## Local Development

```bash
# Clone
git clone https://github.com/your-org/aiwmc-quantis.git
cd aiwmc-quantis

# Install dependencies
npm install

# Start development server
npm run dev
```

> **Note:** Backend functions require configured environment secrets (AI API keys, Stripe keys, Resend API key, etc.). Contact the project maintainer for access.

---

## License

**Proprietary** — Copyright 2024-2026 AIWMC LLC. All rights reserved.

This software and its source code are the exclusive property of AIWMC LLC. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---
AIWMC, Quantis, and the AIWMC logo are trademarks of AIWMC LLC. All other trademarks are the property of their respective owners.
