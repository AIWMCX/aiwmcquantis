

# Directory Master Table, Submission Tracker & Site Copy Updates

## What This Does
Three deliverables: (1) Save the directory master table and LinkedIn profile copy as reference docs, (2) Build an internal `/directory-tracker` page to track submission status across all 44 directories, (3) Update any remaining site copy/descriptions to match the SEO package.

## Status Check — What's Already Done
- JSON-LD structured data (Organization, SoftwareApplication, WebSite, FAQPage): **Done**
- Open Graph + Twitter Card tags: **Done**
- robots.txt and sitemap.xml: **Done**
- Product Hunt badge removed: **Done**
- Fake social proof replaced with honest metric: **Done**
- Page-level SEO titles/descriptions: **Done**

The SEO package from Section 2 content (seo-package-2.md) is largely the same as what was already implemented. The only delta is the aggregate rating (4.9/847 reviews) which was correctly excluded as fake.

## New Work

### 1. Reference Docs (2 new files)

| File | Content |
|------|---------|
| `docs/DIRECTORY_MASTER_TABLE.md` | Full 44-directory table with URLs, DR/DA, cost, priority, notes + submission wave plan + all optimized descriptions (TAAFT, Product Hunt, G2, Crunchbase, BetaList, SaaSHub, IndieHackers) |
| `docs/LINKEDIN_GROWTH_ENGINE.md` | Bogdan Jeltov's optimized profile (headline, about section, featured recommendations) + AIWMC Quantis company page copy (tagline, about, specialties) |

### 2. Directory Submission Tracker Page

**New files:**

| File | Purpose |
|------|---------|
| `src/data/directorySubmissions.ts` | Data array of 44 directories with fields: name, url, type, drScore, cost, priority, wave, status (not_started/submitted/live/rejected), submittedDate, notes |
| `src/pages/DirectoryTracker.tsx` | Protected admin page at `/directory-tracker` with: filterable table (by wave, priority, status), status dropdown per row, progress bar showing submitted/total, wave tabs |

**Modified files:**

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/directory-tracker` route (protected, admin only) |

**Page features:**
- Tab filters: All / Wave 1 / Wave 2 / Wave 3 / Wave 4
- Status pills: Not Started (gray), Submitted (yellow), Live (green), Rejected (red)
- Progress summary bar at top: "12/44 directories submitted"
- Each row: directory name (linked), DR score, cost, priority badge, status selector, notes field
- All data is client-side (in the data file) — no database table needed since this is an internal tracking tool for the founder
- One-click copy buttons for optimized descriptions (TAAFT 200-char, G2 500-char, etc.)

### 3. Site Copy Updates

After thorough review, all SEO meta tags, structured data, and page descriptions from the package are already implemented. No additional site copy changes needed.

The only item in the SEO package we intentionally skip is the `aggregateRating` (4.9/847 reviews) since those are fabricated metrics.

## Technical Summary

- 4 new files created
- 1 file modified (App.tsx — add route)
- No database changes needed
- Admin-only access for the tracker page

