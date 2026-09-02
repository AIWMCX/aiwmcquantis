import React from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { TIERS } from '@/config/tiers';
import { FREE_ANALYSES_PER_MONTH } from '@/config/canonical-facts';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { SectionHeader } from '@/components/ui/glass-card';

export default function Terms() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Terms of Service', url: '/terms' }
  ];
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageSEO
        title="Terms of Service | AIWMC Quantis"
        description="Read the terms of service for AIWMC Quantis, including subscription plans, acceptable use, and liability limitations."
        canonical="/terms"
      />
      <StructuredData includeBreadcrumbs breadcrumbs={breadcrumbs} />

      <section aria-labelledby="terms-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <SectionHeader title="Terms of Service" />
      </section>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 pb-8">
        <p className="text-muted-foreground text-lg">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using AIWMC Quantis ("the Service"), you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our Service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">2. Description of Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            AIWMC Quantis is an AI-powered business analysis platform that provides:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Financial projections and modeling</li>
            <li>Business plan generation</li>
            <li>Market analysis and insights</li>
            <li>Marketing strategy recommendations</li>
            <li>Document analysis and data extraction</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">3. User Accounts</h2>
          <h3 className="text-xl font-medium text-foreground">3.1 Account Creation</h3>
          <p className="text-muted-foreground leading-relaxed">
            To access certain features, you must create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your password (minimum 12 characters)</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground">3.2 Account Termination</h3>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate accounts that violate these terms or engage in
            fraudulent activity.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">4. Subscription Plans & Payment</h2>
          <h3 className="text-xl font-medium text-foreground">4.1 Free Tier</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>{FREE_ANALYSES_PER_MONTH} analyses per month</li>
            <li>Viability score and top 3 critical risks only</li>
            <li>Basic revenue projection (locked: Monte Carlo, P&L, competitive matrix, full action plan)</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground">4.2 Plus Plan (${TIERS.plus.priceMonthly}/month)</h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>14-day free trial</li>
            <li>Unlimited analyses</li>
            <li>Advanced financial modeling</li>
            <li>Complete business plans</li>
            <li>Document Intelligence (AI extraction)</li>
            <li>PDF export with custom branding</li>
          </ul>

          <h3 className="text-xl font-medium text-foreground">4.3 Billing</h3>
          <p className="text-muted-foreground leading-relaxed">
            Payments are processed securely by Stripe. Subscriptions are billed either monthly or annually,
            depending on the plan you select at checkout, and automatically renew at the end of each billing
            period unless cancelled. You may cancel at any time through your account settings.
          </p>

          <h3 className="text-xl font-medium text-foreground">4.4 Refunds</h3>
          <p className="text-muted-foreground leading-relaxed">
            We offer a 14-day free trial for paid plans. After the trial period, refunds are provided at our
            discretion on a case-by-case basis.
          </p>

          <h3 className="text-xl font-medium text-foreground">4.5 Founder-Assisted Paid Engagements ($349 / $499)</h3>
          <p className="text-muted-foreground leading-relaxed">
            Separately from the subscription plans above, AIWMC LLC offers two one-time, founder-assisted
            engagements: the <strong>Founder Decision Review</strong> ($349) and the{' '}
            <strong>Consultant Founding Pilot</strong> ($499). These are professional-services engagements,
            not subscriptions, and are governed by these additional terms.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>What you are purchasing:</strong> a founder-reviewed decision analysis. The Founder
            Decision Review covers one active business decision: a 30-minute intake, a fact-versus-assumption
            register, base/downside/upside scenarios, reconciliation of cash, break-even and payback, five
            identified fragile assumptions, one Decision Memo, one live results review, and one revision. The
            Consultant Founding Pilot covers two client decision cases within 30 days, with the same
            structure applied independently to each case, founder-led pilot setup, and one Decision Memo per
            case.
          </p>
          <p className="text-muted-foreground leading-relaxed"><strong>What is not included:</strong></p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Bookkeeping, accounting, tax, legal, or investment advice</li>
            <li>Audit, assurance, valuation certification, or a fundraising or client-acceptance guarantee</li>
            <li>Independent verification of information you or your client supply</li>
            <li>Unlimited revisions, ongoing consulting, or implementation work beyond the stated scope</li>
            <li>Any guaranteed business, investor, lender, or financial outcome</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Delivery:</strong> the 48-hour delivery target begins after your intake is complete and we
            have received the information reasonably required to perform the review. Materially incomplete or
            changing inputs may extend delivery. You are responsible for the accuracy and completeness of the
            information you supply — we do not independently verify it.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>No guaranteed outcome:</strong> this engagement is structured decision support based on
            supplied information, modeled assumptions, and identified sources. It does not guarantee any
            business, financial, investment, or lending outcome.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            <strong>Cancellation and refunds</strong> for these two engagements are governed by the{' '}
            <a href="/refund-policy" className="underline">Refund Policy</a>, which sets different terms
            than the subscription refund terms above — read it before purchasing.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">5. Acceptable Use</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree NOT to use the Service to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Attempt to bypass rate limits or security measures</li>
            <li>Submit malicious content or code</li>
            <li>Impersonate others or provide false information</li>
            <li>Resell or redistribute our services without authorization</li>
            <li>Use automated systems to access the Service excessively</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">6. Intellectual Property</h2>
          <h3 className="text-xl font-medium text-foreground">6.1 Our Property</h3>
          <p className="text-muted-foreground leading-relaxed">
            The Service, including its design, features, and content, is owned by AIWMC and protected by
            copyright, trademark, and other intellectual property laws.
          </p>

          <h3 className="text-xl font-medium text-foreground">6.2 Your Content</h3>
          <p className="text-muted-foreground leading-relaxed">
            You retain ownership of content you submit (business ideas, documents). By using the Service,
            you grant us a limited license to process this content solely to provide the Service.
          </p>

          <h3 className="text-xl font-medium text-foreground">6.3 Generated Reports</h3>
          <p className="text-muted-foreground leading-relaxed">
            Analysis reports generated by our AI are provided for your use. You may use these reports for
            your business purposes but may not resell them as a service.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">7. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground leading-relaxed">
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>The accuracy or completeness of AI-generated analyses</li>
            <li>That the Service will be uninterrupted or error-free</li>
            <li>That financial projections will match actual business outcomes</li>
            <li>That the Service will meet your specific requirements</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed font-medium">
            Our analyses are informational tools and should not replace professional business, legal, or
            financial advice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">8. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AIWMC SHALL NOT BE LIABLE FOR:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Any indirect, incidental, special, or consequential damages</li>
            <li>Loss of profits, revenue, data, or business opportunities</li>
            <li>Decisions made based on our analyses</li>
            <li>Third-party actions or services</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            Our total liability shall not exceed the amount you paid for the Service in the 12 months
            preceding the claim.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">9. Indemnification</h2>
          <p className="text-muted-foreground leading-relaxed">
            You agree to indemnify and hold harmless AIWMC and its officers, directors, employees, and
            agents from any claims, damages, or expenses arising from your use of the Service or violation
            of these Terms.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">10. Modifications to Service</h2>
          <p className="text-muted-foreground leading-relaxed">
            We reserve the right to modify, suspend, or discontinue any part of the Service at any time.
            We will provide reasonable notice of significant changes.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">11. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the State of
            Colorado, United States, without regard to its conflict of law provisions.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">12. Dispute Resolution</h2>
          <p className="text-muted-foreground leading-relaxed">
            Any disputes arising from these Terms or the Service shall be resolved through binding
            arbitration in Denver, Colorado, except where prohibited by law. You waive the right to
            participate in class action lawsuits.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">13. Severability</h2>
          <p className="text-muted-foreground leading-relaxed">
            If any provision of these Terms is found to be unenforceable, the remaining provisions will
            continue in full force and effect.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">14. Contact Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            For questions about these Terms of Service:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Email: legal@aiwmcquantis.com</li>
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
