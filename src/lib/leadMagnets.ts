/**
 * Lead Magnet System - Types, Constants, and Configuration
 * 
 * Centralized definition of all lead sources, offers, and configurations
 * for the strategic email capture system.
 */

// ============================================
// Lead Source Types
// ============================================

export type LeadSource = 
  | 'exit_intent_popup'
  | 'scroll_popup'
  | 'time_delay_popup'
  | 'footer_newsletter'
  | 'resource_download'
  | 'feature_waitlist'
  | 'blog_cta'
  | 'post_analysis_modal';

export type LeadOffer = 
  | 'free_analysis'
  | 'business_guide'
  | 'validation_questions'
  | 'projection_template'
  | 'newsletter'
  | 'early_access'
  | 'founder_starter_kit';

// ============================================
// Popup Priority Configuration
// ============================================

export const POPUP_PRIORITY: Record<string, number> = {
  exit_intent: 1,    // Highest - user leaving
  scroll: 2,         // Medium - engaged user
  time_delay: 3,     // Low - passive trigger
};

// ============================================
// Cooldown Configuration (in hours)
// ============================================

export const COOLDOWN_CONFIG: Record<LeadSource, { submit: number; dismiss: number }> = {
  exit_intent_popup: { submit: 336, dismiss: 4 },    // 14 days submit, 4 hours dismiss
  scroll_popup: { submit: 168, dismiss: 24 },        // 7 days submit, 24 hours dismiss
  time_delay_popup: { submit: 168, dismiss: 48 },    // 7 days submit, 48 hours dismiss
  footer_newsletter: { submit: 720, dismiss: 0 },    // 30 days submit, no dismiss
  resource_download: { submit: 720, dismiss: 0 },    // 30 days submit, no dismiss
  feature_waitlist: { submit: 720, dismiss: 0 },     // 30 days submit, no dismiss
  blog_cta: { submit: 168, dismiss: 0 },             // 7 days submit, no dismiss
  post_analysis_modal: { submit: 720, dismiss: 72 }, // 30 days submit, 3 days dismiss
};

// ============================================
// Lead Magnet Content Configuration
// ============================================

export interface LeadMagnetContent {
  offer: LeadOffer;
  headline: string;
  subheadline: string;
  benefits: string[];
  ctaText: string;
  successMessage: string;
  pdfFilename?: string;
}

export const LEAD_MAGNET_CONTENT: Record<LeadOffer, LeadMagnetContent> = {
  founder_starter_kit: {
    offer: 'founder_starter_kit',
    headline: 'Founder Validation Starter Kit',
    subheadline: 'Everything you need to validate before you build',
    benefits: [
      'Business Model Canvas Template — map your idea structure',
      'Financial Projection Structure — pre-built formulas for 5-year models',
      '20 AI Prompts for Validation — the exact questions to stress-test your idea',
      'Risk Checklist — red flags investors look for',
    ],
    ctaText: 'Download Free Kit',
    successMessage: 'Your Starter Kit is on its way! Check your inbox.',
    pdfFilename: 'founder-validation-starter-kit.pdf',
  },
  free_analysis: {
    offer: 'free_analysis',
    headline: 'Before you go — validate your idea',
    subheadline: 'Get the AI Validation Checklist used by early founders',
    benefits: [
      'Structured financial logic check for your idea',
      'Risk signals identified before you invest',
      'Clear next steps based on AI analysis',
    ],
    ctaText: 'Get My Free Validation',
    successMessage: 'Check your inbox for your validation report.',
  },
  business_guide: {
    offer: 'business_guide',
    headline: 'Free Business Validation Guide',
    subheadline: 'The complete framework for evaluating any business idea',
    benefits: [
      '47-page comprehensive guide',
      'Real-world case studies',
      'Evaluation frameworks used by VCs',
    ],
    ctaText: 'Download Free Guide',
    successMessage: 'Your guide is on its way to your inbox!',
    pdfFilename: 'business-analysis-guide.pdf',
  },
  validation_questions: {
    offer: 'validation_questions',
    headline: 'Validate Before You Build',
    subheadline: 'The 10 questions investors ask before funding',
    benefits: [
      'Proven validation framework used by top accelerators',
      'Financial red flags scoring rubric',
      'Business model stress-test checklist',
    ],
    ctaText: 'Get the Checklist',
    successMessage: 'Your validation checklist is on its way!',
    pdfFilename: '10-validation-questions.pdf',
  },
  projection_template: {
    offer: 'projection_template',
    headline: 'Financial Projection Template',
    subheadline: 'Professional financial model with pre-built formulas',
    benefits: [
      'Pre-built formulas for revenue, costs, and margins',
      '5-year projection model',
      'Professional formatting',
    ],
    ctaText: 'Download Template',
    successMessage: 'Your template is on its way!',
    pdfFilename: 'financial-projection-template.pdf',
  },
  newsletter: {
    offer: 'newsletter',
    headline: 'Weekly Founder Insights',
    subheadline: 'Join founders getting smarter about business validation',
    benefits: [
      'Weekly validation tips from industry experts',
      'Financial structuring frameworks',
      'Exclusive feature previews',
    ],
    ctaText: 'Subscribe',
    successMessage: 'Welcome! Check your inbox to confirm.',
  },
  early_access: {
    offer: 'early_access',
    headline: 'Get Early Access',
    subheadline: 'Be first to try our newest features',
    benefits: [
      'Priority access to new features',
      'Direct feedback channel to team',
      'Exclusive beta testing opportunities',
    ],
    ctaText: 'Join Waitlist',
    successMessage: "You're on the list! We'll be in touch soon.",
  },
};

// ============================================
// Popup Trigger Configuration
// ============================================

export interface PopupTriggerConfig {
  type: 'exit_intent' | 'scroll' | 'time_delay';
  source: LeadSource;
  offer: LeadOffer;
  priority: number;
  scrollDepth?: number;     // For scroll trigger (percentage)
  delaySeconds?: number;    // For time delay trigger
}

export const POPUP_TRIGGERS: PopupTriggerConfig[] = [
  {
    type: 'exit_intent',
    source: 'exit_intent_popup',
    offer: 'free_analysis',
    priority: 1,
  },
  {
    type: 'scroll',
    source: 'scroll_popup',
    offer: 'validation_questions',
    priority: 2,
    scrollDepth: 50,
  },
  {
    type: 'time_delay',
    source: 'time_delay_popup',
    offer: 'projection_template',
    priority: 3,
    delaySeconds: 30,
  },
];

// ============================================
// Storage Keys
// ============================================

export const STORAGE_KEYS = {
  POPUP_STATE: 'quantis_popup_state',
  SESSION_POPUP_SHOWN: 'quantis_session_popup_shown',
  LEAD_EMAIL: 'quantis_lead_email',
  LEAD_NAME: 'quantis_lead_name',
  LEAD_SOURCE: 'quantis_lead_source',
  LEAD_TIMESTAMP: 'quantis_lead_timestamp',
} as const;
