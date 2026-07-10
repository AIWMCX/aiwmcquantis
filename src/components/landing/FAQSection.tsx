import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StructuredData } from '@/components/seo/StructuredData';
import { TIERS } from '@/config/tiers';
import { SectionHeader } from '@/components/ui/glass-card';

const faqItems = [
  {
    question: 'What is AIWMC Quantis?',
    answer: 'AIWMC Quantis is a deterministic financial stress-testing engine with an AI narrator layer. Enter your business idea and location, and the engine calculates revenue projections, risk flags, and an action plan using 97,500 industry benchmarks — in about 90 seconds.'
  },
  {
    question: 'How is this different from ChatGPT?',
    answer: 'Quantis uses a deterministic financial engine with real industry benchmarks — not generative text. Every number is calculated from verified data, not hallucinated. ChatGPT gives opinions; Quantis gives math. Every metric is tagged as "computed", "benchmark", or "estimated" for full transparency.'
  },
  {
    question: 'What data do you use?',
    answer: '97,500 industry benchmarks covering 50+ sectors, real CAC/LTV/churn data, and cost indices for 50+ global cities. No synthetic or made-up data. The engine uses the same financial frameworks that VCs and accelerators rely on.'
  },
  {
    question: 'How accurate are the financial projections?',
    answer: 'Our projections are based on 97,500 industry benchmarks and real market data. We provide 3 scenarios (conservative, realistic, optimistic) using 12 financial variables to give you a comprehensive view. Projections are estimates — we include confidence scores so you can calibrate.'
  },
  {
    question: 'Can I try AIWMC Quantis for free?',
    answer: `Yes — your first analysis is free. You get a score, top 3 critical risks, and basic revenue projection. To unlock Monte Carlo simulations, P&L breakdown, full action plan, and unlimited analyses, upgrade to Plus ($${TIERS.plus.priceMonthly}/mo) with a 14-day free trial.`
  },
  {
    question: 'What industries does AIWMC Quantis support?',
    answer: 'We currently support analysis for 50+ industries including retail, food service, professional services, healthcare, technology startups, and more. Our benchmark database is continuously expanding with new industry verticals and geographic regions.'
  },
  {
    question: 'How is my data protected?',
    answer: 'We take security seriously. All data is encrypted using AES-256-GCM encryption at rest and in transit. We are GDPR and CCPA compliant, and we never share or sell your business ideas or analysis data to third parties.'
  },
  {
    question: 'What payment methods are accepted?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) through Stripe secure payments. All transactions are encrypted and PCI-DSS compliant for your security.'
  },
  {
    question: 'Can I cancel my subscription anytime?',
    answer: 'Absolutely. You can cancel your Plus subscription at any time with no cancellation fees. Your access continues until the end of your billing period, and you can downgrade to the Free plan.'
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 14-day money-back guarantee on all paid plans. If you are not satisfied with AIWMC Quantis within the first 14 days, contact our support team for a full refund.'
  }
];

export function FAQSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="aiwmc-section-wash py-20 md:py-28">
      <StructuredData includeFAQ faqItems={faqItems} />
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently asked questions"
          subtitle="Everything you need to know about AIWMC Quantis."
        />

        <Accordion type="single" collapsible className="w-full space-y-3 mt-12">
          {faqItems.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="rounded-xl px-6 transition-colors"
              style={{
                background: 'rgba(12,16,32,0.55)',
                border: '1px solid rgba(148,163,255,0.14)',
              }}
            >
              <AccordionTrigger className="text-left text-foreground hover:no-underline py-5">
                <span className="font-semibold text-base md:text-lg pr-4">
                  {item.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 text-base leading-relaxed">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default FAQSection;
