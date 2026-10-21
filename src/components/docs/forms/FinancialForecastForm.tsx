import React, { useEffect, useMemo, useCallback } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, TrendingUp, DollarSign, Calculator, PieChart } from 'lucide-react';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import type { AutoFillData } from '@/hooks/useAnalysisAutoFill';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DocTemplate } from '@/types/document';

const FinancialForecastFormSchema = z.object({
  // Company Info
  company_name: z.string().min(2, 'Company name required'),
  forecast_period: z.string().min(2, 'Period required'),
  currency: z.string().min(1, 'Currency required'),
  
  // Current State
  current_mrr: z.number().min(0),
  current_customers: z.number().min(0),
  current_arpu: z.number().min(0),
  current_churn_rate: z.number().min(0).max(100),
  
  // Growth Assumptions (Pessimistic)
  pess_growth_rate: z.number(),
  pess_churn_rate: z.number().min(0).max(100),
  pess_cac: z.number().min(0),
  
  // Growth Assumptions (Base)
  base_growth_rate: z.number(),
  base_churn_rate: z.number().min(0).max(100),
  base_cac: z.number().min(0),
  
  // Growth Assumptions (Optimistic)
  opt_growth_rate: z.number(),
  opt_churn_rate: z.number().min(0).max(100),
  opt_cac: z.number().min(0),
  
  // Cost Structure
  fixed_costs_monthly: z.number().min(0),
  variable_cost_percent: z.number().min(0).max(100),
  sales_marketing_percent: z.number().min(0).max(100),
  
  // Key Metrics
  ltv_target: z.number().min(0),
  payback_months_target: z.number().min(0),
  gross_margin_target: z.number().min(0).max(100),
});

type FinancialForecastFormData = z.infer<typeof FinancialForecastFormSchema>;

interface FinancialForecastFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function FinancialForecastForm({ template, onGenerate, onPreviewUpdate, isGenerating }: FinancialForecastFormProps) {
  const defaultValues = useMemo(() => ({
    company_name: '',
    forecast_period: '',
    currency: 'USD',
    
    current_mrr: 0,
    current_customers: 0,
    current_arpu: 0,
    current_churn_rate: 0,
    
    pess_growth_rate: 10,
    pess_churn_rate: 5,
    pess_cac: 0,
    
    base_growth_rate: 25,
    base_churn_rate: 3,
    base_cac: 0,
    
    opt_growth_rate: 40,
    opt_churn_rate: 2,
    opt_cac: 0,
    
    fixed_costs_monthly: 0,
    variable_cost_percent: 20,
    sales_marketing_percent: 30,
    
    ltv_target: 0,
    payback_months_target: 12,
    gross_margin_target: 70,
  }), [template]);

  const form = useForm<FinancialForecastFormData>({
    resolver: zodResolver(FinancialForecastFormSchema),
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
    templateId: 'financial-forecast',
  });

  const formValues = form.watch();

  // Calculate projections
  const projections = useMemo(() => {
    const calcProjection = (growthRate: number, churnRate: number) => {
      const months = [1, 12, 24, 36];
      return months.map(m => {
        const netGrowth = (growthRate - churnRate) / 100;
        const mrr = formValues.current_mrr * Math.pow(1 + netGrowth / 12, m);
        return Math.round(mrr);
      });
    };
    
    return {
      pessimistic: calcProjection(formValues.pess_growth_rate, formValues.pess_churn_rate),
      base: calcProjection(formValues.base_growth_rate, formValues.base_churn_rate),
      optimistic: calcProjection(formValues.opt_growth_rate, formValues.opt_churn_rate),
    };
  }, [formValues]);

  // Generate preview HTML
  useEffect(() => {
    const safeValues = escapeFormValues(formValues);
    const formatCurrency = (n: number) => `$${n.toLocaleString('en-US')}`;
    
    const rawHTML = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 22px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.04em;">Financial Forecast</h1>
        <p style="font-size: 13px; text-align: center; color: #444444; margin: 0 0 4px 0;">${safeValues.company_name || 'Company'} &middot; ${safeValues.forecast_period || 'Period'}</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">&copy; ${new Date().getFullYear()}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Current State</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Monthly Rev.</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.current_mrr)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Customers</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.current_customers}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">ARPU</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.current_arpu)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Churn</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.current_churn_rate}%</p></div>
          </div>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Revenue Projections &mdash; 3 Scenarios</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: left;">Scenario</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Month 1</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Year 1</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Year 2</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: right;">Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; font-style: italic;">Pessimistic</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.pessimistic[0])}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.pessimistic[1])}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.pessimistic[2])}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(projections.pessimistic[3])}</td></tr>
              <tr><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; font-weight: bold;">Base Case</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.base[0])}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.base[1])}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.base[2])}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(projections.base[3])}</td></tr>
              <tr><td style="padding: 8px 10px; font-size: 12px; font-style: italic;">Optimistic</td><td style="padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.optimistic[0])}</td><td style="padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.optimistic[1])}</td><td style="padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace;">${formatCurrency(projections.optimistic[2])}</td><td style="padding: 8px 10px; font-size: 12px; text-align: right; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${formatCurrency(projections.optimistic[3])}</td></tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Key Assumptions</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: left;">Metric</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: center;">Pessimistic</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: center;">Base</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: center;">Optimistic</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px;">Growth Rate</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${safeValues.pess_growth_rate}%</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${safeValues.base_growth_rate}%</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${safeValues.opt_growth_rate}%</td></tr>
              <tr><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px;">Churn Rate</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${safeValues.pess_churn_rate}%</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${safeValues.base_churn_rate}%</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${safeValues.opt_churn_rate}%</td></tr>
              <tr><td style="padding: 8px 10px; font-size: 12px;">CAC</td><td style="padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.pess_cac)}</td><td style="padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.base_cac)}</td><td style="padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.opt_cac)}</td></tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Cost Structure</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Fixed Costs/Mo</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.fixed_costs_monthly)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Variable Costs</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.variable_cost_percent}%</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Sales &amp; Mktg</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.sales_marketing_percent}%</p></div>
          </div>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Target Metrics</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">LTV Target</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(formValues.ltv_target)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Payback Period</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.payback_months_target} mo</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">Gross Margin</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${safeValues.gross_margin_target}%</p></div>
          </div>
        </section>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">FINANCIAL FORECAST &middot; ${safeValues.company_name || 'Company'} &middot; &copy; ${new Date().getFullYear()} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [formValues, projections, onPreviewUpdate]);

  const onSubmit = (data: FinancialForecastFormData) => {
    clearDraft();
    onGenerate({ ...data, projections });
  };

  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name !== undefined) form.setValue('company_name', data.company_name);
    if (data.monthly_revenue !== undefined) form.setValue('current_mrr', data.monthly_revenue);
    // pess_cac/opt_cac are deliberately left for the user to set — the
    // engine computes a single real CAC, not per-scenario CAC variants,
    // and this form previously invented them via hardcoded *1.5 / *0.7
    // multipliers on top of the one real value.
    if (data.cac !== undefined) form.setValue('base_cac', data.cac);
    if (data.ltv !== undefined) form.setValue('ltv_target', data.ltv);
    if (data.payback_months !== undefined) form.setValue('payback_months_target', data.payback_months);
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Financial Forecast Form">
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

      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertDescription>
          All projections are calculated automatically based on your inputs. Adjust assumptions to see different scenarios.
        </AlertDescription>
      </Alert>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
            Forecast Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name <span className="text-destructive">*</span></Label>
              <Input id="company_name" {...form.register('company_name')} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="forecast_period">Forecast Period <span className="text-destructive">*</span></Label>
              <Input id="forecast_period" {...form.register('forecast_period')} className="mt-1" placeholder="2026-2028 (3 Years)" />
            </div>
            <div>
              <Label htmlFor="currency">Currency <span className="text-destructive">*</span></Label>
              <Input id="currency" {...form.register('currency')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current State */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" aria-hidden="true" />
            Current State
          </CardTitle>
          <CardDescription>Your current financial position</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="current_mrr">Monthly Revenue ($)</Label>
              <Input id="current_mrr" type="number" {...form.register('current_mrr', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="current_customers">Customers</Label>
              <Input id="current_customers" type="number" {...form.register('current_customers', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="current_arpu">ARPU ($)</Label>
              <Input id="current_arpu" type="number" {...form.register('current_arpu', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="current_churn_rate">Churn Rate (%)</Label>
              <Input id="current_churn_rate" type="number" step="0.1" {...form.register('current_churn_rate', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
            Scenario Assumptions
          </CardTitle>
          <CardDescription>Define assumptions for each scenario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pessimistic */}
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg space-y-4">
            <h4 className="font-semibold text-red-700 dark:text-red-400">🔴 Pessimistic Scenario</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pess_growth_rate">Growth Rate (%)</Label>
                <Input id="pess_growth_rate" type="number" {...form.register('pess_growth_rate', { valueAsNumber: true })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="pess_churn_rate">Churn Rate (%)</Label>
                <Input id="pess_churn_rate" type="number" step="0.1" {...form.register('pess_churn_rate', { valueAsNumber: true })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="pess_cac">CAC ($)</Label>
                <Input id="pess_cac" type="number" {...form.register('pess_cac', { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Base */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-4">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">🔵 Base Case Scenario</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="base_growth_rate">Growth Rate (%)</Label>
                <Input id="base_growth_rate" type="number" {...form.register('base_growth_rate', { valueAsNumber: true })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="base_churn_rate">Churn Rate (%)</Label>
                <Input id="base_churn_rate" type="number" step="0.1" {...form.register('base_churn_rate', { valueAsNumber: true })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="base_cac">CAC ($)</Label>
                <Input id="base_cac" type="number" {...form.register('base_cac', { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Optimistic */}
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg space-y-4">
            <h4 className="font-semibold text-green-700 dark:text-green-400">🟢 Optimistic Scenario</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="opt_growth_rate">Growth Rate (%)</Label>
                <Input id="opt_growth_rate" type="number" {...form.register('opt_growth_rate', { valueAsNumber: true })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="opt_churn_rate">Churn Rate (%)</Label>
                <Input id="opt_churn_rate" type="number" step="0.1" {...form.register('opt_churn_rate', { valueAsNumber: true })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="opt_cac">CAC ($)</Label>
                <Input id="opt_cac" type="number" {...form.register('opt_cac', { valueAsNumber: true })} className="mt-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" aria-hidden="true" />
            Cost Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fixed_costs_monthly">Fixed Costs (Monthly $)</Label>
              <Input id="fixed_costs_monthly" type="number" {...form.register('fixed_costs_monthly', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="variable_cost_percent">Variable Costs (%)</Label>
              <Input id="variable_cost_percent" type="number" {...form.register('variable_cost_percent', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="sales_marketing_percent">Sales & Marketing (%)</Label>
              <Input id="sales_marketing_percent" type="number" {...form.register('sales_marketing_percent', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Target Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
            Target Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ltv_target">LTV Target ($)</Label>
              <Input id="ltv_target" type="number" {...form.register('ltv_target', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="payback_months_target">Payback Target (months)</Label>
              <Input id="payback_months_target" type="number" {...form.register('payback_months_target', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="gross_margin_target">Gross Margin Target (%)</Label>
              <Input id="gross_margin_target" type="number" {...form.register('gross_margin_target', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
