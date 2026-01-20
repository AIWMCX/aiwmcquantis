import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StructuredData } from '@/components/seo/StructuredData';

const faqItems = [
  {
    question: 'What is AIWMC Quantis?',
    answer: 'AIWMC Quantis is an AI-powered business analysis platform that generates comprehensive financial projections, market analysis, and complete business plans in under 2 minutes. Simply enter your business idea and location, and our AI analyzes real market data to provide actionable insights.'
  },
  {
    question: 'How accurate are the financial projections?',
    answer: 'Our projections are based on 1,000+ industry benchmarks and real market data. We provide 3 scenarios (conservative, realistic, optimistic) using 12 financial variables to give you a comprehensive view. While projections are estimates, they are grounded in verified industry data and best practices.'
  },
  {
    question: 'Can I try AIWMC Quantis for free?',
    answer: 'Yes! Our Free plan includes 3 analyses per month with basic financial projections and business plan outlines. No credit card required. Plus plan offers a 14-day free trial with full access to all features including Document Intelligence and custom branding.'
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
    <section id="faq" className="py-20 md:py-32">
      <StructuredData includeFAQ faqItems={faqItems} />
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about AIWMC Quantis
          </p>
        </div>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqItems.map((item, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="border border-border rounded-xl px-6 bg-card data-[state=open]:bg-accent/30 transition-colors"
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
