import React from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { SectionHeader } from '@/components/ui/glass-card';
import { openConsentSettings } from '@/lib/consent';

export default function Privacy() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Privacy Policy', url: '/privacy' }
  ];
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageSEO
        title="Privacy Policy | AIWMC Quantis"
        description="Learn how AIWMC Quantis protects your data. Our privacy policy covers data collection, security measures, and your GDPR/CCPA rights."
        canonical="/privacy"
      />
      <StructuredData includeBreadcrumbs breadcrumbs={breadcrumbs} />

      <section aria-labelledby="privacy-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <SectionHeader title="Privacy Policy" />
      </section>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 pb-8">
        <p className="text-muted-foreground text-lg">
          Last updated: November 3, 2026
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
          <p className="text-muted-foreground leading-relaxed">
            AIWMC Quantis is operated by AIWMC LLC, a Colorado limited liability company ("we", "our", or "us"). We respect
            your privacy and are committed to protecting your personal data. This privacy policy explains how we collect,
            use, store, and protect your information when you use our business decision-modeling service, which calculates
            figures with deterministic code and uses AI models to write narrative commentary.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
          <h3 className="text-xl font-medium text-foreground">2.1 Information You Provide</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Account information (email address, name, phone number)</li>
            <li>Business ideas and location data submitted for analysis</li>
            <li>Uploaded documents for financial analysis</li>
            <li>Payment information (processed securely by Stripe)</li>
            <li>For the Founder Decision Review and Consultant Founding Pilot: your company/decision details, deadline, and context submitted during the payment-verified intake, used solely to deliver that engagement</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground">2.2 Automatically Collected Information</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Device identifiers for rate limiting purposes</li>
            <li>IP address (hashed for privacy)</li>
            <li>Browser type and version</li>
            <li>Usage patterns and analytics data</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>To provide the business analysis services you request</li>
            <li>To process payments and manage subscriptions</li>
            <li>To prevent fraud and abuse of our services</li>
            <li>To improve our platform and develop new features</li>
            <li>To communicate with you about your account and services</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">4. Data Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Encryption in transit: the site and our APIs are served only over HTTPS (TLS), with HSTS</li>
            <li>Encryption at rest: our database provider, Supabase, encrypts stored data with AES-256; lead email addresses are additionally encrypted at the column level</li>
            <li>AES-256-GCM encryption for sensitive data stored in your browser</li>
            <li>Row-Level Security (RLS) on database tables</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Hashing of sensitive identifiers (IP addresses, device IDs)</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">5. Third-Party Services</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use the following third-party services:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong>Stripe</strong> - Payment processing (PCI-DSS compliant)</li>
            <li><strong>Supabase</strong> - Database, sign-in and server functions that store and process your account and analyses</li>
            <li><strong>Vercel</strong> - Website hosting</li>
            <li><strong>Resend</strong> - Delivery of account and service emails</li>
            <li><strong>Google Analytics</strong> - Counting visits and which pages are used, only if you accept optional cookies (see Cookies)</li>
            <li><strong>Apollo.io</strong> - Website visitor tracker that can identify the company behind a visit from its network address, only if you accept optional cookies (see Cookies)</li>
            <li><strong>Vercel Web Analytics</strong> - Cookieless page-view counts, only if you accept optional cookies; Vercel Speed Insights measures page-load speed without cookies</li>
            <li><strong>Meta Pixel and TikTok Pixel</strong> - Measuring which of our ads lead to visits, tool runs and purchases, only if you accept optional cookies and only while those ads run (see Cookies)</li>
            <li><strong>Google Fonts and Fontshare</strong> - Web fonts; your browser requests them directly, which shares your IP address with those services</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Quantis uses approved AI providers for classification and narration. Provider routing can vary by
            capability, availability, and controlled rollout — it is not simply "Free uses one provider, Plus/Pro
            use another." Financial calculations remain deterministic and do not depend on which narrative provider
            handled a given request. Providers that may process your business idea text to generate an analysis:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong>Dahl gateway</strong> - where enabled, through controlled canary routing to a subset of requests</li>
            <li><strong>DeepSeek</strong> - primary provider when Dahl routing does not apply</li>
            <li><strong>Anthropic</strong> - fallback provider</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            These services have their own privacy policies governing how they handle your data.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">6. Your Rights (GDPR/CCPA)</h2>
          <p className="text-muted-foreground leading-relaxed">
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li><strong>Right to Access</strong> - Request a copy of your personal data</li>
            <li><strong>Right to Rectification</strong> - Correct inaccurate personal data</li>
            <li><strong>Right to Erasure</strong> - Request deletion of your personal data</li>
            <li><strong>Right to Data Portability</strong> - Receive your data in a structured format</li>
            <li><strong>Right to Object</strong> - Object to processing of your personal data</li>
            <li><strong>Right to Withdraw Consent</strong> - Withdraw consent at any time</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            To exercise these rights, contact us at privacy@aiwmcquantis.com
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">7. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your personal data only for as long as necessary:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Account data - Until account deletion</li>
            <li>Analysis history - 2 years from creation</li>
            <li>Security logs - 90 days</li>
            <li>Anonymous usage data - 24 hours</li>
            <li>Rate limiting data - 24 hours</li>
          </ul>
        </section>

        <section id="cookies" className="space-y-4 scroll-mt-24">
          <h2 className="text-2xl font-semibold text-foreground">8. Cookies and Tracking</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use essential cookies and local storage, which the site needs to work, for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Authentication and session management</li>
            <li>Theme preferences (dark/light mode)</li>
            <li>Form draft recovery</li>
            <li>Anonymous device identification (for rate limiting)</li>
            <li>Remembering your cookie choice</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Optional cookies and trackers load only if you accept them</strong> in the banner shown on your first
            visit. Rejecting is as easy as accepting, and the site works the same either way. If your browser sends a
            Global Privacy Control (GPC) signal, we treat it as a rejection. The optional trackers are:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Google Analytics, which sets analytics cookies (<code>_ga</code>, <code>_ga_*</code>) to count visits and see which pages are used</li>
            <li>The Apollo.io visitor tracker, which stores an anonymous ID and can identify the company behind a visit from its network address</li>
            <li>Vercel Web Analytics (cookieless page-view counts)</li>
            <li>
              The Meta Pixel and TikTok Pixel, only while our ads run, which may set cookies (for example <code>_fbp</code>,{' '}
              <code>_ttp</code>) so Meta and TikTok can tell us which ads led to a page view, a tool run, a sign-up or a purchase.
              We send them the event name only, never your inputs, analyses or contact details.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Separately, without cookies or third parties, we record which steps of the site a visit reaches (for example, an
            analysis started or a pricing page viewed) and how the visit arrived (referrer and campaign tags) under a random
            session ID, to measure what works. Vercel Speed Insights measures page-load speed without cookies.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You can change your choice at any time:{' '}
            <button type="button" onClick={openConsentSettings} className="underline underline-offset-2 text-foreground">
              Cookie settings
            </button>
            . Withdrawing consent clears the analytics cookies we can reach and reloads the page without the trackers.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">9. Children's Privacy</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our services are not intended for individuals under the age of 18. We do not knowingly collect
            personal data from children.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">10. Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this privacy policy from time to time. We will notify you of any changes by
            posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">11. Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>AIWMC LLC</li>
            <li>Email: privacy@aiwmcquantis.com</li>
            <li>Address: Denver, Colorado, USA</li>
          </ul>
        </section>
      </div>

      <div className="mt-4 pt-8 pb-8" style={{ borderTop: '1px solid rgba(148,163,255,0.14)' }}>
        <p className="text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} AIWMC Quantis. All rights reserved.
        </p>
      </div>
    </PublicPageShell>
  );
}
