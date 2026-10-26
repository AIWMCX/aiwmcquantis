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
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 22px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0;">${safeValues.company_name || 'Company'}</h1>
        <p style="font-size: 13px; text-align: center; color: #444444; margin: 0 0 4px 0; font-style: italic;">${safeValues.tagline || ''}</p>
        ${safeValues.website ? `<p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 4px 0;">${safeValues.website}${safeValues.contact_email ? ' &middot; ' + safeValues.contact_email : ''}</p>` : ''}
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">One-Page Business Plan</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 14px;">
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Vision</p><p style="font-size: 13px; margin: 0; line-height: 1.6; color: #111111;">${safeValues.vision || ''}</p></div>
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Mission</p><p style="font-size: 13px; margin: 0; line-height: 1.6; color: #111111;">${safeValues.mission || ''}</p></div>
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Problem</p><p style="font-size: 13px; margin: 0; line-height: 1.6; color: #111111;">${safeValues.problem || ''}</p></div>
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Solution</p><p style="font-size: 13px; margin: 0; line-height: 1.6; color: #111111;">${safeValues.solution || ''}</p></div>
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Target Customer</p><p style="font-size: 13px; margin: 0 0 4px 0; line-height: 1.6; color: #111111;">${safeValues.target_customer || ''}</p><p style="font-size: 12px; color: #555555; margin: 0;"><strong>Market:</strong> ${safeValues.market_size || ''}</p></div>
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Value Proposition</p><p style="font-size: 13px; margin: 0 0 4px 0; line-height: 1.6; color: #111111;">${safeValues.value_proposition || ''}</p><p style="font-size: 12px; color: #555555; margin: 0;"><strong>Differentiator:</strong> ${safeValues.key_differentiator || ''}</p></div>
        </div>
        <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa; margin-bottom: 14px;">
          <p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 8px 0;">Revenue Model</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <p style="font-size: 13px; margin: 0; color: #111111;"><strong>Streams:</strong> ${safeValues.revenue_streams || ''}</p>
            <p style="font-size: 13px; margin: 0; color: #111111;"><strong>Pricing:</strong> ${safeValues.pricing || ''}</p>
          </div>
        </div>
        <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa; margin-bottom: 14px;">
          <p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 10px 0;">Key Metrics</p>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.metric_1_value || '-'}</p><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">${safeValues.metric_1_name || ''}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.metric_2_value || '-'}</p><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">${safeValues.metric_2_name || ''}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.metric_3_value || '-'}</p><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">${safeValues.metric_3_name || ''}</p></div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 14px;">
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Team</p><p style="font-size: 13px; margin: 0 0 4px 0; line-height: 1.6; color: #111111;">${safeValues.founders || ''}</p>${safeValues.team_size ? `<p style="font-size: 12px; color: #555555; margin: 0;">${safeValues.team_size}</p>` : ''}</div>
          <div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Goals</p><p style="font-size: 12px; margin: 0 0 4px 0; color: #111111;"><strong>Short-term:</strong> ${safeValues.short_term_goals || ''}</p><p style="font-size: 12px; margin: 0; color: #111111;"><strong>Long-term:</strong> ${safeValues.long_term_goals || ''}</p></div>
        </div>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">ONE-PAGE BUSINESS PLAN &middot; ${safeValues.company_name || 'Company'} &middot; &copy; ${new Date().getFullYear()} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
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
      form.setValue('metric_1_value', `$${data.monthly_revenue.toLocaleString('en-US')}`);
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
