

# Implement SEO Optimization Package

## What This Does
Applies the complete SEO package from the uploaded document across the entire site: updated meta tags, enriched JSON-LD structured data, improved robots.txt, expanded sitemap, and updated `index.html` head tags.

## Changes

### 1. Update `index.html` — Head Meta Tags
- Update `<title>` to: "Quantis — AI Business Validation in 90 Seconds | Free" (56 chars)
- Update `<meta name="description">` to the SEO package version (149 chars)
- Update og:title, og:description, twitter:title, twitter:description to match
- Add `og:image:alt` with proper descriptive text
- Update twitter:site to `@aiwmcquantis`

### 2. Update `PageSEO` Usage on Every Page
Update the `title` and `description` props passed to `<PageSEO>` on each page to match the SEO package specifications:

| Page | New Title | New Description |
|------|-----------|----------------|
| Homepage (Landing.tsx) | Quantis — AI Business Validation in 90 Seconds \| Free | Run a financial pre-mortem on your startup in 90 seconds... |
| How It Works | How Quantis Works — AI Financial Stress-Testing | 3 steps: describe your idea, AI stress-tests 12 financial variables... |
| Use Cases | Who Uses Quantis — Founders, Consultants & Builders | Quantis helps founders validate ideas... |
| Examples | Business Validation Examples — Real AI Analysis Reports | See complete AI-generated financial reports... |
| Risk Gallery | Startup Risk Gallery — Common Business Model Failures | Browse real risk flags caught by Quantis... |
| Pricing | Quantis Pricing — Free Plan & Plus at $17/mo | Start free forever or upgrade to Plus... |
| Blog | Startup Validation Blog — AIWMC Quantis Insights | Practical guides on validating startup ideas... |
| Methodology | Quantis Methodology — Deterministic Financial Engine | How Quantis calculates projections... |

### 3. Update `StructuredData.tsx` — Enriched JSON-LD
Replace existing schemas with the full SEO package versions:
- **Organization**: Add `@id`, `alternateName`, `logo` as ImageObject, `sameAs` array, `contactPoint`, `address`
- **SoftwareApplication**: Add `@id`, `applicationSubCategory`, `browserRequirements`, expanded `featureList` (12 items), `datePublished`, `dateModified`, `author`/`publisher` refs, `url`
- **WebSite**: Add `@id`, `publisher` ref, `inLanguage`, update SearchAction target to `/blog?q=`
- **FAQPage**: Update with the 10 comprehensive FAQ items from the SEO package (inject on Landing page)

### 4. Update `robots.txt`
Replace with SEO package version:
- Add disallow rules for `/login`, `/signup`, `/account/`, `/checkout/`, `/auth/`, `/dashboard/`
- Add query string blocks (`?ref=`, `?source=`)
- Add explicit Allow rules for public marketing pages
- Add `Crawl-delay: 1`
- Keep existing bot-specific rules

### 5. Update `sitemap.xml`
Add missing pages with proper priority/changefreq:
- `/how-it-works` (priority 0.9)
- `/use-cases` (priority 0.8)
- `/methodology` (priority 0.7)
- Update existing priorities to match SEO package
- Add blog posts: `how-to-stress-test-your-startup`, `startup-validation-checklist`, `ai-vs-spreadsheets-startup-planning`
- Remove `/auth` from sitemap (should not be indexed)
- Update all `lastmod` dates to 2026-03-01

### 6. Add FAQ Data to Landing Page
Pass the 10 SEO-package FAQ items to `StructuredData` on the Landing page via `includeFAQ={true}` and `faqItems={[...]}` — these render as JSON-LD only (no visible UI change needed).

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Updated title, description, OG/Twitter meta |
| `src/components/seo/StructuredData.tsx` | Enriched Organization, Software, WebSite schemas |
| `src/pages/Landing.tsx` | Updated PageSEO props + FAQ structured data |
| `src/pages/Blog.tsx` | Updated PageSEO title/description |
| `src/pages/UseCases.tsx` | Updated PageSEO title/description |
| `src/pages/RiskGallery.tsx` | Updated PageSEO title/description |
| `src/pages/Methodology.tsx` | Updated PageSEO title/description |
| `public/robots.txt` | Expanded disallow/allow rules |
| `public/sitemap.xml` | Added missing pages, fixed priorities, removed /auth |

