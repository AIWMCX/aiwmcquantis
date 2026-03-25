import React, { useEffect, useMemo, useCallback } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, FileText, Target, DollarSign, Users } from 'lucide-react';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import type { AutoFillData } from '@/hooks/useAnalysisAutoFill';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DocTemplate } from '@/types/document';

const OnePagePlanFormSchema = z.object({
  // Header
  company_name: z.string().min(2, 'Company name required'),
  tagline: z.string().min(5, 'Tagline required'),
  website: z.string().optional(),
  contact_email: z.string().email().optional(),
  
  // Vision & Mission
  vision: z.string().min(10, 'Vision statement required'),
  mission: z.string().min(10, 'Mission statement required'),
  
  // Problem & Solution
  problem: z.string().min(20, 'Problem description required'),
  solution: z.string().min(20, 'Solution description required'),
  
  // Target Market
  target_customer: z.string().min(10, 'Target customer required'),
  market_size: z.string().min(5, 'Market size required'),
  
  // Value Proposition
  value_proposition: z.string().min(20, 'Value proposition required'),
  key_differentiator: z.string().min(10, 'Differentiator required'),
  
  // Revenue Model
  revenue_streams: z.string().min(10, 'Revenue streams required'),
  pricing: z.string().min(5, 'Pricing required'),
  
  // Key Metrics
  metric_1_name: z.string().min(2, 'Metric name required'),
  metric_1_value: z.string().min(1, 'Metric value required'),
  metric_2_name: z.string().min(2, 'Metric name required'),
  metric_2_value: z.string().min(1, 'Metric value required'),
  metric_3_name: z.string().min(2, 'Metric name required'),
  metric_3_value: z.string().min(1, 'Metric value required'),
  
  // Team
  founders: z.string().min(5, 'Founders required'),
  team_size: z.string().optional(),
  
  // Goals
  short_term_goals: z.string().min(10, 'Short-term goals required'),
  long_term_goals: z.string().min(10, 'Long-term goals required'),
});

type OnePagePlanFormData = z.infer<typeof OnePagePlanFormSchema>;

interface OnePagePlanFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function OnePagePlanForm({ template, onGenerate, onPreviewUpdate, isGenerating }: OnePagePlanFormProps) {
  const defaultValues = useMemo(() => ({
    company_name: '',
    tagline: '',
    website: '',
    contact_email: '',
    
    vision: '',
    mission: '',
    
    problem: '',
    solution: '',
    
    target_customer: '',
    market_size: '',
    
    value_proposition: '',
    key_differentiator: '',
    
    revenue_streams: '',
    pricing: '',
    
    metric_1_name: 'Revenue',
    metric_1_value: '',
    metric_2_name: 'Customers',
    metric_2_value: '',
    metric_3_name: 'Growth',
    metric_3_value: '',
    
    founders: '',
    team_size: '',
    
    short_term_goals: '',
    long_term_goals: '',
  }), [template]);

  const form = useForm<OnePagePlanFormData>({
    resolver: zodResolver(OnePagePlanFormSchema),
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
    templateId: 'one-page-plan',
  });

  const formValues = form.watch();

  // Generate preview HTML
  useEffect(() => {
    const safeValues = escapeFormValues(formValues);
    
    const rawHTML = `
      <div style="font-family: 'DM Sans', 'Inter', sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <!-- Header -->
        <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border-radius: 12px; margin-bottom: 24px;">
          <h1 style="font-family: 'Sora', sans-serif; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">${safeValues.company_name || 'Company'}</h1>
          <p style="font-size: 16px; margin: 8px 0 0 0; opacity: 0.9;">${safeValues.tagline || 'Tagline'}</p>
          ${safeValues.website ? `<p style="font-size: 12px; margin: 12px 0 0 0; opacity: 0.8;">${safeValues.website} • ${safeValues.contact_email || ''}</p>` : ''}
        </div>

        <!-- Main Grid -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
          
          <!-- Vision & Mission -->
          <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="font-size: 12px; font-weight: 600; color: #2563eb; margin: 0 0 8px 0;">VISION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.vision || ''}</p>
          </div>
          
          <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="font-size: 12px; font-weight: 600; color: #2563eb; margin: 0 0 8px 0;">MISSION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.mission || ''}</p>
          </div>

          <!-- Problem & Solution -->
          <div style="padding: 16px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626;">
            <h3 style="font-size: 12px; font-weight: 600; color: #dc2626; margin: 0 0 8px 0;">PROBLEM</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.problem || ''}</p>
          </div>
          
          <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
            <h3 style="font-size: 12px; font-weight: 600; color: #10b981; margin: 0 0 8px 0;">SOLUTION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.solution || ''}</p>
          </div>

          <!-- Target Market -->
          <div style="padding: 16px; background: #faf5ff; border-radius: 8px; border-left: 4px solid #9333ea;">
            <h3 style="font-size: 12px; font-weight: 600; color: #9333ea; margin: 0 0 8px 0;">TARGET CUSTOMER</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.target_customer || ''}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;"><strong>Market:</strong> ${safeValues.market_size || ''}</p>
          </div>

          <!-- Value Proposition -->
          <div style="padding: 16px; background: #fefce8; border-radius: 8px; border-left: 4px solid #ca8a04;">
            <h3 style="font-size: 12px; font-weight: 600; color: #ca8a04; margin: 0 0 8px 0;">VALUE PROPOSITION</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.value_proposition || ''}</p>
            <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;"><strong>Differentiator:</strong> ${safeValues.key_differentiator || ''}</p>
          </div>

          <!-- Revenue Model -->
          <div style="grid-column: span 2; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #16a34a;">
            <h3 style="font-size: 12px; font-weight: 600; color: #16a34a; margin: 0 0 8px 0;">REVENUE MODEL</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <p style="font-size: 13px; margin: 0;"><strong>Streams:</strong> ${safeValues.revenue_streams || ''}</p>
              <p style="font-size: 13px; margin: 0;"><strong>Pricing:</strong> ${safeValues.pricing || ''}</p>
            </div>
          </div>

          <!-- Key Metrics -->
          <div style="grid-column: span 2; padding: 16px; background: #f9fafb; border-radius: 8px;">
            <h3 style="font-size: 12px; font-weight: 600; color: #374151; margin: 0 0 12px 0;">KEY METRICS</h3>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
              <div style="text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 20px; font-weight: 700; color: #2563eb; margin: 0; font-family: 'JetBrains Mono', monospace;">${safeValues.metric_1_value || '-'}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${safeValues.metric_1_name || ''}</p>
              </div>
              <div style="text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 0; font-family: 'JetBrains Mono', monospace;">${safeValues.metric_2_value || '-'}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${safeValues.metric_2_name || ''}</p>
              </div>
              <div style="text-align: center; padding: 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="font-size: 20px; font-weight: 700; color: #9333ea; margin: 0; font-family: 'JetBrains Mono', monospace;">${safeValues.metric_3_value || '-'}</p>
                <p style="font-size: 11px; color: #6b7280; margin: 4px 0 0 0;">${safeValues.metric_3_name || ''}</p>
              </div>
            </div>
          </div>

          <!-- Team -->
          <div style="padding: 16px; background: #fff7ed; border-radius: 8px; border-left: 4px solid #ea580c;">
            <h3 style="font-size: 12px; font-weight: 600; color: #ea580c; margin: 0 0 8px 0;">TEAM</h3>
            <p style="font-size: 13px; margin: 0; line-height: 1.5;">${safeValues.founders || ''}</p>
            ${safeValues.team_size ? `<p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">${safeValues.team_size}</p>` : ''}
          </div>

          <!-- Goals -->
          <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <h3 style="font-size: 12px; font-weight: 600; color: #2563eb; margin: 0 0 8px 0;">GOALS</h3>
            <p style="font-size: 12px; margin: 0;"><strong>Short-term:</strong> ${safeValues.short_term_goals || ''}</p>
            <p style="font-size: 12px; margin: 8px 0 0 0;"><strong>Long-term:</strong> ${safeValues.long_term_goals || ''}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
          <p>One-Page Business Plan - ${safeValues.company_name || 'Company'} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 4px; font-size: 10px;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
        </div>
      </div>
    `;
    
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [formValues, onPreviewUpdate]);

  const onSubmit = (data: OnePagePlanFormData) => {
    clearDraft(); // Clear draft on successful submit
    onGenerate(data);
  };

  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.monthly_revenue) {
      form.setValue('metric_1_name', 'Monthly Revenue');
      form.setValue('metric_1_value', `$${data.monthly_revenue.toLocaleString()}`);
    }
    if (data.roi) {
      form.setValue('metric_2_name', 'ROI');
      form.setValue('metric_2_value', `${data.roi}%`);
    }
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="One-Page Business Plan Form">
      {/* Draft Recovery Banner */}
      <DocDraftBanner
        hasDraft={hasDraft}
        draftAge={draftAge}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
      />

      <div className="flex items-center justify-between">
        <AutoFillButton onAutoFill={handleAutoFill} disabled={isGenerating} />
      </div>

      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            Company Header
          </CardTitle>
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
              <Label htmlFor="website">Website</Label>
              <Input id="website" {...form.register('website')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" type="email" {...form.register('contact_email')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vision & Mission */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" aria-hidden="true" />
            Vision & Mission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="vision">Vision <span className="text-destructive">*</span></Label>
            <Textarea id="vision" {...form.register('vision')} rows={2} className="mt-1" placeholder="Where you see the company in the future" />
          </div>
          <div>
            <Label htmlFor="mission">Mission <span className="text-destructive">*</span></Label>
            <Textarea id="mission" {...form.register('mission')} rows={2} className="mt-1" placeholder="Your purpose and how you achieve it" />
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="problem">Problem <span className="text-destructive">*</span></Label>
            <Textarea id="problem" {...form.register('problem')} rows={2} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="solution">Solution <span className="text-destructive">*</span></Label>
            <Textarea id="solution" {...form.register('solution')} rows={2} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Target Market */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" aria-hidden="true" />
            Target Market
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_customer">Target Customer <span className="text-destructive">*</span></Label>
              <Textarea id="target_customer" {...form.register('target_customer')} rows={2} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="market_size">Market Size <span className="text-destructive">*</span></Label>
              <Input id="market_size" {...form.register('market_size')} className="mt-1" placeholder="$150B, growing 42% annually" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Value Proposition */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" aria-hidden="true" />
            Value Proposition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="value_proposition">Value Proposition <span className="text-destructive">*</span></Label>
            <Textarea id="value_proposition" {...form.register('value_proposition')} rows={2} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="key_differentiator">Key Differentiator <span className="text-destructive">*</span></Label>
            <Input id="key_differentiator" {...form.register('key_differentiator')} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Revenue Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
            Revenue Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="revenue_streams">Revenue Streams <span className="text-destructive">*</span></Label>
              <Input id="revenue_streams" {...form.register('revenue_streams')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="pricing">Pricing <span className="text-destructive">*</span></Label>
              <Input id="pricing" {...form.register('pricing')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" aria-hidden="true" />
            Key Metrics
          </CardTitle>
          <CardDescription>Three headline metrics that show traction</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <Label htmlFor="metric_1_name">Metric 1 Name <span className="text-destructive">*</span></Label>
              <Input id="metric_1_name" {...form.register('metric_1_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="metric_1_value">Value <span className="text-destructive">*</span></Label>
              <Input id="metric_1_value" {...form.register('metric_1_value')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="metric_2_name">Metric 2 Name <span className="text-destructive">*</span></Label>
              <Input id="metric_2_name" {...form.register('metric_2_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="metric_2_value">Value <span className="text-destructive">*</span></Label>
              <Input id="metric_2_value" {...form.register('metric_2_value')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="metric_3_name">Metric 3 Name <span className="text-destructive">*</span></Label>
              <Input id="metric_3_name" {...form.register('metric_3_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="metric_3_value">Value <span className="text-destructive">*</span></Label>
              <Input id="metric_3_value" {...form.register('metric_3_value')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team & Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" aria-hidden="true" />
            Team & Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="founders">Founders <span className="text-destructive">*</span></Label>
              <Input id="founders" {...form.register('founders')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="team_size">Team Size</Label>
              <Input id="team_size" {...form.register('team_size')} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="short_term_goals">Short-term Goals <span className="text-destructive">*</span></Label>
              <Textarea id="short_term_goals" {...form.register('short_term_goals')} rows={2} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="long_term_goals">Long-term Goals <span className="text-destructive">*</span></Label>
              <Textarea id="long_term_goals" {...form.register('long_term_goals')} rows={2} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
