import React, { useEffect, useMemo, useCallback } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, FileText, Target, Users, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DocTemplate } from '@/types/document';

const BusinessPlanFormSchema = z.object({
  // Executive Summary
  company_name: z.string().min(2, 'Company name required'),
  tagline: z.string().min(5, 'Tagline required'),
  executive_summary: z.string().min(100, 'Executive summary must be at least 100 characters'),
  
  // Problem & Solution
  problem_statement: z.string().min(50, 'Problem statement must be at least 50 characters'),
  solution_description: z.string().min(50, 'Solution description must be at least 50 characters'),
  unique_value_proposition: z.string().min(20, 'Value proposition required'),
  
  // Market Analysis
  target_market: z.string().min(20, 'Target market description required'),
  market_size_tam: z.number().min(0, 'TAM required'),
  market_size_sam: z.number().min(0, 'SAM required'),
  market_size_som: z.number().min(0, 'SOM required'),
  competitive_advantage: z.string().min(30, 'Competitive advantage required'),
  
  // Business Model
  revenue_model: z.string().min(20, 'Revenue model required'),
  pricing_strategy: z.string().min(10, 'Pricing strategy required'),
  sales_channels: z.string().min(10, 'Sales channels required'),
  
  // Financial Projections
  year1_revenue: z.number().min(0),
  year2_revenue: z.number().min(0),
  year3_revenue: z.number().min(0),
  startup_costs: z.number().min(0),
  monthly_burn_rate: z.number().min(0),
  break_even_months: z.number().min(0).max(120),
  
  // Team
  founders: z.string().min(10, 'Founders information required'),
  team_size: z.number().min(1),
  key_hires_needed: z.string().optional(),
  
  // Risk & Milestones
  key_risks: z.string().min(20, 'Key risks required'),
  milestones: z.string().min(20, 'Milestones required'),
  
  // Funding
  funding_stage: z.string(),
  funding_amount: z.number().min(0),
  use_of_funds: z.string().min(20, 'Use of funds required'),
});

type BusinessPlanFormData = z.infer<typeof BusinessPlanFormSchema>;

interface BusinessPlanFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function BusinessPlanForm({ template, onGenerate, onPreviewUpdate, isGenerating }: BusinessPlanFormProps) {
  const defaultValues = useMemo(() => ({
    company_name: '',
    tagline: '',
    executive_summary: '',
    
    problem_statement: '',
    solution_description: '',
    unique_value_proposition: '',
    
    target_market: '',
    market_size_tam: 0,
    market_size_sam: 0,
    market_size_som: 0,
    competitive_advantage: '',
    
    revenue_model: '',
    pricing_strategy: '',
    sales_channels: '',
    
    year1_revenue: 0,
    year2_revenue: 0,
    year3_revenue: 0,
    startup_costs: 0,
    monthly_burn_rate: 0,
    break_even_months: 0,
    
    founders: '',
    team_size: 1,
    key_hires_needed: '',
    
    key_risks: '',
    milestones: '',
    
    funding_stage: 'seed',
    funding_amount: 0,
    use_of_funds: '',
  }), [template]);

  const form = useForm<BusinessPlanFormData>({
    resolver: zodResolver(BusinessPlanFormSchema),
    defaultValues,
  });

  // Auto-save draft functionality
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
    templateId: 'business-plan',
  });

  const formValues = form.watch();

  // Generate preview HTML
  useEffect(() => {
    const safeValues = escapeFormValues(formValues);
    const formatCurrency = (n: number) => `$${n.toLocaleString('en-US')}`;
    const formatMillions = (n: number) => `$${(n / 1000000000).toFixed(1)}B`;
    
    const rawHTML = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 26px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 8px 0; line-height: 1.3;">${safeValues.company_name || 'Company Name'}</h1>
        <p style="font-size: 13px; text-align: center; color: #444444; margin: 0 0 4px 0; font-style: italic;">${safeValues.tagline || ''}</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">Business Plan &middot; ${new Date().getFullYear()}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Executive Summary</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111;">${safeValues.executive_summary || ''}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Problem &amp; Solution</h2>
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">The Problem</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 14px 0; padding-left: 14px; border-left: 2px solid #cccccc;">${safeValues.problem_statement || ''}</p>
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Our Solution</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 14px 0; padding-left: 14px; border-left: 2px solid #111111;">${safeValues.solution_description || ''}</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Value Proposition:</strong> ${safeValues.unique_value_proposition || ''}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Market Analysis</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 12px 0;"><strong>Target Market:</strong> ${safeValues.target_market || ''}</p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 0 0 12px 0;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">TAM</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatMillions(formValues.market_size_tam || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">SAM</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatMillions(formValues.market_size_sam || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">SOM</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatMillions(formValues.market_size_som || 0)}</p></div>
          </div>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Competitive Advantage:</strong> ${safeValues.competitive_advantage || ''}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Business Model</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; color: #555555; width: 30%; vertical-align: top;"><strong>Revenue Model</strong></td><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 12px;">${safeValues.revenue_model || ''}</td></tr>
              <tr><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; color: #555555; vertical-align: top;"><strong>Pricing Strategy</strong></td><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 12px;">${safeValues.pricing_strategy || ''}</td></tr>
              <tr><td style="padding: 8px 0; color: #555555; vertical-align: top;"><strong>Sales Channels</strong></td><td style="padding: 8px 12px;">${safeValues.sales_channels || ''}</td></tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Financial Projections</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px;">
            <thead>
              <tr>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: left;">Metric</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Year 1</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Year 2</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px;">Revenue</td>
                <td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(formValues.year1_revenue || 0)}</td>
                <td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(formValues.year2_revenue || 0)}</td>
                <td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(formValues.year3_revenue || 0)}</td>
              </tr>
            </tbody>
          </table>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Startup Costs</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.startup_costs || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Monthly Burn</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.monthly_burn_rate || 0)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Break-Even</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formValues.break_even_months || 0} mo</p></div>
          </div>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Team</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 6px 0;"><strong>Founders:</strong> ${safeValues.founders || ''}</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 6px 0;"><strong>Current Team Size:</strong> ${safeValues.team_size} employees</p>
          ${safeValues.key_hires_needed ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Key Hires Needed:</strong> ${safeValues.key_hires_needed}</p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Risks &amp; Milestones</h2>
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Key Risks</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 14px 0; white-space: pre-line;">${safeValues.key_risks || ''}</p>
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Key Milestones</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; white-space: pre-line;">${safeValues.milestones || ''}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Funding Request</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;">Seeking <strong>${safeValues.funding_stage?.toUpperCase() || 'SEED'} round</strong> &mdash; <strong style="font-family: 'Courier New',Courier,monospace; font-size: 15px;">${formatCurrency(formValues.funding_amount || 0)}</strong></p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Use of Funds:</strong> ${safeValues.use_of_funds || ''}</p>
        </section>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">CONFIDENTIAL &middot; ${safeValues.company_name || 'Company'} &middot; &copy; ${new Date().getFullYear()} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [formValues, onPreviewUpdate]);

  const onSubmit = (data: BusinessPlanFormData) => {
    clearDraft(); // Clear draft on successful submit
    onGenerate(data);
  };

  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.monthly_revenue) {
      form.setValue('year1_revenue', data.monthly_revenue * 12);
      form.setValue('year2_revenue', data.monthly_revenue * 12 * 2.5);
      form.setValue('year3_revenue', data.monthly_revenue * 12 * 5);
    }
    if (data.startup_investment) form.setValue('startup_costs', data.startup_investment);
    if (data.payback_months) form.setValue('break_even_months', data.payback_months);
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Business Plan Generator Form">
      {/* Draft Recovery Banner */}
      <DocDraftBanner
        hasDraft={hasDraft}
        draftAge={draftAge}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
      />

      {/* Auto-fill from Quantis Analysis */}
      <div className="flex items-center justify-between">
        <AutoFillButton onAutoFill={handleAutoFill} disabled={isGenerating} />
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            Executive Summary
          </CardTitle>
          <CardDescription>Provide a compelling overview of your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name <span className="text-destructive" aria-label="required">*</span></Label>
              <Input 
                id="company_name"
                {...form.register('company_name')} 
                className="mt-1"
                aria-describedby={form.formState.errors.company_name ? 'company_name-error' : undefined}
                aria-invalid={!!form.formState.errors.company_name}
              />
              {form.formState.errors.company_name && (
                <p id="company_name-error" className="text-sm text-destructive mt-1" role="alert">
                  {form.formState.errors.company_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="tagline">Tagline <span className="text-destructive" aria-label="required">*</span></Label>
              <Input id="tagline" {...form.register('tagline')} className="mt-1" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="executive_summary">Executive Summary <span className="text-destructive" aria-label="required">*</span></Label>
              <AISuggestionButton
                sectionType="executive_summary"
                context={{ 
                  business_name: formValues.company_name,
                  industry: 'Technology',
                }}
                onApply={(suggestion) => form.setValue('executive_summary', suggestion)}
              />
            </div>
            <Textarea
              id="executive_summary"
              {...form.register('executive_summary')}
              rows={5}
              className="mt-1"
              aria-describedby="executive_summary-hint"
            />
            <p id="executive_summary-hint" className="text-xs text-muted-foreground mt-1">
              Minimum 100 characters. Summarize your business opportunity concisely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Problem & Solution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" aria-hidden="true" />
            Problem & Solution
          </CardTitle>
          <CardDescription>What problem do you solve and how?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="problem_statement">Problem Statement <span className="text-destructive">*</span></Label>
              <AISuggestionButton
                sectionType="market_analysis"
                context={{ business_name: formValues.company_name }}
                onApply={(suggestion) => form.setValue('problem_statement', suggestion)}
              />
            </div>
            <Textarea id="problem_statement" {...form.register('problem_statement')} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="solution_description">Your Solution <span className="text-destructive">*</span></Label>
            <Textarea id="solution_description" {...form.register('solution_description')} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="unique_value_proposition">Unique Value Proposition <span className="text-destructive">*</span></Label>
            <Input id="unique_value_proposition" {...form.register('unique_value_proposition')} className="mt-1" placeholder="One sentence that captures your unique value" />
          </div>
        </CardContent>
      </Card>

      {/* Market Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
            Market Analysis
          </CardTitle>
          <CardDescription>Define your market size and opportunity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="target_market">Target Market Description <span className="text-destructive">*</span></Label>
            <Textarea id="target_market" {...form.register('target_market')} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="market_size_tam">TAM (Total Addressable Market) <span className="text-destructive">*</span></Label>
              <Input
                id="market_size_tam"
                type="number"
                {...form.register('market_size_tam', { valueAsNumber: true })}
                className="mt-1"
                placeholder="$150,000,000,000"
              />
              <p className="text-xs text-muted-foreground mt-1">In USD</p>
            </div>
            <div>
              <Label htmlFor="market_size_sam">SAM (Serviceable Market) <span className="text-destructive">*</span></Label>
              <Input
                id="market_size_sam"
                type="number"
                {...form.register('market_size_sam', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="market_size_som">SOM (Obtainable Market) <span className="text-destructive">*</span></Label>
              <Input
                id="market_size_som"
                type="number"
                {...form.register('market_size_som', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="competitive_advantage">Competitive Advantage <span className="text-destructive">*</span></Label>
            <Textarea id="competitive_advantage" {...form.register('competitive_advantage')} rows={2} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Business Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
            Business Model
          </CardTitle>
          <CardDescription>How will you make money?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="revenue_model">Revenue Model <span className="text-destructive">*</span></Label>
            <Textarea id="revenue_model" {...form.register('revenue_model')} rows={2} className="mt-1" placeholder="Describe your revenue streams" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pricing_strategy">Pricing Strategy <span className="text-destructive">*</span></Label>
              <Input id="pricing_strategy" {...form.register('pricing_strategy')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="sales_channels">Sales Channels <span className="text-destructive">*</span></Label>
              <Input id="sales_channels" {...form.register('sales_channels')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Projections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
            Financial Projections
          </CardTitle>
          <CardDescription>3-year revenue projections and key metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year1_revenue">Year 1 Revenue ($)</Label>
              <Input
                id="year1_revenue"
                type="number"
                {...form.register('year1_revenue', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="year2_revenue">Year 2 Revenue ($)</Label>
              <Input
                id="year2_revenue"
                type="number"
                {...form.register('year2_revenue', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="year3_revenue">Year 3 Revenue ($)</Label>
              <Input
                id="year3_revenue"
                type="number"
                {...form.register('year3_revenue', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startup_costs">Startup Costs ($)</Label>
              <Input
                id="startup_costs"
                type="number"
                {...form.register('startup_costs', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="monthly_burn_rate">Monthly Burn Rate ($)</Label>
              <Input
                id="monthly_burn_rate"
                type="number"
                {...form.register('monthly_burn_rate', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="break_even_months">Break-even (months)</Label>
              <Input
                id="break_even_months"
                type="number"
                min={0}
                max={120}
                {...form.register('break_even_months', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" aria-hidden="true" />
            Team
          </CardTitle>
          <CardDescription>Your founding team and hiring plans</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="founders">Founders & Key Experience <span className="text-destructive">*</span></Label>
            <Textarea id="founders" {...form.register('founders')} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="team_size">Current Team Size</Label>
              <Input
                id="team_size"
                type="number"
                min={1}
                {...form.register('team_size', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="key_hires_needed">Key Hires Needed</Label>
              <Input id="key_hires_needed" {...form.register('key_hires_needed')} className="mt-1" placeholder="VP Sales, Engineers, etc." />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risks & Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-primary" aria-hidden="true" />
            Risks & Milestones
          </CardTitle>
          <CardDescription>Key risks and upcoming milestones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="key_risks">Key Risks <span className="text-destructive">*</span></Label>
              <AISuggestionButton
                sectionType="risk_assessment"
                context={{ business_name: formValues.company_name }}
                onApply={(suggestion) => form.setValue('key_risks', suggestion)}
              />
            </div>
            <Textarea id="key_risks" {...form.register('key_risks')} rows={3} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="milestones">Key Milestones <span className="text-destructive">*</span></Label>
            <Textarea id="milestones" {...form.register('milestones')} rows={3} className="mt-1" placeholder="Q1: Launch product&#10;Q2: 100 customers&#10;Q3: Profitability" />
          </div>
        </CardContent>
      </Card>

      {/* Funding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
            Funding Request
          </CardTitle>
          <CardDescription>Your funding needs and use of capital</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="funding_stage">Funding Stage</Label>
              <Select
                value={formValues.funding_stage}
                onValueChange={(value) => form.setValue('funding_stage', value)}
              >
                <SelectTrigger id="funding_stage" className="mt-1">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                  <SelectItem value="seed">Seed</SelectItem>
                  <SelectItem value="series-a">Series A</SelectItem>
                  <SelectItem value="series-b">Series B</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="funding_amount">Funding Amount ($)</Label>
              <Input
                id="funding_amount"
                type="number"
                {...form.register('funding_amount', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="use_of_funds">Use of Funds <span className="text-destructive">*</span></Label>
            <Textarea id="use_of_funds" {...form.register('use_of_funds')} rows={2} className="mt-1" placeholder="Product (40%), Sales (35%), Operations (15%), Reserve (10%)" />
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
