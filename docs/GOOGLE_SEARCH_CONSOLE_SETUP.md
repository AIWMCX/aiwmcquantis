# Google Search Console Setup Guide

This guide covers how to set up and configure Google Search Console (GSC) for AIWMC Quantis.

## Prerequisites

- Access to DNS settings for `aiwmcquantis.com`
- Google account with admin access

---

## Step 1: Property Verification

### Option A: DNS TXT Record (Recommended)

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add property"
3. Choose "Domain" and enter `aiwmcquantis.com`
4. Copy the TXT record provided (e.g., `google-site-verification=XXXX`)
5. Add this TXT record to your DNS provider:
   - **Type:** TXT
   - **Name/Host:** `@` or leave blank
   - **Value:** The verification string from GSC
   - **TTL:** 3600 (or default)
6. Wait 5-10 minutes for DNS propagation
7. Click "Verify" in GSC

### Option B: HTML Meta Tag

1. Add to `index.html` inside `<head>`:
   ```html
   <meta name="google-site-verification" content="YOUR_VERIFICATION_CODE" />
   ```
2. Deploy the changes
3. Click "Verify" in GSC

### Option C: HTML File Upload

1. Download the HTML verification file from GSC
2. Add it to `public/` directory (e.g., `public/google1234567890.html`)
3. Deploy the changes
4. Verify the file is accessible at `https://aiwmcquantis.com/google1234567890.html`
5. Click "Verify" in GSC

---

## Step 2: Initial Configuration

### Submit Sitemap

1. In GSC, go to **Sitemaps** in the left sidebar
2. Enter `sitemap.xml` in the "Add a new sitemap" field
3. Click "Submit"
4. Verify status shows "Success"

### Set Preferred Domain

GSC automatically handles www vs non-www since we use canonical URLs. Ensure:
- Canonical is set to `https://aiwmcquantis.com` (no www)
- HTTPS is enforced

### International Targeting

1. Go to **Settings** > **International Targeting**
2. Set target country to "United States" if applicable
3. Language is auto-detected from `<html lang="en">`

---

## Step 3: Monitoring Checklist

### Coverage Report
- **Valid:** Pages successfully indexed
- **Excluded:** Pages intentionally not indexed (check robots.txt rules)
- **Error:** Pages with issues preventing indexing

Expected exclusions for AIWMC Quantis:
- `/app/*` - Authenticated dashboard
- `/admin/*` - Admin routes
- `/plus-settings` - User settings
- `/thank-you` - Post-purchase page

### Core Web Vitals Report

Monitor these metrics:
| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | ≤2.5s | ≤4s | >4s |
| FID/INP | ≤100ms | ≤300ms | >300ms |
| CLS | ≤0.1 | ≤0.25 | >0.25 |

### Mobile Usability Report

Check for issues:
- Clickable elements too close together (should be 48px+ apart)
- Content wider than screen
- Text too small to read (minimum 14px)
- Viewport not set

### Security Issues

Monitor for:
- Malware warnings
- Deceptive content flags
- Hacked content notifications

### Manual Actions

Check weekly for any manual penalties from Google.

---

## Step 4: Ongoing Maintenance

### URL Inspection

When adding new public pages:
1. Go to **URL Inspection** tool
2. Enter the new URL
3. Click "Request Indexing"
4. Monitor coverage until indexed

### Removing Outdated URLs

1. Go to **Removals** tool
2. Click "New Request"
3. Choose "Remove outdated content" or "Temporarily remove URL"
4. Submit the URL

### Performance Monitoring

Weekly review in **Performance** report:
- **Total clicks** and **impressions**
- **Average CTR** (target: >3%)
- **Average position** (target: <10 for main keywords)

Key queries to monitor:
- "AI business analysis"
- "Business plan generator"
- "Financial projections tool"
- "AIWMC Quantis"

---

## Structured Data Validation

After deployment, validate structured data:

1. Go to [Rich Results Test](https://search.google.com/test/rich-results)
2. Enter `https://aiwmcquantis.com`
3. Verify these schemas are detected:
   - Organization
   - SoftwareApplication
   - WebSite with SearchAction
   - FAQPage (on landing page)
   - BreadcrumbList (on internal pages)

---

## Troubleshooting

### Sitemap Not Found
- Verify `https://aiwmcquantis.com/sitemap.xml` is accessible
- Check for correct XML formatting
- Ensure no trailing whitespace in file

### Pages Not Indexed
1. Check robots.txt allows crawling
2. Verify no `noindex` meta tag on page
3. Ensure page has valid canonical URL
4. Check for soft 404 errors

### Mobile Usability Issues
- Run Lighthouse audit in Chrome DevTools
- Test on actual mobile devices
- Check viewport meta tag configuration

---

## Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Structured Data Testing Tool](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
