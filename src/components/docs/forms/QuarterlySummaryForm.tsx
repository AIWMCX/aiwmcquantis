import React, { useEffect, useMemo, useCallback } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2, CheckCircle, TrendingUp, Users, DollarSign } from 'lucide-react';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import type { AutoFillData } from '@/hooks/useAnalysisAutoFill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const QuarterlyFormSchema = z.object({
  company_name: z.string().min(2, 'Company name required'),
  quarter: z.string(),
  prepared_by: z.string().min(2, 'Prepared by required'),
  overview: z.string().min(20, 'Overview must be at least 20 characters'),
  key_highlights: z.array(z.string()).min(1, 'At least one highlight required'),
  total_revenue: z.number().min(0),
  subscription_revenue: z.number().min(0),
  consulting_revenue: z.number().min(0),
  total_expenses: z.number().min(0),
  net_income: z.number(),
  total_customers: z.number().min(0),
  new_customers: z.number().min(0),
  retention_rate: z.number().min(0).max(100),
  total_employees: z.number().min(1),
  achievements: z.array(z.object({
    area: z.string(),
    achievement: z.string(),
    impact: z.string(),
  })),
  next_quarter_revenue_target: z.number().min(0),
  next_quarter_customers_target: z.number().min(0),
});

type QuarterlyFormData = z.infer<typeof QuarterlyFormSchema>;

interface QuarterlySummaryFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: any) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function QuarterlySummaryForm({ template, onGenerate, onPreviewUpdate, isGenerating }: QuarterlySummaryFormProps) {
  const defaultValues = useMemo(() => {
    const templateJson = template?.template_json as Record<string, any> | undefined;
    const prefilled = templateJson?.prefilled_content;
    return {
      company_name: prefilled?.header?.company_name || '',
      quarter: prefilled?.header?.quarter || 'Q1 2026',
      prepared_by: prefilled?.header?.prepared_by || '',
      overview: prefilled?.executive_summary?.overview || '',
      key_highlights: prefilled?.executive_summary?.key_highlights || [''],
      total_revenue: prefilled?.financial_performance?.revenue?.total || 0,
      subscription_revenue: prefilled?.financial_performance?.revenue?.breakdown?.subscription_revenue || 0,
      consulting_revenue: prefilled?.financial_performance?.revenue?.breakdown?.consulting_services || 0,
      total_expenses: prefilled?.financial_performance?.expenses?.total || 0,
      net_income: prefilled?.financial_performance?.profitability?.net_income || 0,
      total_customers: prefilled?.operational_metrics?.customers?.total_customers || 0,
      new_customers: prefilled?.operational_metrics?.customers?.new_customers || 0,
      retention_rate: (prefilled?.operational_metrics?.customers?.retention_rate || 0) * 100,
      total_employees: prefilled?.operational_metrics?.team_metrics?.total_employees || 1,
      achievements: prefilled?.key_achievements || [
        { area: '', achievement: '', impact: '' },
      ],
      next_quarter_revenue_target: prefilled?.outlook?.q1_2026_targets?.revenue_target || 0,
      next_quarter_customers_target: prefilled?.outlook?.q1_2026_targets?.new_customers || 0,
    };
  }, [template]);

  const form = useForm<QuarterlyFormData>({
    resolver: zodResolver(QuarterlyFormSchema),
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
    templateId: 'quarterly-summary',
  });

  const { fields: achievementFields, append: appendAchievement, remove: removeAchievement } = useFieldArray({
    control: form.control,
    name: 'achievements',
  });

  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control: form.control,
    name: 'key_highlights' as any,
  });

  const formValues = form.watch();

  // Calculate derived metrics
  const calculations = useMemo(() => {
    const grossProfit = (formValues.total_revenue || 0) - (formValues.total_expenses || 0);
    const grossMargin = formValues.total_revenue ? (grossProfit / formValues.total_revenue) * 100 : 0;
    const revenueGrowth = 45; // Would calculate from previous quarter data
    return { grossProfit, grossMargin, revenueGrowth };
  }, [formValues.total_revenue, formValues.total_expenses]);

  // Generate preview HTML
  useEffect(() => {
    // SECURITY: Escape all form values before template interpolation to prevent XSS
    const safeValues = escapeFormValues(formValues);
    const safeHighlights = (safeValues.key_highlights || []) as string[];
    const safeAchievements = (safeValues.achievements || []) as typeof formValues.achievements;
    
    const prepDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const formatCurrency = (num: number) => `$${(num || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    const formatPercent = (num: number) => `${(num || 0).toFixed(1)}%`;

    const rawHTML = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 20px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.06em;">Quarterly Business Summary</h1>
        <p style="font-size: 13px; text-align: center; font-weight: bold; color: #111111; margin: 0 0 4px 0;">${safeValues.company_name || ''}</p>
        <p style="font-size: 11px; text-align: center; color: #555555; margin: 0 0 4px 0;">${safeValues.quarter || ''} &middot; Prepared by ${safeValues.prepared_by || ''}</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">Report Date: ${prepDate}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Executive Summary</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 12px 0;">${safeValues.overview || ''}</p>
          ${safeHighlights.length > 0 ? `<p style="font-size: 11px; font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Key Highlights</p><ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; color: #111111;">${safeHighlights.map(h => `<li style="margin-bottom: 4px;">${h}</li>`).join('')}</ul>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Financial Performance</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Total Revenue</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.total_revenue)}</p><p style="font-size: 11px; color: #555555; margin: 4px 0 0 0;">&uarr; ${calculations.revenueGrowth}% YoY</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Total Expenses</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.total_expenses)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Net Income</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.net_income)}</p><p style="font-size: 11px; color: #555555; margin: 4px 0 0 0;">${formatPercent(calculations.grossMargin)} margin</p></div>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; color: #555555; width: 50%;">Subscription Revenue</td><td style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(formValues.subscription_revenue)}</td></tr>
              <tr><td style="padding: 8px 0; color: #555555;">Consulting Services</td><td style="padding: 8px 0; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(formValues.consulting_revenue)}</td></tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Operational Metrics</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Customers</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formValues.total_customers?.toLocaleString() || 0}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">New</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">+${formValues.new_customers || 0}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Retention</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formValues.retention_rate || 0}%</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Team</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formValues.total_employees || 0}</p></div>
          </div>
        </section>
        ${safeAchievements.length > 0 ? `
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Key Achievements</h2>
          ${safeAchievements.map(a => `<div style="margin-bottom: 12px; padding-left: 12px; border-left: 2px solid #111111;"><p style="font-weight: bold; color: #111111; margin: 0 0 2px 0; font-size: 13px;">${a.area}</p><p style="font-size: 13px; margin: 0 0 2px 0; color: #111111;">${a.achievement}</p><p style="font-size: 12px; color: #444444; margin: 0;"><em>Impact: ${a.impact}</em></p></div>`).join('')}
        </section>` : ''}
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Next Quarter Targets</h2>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Revenue Target</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.next_quarter_revenue_target)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">New Customers</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formValues.next_quarter_customers_target}</p></div>
          </div>
        </section>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">CONFIDENTIAL &mdash; FOR INTERNAL USE ONLY &middot; ${safeValues.company_name} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    
    // SECURITY: Final sanitization pass to catch any edge cases
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [formValues, calculations, onPreviewUpdate]);

  const onSubmit = (data: QuarterlyFormData) => {
    onGenerate({
      header: {
        company_name: data.company_name,
        quarter: data.quarter,
        prepared_by: data.prepared_by,
      },
      executive_summary: {
        overview: data.overview,
        key_highlights: data.key_highlights,
      },
      financial_performance: {
        revenue: {
          total: data.total_revenue,
          breakdown: {
            subscription_revenue: data.subscription_revenue,
            consulting_services: data.consulting_revenue,
          },
        },
        expenses: { total: data.total_expenses },
        profitability: { net_income: data.net_income },
      },
      operational_metrics: {
        customers: {
          total_customers: data.total_customers,
          new_customers: data.new_customers,
          retention_rate: data.retention_rate / 100,
        },
        team_metrics: { total_employees: data.total_employees },
      },
      key_achievements: data.achievements,
      outlook: {
        revenue_target: data.next_quarter_revenue_target,
        customers_target: data.next_quarter_customers_target,
      },
      calculated: calculations,
    });
  };

  // Handle auto-fill from analysis
  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.quarterly_revenue) form.setValue('total_revenue', data.quarterly_revenue);
    if (data.monthly_profit) form.setValue('net_income', data.monthly_profit * 3);
    if (data.gross_margin) {
      const expenses = (data.quarterly_revenue || 0) * (1 - (data.gross_margin / 100));
      form.setValue('total_expenses', expenses);
    }
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Auto-fill from Quantis Analysis */}
      <div className="flex items-center justify-between mb-2">
        <AutoFillButton onAutoFill={handleAutoFill} disabled={isGenerating} />
      </div>

      {/* Report Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Report Header
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label>Company Name *</Label>
              <Input {...form.register('company_name')} className="mt-1" />
            </div>
            <div>
              <Label>Quarter *</Label>
              <Controller
                name="quarter"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                      <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                      <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                      <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                      <SelectItem value="Q1 2026">Q1 2026</SelectItem>
                      <SelectItem value="Q2 2026">Q2 2026</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div>
            <Label>Prepared By *</Label>
            <Input {...form.register('prepared_by')} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Overview *</Label>
            <Textarea {...form.register('overview')} rows={4} className="mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Key Highlights</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendHighlight('')}
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            {highlightFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 mb-2">
                <Input
                  {...form.register(`key_highlights.${index}` as any)}
                  placeholder="Highlight point..."
                  className="flex-1"
                />
                {highlightFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHighlight(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Financial Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Financial Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Total Revenue ($) *</Label>
              <Input type="number" {...form.register('total_revenue', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Subscription Revenue ($)</Label>
              <Input type="number" {...form.register('subscription_revenue', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Consulting Revenue ($)</Label>
              <Input type="number" {...form.register('consulting_revenue', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Total Expenses ($) *</Label>
              <Input type="number" {...form.register('total_expenses', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Net Income ($) *</Label>
              <Input type="number" {...form.register('net_income', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
          
          {/* Calculated Summary */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Gross Profit:</span>
                <span className="ml-2 font-semibold">${calculations.grossProfit.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Gross Margin:</span>
                <span className="ml-2 font-semibold">{calculations.grossMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operational Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Operational Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Total Customers *</Label>
              <Input type="number" {...form.register('total_customers', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>New Customers *</Label>
              <Input type="number" {...form.register('new_customers', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Retention Rate (%) *</Label>
              <Input type="number" step="0.1" {...form.register('retention_rate', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Team Size *</Label>
              <Input type="number" {...form.register('total_employees', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Achievements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Key Achievements</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAchievement({ area: '', achievement: '', impact: '' })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Achievement
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {achievementFields.map((field, index) => (
            <div key={field.id} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Achievement {index + 1}</Label>
                {achievementFields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAchievement(index)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <Input
                {...form.register(`achievements.${index}.area`)}
                placeholder="Area (e.g., Product Development)"
              />
              <Textarea
                {...form.register(`achievements.${index}.achievement`)}
                placeholder="What was achieved..."
                rows={2}
              />
              <Input
                {...form.register(`achievements.${index}.impact`)}
                placeholder="Business impact..."
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Next Quarter Outlook */}
      <Card>
        <CardHeader>
          <CardTitle>Next Quarter Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Revenue Target ($) *</Label>
              <Input type="number" {...form.register('next_quarter_revenue_target', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>New Customers Target *</Label>
              <Input type="number" {...form.register('next_quarter_customers_target', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
