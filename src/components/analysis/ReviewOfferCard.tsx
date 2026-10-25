import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';
import { trackCtaClick } from '@/lib/analytics';

const REVIEW = ENGAGEMENT_OFFERS.find((o) => o.code === 'founder_decision_review')!;

/**
 * The one place a result offers the paid, founder-assisted review. Shown once,
 * right after the numbers, for a visitor whose decision is too big to settle
 * with a free run alone. Links the sample memo so they see the deliverable.
 */
export function ReviewOfferCard() {
  return (
    <section className="q-card p-5" aria-labelledby="review-offer-heading" data-testid="review-offer-card">
      <h3 id="review-offer-heading" className="font-semibold text-foreground">Real money riding on this?</h3>
      <p className="text-sm text-muted-foreground mt-1">
        In a Founder Decision Review, a person checks your inputs, reconciles cash, break-even and payback, and walks you through the assumptions that would change the answer. ${REVIEW.price}, one decision.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link
          to="/decision-review"
          onClick={() => trackCtaClick('result_review_offer', 'result')}
          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
        >
          See the review <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to="/demo/sample-decision-memo"
          onClick={() => trackCtaClick('result_sample_memo', 'result')}
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Read a sample memo
        </Link>
      </div>
    </section>
  );
}
