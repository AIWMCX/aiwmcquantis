import React, { useEffect, useCallback, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, PieChart, Shield, Clock, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { AutoFillButton } from '../AutoFillButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import type { DocTemplate } from '@/types/document';

const founderSchema = z.object({
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  role: z.string().min(1, 'Role required'),
  equity_percent: z.number().min(0).max(100),
  vesting_months: z.number().min(0).max(60),
  cliff_months: z.number().min(0).max(24),
});

const agreementSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  company_type: z.enum(['llc', 'c_corp', 's_corp', 'partnership', 'sole_prop']),
  state_of_incorporation: z.string().min(2, 'State required'),
  
  founders: z.array(founderSchema).min(1, 'At least one founder required'),
  
  standard_vesting_months: z.number().min(12).max(60),
  standard_cliff_months: z.number().min(0).max(24),
  acceleration_on_exit: z.boolean(),
  acceleration_on_termination: z.boolean(),
  
  ip_assignment: z.boolean(),
  non_compete_months: z.number().min(0).max(36),
  non_solicit_months: z.number().min(0).max(36),
  
  voting_threshold: z.number().min(50).max(100),
  major_decisions_require_unanimous: z.boolean(),
  
  drag_along: z.boolean(),
  tag_along: z.boolean(),
  right_of_first_refusal: z.boolean(),
  
  good_leaver_buyback: z.boolean(),
  bad_leaver_buyback: z.boolean(),
  buyback_price_method: z.enum(['fair_market_value', 'cost_basis', 'formula']),
  
  effective_date: z.string(),
  governing_law_state: z.string(),
  dispute_resolution: z.enum(['arbitration', 'litigation', 'mediation_first']),
  additional_terms: z.string().optional(),
});

type FounderAgreementFormData = z.infer<typeof agreementSchema>;

interface FounderAgreementFormProps {
  template: DocTemplate | null;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function FounderAgreementForm({ template, onGenerate, onPreviewUpdate, isGenerating }: FounderAgreementFormProps) {
  const form = useForm<FounderAgreementFormData>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      company_name: '',
      company_type: 'llc',
      state_of_incorporation: '',
      founders: [
        { name: '', email: '', role: 'CEO', equity_percent: 50, vesting_months: 48, cliff_months: 12 },
        { name: '', email: '', role: 'CTO', equity_percent: 50, vesting_months: 48, cliff_months: 12 },
      ],
      standard_vesting_months: 48,
      standard_cliff_months: 12,
      acceleration_on_exit: true,
      acceleration_on_termination: false,
      ip_assignment: true,
      non_compete_months: 12,
      non_solicit_months: 24,
      voting_threshold: 51,
      major_decisions_require_unanimous: true,
      drag_along: true,
      tag_along: true,
      right_of_first_refusal: true,
      good_leaver_buyback: true,
      bad_leaver_buyback: true,
      buyback_price_method: 'fair_market_value',
      effective_date: new Date().toISOString().split('T')[0],
      governing_law_state: '',
      dispute_resolution: 'arbitration',
      additional_terms: '',
    },
  });

  const { setValue, handleSubmit, formState: { errors }, control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'founders' });

  // Draft persistence
  const {
    hasDraft,
    draftAge,
    isSaving,
    lastSaved,
    restoreDraft,
    dismissDraft,
  } = useDocFormDraft({
    form,
    templateId: 'founder-agreement',
  });

  // Optimized: subscription-based watch to avoid full re-renders
  const formValuesRef = useRef<FounderAgreementFormData>(form.getValues());
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Compute equity from ref for preview (not triggering re-renders)
  const computeEquity = useCallback((founders: FounderAgreementFormData['founders']) => {
    return founders.reduce((sum, f) => sum + (f.equity_percent || 0), 0);
  }, []);

  const generatePreview = useCallback((rawData: FounderAgreementFormData) => {
    const d = escapeFormValues(rawData as unknown as Record<string, unknown>) as unknown as FounderAgreementFormData;
    const totalEquity = computeEquity(rawData.founders); // use raw for numbers
    const equityBalanced = Math.abs(totalEquity - 100) < 0.01;
    
    const companyTypeLabel = {
      llc: 'Limited Liability Company',
      c_corp: 'C Corporation',
      s_corp: 'S Corporation',
      partnership: 'Partnership',
      sole_prop: 'Sole Proprietorship',
    }[d.company_type];
    
    const html = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">Created by AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 20px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.06em;">Founder&rsquo;s Agreement</h1>
        <p style="font-size: 13px; text-align: center; color: #444444; margin: 0 0 4px 0;">${d.company_name || '[Company Name]'}</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">Effective Date: ${d.effective_date || '[Date]'}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 20px 0;">This Founder&rsquo;s Agreement (&ldquo;Agreement&rdquo;) is entered into as of <strong>${d.effective_date || '[Date]'}</strong> by and among the undersigned founders of <strong>${d.company_name || '[Company Name]'}</strong>, a ${companyTypeLabel} organized under the laws of the State of <strong>${d.state_of_incorporation || '[State]'}</strong>.</p>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">1. Founders &amp; Equity Distribution</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: left;">Founder</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: left;">Role</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: center;">Equity %</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: center;">Vesting</th>
                <th style="font-size: 9px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; border-bottom: 2px solid #111111; padding: 6px 10px; text-align: center;">Cliff</th>
              </tr>
            </thead>
            <tbody>
              ${d.founders.map((f, i) => `<tr><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px;">${f.name || `Founder ${i + 1}`}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px;">${f.role || '-'}</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center; font-family: 'Courier New',Courier,monospace; font-weight: bold;">${rawData.founders[i]?.equity_percent || 0}%</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center;">${rawData.founders[i]?.vesting_months || 0} mo</td><td style="border-bottom: 1px solid #cccccc; padding: 8px 10px; font-size: 12px; text-align: center;">${rawData.founders[i]?.cliff_months || 0} mo</td></tr>`).join('')}
              <tr><td colspan="2" style="padding: 8px 10px; font-size: 12px; font-weight: bold; border-bottom: 2px solid #111111;">Total</td><td style="padding: 8px 10px; font-size: 12px; border-bottom: 2px solid #111111; text-align: center; font-family: 'Courier New',Courier,monospace; font-weight: bold; color: ${equityBalanced ? '#111111' : '#cc0000'};">${totalEquity}%</td><td colspan="2" style="border-bottom: 2px solid #111111;"></td></tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">2. Vesting Schedule</h2>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; color: #111111;">
            <li>Standard vesting period: <strong>${rawData.standard_vesting_months} months</strong></li>
            <li>Cliff period: <strong>${rawData.standard_cliff_months} months</strong></li>
            <li>Acceleration on exit: <strong>${rawData.acceleration_on_exit ? 'Yes (100% acceleration)' : 'No'}</strong></li>
            <li>Acceleration on termination without cause: <strong>${rawData.acceleration_on_termination ? 'Yes' : 'No'}</strong></li>
          </ul>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">3. Intellectual Property</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;">${rawData.ip_assignment ? 'All founders agree to assign all intellectual property created for or relating to the Company to the Company.' : 'IP assignment terms to be negotiated separately.'}</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Non-Compete:</strong> ${rawData.non_compete_months} months after departure &nbsp;&middot;&nbsp; <strong>Non-Solicitation:</strong> ${rawData.non_solicit_months} months after departure</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">4. Decision Making</h2>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; color: #111111;">
            <li>Voting threshold for ordinary decisions: <strong>${rawData.voting_threshold}%</strong></li>
            <li>Major decisions require unanimous consent: <strong>${rawData.major_decisions_require_unanimous ? 'Yes' : 'No'}</strong></li>
          </ul>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">5. Exit Provisions</h2>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; color: #111111;">
            <li>Drag-Along Rights: <strong>${rawData.drag_along ? 'Enabled' : 'Disabled'}</strong></li>
            <li>Tag-Along Rights: <strong>${rawData.tag_along ? 'Enabled' : 'Disabled'}</strong></li>
            <li>Right of First Refusal: <strong>${rawData.right_of_first_refusal ? 'Enabled' : 'Disabled'}</strong></li>
          </ul>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">6. Founder Departure</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>Good Leaver:</strong> ${rawData.good_leaver_buyback ? 'Company may repurchase unvested shares' : 'No buyback provision'}<br/><strong>Bad Leaver:</strong> ${rawData.bad_leaver_buyback ? 'Company may repurchase all shares (vested and unvested)' : 'No buyback provision'}<br/><strong>Buyback Price:</strong> ${rawData.buyback_price_method === 'fair_market_value' ? 'Fair Market Value' : rawData.buyback_price_method === 'cost_basis' ? 'Original Cost Basis' : 'Formula-based'}</p>
        </section>
        <section style="margin-bottom: 24px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">7. Governing Law &amp; Disputes</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">This Agreement shall be governed by the laws of the State of <strong>${d.governing_law_state || '[State]'}</strong>. Dispute resolution: <strong>${rawData.dispute_resolution === 'arbitration' ? 'Binding Arbitration' : rawData.dispute_resolution === 'litigation' ? 'Court Litigation' : 'Mediation, then Arbitration'}</strong></p>
        </section>
        ${d.additional_terms ? `<section style="margin-bottom: 24px;"><h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">8. Additional Terms</h2><p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">${d.additional_terms}</p></section>` : ''}
        <section style="margin-top: 40px; margin-bottom: 24px; padding-top: 24px; border-top: 1px solid #cccccc;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Signatures</h2>
          ${d.founders.map((f) => `<div style="display: inline-block; width: 44%; margin-right: 5%; margin-bottom: 32px; vertical-align: top;"><div style="border-bottom: 1px solid #000000; margin-bottom: 8px; height: 40px;"></div><p style="margin: 0; font-size: 13px;"><strong>${f.name || '________________'}</strong></p><p style="margin: 4px 0 0 0; font-size: 11px; color: #555555;">${f.role || 'Founder'}</p><p style="margin: 4px 0 0 0; font-size: 11px; color: #555555;">Date: ________________</p></div>`).join('')}
        </section>
        <div style="padding: 12px 16px; border: 1px solid #cccccc; background: #fafafa; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 11px; color: #444444;"><strong>LEGAL DISCLAIMER:</strong> This template is provided for informational purposes only and does not constitute legal advice. Consult with a qualified attorney before executing any legal agreement.</p>
        </div>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">FOUNDER&rsquo;S AGREEMENT &middot; ${d.company_name || 'Company'} &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    onPreviewUpdate(sanitizePreviewHTML(html));
  }, [onPreviewUpdate, computeEquity]);

  // Subscription-based watch for debounced preview (no full re-renders)
  useEffect(() => {
    const subscription = form.watch((values) => {
      formValuesRef.current = values as FounderAgreementFormData;
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        generatePreview(formValuesRef.current);
      }, 300);
    });
    generatePreview(form.getValues());
    return () => {
      subscription.unsubscribe();
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [form, generatePreview]);

  // Watched fields needed for Select/Checkbox controlled components
  const companyType = form.watch('company_type');
  const buybackPriceMethod = form.watch('buyback_price_method');
  const disputeResolution = form.watch('dispute_resolution');
  const accelerationOnExit = form.watch('acceleration_on_exit');
  const accelerationOnTermination = form.watch('acceleration_on_termination');
  const ipAssignment = form.watch('ip_assignment');
  const dragAlong = form.watch('drag_along');
  const tagAlong = form.watch('tag_along');
  const rightOfFirstRefusal = form.watch('right_of_first_refusal');
  const majorDecisionsRequireUnanimous = form.watch('major_decisions_require_unanimous');

  // Equity calculation from watched founders
  const watchedFounders = form.watch('founders');
  const totalEquity = watchedFounders.reduce((sum, f) => sum + (f.equity_percent || 0), 0);
  const equityBalanced = Math.abs(totalEquity - 100) < 0.01;

  const handleAutoFill = useCallback((data: Record<string, unknown>) => {
    if (data.company_name) setValue('company_name', String(data.company_name));
    if (data.location) setValue('state_of_incorporation', String(data.location).split(',').pop()?.trim() || '');
  }, [setValue]);

  const onSubmit = (data: FounderAgreementFormData) => {
    onGenerate(data as unknown as Record<string, unknown>);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Draft recovery banner */}
      <DocDraftBanner
        hasDraft={hasDraft}
        draftAge={draftAge}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
      />

      {/* Auto-fill from Analysis */}
      <AutoFillButton onAutoFill={handleAutoFill} />

      {/* Company Info */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                {...form.register('company_name')}
                placeholder="Startup Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_type">Entity Type *</Label>
              <Select
                value={companyType}
                onValueChange={(v) => setValue('company_type', v as FounderAgreementFormData['company_type'])}
              >
                <SelectTrigger id="company_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llc">LLC</SelectItem>
                  <SelectItem value="c_corp">C Corporation</SelectItem>
                  <SelectItem value="s_corp">S Corporation</SelectItem>
                  <SelectItem value="partnership">Partnership</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="state_of_incorporation">State of Incorporation *</Label>
              <Input
                id="state_of_incorporation"
                {...form.register('state_of_incorporation')}
                placeholder="Delaware"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                {...form.register('effective_date')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Founders */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Founders & Equity
          </CardTitle>
          <CardDescription>
            Total equity: <span className={equityBalanced ? 'text-success font-semibold' : 'text-destructive font-semibold'}>{totalEquity}%</span>
            {!equityBalanced && <span className="text-destructive ml-2">(Must equal 100%)</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border rounded-lg bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Founder {index + 1}</h4>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    {...form.register(`founders.${index}.name`)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    {...form.register(`founders.${index}.email`)}
                    placeholder="john@startup.com"
                  />
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Input
                    {...form.register(`founders.${index}.role`)}
                    placeholder="CEO"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Equity %</Label>
                  <Input
                    type="number"
                    {...form.register(`founders.${index}.equity_percent`, { valueAsNumber: true })}
                    min={0}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vesting (mo)</Label>
                  <Input
                    type="number"
                    {...form.register(`founders.${index}.vesting_months`, { valueAsNumber: true })}
                    min={0}
                    max={60}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cliff (mo)</Label>
                  <Input
                    type="number"
                    {...form.register(`founders.${index}.cliff_months`, { valueAsNumber: true })}
                    min={0}
                    max={24}
                  />
                </div>
              </div>
            </div>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: '', email: '', role: '', equity_percent: 0, vesting_months: 48, cliff_months: 12 })}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Founder
          </Button>
        </CardContent>
      </Card>

      {/* Vesting & IP */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Vesting & Intellectual Property
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Standard Vesting (mo)</Label>
              <Input
                type="number"
                {...form.register('standard_vesting_months', { valueAsNumber: true })}
                min={12}
                max={60}
              />
            </div>
            <div className="space-y-2">
              <Label>Standard Cliff (mo)</Label>
              <Input
                type="number"
                {...form.register('standard_cliff_months', { valueAsNumber: true })}
                min={0}
                max={24}
              />
            </div>
            <div className="space-y-2">
              <Label>Non-Compete (mo)</Label>
              <Input
                type="number"
                {...form.register('non_compete_months', { valueAsNumber: true })}
                min={0}
                max={36}
              />
            </div>
            <div className="space-y-2">
              <Label>Non-Solicit (mo)</Label>
              <Input
                type="number"
                {...form.register('non_solicit_months', { valueAsNumber: true })}
                min={0}
                max={36}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6 pt-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="acceleration_on_exit"
                checked={accelerationOnExit}
                onCheckedChange={(checked) => setValue('acceleration_on_exit', !!checked)}
              />
              <Label htmlFor="acceleration_on_exit" className="cursor-pointer">
                Acceleration on Exit
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="acceleration_on_termination"
                checked={accelerationOnTermination}
                onCheckedChange={(checked) => setValue('acceleration_on_termination', !!checked)}
              />
              <Label htmlFor="acceleration_on_termination" className="cursor-pointer">
                Acceleration on Termination
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ip_assignment"
                checked={ipAssignment}
                onCheckedChange={(checked) => setValue('ip_assignment', !!checked)}
              />
              <Label htmlFor="ip_assignment" className="cursor-pointer">
                IP Assignment Required
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exit & Governance */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PieChart className="w-5 h-5 text-primary" />
            Governance & Exit Provisions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Voting Threshold %</Label>
              <Input
                type="number"
                {...form.register('voting_threshold', { valueAsNumber: true })}
                min={50}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Buyback Price Method</Label>
              <Select
                value={buybackPriceMethod}
                onValueChange={(v) => setValue('buyback_price_method', v as FounderAgreementFormData['buyback_price_method'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fair_market_value">Fair Market Value</SelectItem>
                  <SelectItem value="cost_basis">Original Cost</SelectItem>
                  <SelectItem value="formula">Formula-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="drag_along"
                checked={dragAlong}
                onCheckedChange={(checked) => setValue('drag_along', !!checked)}
              />
              <Label htmlFor="drag_along" className="cursor-pointer">Drag-Along Rights</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="tag_along"
                checked={tagAlong}
                onCheckedChange={(checked) => setValue('tag_along', !!checked)}
              />
              <Label htmlFor="tag_along" className="cursor-pointer">Tag-Along Rights</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="right_of_first_refusal"
                checked={rightOfFirstRefusal}
                onCheckedChange={(checked) => setValue('right_of_first_refusal', !!checked)}
              />
              <Label htmlFor="right_of_first_refusal" className="cursor-pointer">Right of First Refusal</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="major_decisions_require_unanimous"
                checked={majorDecisionsRequireUnanimous}
                onCheckedChange={(checked) => setValue('major_decisions_require_unanimous', !!checked)}
              />
              <Label htmlFor="major_decisions_require_unanimous" className="cursor-pointer">Unanimous Major Decisions</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Legal & Disputes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Governing Law State</Label>
              <Input
                {...form.register('governing_law_state')}
                placeholder="Delaware"
              />
            </div>
            <div className="space-y-2">
              <Label>Dispute Resolution</Label>
              <Select
                value={disputeResolution}
                onValueChange={(v) => setValue('dispute_resolution', v as FounderAgreementFormData['dispute_resolution'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arbitration">Binding Arbitration</SelectItem>
                  <SelectItem value="litigation">Court Litigation</SelectItem>
                  <SelectItem value="mediation_first">Mediation First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Additional Terms</Label>
            <Textarea
              {...form.register('additional_terms')}
              placeholder="Any additional provisions or special terms..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {!equityBalanced && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
          <p className="text-sm text-destructive font-medium">
            Equity must total 100% before downloading (currently {totalEquity}%)
          </p>
        </div>
      )}
    </form>
  );
}
