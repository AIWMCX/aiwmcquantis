import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Target, Users, Building2, BarChart3, Lightbulb, AlertTriangle } from 'lucide-react';
import { AutoFillButton } from '../AutoFillButton';
import { AISuggestionButton } from '../AISuggestionButton';
import { DocDraftBanner } from '../DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import type { DocTemplate } from '@/types/document';

const marketAnalysisSchema = z.object({
  // Basic Info
  company_name: z.string().min(1, 'Company name is required'),
  industry: z.string().min(1, 'Industry is required'),
  report_date: z.string(),
  prepared_by: z.string().optional(),
  
  // Market Overview
  market_name: z.string().min(1, 'Market name is required'),
  market_description: z.string().min(20, 'Please provide a market description'),
  geographic_focus: z.string().min(1, 'Geographic focus is required'),
  
  // Market Size
  tam_value: z.number().min(0).optional(),
  sam_value: z.number().min(0).optional(),
  som_value: z.number().min(0).optional(),
  market_size_year: z.number().min(2020).max(2030),
  market_growth_rate: z.number().min(-50).max(200).optional(),
  
  // Target Customer
  target_customer_description: z.string().min(10, 'Describe your target customer'),
  customer_pain_points: z.string().min(10, 'Describe customer pain points'),
  customer_demographics: z.string().optional(),
  
  // Competition
  competition_level: z.enum(['low', 'medium', 'high', 'very_high']),
  main_competitors: z.string().optional(),
  competitive_advantages: z.string().min(10, 'Describe your competitive advantages'),
  
  // Trends & Opportunities
  market_trends: z.string().min(10, 'Describe key market trends'),
  opportunities: z.string().optional(),
  threats: z.string().optional(),
  
  // SWOT (Optional)
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  
  // Recommendations
  recommendations: z.string().optional(),
  sources: z.string().optional(),
});

type MarketAnalysisFormData = z.infer<typeof marketAnalysisSchema>;

interface MarketAnalysisFormProps {
  template: DocTemplate | null;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

function formatCurrency(value: number | undefined): string {
  if (!value) return '$0';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

export function MarketAnalysisForm({ template, onGenerate, onPreviewUpdate, isGenerating }: MarketAnalysisFormProps) {
  const form = useForm<MarketAnalysisFormData>({
    resolver: zodResolver(marketAnalysisSchema),
    defaultValues: {
      company_name: '',
      industry: '',
      report_date: new Date().toISOString().split('T')[0],
      prepared_by: '',
      market_name: '',
      market_description: '',
      geographic_focus: 'United States',
      tam_value: undefined,
      sam_value: undefined,
      som_value: undefined,
      market_size_year: new Date().getFullYear(),
      market_growth_rate: undefined,
      target_customer_description: '',
      customer_pain_points: '',
      customer_demographics: '',
      competition_level: 'medium',
      main_competitors: '',
      competitive_advantages: '',
      market_trends: '',
      opportunities: '',
      threats: '',
      strengths: '',
      weaknesses: '',
      recommendations: '',
      sources: '',
    },
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
    templateId: 'market-analysis',
  });

  const { watch, setValue, handleSubmit, formState: { errors } } = form;
  const watchedValues = watch();

  // Generate preview HTML
  const generatePreview = useCallback(() => {
    const d = watchedValues;
    const competitionLabel = {
      low: 'Low Competition',
      medium: 'Moderate Competition',
      high: 'High Competition',
      very_high: 'Extremely High Competition',
    }[d.competition_level];
    
    const competitionColor = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      very_high: '#DC2626',
    }[d.competition_level];
    
    const html = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <p style="font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #555555; text-align: center; margin: 0 0 6px 0;">Market Analysis Report</p>
        <h1 style="font-family: Georgia,serif; font-size: 24px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0; line-height: 1.3;">${d.market_name || '[Market Name]'}</h1>
        <p style="font-size: 11px; text-align: center; color: #555555; margin: 0 0 4px 0;">Prepared for <strong>${d.company_name || '[Company]'}</strong> &middot; ${d.report_date || new Date().toLocaleDateString()}${d.prepared_by ? ` &middot; By ${d.prepared_by}` : ''}</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">&copy; ${new Date().getFullYear()}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Market Overview</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;">${d.market_description || '[Describe the market]'}</p>
          <p style="font-size: 12px; color: #555555; margin: 0;"><strong>Industry:</strong> ${d.industry || '[Industry]'} &middot; <strong>Region:</strong> ${d.geographic_focus || '[Region]'}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Market Size (${d.market_size_year || 'Current'})</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">TAM &mdash; Total Addressable</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(d.tam_value)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">SAM &mdash; Serviceable</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(d.sam_value)}</p></div>
            <div style="border: 1px solid #cccccc; padding: 14px 8px; text-align: center; background: #fafafa;"><p style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #666666; margin: 0 0 4px 0;">SOM &mdash; Obtainable</p><p style="font-size: 20px; font-weight: bold; color: #000000; margin: 0; font-family: 'Courier New',Courier,monospace;">${formatCurrency(d.som_value)}</p></div>
          </div>
          ${d.market_growth_rate ? `<p style="font-size: 12px; color: #444444; margin: 0;">Projected annual growth rate: <strong>${d.market_growth_rate}%</strong></p>` : ''}
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Target Customer</h2>
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Customer Profile</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0; padding-left: 12px; border-left: 2px solid #111111;">${d.target_customer_description || '[Describe target customer]'}</p>
          ${d.customer_demographics ? `<p style="font-size: 12px; color: #444444; margin: 0 0 10px 0;"><strong>Demographics:</strong> ${d.customer_demographics}</p>` : ''}
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Pain Points</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; padding-left: 12px; border-left: 2px solid #cccccc;">${d.customer_pain_points || '[Describe pain points]'}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Competitive Landscape</h2>
          <p style="font-size: 12px; color: #444444; margin: 0 0 10px 0;">Competition Level: <strong>${competitionLabel}</strong></p>
          ${d.main_competitors ? `<p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;"><strong>Key Competitors:</strong> ${d.main_competitors}</p>` : ''}
          <p style="font-size: 11px; font-weight: bold; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.06em; color: #444444;">Our Competitive Advantages</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; padding: 12px; border: 1px solid #cccccc; background: #fafafa;">${d.competitive_advantages || '[Describe advantages]'}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Market Trends</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">${d.market_trends || '[Describe market trends]'}</p>
        </section>
        ${(d.opportunities || d.threats) ? `
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Opportunities &amp; Threats</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${d.opportunities ? `<div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 8px 0;">Opportunities</p><p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">${d.opportunities}</p></div>` : ''}
            ${d.threats ? `<div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 8px 0;">Threats</p><p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">${d.threats}</p></div>` : ''}
          </div>
        </section>` : ''}
        ${(d.strengths || d.weaknesses) ? `
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">SWOT Analysis</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            ${d.strengths ? `<div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 8px 0;">Strengths</p><p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">${d.strengths}</p></div>` : ''}
            ${d.weaknesses ? `<div style="padding: 14px; border: 1px solid #cccccc; background: #fafafa;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 8px 0;">Weaknesses</p><p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">${d.weaknesses}</p></div>` : ''}
          </div>
        </section>` : ''}
        ${d.recommendations ? `<section style="margin-bottom: 24px;"><h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Recommendations</h2><p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0; padding: 14px; border: 1px solid #cccccc; background: #fafafa;">${d.recommendations}</p></section>` : ''}
        ${d.sources ? `<section style="margin-bottom: 24px; padding-top: 16px; border-top: 1px solid #cccccc;"><p style="font-size: 10px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; color: #444444; margin: 0 0 8px 0;">Sources &amp; References</p><p style="font-size: 11px; color: #555555; line-height: 1.6; margin: 0;">${d.sources}</p></section>` : ''}
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">MARKET ANALYSIS &middot; ${d.company_name || 'Company'} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    onPreviewUpdate(html);
  }, [watchedValues, onPreviewUpdate]);

  useEffect(() => {
    generatePreview();
  }, [generatePreview]);

  const handleAutoFill = useCallback((data: Record<string, unknown>) => {
    if (data.company_name) setValue('company_name', String(data.company_name));
    if (data.industry) setValue('industry', String(data.industry));
    if (data.market_name) setValue('market_name', String(data.market_name));
    if (data.tam) setValue('tam_value', Number(data.tam));
    if (data.sam) setValue('sam_value', Number(data.sam));
    if (data.som) setValue('som_value', Number(data.som));
    if (data.growth_rate) setValue('market_growth_rate', Number(data.growth_rate));
  }, [setValue]);

  const onSubmit = (data: MarketAnalysisFormData) => {
    onGenerate(data as Record<string, unknown>);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Auto-fill from Analysis */}
      <AutoFillButton onAutoFill={handleAutoFill} />

      {/* Basic Info */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            Report Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                {...form.register('company_name')}
                placeholder="Your Company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry *</Label>
              <Input
                id="industry"
                {...form.register('industry')}
                placeholder="e.g., SaaS, Healthcare, FinTech"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report_date">Report Date</Label>
              <Input
                id="report_date"
                type="date"
                {...form.register('report_date')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prepared_by">Prepared By</Label>
              <Input
                id="prepared_by"
                {...form.register('prepared_by')}
                placeholder="Analyst name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Overview */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Market Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="market_name">Market Name *</Label>
              <Input
                id="market_name"
                {...form.register('market_name')}
                placeholder="e.g., Enterprise AI Solutions"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="geographic_focus">Geographic Focus *</Label>
              <Input
                id="geographic_focus"
                {...form.register('geographic_focus')}
                placeholder="e.g., North America, Global"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="market_description">Market Description *</Label>
              <AISuggestionButton
                sectionType="market_description"
                context={{
                  market_name: watchedValues.market_name,
                  industry: watchedValues.industry,
                }}
                onApply={(text) => setValue('market_description', text)}
              />
            </div>
            <Textarea
              id="market_description"
              {...form.register('market_description')}
              placeholder="Describe the market, its current state, and key characteristics..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Market Size */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Market Size (TAM/SAM/SOM)
          </CardTitle>
          <CardDescription>Enter values in USD (e.g., 1000000000 for $1B)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tam_value">TAM ($)</Label>
              <Input
                id="tam_value"
                type="number"
                {...form.register('tam_value', { valueAsNumber: true })}
                placeholder="Total Addressable"
              />
              {watchedValues.tam_value && (
                <p className="text-xs text-muted-foreground">{formatCurrency(watchedValues.tam_value)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sam_value">SAM ($)</Label>
              <Input
                id="sam_value"
                type="number"
                {...form.register('sam_value', { valueAsNumber: true })}
                placeholder="Serviceable Addressable"
              />
              {watchedValues.sam_value && (
                <p className="text-xs text-muted-foreground">{formatCurrency(watchedValues.sam_value)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="som_value">SOM ($)</Label>
              <Input
                id="som_value"
                type="number"
                {...form.register('som_value', { valueAsNumber: true })}
                placeholder="Obtainable"
              />
              {watchedValues.som_value && (
                <p className="text-xs text-muted-foreground">{formatCurrency(watchedValues.som_value)}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="market_growth_rate">Growth Rate (%)</Label>
              <Input
                id="market_growth_rate"
                type="number"
                {...form.register('market_growth_rate', { valueAsNumber: true })}
                placeholder="Annual CAGR"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="market_size_year">Year</Label>
            <Input
              id="market_size_year"
              type="number"
              {...form.register('market_size_year', { valueAsNumber: true })}
              min={2020}
              max={2030}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Target Customer */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Target Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target_customer_description">Customer Profile *</Label>
            <Textarea
              id="target_customer_description"
              {...form.register('target_customer_description')}
              placeholder="Describe your ideal customer (company size, industry, decision makers)..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_pain_points">Pain Points *</Label>
            <Textarea
              id="customer_pain_points"
              {...form.register('customer_pain_points')}
              placeholder="What problems does your target customer face that you solve?"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer_demographics">Demographics (Optional)</Label>
            <Input
              id="customer_demographics"
              {...form.register('customer_demographics')}
              placeholder="e.g., Mid-market companies, 50-500 employees, $10M-$100M revenue"
            />
          </div>
        </CardContent>
      </Card>

      {/* Competition */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            Competitive Landscape
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competition_level">Competition Level *</Label>
            <Select
              value={watchedValues.competition_level}
              onValueChange={(v) => setValue('competition_level', v as MarketAnalysisFormData['competition_level'])}
            >
              <SelectTrigger id="competition_level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Few direct competitors</SelectItem>
                <SelectItem value="medium">Medium - Established players exist</SelectItem>
                <SelectItem value="high">High - Crowded market</SelectItem>
                <SelectItem value="very_high">Very High - Dominated by major players</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="main_competitors">Key Competitors</Label>
            <Textarea
              id="main_competitors"
              {...form.register('main_competitors')}
              placeholder="List main competitors and their strengths/weaknesses..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="competitive_advantages">Your Competitive Advantages *</Label>
              <AISuggestionButton
                sectionType="competitive_advantage"
                context={{
                  company_name: watchedValues.company_name,
                  industry: watchedValues.industry,
                  competitors: watchedValues.main_competitors,
                }}
                onApply={(text) => setValue('competitive_advantages', text)}
              />
            </div>
            <Textarea
              id="competitive_advantages"
              {...form.register('competitive_advantages')}
              placeholder="What makes you different? Why would customers choose you?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trends & Opportunities */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-primary" />
            Trends & Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="market_trends">Market Trends *</Label>
              <AISuggestionButton
                sectionType="market_trends"
                context={{
                  market_name: watchedValues.market_name,
                  industry: watchedValues.industry,
                }}
                onApply={(text) => setValue('market_trends', text)}
              />
            </div>
            <Textarea
              id="market_trends"
              {...form.register('market_trends')}
              placeholder="Key trends shaping this market (technology, regulation, consumer behavior)..."
              rows={4}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="opportunities">Opportunities</Label>
              <Textarea
                id="opportunities"
                {...form.register('opportunities')}
                placeholder="Market opportunities to capitalize on..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threats" className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Threats
              </Label>
              <Textarea
                id="threats"
                {...form.register('threats')}
                placeholder="Potential threats and risks..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SWOT & Recommendations */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            SWOT & Recommendations
          </CardTitle>
          <CardDescription>Optional strategic analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="strengths">Strengths</Label>
              <Textarea
                id="strengths"
                {...form.register('strengths')}
                placeholder="Internal strengths..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weaknesses">Weaknesses</Label>
              <Textarea
                id="weaknesses"
                {...form.register('weaknesses')}
                placeholder="Internal weaknesses..."
                rows={2}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recommendations">Strategic Recommendations</Label>
            <Textarea
              id="recommendations"
              {...form.register('recommendations')}
              placeholder="Key recommendations based on this analysis..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sources">Sources & References</Label>
            <Textarea
              id="sources"
              {...form.register('sources')}
              placeholder="List data sources, reports, and references used..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
