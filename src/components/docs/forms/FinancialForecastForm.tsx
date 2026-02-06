import React, { useEffect, useMemo, useCallback } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, TrendingUp, DollarSign, Calculator, PieChart } from 'lucide-react';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
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
    company_name: 'AIWMC AI Agency',
    forecast_period: '2026-2028 (3 Years)',
    currency: 'USD',
    
    current_mrr: 100000,
    current_customers: 25,
    current_arpu: 4000,
    current_churn_rate: 2.5,
    
    pess_growth_rate: 15,
    pess_churn_rate: 4,
    pess_cac: 8000,
    
    base_growth_rate: 30,
    base_churn_rate: 2.5,
    base_cac: 5000,
    
    opt_growth_rate: 50,
    opt_churn_rate: 1.5,
    opt_cac: 3500,
    
    fixed_costs_monthly: 85000,
    variable_cost_percent: 20,
    sales_marketing_percent: 35,
    
    ltv_target: 48000,
    payback_months_target: 12,
    gross_margin_target: 80,
  }), [template]);

  const form = useForm<FinancialForecastFormData>({
    resolver: zodResolver(FinancialForecastFormSchema),
    defaultValues,
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1f2937;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 3px solid #2563eb;">
          <h1 style="font-size: 28px; font-weight: 700; color: #2563eb; margin: 0;">Financial Forecast</h1>
          <p style="font-size: 16px; color: #6b7280; margin: 8px 0 0 0;">${safeValues.company_name || 'Company'} • ${safeValues.forecast_period || 'Period'}</p>
        </div>

        <!-- Current State -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">📊 Current State</h2>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Monthly Revenue</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0;">${formatCurrency(formValues.current_mrr)}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Customers</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0;">${safeValues.current_customers}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">ARPU</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0;">${formatCurrency(formValues.current_arpu)}</p>
            </div>
            <div style="padding: 16px; background: #f0f9ff; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #6b7280; margin: 0;">Churn Rate</p>
              <p style="font-size: 24px; font-weight: 700; color: #2563eb; margin: 4px 0;">${safeValues.current_churn_rate}%</p>
            </div>
          </div>
        </section>

        <!-- 3-Scenario Projections -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">📈 Revenue Projections (3 Scenarios)</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #374151; color: white;">
                <th style="padding: 12px; text-align: left;">Scenario</th>
                <th style="padding: 12px; text-align: right;">Month 1</th>
                <th style="padding: 12px; text-align: right;">Year 1</th>
                <th style="padding: 12px; text-align: right;">Year 2</th>
                <th style="padding: 12px; text-align: right;">Year 3</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb; background: #fef2f2;">
                <td style="padding: 12px; font-weight: 600; color: #dc2626;">🔴 Pessimistic</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.pessimistic[0])}</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.pessimistic[1])}</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.pessimistic[2])}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(projections.pessimistic[3])}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb; background: #f0f9ff;">
                <td style="padding: 12px; font-weight: 600; color: #2563eb;">🔵 Base Case</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.base[0])}</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.base[1])}</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.base[2])}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(projections.base[3])}</td>
              </tr>
              <tr style="background: #ecfdf5;">
                <td style="padding: 12px; font-weight: 600; color: #10b981;">🟢 Optimistic</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.optimistic[0])}</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.optimistic[1])}</td>
                <td style="padding: 12px; text-align: right;">${formatCurrency(projections.optimistic[2])}</td>
                <td style="padding: 12px; text-align: right; font-weight: 600;">${formatCurrency(projections.optimistic[3])}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Assumptions -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">🔍 Key Assumptions</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb;">Metric</th>
                <th style="padding: 10px; text-align: center; color: #dc2626; border-bottom: 1px solid #e5e7eb;">Pessimistic</th>
                <th style="padding: 10px; text-align: center; color: #2563eb; border-bottom: 1px solid #e5e7eb;">Base</th>
                <th style="padding: 10px; text-align: center; color: #10b981; border-bottom: 1px solid #e5e7eb;">Optimistic</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">Growth Rate</td>
                <td style="padding: 10px; text-align: center;">${safeValues.pess_growth_rate}%</td>
                <td style="padding: 10px; text-align: center;">${safeValues.base_growth_rate}%</td>
                <td style="padding: 10px; text-align: center;">${safeValues.opt_growth_rate}%</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">Churn Rate</td>
                <td style="padding: 10px; text-align: center;">${safeValues.pess_churn_rate}%</td>
                <td style="padding: 10px; text-align: center;">${safeValues.base_churn_rate}%</td>
                <td style="padding: 10px; text-align: center;">${safeValues.opt_churn_rate}%</td>
              </tr>
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px;">CAC</td>
                <td style="padding: 10px; text-align: center;">${formatCurrency(formValues.pess_cac)}</td>
                <td style="padding: 10px; text-align: center;">${formatCurrency(formValues.base_cac)}</td>
                <td style="padding: 10px; text-align: center;">${formatCurrency(formValues.opt_cac)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- Cost Structure -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">💰 Cost Structure</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="padding: 16px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Fixed Costs (Monthly)</p>
              <p style="font-size: 20px; font-weight: 700; color: #92400e; margin: 4px 0;">${formatCurrency(formValues.fixed_costs_monthly)}</p>
            </div>
            <div style="padding: 16px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Variable Costs</p>
              <p style="font-size: 20px; font-weight: 700; color: #92400e; margin: 4px 0;">${safeValues.variable_cost_percent}%</p>
            </div>
            <div style="padding: 16px; background: #fef3c7; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #92400e; margin: 0;">Sales & Marketing</p>
              <p style="font-size: 20px; font-weight: 700; color: #92400e; margin: 4px 0;">${safeValues.sales_marketing_percent}%</p>
            </div>
          </div>
        </section>

        <!-- Target Metrics -->
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; font-weight: 600; color: #374151; margin: 0 0 16px 0;">🎯 Target Metrics</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">LTV Target</p>
              <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0;">${formatCurrency(formValues.ltv_target)}</p>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">Payback Period</p>
              <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0;">${safeValues.payback_months_target} mo</p>
            </div>
            <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; text-align: center;">
              <p style="font-size: 12px; color: #065f46; margin: 0;">Gross Margin</p>
              <p style="font-size: 20px; font-weight: 700; color: #10b981; margin: 4px 0;">${safeValues.gross_margin_target}%</p>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Financial Forecast - ${safeValues.company_name || 'Company'} © ${new Date().getFullYear()}</p>
          <p style="margin-top: 8px; font-size: 10px;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis™</a></p>
        </div>
      </div>
    `;
    
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [formValues, projections, onPreviewUpdate]);

  const onSubmit = (data: FinancialForecastFormData) => {
    onGenerate({ ...data, projections });
  };

  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.monthly_revenue) form.setValue('current_mrr', data.monthly_revenue);
    if (data.cac) {
      form.setValue('base_cac', data.cac);
      form.setValue('pess_cac', data.cac * 1.5);
      form.setValue('opt_cac', data.cac * 0.7);
    }
    if (data.ltv) form.setValue('ltv_target', data.ltv);
    if (data.payback_months) form.setValue('payback_months_target', data.payback_months);
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-label="Financial Forecast Form">
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
              Generate Forecast
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
