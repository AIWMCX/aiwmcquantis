import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, Presentation, Target, Users, TrendingUp, DollarSign, Rocket } from 'lucide-react';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
import { AISuggestionButton } from '@/components/docs/AISuggestionButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import type { AutoFillData } from '@/hooks/useAnalysisAutoFill';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DocTemplate } from '@/types/document';

const PitchDeckFormSchema = z.object({
  // Slide 1: Cover
  company_name: z.string().min(2, 'Company name required'),
  tagline: z.string().min(5, 'Tagline required'),
  presenter_name: z.string().min(2, 'Presenter name required'),
  presenter_title: z.string().min(2, 'Title required'),
  
  // Slide 2: Problem
  problem_headline: z.string().min(5, 'Problem headline required'),
  problem_description: z.string().min(30, 'Describe the problem'),
  problem_impact: z.string().min(10, 'Describe the impact'),
  
  // Slide 3: Solution
  solution_headline: z.string().min(5, 'Solution headline required'),
  solution_description: z.string().min(30, 'Describe your solution'),
  key_features: z.string().min(10, 'List key features'),
  
  // Slide 4: Market
  market_size_tam: z.number().min(0),
  market_size_sam: z.number().min(0),
  market_size_som: z.number().min(0),
  market_growth_rate: z.number().min(0).max(500),
  
  // Slide 5: Business Model
  revenue_model: z.string().min(10, 'Revenue model required'),
  average_deal_size: z.number().min(0),
  target_customers: z.string().min(10, 'Target customers required'),
  
  // Slide 6: Traction
  traction_metrics: z.string().min(10, 'Traction metrics required'),
  key_customers: z.string().optional(),
  growth_rate: z.string().optional(),
  
  // Slide 7: Competition
  competitors: z.string().min(10, 'List competitors'),
  differentiation: z.string().min(20, 'Differentiation required'),
  
  // Slide 8: Team
  team_members: z.string().min(10, 'Team info required'),
  advisors: z.string().optional(),
  
  // Slide 9: Financials
  current_revenue: z.number().min(0),
  year1_projection: z.number().min(0),
  year3_projection: z.number().min(0),
  
  // Slide 10: The Ask
  funding_amount: z.number().min(0),
  use_of_funds: z.string().min(10, 'Use of funds required'),
  milestones: z.string().min(10, 'Milestones required'),
});

type PitchDeckFormData = z.infer<typeof PitchDeckFormSchema>;

interface PitchDeckFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function PitchDeckForm({ template, onGenerate, onPreviewUpdate, isGenerating }: PitchDeckFormProps) {
  const defaultValues = useMemo(() => ({
    company_name: '',
    tagline: '',
    presenter_name: '',
    presenter_title: '',
    problem_headline: '',
    problem_description: '',
    problem_impact: '',
    solution_headline: '',
    solution_description: '',
    key_features: '',
    market_size_tam: 0,
    market_size_sam: 0,
    market_size_som: 0,
    market_growth_rate: 0,
    revenue_model: '',
    average_deal_size: 0,
    target_customers: '',
    traction_metrics: '',
    key_customers: '',
    growth_rate: '',
    competitors: '',
    differentiation: '',
    team_members: '',
    advisors: '',
    current_revenue: 0,
    year1_projection: 0,
    year3_projection: 0,
    funding_amount: 0,
    use_of_funds: '',
    milestones: '',
  }), [template]);

  const form = useForm<PitchDeckFormData>({
    resolver: zodResolver(PitchDeckFormSchema),
    defaultValues,
  });

  // Draft persistence
  const {
    hasDraft,
    draftAge,
    isSaving,
    lastSaved,
    restoreDraft,
    dismissDraft,
    clearDraft,
  } = useDocFormDraft({
    form,
    templateId: 'pitch-deck',
  });

  // Optimized: subscription-based watch to avoid full re-renders
  const formValuesRef = useRef(defaultValues);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const subscription = form.watch((values) => {
      formValuesRef.current = values as typeof defaultValues;
      // Debounce preview update by 300ms
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        updatePreview(formValuesRef.current);
      }, 300);
    });
    // Initial preview
    updatePreview(form.getValues());
    return () => {
      subscription.unsubscribe();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [form, onPreviewUpdate]);

  const updatePreview = useCallback((fv: Partial<PitchDeckFormData>) => {
    const formValues = {
      company_name: '', tagline: '', presenter_name: '', presenter_title: '',
      problem_headline: '', problem_description: '', problem_impact: '',
      solution_headline: '', solution_description: '', key_features: '',
      market_size_tam: 0, market_size_sam: 0, market_size_som: 0, market_growth_rate: 0,
      revenue_model: '', average_deal_size: 0, target_customers: '',
      traction_metrics: '', key_customers: '', growth_rate: '',
      competitors: '', differentiation: '', team_members: '', advisors: '',
      current_revenue: 0, year1_projection: 0, year3_projection: 0,
      funding_amount: 0, use_of_funds: '', milestones: '',
      ...fv,
    };
    const safeValues = escapeFormValues(formValues);
    const formatCurrency = (n: number) => `$${n.toLocaleString('en-US')}`;
    const formatMillions = (n: number) => n >= 1000000000 ? `$${(n / 1000000000).toFixed(1)}B` : `$${(n / 1000000).toFixed(0)}M`;
    
    const rawHTML = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 26px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0; line-height: 1.3;">${safeValues.company_name || 'Company Name'}</h1>
        <p style="font-size: 13px; text-align: center; color: #444444; margin: 0 0 4px 0; font-style: italic;">${safeValues.tagline || ''}</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 6px 0;">Investor Pitch Deck</p>
        <p style="font-size: 11px; text-align: center; color: #555555; margin: 0 0 24px 0;">${safeValues.presenter_name || ''}${safeValues.presenter_title ? ' &mdash; ' + safeValues.presenter_title : ''}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">I. The Problem</h2>
          <p style="font-size: 14px; font-weight: bold; color: #111111; margin: 0 0 6px 0;">${safeValues.problem_headline || ''}</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;">${safeValues.problem_description || ''}</p>
          ${safeValues.problem_impact ? `<p style="font-size: 12px; color: #555555; padding-left: 12px; border-left: 2px solid #111111; margin: 0;"><strong>Impact:</strong> ${safeValues.problem_impact}</p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">II. Our Solution</h2>
          <p style="font-size: 14px; font-weight: bold; color: #111111; margin: 0 0 6px 0;">${safeValues.solution_headline || ''}</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;">${safeValues.solution_description || ''}</p>
          ${safeValues.key_features ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; white-space: pre-line;">${safeValues.key_features}</p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">III. Market Opportunity</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">TAM</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatMillions(formValues.market_size_tam || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">SAM</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatMillions(formValues.market_size_sam || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">SOM</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatMillions(formValues.market_size_som || 0)}</p></div>
          </div>
          <p style="font-size: 12px; color: #555555; margin: 0;">Market growing at <strong>${safeValues.market_growth_rate || 0}% CAGR</strong></p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">IV. Business Model</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; color: #555555; width: 35%;"><strong>Revenue Model</strong></td><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 12px;">${safeValues.revenue_model || ''}</td></tr>
              <tr><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; color: #555555;"><strong>Average Deal Size</strong></td><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 12px; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(formValues.average_deal_size || 0)}/yr</td></tr>
              <tr><td style="padding: 8px 0; color: #555555;"><strong>Target Customers</strong></td><td style="padding: 8px 12px;">${safeValues.target_customers || ''}</td></tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">V. Traction</h2>
          ${safeValues.traction_metrics ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0; white-space: pre-line;">${safeValues.traction_metrics}</p>` : ''}
          ${safeValues.key_customers ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 6px 0;"><strong>Key Customers:</strong> ${safeValues.key_customers}</p>` : ''}
          ${safeValues.growth_rate ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Growth:</strong> ${safeValues.growth_rate}</p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">VI. Competitive Landscape</h2>
          ${safeValues.competitors ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;"><strong>Competitors:</strong> ${safeValues.competitors}</p>` : ''}
          ${safeValues.differentiation ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; padding-left: 14px; border-left: 2px solid #111111;"><strong>Our Differentiation:</strong> ${safeValues.differentiation}</p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">VII. Team</h2>
          ${safeValues.team_members ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0; white-space: pre-line;">${safeValues.team_members}</p>` : ''}
          ${safeValues.advisors ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Advisors:</strong> ${safeValues.advisors}</p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">VIII. Financial Projections</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Current ARR</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.current_revenue || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Year 1</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.year1_projection || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Year 3</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.year3_projection || 0)}</p></div>
          </div>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">IX. The Ask</h2>
          <p style="font-size: 22px; font-weight: bold; font-family: 'Courier New',Courier,monospace; color: #000000; margin: 0 0 10px 0;">${formatCurrency(formValues.funding_amount || 0)}</p>
          ${safeValues.use_of_funds ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;"><strong>Use of Funds:</strong> ${safeValues.use_of_funds}</p>` : ''}
          ${safeValues.milestones ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; white-space: pre-line;"><strong>Key Milestones:</strong> ${safeValues.milestones}</p>` : ''}
        </section>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">CONFIDENTIAL &middot; ${safeValues.company_name || 'Company'} &middot; &copy; ${new Date().getFullYear()} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [onPreviewUpdate]);

  const onSubmit = (data: PitchDeckFormData) => {
    onGenerate(data);
  };

  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    // current_revenue is a real annualization of actual monthly revenue.
    // year1/year3_projection are deliberately left for the user to set —
    // the engine doesn't produce multi-year projections, and this form
    // previously invented them via hardcoded *3 / *10 growth multipliers.
    if (data.monthly_revenue) {
      form.setValue('current_revenue', data.monthly_revenue * 12);
    }
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Pitch Deck Generator Form">
      {/* Draft Recovery */}
      <DocDraftBanner
        hasDraft={hasDraft}
        draftAge={draftAge}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
      />

      {/* Auto-fill */}
      <div className="flex items-center justify-between">
        <AutoFillButton onAutoFill={handleAutoFill} disabled={isGenerating} />
      </div>

      {/* Cover Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Presentation className="w-5 h-5 text-primary" aria-hidden="true" />
            Cover Slide
          </CardTitle>
          <CardDescription>Your opening slide that sets the tone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name <span className="text-destructive">*</span></Label>
              <Input id="company_name" {...form.register('company_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="tagline">Tagline <span className="text-destructive">*</span></Label>
              <Input id="tagline" {...form.register('tagline')} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="presenter_name">Presenter Name <span className="text-destructive">*</span></Label>
              <Input id="presenter_name" {...form.register('presenter_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="presenter_title">Title <span className="text-destructive">*</span></Label>
              <Input id="presenter_title" {...form.register('presenter_title')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Problem Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-destructive" aria-hidden="true" />
            The Problem
          </CardTitle>
          <CardDescription>What pain point are you addressing?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="problem_headline">Problem Headline <span className="text-destructive">*</span></Label>
            <Input id="problem_headline" {...form.register('problem_headline')} className="mt-1" placeholder="A bold statement about the problem" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="problem_description">Problem Description <span className="text-destructive">*</span></Label>
              <AISuggestionButton
                sectionType="market_analysis"
                context={{ business_name: form.getValues('company_name') }}
                onApply={(s) => form.setValue('problem_description', s)}
              />
            </div>
            <Textarea id="problem_description" {...form.register('problem_description')} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="problem_impact">Impact / Stats <span className="text-destructive">*</span></Label>
            <Input id="problem_impact" {...form.register('problem_impact')} className="mt-1" placeholder="$X billion lost annually, Y% failure rate" />
          </div>
        </CardContent>
      </Card>

      {/* Solution Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-success" aria-hidden="true" />
            Your Solution
          </CardTitle>
          <CardDescription>How do you solve the problem?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="solution_headline">Solution Headline <span className="text-destructive">*</span></Label>
            <Input id="solution_headline" {...form.register('solution_headline')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="solution_description">Solution Description <span className="text-destructive">*</span></Label>
            <Textarea id="solution_description" {...form.register('solution_description')} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="key_features">Key Features (one per line) <span className="text-destructive">*</span></Label>
            <Textarea id="key_features" {...form.register('key_features')} rows={4} className="mt-1" placeholder="• Feature 1&#10;• Feature 2&#10;• Feature 3" />
          </div>
        </CardContent>
      </Card>

      {/* Market Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
            Market Opportunity
          </CardTitle>
          <CardDescription>TAM / SAM / SOM analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="market_size_tam">TAM ($)</Label>
              <Input id="market_size_tam" type="number" {...form.register('market_size_tam', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="market_size_sam">SAM ($)</Label>
              <Input id="market_size_sam" type="number" {...form.register('market_size_sam', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="market_size_som">SOM ($)</Label>
              <Input id="market_size_som" type="number" {...form.register('market_size_som', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="market_growth_rate">Market Growth Rate (% CAGR)</Label>
            <Input id="market_growth_rate" type="number" {...form.register('market_growth_rate', { valueAsNumber: true })} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Business Model Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-warning" aria-hidden="true" />
            Business Model
          </CardTitle>
          <CardDescription>How you make money</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="revenue_model">Revenue Model <span className="text-destructive">*</span></Label>
            <Textarea id="revenue_model" {...form.register('revenue_model')} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="average_deal_size">Average Deal Size ($/year)</Label>
              <Input id="average_deal_size" type="number" {...form.register('average_deal_size', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="target_customers">Target Customers <span className="text-destructive">*</span></Label>
              <Input id="target_customers" {...form.register('target_customers')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traction Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" aria-hidden="true" />
            Traction
          </CardTitle>
          <CardDescription>Proof that your business is working</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="traction_metrics">Key Metrics (one per line) <span className="text-destructive">*</span></Label>
            <Textarea id="traction_metrics" {...form.register('traction_metrics')} rows={4} className="mt-1" placeholder="• $X ARR&#10;• Y customers&#10;• Z% growth" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="key_customers">Key Customers</Label>
              <Input id="key_customers" {...form.register('key_customers')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="growth_rate">Growth Rate</Label>
              <Input id="growth_rate" {...form.register('growth_rate')} className="mt-1" placeholder="3x YoY" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competition Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" aria-hidden="true" />
            Competition
          </CardTitle>
          <CardDescription>Who else is in the market?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="competitors">Competitors <span className="text-destructive">*</span></Label>
            <Textarea id="competitors" {...form.register('competitors')} rows={2} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="differentiation">Your Differentiation <span className="text-destructive">*</span></Label>
            <Textarea id="differentiation" {...form.register('differentiation')} rows={2} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Team Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" aria-hidden="true" />
            Team
          </CardTitle>
          <CardDescription>Who's building this company?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="team_members">Team Members (one per line) <span className="text-destructive">*</span></Label>
            <Textarea id="team_members" {...form.register('team_members')} rows={4} className="mt-1" placeholder="• Name, Role - Experience&#10;• Name, Role - Experience" />
          </div>
          <div>
            <Label htmlFor="advisors">Advisors</Label>
            <Textarea id="advisors" {...form.register('advisors')} rows={2} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Financials Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
            Financial Projections
          </CardTitle>
          <CardDescription>Revenue trajectory</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="current_revenue">Current ARR ($)</Label>
              <Input id="current_revenue" type="number" {...form.register('current_revenue', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="year1_projection">Year 1 Projection ($)</Label>
              <Input id="year1_projection" type="number" {...form.register('year1_projection', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="year3_projection">Year 3 Projection ($)</Label>
              <Input id="year3_projection" type="number" {...form.register('year3_projection', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The Ask Slide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
            The Ask
          </CardTitle>
          <CardDescription>What you need from investors</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="funding_amount">Funding Amount ($)</Label>
            <Input id="funding_amount" type="number" {...form.register('funding_amount', { valueAsNumber: true })} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="use_of_funds">Use of Funds <span className="text-destructive">*</span></Label>
            <Textarea id="use_of_funds" {...form.register('use_of_funds')} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="milestones">Key Milestones <span className="text-destructive">*</span></Label>
            <Textarea id="milestones" {...form.register('milestones')} rows={4} className="mt-1" placeholder="• Q2: Milestone 1&#10;• Q4: Milestone 2" />
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
