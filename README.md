# AIWMC Quantis — 2-Minute Business Analysis Engine

> **Validate any business idea in under 2 minutes.** Powered by real industry benchmarks, location intelligence, and AI-enhanced financial modeling.

🌐 **Live:** [www.aiwmcquantis.com](https://www.aiwmcquantis.com)

---

## What It Does

AIWMC Quantis takes a business idea, a location, and optional financial inputs — then produces a comprehensive analysis covering:

- **Financial Projections** — Revenue, margins, startup investment, payback period, monthly profit across base/optimistic/pessimistic scenarios
- **Unit Economics** — CAC, LTV, LTV:CAC ratio, average check, orders per client
- **Location Intelligence** — Cost adjustments for 50+ global cities (salary, rent, utility multipliers)
- **Risk Assessment** — 9-category risk scoring with mitigation strategies
- **Industry Benchmarks** — 100+ industries with real margin, churn, and growth data
- **AI Narrative** — Qualitative business insights and actionable recommendations

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Supabase (Postgres + Edge Functions) |
| AI | Multi-model (GPT-5, Gemini 2.5) via Lovable AI |
| Payments | Stripe (subscriptions, webhooks) |
| Email | Resend (lifecycle, newsletters) |
| Analytics | Google Analytics, Sentry |
| Hosting | Lovable Cloud |

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React SPA → Supabase Client → Edge Fns     │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Edge Functions (19)             │
│  analyze-business │ calculate-financials     │
│  ai-narrator      │ generate-document        │
│  stripe-webhook   │ share-report             │
│  send-lifecycle   │ health-check    ...      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│              Supabase Postgres               │
│  38+ tables │ RLS on every table             │
│  RESTRICTIVE anon deny │ PII encryption      │
│  Vault-managed keys │ SECURITY DEFINER RPCs  │
└─────────────────────────────────────────────┘
```

## Security Posture

This project follows **Airplane-Grade Security Engineering**:

- ✅ **Zero anonymous access** — Every table has a RESTRICTIVE `anon` deny policy
- ✅ **PII encryption** — Emails and phones encrypted via Supabase Vault (`pgp_sym_encrypt`)
- ✅ **Admin lockdown** — Database trigger restricts admin role to a single authorized account
- ✅ **Rate limiting** — Multi-layer (device, IP, browser fingerprint) with anti-incognito measures
- ✅ **Input sanitization** — 1MB limit, regex cleaning, 7-layer AI safety guardrails
- ✅ **Edge Function auth** — CRON_SECRET-only authentication for scheduled tasks, no raw key comparisons
- ✅ **Webhook security** — Stripe signature verification, PII redaction on stored payloads
- ✅ **No secrets in code** — All API keys stored as encrypted environment variables

## Local Development

```sh
git clone <repo-url>
cd <project-dir>
npm install
npm run dev
```

> **Note:** The app requires a connected Supabase backend. Environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are auto-configured in production.

## Project Structure

```
src/
├── components/        # UI components (analysis, auth, landing, docs, etc.)
├── hooks/             # Custom React hooks
├── lib/               # Utilities, analytics, validation
├── pages/             # Route pages
├── services/          # API and database service layer
├── types/             # TypeScript type definitions
└── integrations/      # Supabase client (auto-generated)

supabase/
├── functions/         # 19 Deno Edge Functions
└── config.toml        # Supabase configuration
```

## Key Features

| Feature | Tier |
|---|---|
| Business Analysis (1 free/hr) | Free |
| Full Financial Projections | Free |
| Document Studio (10 templates) | Plus |
| Executive PDF Reports | Plus |
| Custom Branding | Plus |
| API Access | Plus |
| Team Collaboration | Plus |
| Priority AI Models | Plus |

## License

Proprietary — © 2024-2026 AIWMC Quantis. All rights reserved.

## Contact

- 🌐 [www.aiwmcquantis.com](https://www.aiwmcquantis.com)
- 📧 support@aiwmcquantis.com
