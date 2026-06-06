import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { trackEvent } from '@/lib/analytics';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const pricingFaqs: FAQItem[] = [
  {
    id: 'trial-free',
    question: 'Is the 14-day trial really free?',
    answer:
      'Yes, completely free. We don\'t charge your card until day 15, and you can cancel anytime before that with one click.',
  },
  {
    id: 'downgrade',
    question: 'Can I downgrade after upgrading?',
    answer:
      'Absolutely. Cancel anytime and you\'ll automatically switch to the Free plan at the end of your billing period. No hassle.',
  },
  {
    id: 'cheaper',
    question: 'Why is Plus so much cheaper than consultants?',
    answer:
      'Our AI does in 2 minutes what takes consultants weeks. We\'ve automated the research, benchmarking, and analysis—and we pass those savings to you.',
  },
  {
    id: 'payment',
    question: 'What payment methods do you accept?',
    answer:
      'All major credit cards (Visa, Mastercard, American Express) via Stripe. Your payment is encrypted with bank-grade security.',
  },
  {
    id: 'contract',
    question: 'Is there a contract or commitment?',
    answer:
      'No contracts. Cancel anytime with one click from your account settings. Your subscription will remain active until the end of the billing period.',
  },
];

export function PricingFAQ() {
  const handleFaqExpand = (questionId: string) => {
    trackEvent('pricing_faq_expanded', { question_id: questionId });
  };

  return (
    <div className="mt-12 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-center text-foreground mb-6">
        Pricing Questions
      </h3>
      <Accordion type="single" collapsible className="space-y-2">
        {pricingFaqs.map((faq) => (
          <AccordionItem
            key={faq.id}
            value={faq.id}
            className="border border-border rounded-lg px-4 bg-card"
          >
            <AccordionTrigger
              onClick={() => handleFaqExpand(faq.id)}
              className="text-left text-sm md:text-base font-medium hover:no-underline py-4"
            >
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
