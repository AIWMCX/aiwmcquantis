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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937;">
        
        <!-- Slide 1: Cover -->
        <div style="min-height: 400px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 48px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; letter-spacing: 2px; margin: 0 0 16px 0; opacity: 0.8;">INVESTOR PITCH DECK</p>
          <h1 style="font-size: 48px; font-weight: 700; margin: 0 0 16px 0;">${safeValues.company_name || 'Company Name'}</h1>
          <p style="font-size: 20px; margin: 0 0 32px 0; opacity: 0.9;">${safeValues.tagline || 'Tagline'}</p>
          <div style="margin-top: 48px;">
            <p style="margin: 0; font-size: 14px;">${safeValues.presenter_name || 'Name'} • ${safeValues.presenter_title || 'Title'}</p>
          </div>
        </div>

        <!-- Slide 2: Problem -->
        <div style="padding: 32px; background: #fef2f2; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #dc2626; font-weight: 600; margin: 0 0 8px 0;">THE PROBLEM</p>
          <h2 style="font-size: 32px; font-weight: 700; color: #dc2626; margin: 0 0 16px 0;">${safeValues.problem_headline || 'Problem'}</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">${safeValues.problem_description || ''}</p>
          <div style="padding: 16px; background: white; border-radius: 8px; font-weight: 600; color: #dc2626;">
            Impact: ${safeValues.problem_impact || ''}
          </div>
        </div>

        <!-- Slide 3: Solution -->
        <div style="padding: 32px; background: #ecfdf5; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #10b981; font-weight: 600; margin: 0 0 8px 0;">OUR SOLUTION</p>
          <h2 style="font-size: 32px; font-weight: 700; color: #10b981; margin: 0 0 16px 0;">${safeValues.solution_headline || 'Solution'}</h2>
          <p style="font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">${safeValues.solution_description || ''}</p>
          <div style="padding: 16px; background: white; border-radius: 8px; white-space: pre-line;">
            ${safeValues.key_features || ''}
          </div>
        </div>

        <!-- Slide 4: Market -->
        <div style="padding: 32px; background: #f0f9ff; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #2563eb; font-weight: 600; margin: 0 0 8px 0;">MARKET OPPORTUNITY</p>
          <h2 style="font-size: 32px; font-weight: 700; color: #2563eb; margin: 0 0 24px 0;">TAM / SAM / SOM</h2>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">TAM</p>
              <p style="font-size: 36px; font-weight: 700; color: #2563eb; margin: 8px 0;">${formatMillions(formValues.market_size_tam || 0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">SAM</p>
              <p style="font-size: 36px; font-weight: 700; color: #2563eb; margin: 8px 0;">${formatMillions(formValues.market_size_sam || 0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">SOM</p>
              <p style="font-size: 36px; font-weight: 700; color: #2563eb; margin: 8px 0;">${formatMillions(formValues.market_size_som || 0)}</p>
            </div>
          </div>
          <p style="text-align: center; margin-top: 16px; font-size: 14px; color: #6b7280;">
            Market growing at <strong style="color: #2563eb;">${safeValues.market_growth_rate || 0}% CAGR</strong>
          </p>
        </div>

        <!-- Slide 5: Business Model -->
        <div style="padding: 32px; background: #fefce8; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #ca8a04; font-weight: 600; margin: 0 0 8px 0;">BUSINESS MODEL</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #ca8a04; margin: 0 0 24px 0;">How We Make Money</h2>
          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Revenue Model:</strong> ${safeValues.revenue_model || ''}
            </div>
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Average Deal Size:</strong> ${formatCurrency(formValues.average_deal_size || 0)}/year
            </div>
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Target Customers:</strong> ${safeValues.target_customers || ''}
            </div>
          </div>
        </div>

        <!-- Slide 6: Traction -->
        <div style="padding: 32px; background: #f0fdf4; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #16a34a; font-weight: 600; margin: 0 0 8px 0;">TRACTION</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #16a34a; margin: 0 0 24px 0;">Proof Points</h2>
          <div style="padding: 16px; background: white; border-radius: 8px; white-space: pre-line; margin-bottom: 16px;">
            ${safeValues.traction_metrics || ''}
          </div>
          ${safeValues.key_customers ? `<p><strong>Key Customers:</strong> ${safeValues.key_customers}</p>` : ''}
          ${safeValues.growth_rate ? `<p><strong>Growth:</strong> ${safeValues.growth_rate}</p>` : ''}
        </div>

        <!-- Slide 7: Competition -->
        <div style="padding: 32px; background: #fff7ed; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #ea580c; font-weight: 600; margin: 0 0 8px 0;">COMPETITIVE LANDSCAPE</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #ea580c; margin: 0 0 24px 0;">Why We Win</h2>
          <div style="display: grid; gap: 16px;">
            <div style="padding: 16px; background: white; border-radius: 8px;">
              <strong>Competitors:</strong> ${safeValues.competitors || ''}
            </div>
            <div style="padding: 16px; background: #ea580c; color: white; border-radius: 8px;">
              <strong>Our Differentiation:</strong> ${safeValues.differentiation || ''}
            </div>
          </div>
        </div>

        <!-- Slide 8: Team -->
        <div style="padding: 32px; background: #faf5ff; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #9333ea; font-weight: 600; margin: 0 0 8px 0;">THE TEAM</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #9333ea; margin: 0 0 24px 0;">Who's Building This</h2>
          <div style="padding: 16px; background: white; border-radius: 8px; white-space: pre-line; margin-bottom: 16px;">
            ${safeValues.team_members || ''}
          </div>
          ${safeValues.advisors ? `<p style="color: #6b7280;"><strong>Advisors:</strong> ${safeValues.advisors}</p>` : ''}
        </div>

        <!-- Slide 9: Financials -->
        <div style="padding: 32px; background: #f0f9ff; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; color: #2563eb; font-weight: 600; margin: 0 0 8px 0;">FINANCIAL PROJECTIONS</p>
          <h2 style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 0 0 24px 0;">Path to Scale</h2>
          <div style="display: flex; gap: 16px; justify-content: center;">
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Current ARR</p>
              <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 8px 0;">${formatCurrency(formValues.current_revenue || 0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Year 1</p>
              <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 8px 0;">${formatCurrency(formValues.year1_projection || 0)}</p>
            </div>
            <div style="flex: 1; padding: 24px; background: white; border-radius: 12px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Year 3</p>
              <p style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 8px 0;">${formatCurrency(formValues.year3_projection || 0)}</p>
            </div>
          </div>
        </div>

        <!-- Slide 10: The Ask -->
        <div style="min-height: 400px; display: flex; flex-direction: column; justify-content: center; padding: 48px; background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; border-radius: 16px; margin-bottom: 24px;">
          <p style="font-size: 12px; letter-spacing: 2px; margin: 0 0 16px 0; opacity: 0.8;">THE ASK</p>
          <h2 style="font-size: 48px; font-weight: 700; margin: 0 0 32px 0;">${formatCurrency(formValues.funding_amount || 0)}</h2>
          
          <div style="display: grid; gap: 24px;">
            <div>
              <p style="font-size: 14px; opacity: 0.8; margin: 0 0 8px 0;">Use of Funds:</p>
              <p style="font-size: 16px; white-space: pre-line; margin: 0;">${safeValues.use_of_funds || ''}</p>
            </div>
            <div>
              <p style="font-size: 14px; opacity: 0.8; margin: 0 0 8px 0;">Key Milestones:</p>
              <p style="font-size: 16px; white-space: pre-line; margin: 0;">${safeValues.milestones || ''}</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Confidential - ${safeValues.company_name || 'Company'} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis™</a></p>
        </div>
      </div>
    `;
    
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [onPreviewUpdate]);

  const onSubmit = (data: PitchDeckFormData) => {
    onGenerate(data);
  };

  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.monthly_revenue) {
      form.setValue('current_revenue', data.monthly_revenue * 12);
      form.setValue('year1_projection', data.monthly_revenue * 12 * 3);
      form.setValue('year3_projection', data.monthly_revenue * 12 * 10);
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

      {/* Submit */}
      <div className="flex items-center justify-end gap-4 pt-4">
        <Button type="submit" size="lg" disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              Generating...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              Generate Pitch Deck
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
