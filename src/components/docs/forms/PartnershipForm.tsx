import React, { useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Handshake, Building2, Users, Target, FileText, Calendar, DollarSign } from 'lucide-react';
import { AutoFillButton } from '../AutoFillButton';
import { AISuggestionButton } from '../AISuggestionButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import type { DocTemplate } from '@/types/document';

const partnershipSchema = z.object({
  // Your Company
  your_company_name: z.string().min(1, 'Company name is required'),
  your_company_address: z.string().min(1, 'Address is required'),
  your_contact_name: z.string().min(1, 'Contact name is required'),
  your_contact_email: z.string().email('Valid email required'),
  your_contact_title: z.string().min(1, 'Title is required'),
  
  // Partner Company
  partner_company_name: z.string().min(1, 'Partner company name is required'),
  partner_company_address: z.string().optional(),
  partner_contact_name: z.string().optional(),
  partner_contact_email: z.string().optional(),
  
  // Partnership Details
  partnership_type: z.enum(['strategic', 'distribution', 'technology', 'marketing', 'referral', 'joint_venture']),
  partnership_objective: z.string().min(10, 'Please describe the partnership objective'),
  value_proposition: z.string().min(10, 'Please describe the value proposition'),
  
  // Terms
  revenue_share_percent: z.number().min(0).max(100).optional(),
  duration_months: z.number().min(1).max(120).optional(),
  exclusivity: z.enum(['exclusive', 'non_exclusive', 'semi_exclusive']),
  territory: z.string().optional(),
  
  // Responsibilities
  your_responsibilities: z.string().min(10, 'Please describe your responsibilities'),
  partner_responsibilities: z.string().min(10, 'Please describe partner responsibilities'),
  
  // Success Metrics
  success_metrics: z.string().optional(),
  
  // Additional
  effective_date: z.string().optional(),
  special_terms: z.string().optional(),
});

type PartnershipFormData = z.infer<typeof partnershipSchema>;

interface PartnershipFormProps {
  template: DocTemplate | null;
  onGenerate: (data: Record<string, unknown>) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

const PARTNERSHIP_TYPES = [
  { value: 'strategic', label: 'Strategic Alliance' },
  { value: 'distribution', label: 'Distribution Partnership' },
  { value: 'technology', label: 'Technology Partnership' },
  { value: 'marketing', label: 'Co-Marketing Partnership' },
  { value: 'referral', label: 'Referral Partnership' },
  { value: 'joint_venture', label: 'Joint Venture' },
];

export function PartnershipForm({ template, onGenerate, onPreviewUpdate, isGenerating }: PartnershipFormProps) {
  const form = useForm<PartnershipFormData>({
    resolver: zodResolver(partnershipSchema),
    defaultValues: {
      your_company_name: '',
      your_company_address: '',
      your_contact_name: '',
      your_contact_email: '',
      your_contact_title: '',
      partner_company_name: '',
      partner_company_address: '',
      partner_contact_name: '',
      partner_contact_email: '',
      partnership_type: 'strategic',
      partnership_objective: '',
      value_proposition: '',
      revenue_share_percent: undefined,
      duration_months: 24,
      exclusivity: 'non_exclusive',
      territory: 'Worldwide',
      your_responsibilities: '',
      partner_responsibilities: '',
      success_metrics: '',
      effective_date: new Date().toISOString().split('T')[0],
      special_terms: '',
    },
  });

  const { setValue, handleSubmit, formState: { errors } } = form;

  // Draft persistence
  const {
    hasDraft,
    draftAge,
    restoreDraft,
    dismissDraft,
  } = useDocFormDraft({
    form,
    templateId: 'partnership-proposal',
  });

  // Optimized: subscription-based watch to avoid re-renders
  const formValuesRef = useRef(form.getValues());
  const previewTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const subscription = form.watch((values) => {
      formValuesRef.current = values as PartnershipFormData;
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
  }, [form, onPreviewUpdate]);

  // Generate preview HTML
  const generatePreview = useCallback((rawData: PartnershipFormData) => {
    const d = escapeFormValues(rawData as unknown as Record<string, unknown>) as unknown as PartnershipFormData;
    const partnershipType = PARTNERSHIP_TYPES.find(t => t.value === d.partnership_type)?.label || d.partnership_type;
    
    const html = `
      <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3B82F6; padding-bottom: 20px;">
          <h1 style="font-size: 28px; margin: 0 0 8px 0; color: #0F172A;">PARTNERSHIP PROPOSAL</h1>
          <p style="color: #64748B; margin: 0; font-size: 14px;">${partnershipType}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
          <div style="padding: 20px; background: #F8FAFC; border-radius: 8px;">
            <h3 style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase;">From</h3>
            <p style="font-weight: 600; margin: 0 0 4px 0; color: #0F172A;">${d.your_company_name || '[Your Company]'}</p>
            <p style="font-size: 13px; color: #475569; margin: 0;">${d.your_contact_name || '[Contact Name]'}</p>
            <p style="font-size: 13px; color: #475569; margin: 0;">${d.your_contact_title || '[Title]'}</p>
          </div>
          <div style="padding: 20px; background: #F8FAFC; border-radius: 8px;">
            <h3 style="font-size: 12px; color: #64748B; margin: 0 0 8px 0; text-transform: uppercase;">To</h3>
            <p style="font-weight: 600; margin: 0 0 4px 0; color: #0F172A;">${d.partner_company_name || '[Partner Company]'}</p>
            <p style="font-size: 13px; color: #475569; margin: 0;">${d.partner_contact_name || ''}</p>
          </div>
        </div>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Partnership Objective</h2>
          <p style="line-height: 1.7; color: #334155;">${d.partnership_objective || '[Describe the main objective of this partnership]'}</p>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Value Proposition</h2>
          <p style="line-height: 1.7; color: #334155;">${d.value_proposition || '[Describe the mutual value proposition]'}</p>
        </section>
        
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Proposed Terms</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B; width: 40%;">Duration</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${d.duration_months || 24} months</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B;">Exclusivity</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${d.exclusivity === 'exclusive' ? 'Exclusive' : d.exclusivity === 'semi_exclusive' ? 'Semi-Exclusive' : 'Non-Exclusive'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B;">Territory</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${d.territory || 'Worldwide'}</td>
            </tr>
            ${d.revenue_share_percent ? `
            <tr style="border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 12px 0; color: #64748B;">Revenue Share</td>
              <td style="padding: 12px 0; color: #0F172A; font-weight: 500;">${d.revenue_share_percent}%</td>
            </tr>` : ''}
          </table>
        </section>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px;">
          <section>
            <h2 style="font-size: 16px; color: #0F172A; margin-bottom: 12px;">Our Responsibilities</h2>
            <div style="padding: 16px; background: #EFF6FF; border-radius: 8px; border-left: 3px solid #3B82F6;">
              <p style="margin: 0; font-size: 14px; color: #1E40AF; line-height: 1.6;">${d.your_responsibilities || '[Your responsibilities]'}</p>
            </div>
          </section>
          <section>
            <h2 style="font-size: 16px; color: #0F172A; margin-bottom: 12px;">Partner Responsibilities</h2>
            <div style="padding: 16px; background: #F0FDF4; border-radius: 8px; border-left: 3px solid #10B981;">
              <p style="margin: 0; font-size: 14px; color: #166534; line-height: 1.6;">${d.partner_responsibilities || '[Partner responsibilities]'}</p>
            </div>
          </section>
        </div>
        
        ${d.success_metrics ? `
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Success Metrics</h2>
          <p style="line-height: 1.7; color: #334155;">${d.success_metrics}</p>
        </section>` : ''}
        
        ${d.special_terms ? `
        <section style="margin-bottom: 32px;">
          <h2 style="font-size: 18px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; margin-bottom: 16px;">Additional Terms</h2>
          <p style="line-height: 1.7; color: #334155;">${d.special_terms}</p>
        </section>` : ''}
        
        <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 11px;">
          Generated with AIWMC Quantis™ | aiwmcquantis.com
        </footer>
      </div>
    `;
    onPreviewUpdate(sanitizePreviewHTML(html));
  }, [onPreviewUpdate]);

  // Provide watchedValues for Select components via form.watch on specific fields
  const partnershipType = form.watch('partnership_type');
  const exclusivity = form.watch('exclusivity');
  const yourCompanyName = form.watch('your_company_name');
  const partnerCompanyName = form.watch('partner_company_name');
  const handleAutoFill = useCallback((data: Record<string, unknown>) => {
    if (data.company_name) setValue('your_company_name', String(data.company_name));
    if (data.location) setValue('your_company_address', String(data.location));
  }, [setValue]);

  const onSubmit = (data: PartnershipFormData) => {
    onGenerate(data as Record<string, unknown>);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Auto-fill from Analysis */}
      <AutoFillButton onAutoFill={handleAutoFill} />

      {/* Your Company Section */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            Your Company
          </CardTitle>
          <CardDescription>Your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="your_company_name">Company Name *</Label>
              <Input
                id="your_company_name"
                {...form.register('your_company_name')}
                placeholder="Your Company Inc."
                aria-invalid={!!errors.your_company_name}
              />
              {errors.your_company_name && (
                <p className="text-sm text-destructive">{errors.your_company_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="your_company_address">Address *</Label>
              <Input
                id="your_company_address"
                {...form.register('your_company_address')}
                placeholder="123 Business Ave, City, State"
              />
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="your_contact_name">Contact Name *</Label>
              <Input
                id="your_contact_name"
                {...form.register('your_contact_name')}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="your_contact_title">Title *</Label>
              <Input
                id="your_contact_title"
                {...form.register('your_contact_title')}
                placeholder="CEO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="your_contact_email">Email *</Label>
              <Input
                id="your_contact_email"
                type="email"
                {...form.register('your_contact_email')}
                placeholder="john@company.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner Company Section */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-primary" />
            Partner Company
          </CardTitle>
          <CardDescription>Prospective partner details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partner_company_name">Company Name *</Label>
              <Input
                id="partner_company_name"
                {...form.register('partner_company_name')}
                placeholder="Partner Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_company_address">Address</Label>
              <Input
                id="partner_company_address"
                {...form.register('partner_company_address')}
                placeholder="456 Partner St, City, State"
              />
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partner_contact_name">Contact Name</Label>
              <Input
                id="partner_contact_name"
                {...form.register('partner_contact_name')}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_contact_email">Contact Email</Label>
              <Input
                id="partner_contact_email"
                type="email"
                {...form.register('partner_contact_email')}
                placeholder="jane@partner.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partnership Details */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="w-5 h-5 text-primary" />
            Partnership Details
          </CardTitle>
          <CardDescription>Define the partnership scope and objectives</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="partnership_type">Partnership Type *</Label>
              <Select
                value={partnershipType}
                onValueChange={(v) => setValue('partnership_type', v as PartnershipFormData['partnership_type'])}
              >
                <SelectTrigger id="partnership_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTNERSHIP_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date</Label>
              <Input
                id="effective_date"
                type="date"
                {...form.register('effective_date')}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="partnership_objective">Partnership Objective *</Label>
              <AISuggestionButton
                sectionType="partnership_objective"
                context={{
                  company_name: yourCompanyName,
                  partner_name: partnerCompanyName,
                  partnership_type: partnershipType,
                }}
                onApply={(text) => setValue('partnership_objective', text)}
              />
            </div>
            <Textarea
              id="partnership_objective"
              {...form.register('partnership_objective')}
              placeholder="Describe the main goals and objectives of this partnership..."
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="value_proposition">Value Proposition *</Label>
              <AISuggestionButton
                sectionType="value_proposition"
                context={{
                  company_name: yourCompanyName,
                  partner_name: partnerCompanyName,
                  partnership_type: partnershipType,
                }}
                onApply={(text) => setValue('value_proposition', text)}
              />
            </div>
            <Textarea
              id="value_proposition"
              {...form.register('value_proposition')}
              placeholder="What value does this partnership create for both parties?"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            Proposed Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (months)</Label>
              <Input
                id="duration_months"
                type="number"
                {...form.register('duration_months', { valueAsNumber: true })}
                min={1}
                max={120}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exclusivity">Exclusivity</Label>
              <Select
                value={exclusivity}
                onValueChange={(v) => setValue('exclusivity', v as PartnershipFormData['exclusivity'])}
              >
                <SelectTrigger id="exclusivity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_exclusive">Non-Exclusive</SelectItem>
                  <SelectItem value="semi_exclusive">Semi-Exclusive</SelectItem>
                  <SelectItem value="exclusive">Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="territory">Territory</Label>
              <Input
                id="territory"
                {...form.register('territory')}
                placeholder="Worldwide"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="revenue_share_percent">Revenue Share %</Label>
              <Input
                id="revenue_share_percent"
                type="number"
                {...form.register('revenue_share_percent', { valueAsNumber: true })}
                min={0}
                max={100}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responsibilities */}
      <Card className="doc-section-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="your_responsibilities">Your Responsibilities *</Label>
              <Textarea
                id="your_responsibilities"
                {...form.register('your_responsibilities')}
                placeholder="What your company will provide and deliver..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner_responsibilities">Partner Responsibilities *</Label>
              <Textarea
                id="partner_responsibilities"
                {...form.register('partner_responsibilities')}
                placeholder="What you expect from the partner..."
                rows={4}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="success_metrics">Success Metrics</Label>
            <Textarea
              id="success_metrics"
              {...form.register('success_metrics')}
              placeholder="How will partnership success be measured? (KPIs, milestones, etc.)"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="special_terms">Additional Terms</Label>
            <Textarea
              id="special_terms"
              {...form.register('special_terms')}
              placeholder="Any special conditions or requirements..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
