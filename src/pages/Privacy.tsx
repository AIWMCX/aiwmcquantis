import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';

export default function Privacy() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Privacy Policy', url: '/privacy' }
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Privacy Policy | AIWMC Quantis"
        description="Learn how AIWMC Quantis protects your data. Our privacy policy covers data collection, security measures, and your GDPR/CCPA rights."
        canonical="/privacy"
      />
      <StructuredData includeBreadcrumbs breadcrumbs={breadcrumbs} />
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground text-lg">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              AIWMC Quantis ("we", "our", or "us") respects your privacy and is committed to protecting your personal data. 
              This privacy policy explains how we collect, use, store, and protect your information when you use our 
              AI-powered business analysis platform.
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
              <li>To provide AI-powered business analysis services</li>
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
              <li>AES-256-GCM encryption for sensitive data stored locally</li>
              <li>Secure HTTPS connections for all data transmission</li>
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
              <li><strong>Google AI (Gemini)</strong> - Document analysis and AI features</li>
              <li><strong>Anthropic Claude</strong> - Business analysis generation</li>
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

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies and local storage for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Authentication and session management</li>
              <li>Theme preferences (dark/light mode)</li>
              <li>Form draft recovery</li>
              <li>Anonymous device identification (for rate limiting)</li>
            </ul>
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
              <li>Email: privacy@aiwmcquantis.com</li>
              <li>Address: Denver, Colorado, USA</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} AIWMC Quantis. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
