import React from 'react';
import { Link } from 'react-router-dom';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { SectionHeader } from '@/components/ui/glass-card';

/** Fixed date of the last material change. */
export const DMCA_LAST_UPDATED = 'November 3, 2026';

/** Where copyright notices and counter-notices are sent today. */
export const DMCA_NOTICE_EMAIL = 'legal@aiwmcquantis.com';

/*
 * TODO(founder): designate a DMCA agent with the U.S. Copyright Office.
 *   1. Register / sign in at https://dmca.copyright.gov/osp/ (Copyright Office online system).
 *   2. File a designation for AIWMC LLC (service provider) naming the agent, a full
 *      postal address, phone and email. The fee is $6 per designation or amendment.
 *   3. The designation expires 3 years after it is registered: put a renewal reminder
 *      in the calendar and amend before then.
 *   4. Then add the agent's name, postal address, phone and email to this page (same
 *      details as the directory), and remove this TODO.
 * Until then, this page must not say an agent is registered or pending.
 */
export default function Dmca() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Copyright / DMCA', url: '/dmca' },
  ];
  const p = 'text-muted-foreground leading-relaxed';
  const h2 = 'text-2xl font-semibold text-foreground';
  const ol = 'list-decimal pl-6 text-muted-foreground space-y-2';
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageSEO
        title="Copyright and DMCA Policy | AIWMC Quantis"
        description="How to report copyright infringement on AIWMC Quantis, send a counter-notice, and how AIWMC LLC handles repeat infringers."
        canonical="/dmca"
      />
      <StructuredData includeBreadcrumbs breadcrumbs={breadcrumbs} />

      <section aria-labelledby="dmca-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <SectionHeader title="Copyright and DMCA Policy" />
      </section>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 pb-8">
        <p className="text-muted-foreground text-lg">Last updated: {DMCA_LAST_UPDATED}</p>

        <section className="space-y-4">
          <h2 className={h2}>1. Our policy</h2>
          <p className={p}>
            AIWMC LLC, a Colorado limited liability company, operates AIWMC Quantis. We respect copyright and respond
            to notices of alleged infringement that follow the U.S. Digital Millennium Copyright Act (17 U.S.C.
            §512). When we receive a valid notice, we remove or disable access to the material and tell the person who
            posted it.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>2. Where to send notices</h2>
          <p className={p}>Send copyright notices and counter-notices to:</p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>Email: <a href={`mailto:${DMCA_NOTICE_EMAIL}`} className="underline">{DMCA_NOTICE_EMAIL}</a> (subject line: "DMCA notice" or "DMCA counter-notice")</li>
            <li>Mail: AIWMC LLC, Attn: Copyright, Denver, Colorado, USA</li>
          </ul>
          <p className={p}>
            Notices go to this address until a designated agent is listed for AIWMC LLC in the U.S. Copyright Office
            DMCA Designated Agent Directory. When an agent is listed, this page will show the agent's details.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>3. What a notice must include</h2>
          <p className={p}>Under 17 U.S.C. §512(c)(3), your notice must be in writing and include:</p>
          <ol className={ol}>
            <li>A physical or electronic signature of the copyright owner or a person authorized to act for them.</li>
            <li>Identification of the copyrighted work claimed to be infringed (or, for several works, a representative list).</li>
            <li>Identification of the material claimed to be infringing and information reasonably sufficient for us to
              locate it, such as the URL.</li>
            <li>Your contact information: name, postal address, telephone number and email address.</li>
            <li>A statement that you have a good-faith belief that the use is not authorized by the copyright owner,
              its agent, or the law.</li>
            <li>A statement that the information in the notice is accurate and, under penalty of perjury, that you are
              the copyright owner or authorized to act on the owner's behalf.</li>
          </ol>
          <p className={p}>Notices that are missing these elements may not be acted on.</p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>4. Counter-notices</h2>
          <p className={p}>
            If material you posted was removed and you believe it was removed by mistake or misidentification, you may
            send a counter-notice under 17 U.S.C. §512(g)(3). It must include:
          </p>
          <ol className={ol}>
            <li>Your physical or electronic signature.</li>
            <li>Identification of the material that was removed and where it appeared before removal.</li>
            <li>A statement under penalty of perjury that you have a good-faith belief the material was removed or
              disabled as a result of mistake or misidentification.</li>
            <li>Your name, address and telephone number, and a statement that you consent to the jurisdiction of the
              U.S. federal district court for your address (or, if you are outside the United States, any judicial
              district in which AIWMC LLC may be found), and that you will accept service of process from the person
              who sent the original notice or their agent.</li>
          </ol>
          <p className={p}>
            We forward valid counter-notices to the person who sent the original notice. Unless they tell us within 10
            to 14 business days that they have filed a court action, we may restore the material.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>5. Repeat infringers</h2>
          <p className={p}>
            In appropriate circumstances we disable or terminate the accounts of users who repeatedly infringe
            copyright.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>6. False claims</h2>
          <p className={p}>
            Under 17 U.S.C. §512(f), anyone who knowingly and materially misrepresents that material is infringing, or
            that it was removed by mistake, may be liable for damages, including costs and attorneys' fees. If you are
            unsure whether material infringes your rights, consider getting legal advice before sending a notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>7. Related terms</h2>
          <p className={p}>
            See section 6 of our <Link to="/terms" className="underline">Terms of Service</Link> for ownership of the
            Service and of the content you submit.
          </p>
        </section>
      </div>
    </PublicPageShell>
  );
}
