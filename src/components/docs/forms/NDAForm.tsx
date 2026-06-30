import React, { useEffect, useMemo, useCallback } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle, Scale, Building2, User } from 'lucide-react';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import type { AutoFillData } from '@/hooks/useAnalysisAutoFill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { DocTemplate } from '@/types/document';

const NDAFormSchema = z.object({
  effective_date: z.string(),
  jurisdiction: z.string().min(5, 'Jurisdiction required'),
  
  party_a_name: z.string().min(2, 'Company name required'),
  party_a_address: z.string().min(5, 'Address required'),
  party_a_city: z.string().min(5, 'City required'),
  party_a_rep: z.string().min(5, 'Representative required'),
  party_a_email: z.string().email('Valid email required'),
  
  party_b_name: z.string().min(2, 'Company name required'),
  party_b_address: z.string().min(5, 'Address required'),
  party_b_city: z.string().min(5, 'City required'),
  party_b_rep: z.string().min(5, 'Representative required'),
  party_b_email: z.string().email('Valid email required'),
  
  purpose: z.string().min(20, 'Purpose must be at least 20 characters'),
  term_years: z.number().min(1).max(10),
  confidentiality_years: z.number().min(1).max(10),
});

type NDAFormData = z.infer<typeof NDAFormSchema>;

interface NDAFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: any) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
}

export function NDAForm({ template, onGenerate, onPreviewUpdate, isGenerating }: NDAFormProps) {
  const today = new Date().toISOString().split('T')[0];
  
  const defaultValues = useMemo(() => {
    const templateJson = template?.template_json as Record<string, any> | undefined;
    const prefilled = templateJson?.prefilled_content;
    return {
      effective_date: today,
      jurisdiction: prefilled?.header?.jurisdiction || 'State of Colorado, United States',
      
      party_a_name: prefilled?.parties?.party_a?.legal_name || '',
      party_a_address: prefilled?.parties?.party_a?.address || '',
      party_a_city: prefilled?.parties?.party_a?.city_state_zip || '',
      party_a_rep: prefilled?.parties?.party_a?.represented_by || '',
      party_a_email: prefilled?.parties?.party_a?.email || '',
      
      party_b_name: '[Company Name]',
      party_b_address: '[Street Address]',
      party_b_city: '[City, State ZIP]',
      party_b_rep: '[Representative Name and Title]',
      party_b_email: '[Email Address]',
      
      purpose: 'The Parties wish to explore a potential business relationship and may disclose confidential and proprietary information to each other in connection with this purpose.',
      term_years: 3,
      confidentiality_years: 5,
    };
  }, [template, today]);

  const form = useForm<NDAFormData>({
    resolver: zodResolver(NDAFormSchema),
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
    templateId: 'nda-agreement',
  });

  const formValues = form.watch();

  // Generate preview HTML
  useEffect(() => {
    // SECURITY: Escape all form values before template interpolation to prevent XSS
    const safeValues = escapeFormValues(formValues);
    
    const effectiveDate = formValues.effective_date 
      ? new Date(formValues.effective_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '[Date]';

    const rawHTML = `
      <div style="font-family: Georgia,'Times New Roman',Times,serif; max-width: 800px; margin: 0 auto; padding: 56px 72px; color: #111111; background: #ffffff;">
        <p style="font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #444444; text-align: center; margin: 0 0 8px 0;">AIWMC Research Foundation &middot; AIWMC Quantis &middot; Denver, CO, USA</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 20px 0;" />
        <h1 style="font-family: Georgia,serif; font-size: 20px; font-weight: bold; text-align: center; color: #000000; margin: 0 0 6px 0; letter-spacing: 0.06em; text-transform: uppercase;">Mutual Non-Disclosure Agreement</h1>
        <p style="font-size: 11px; text-align: center; color: #555555; margin: 0 0 6px 0; font-style: italic;">Confidential Information Protection</p>
        <p style="font-size: 11px; text-align: center; color: #777777; margin: 0 0 24px 0;">Effective Date: ${effectiveDate}</p>
        <hr style="border: none; border-top: 1px solid #000000; margin: 0 0 28px 0;" />
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Parties</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
              <tr>
                <td style="padding: 12px 16px 12px 0; border-bottom: 1px solid #e0e0e0; vertical-align: top; width: 50%;">
                  <p style="font-size: 10px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Party A</p>
                  <p style="font-weight: bold; margin: 0 0 2px 0; color: #111111;">${safeValues.party_a_name || '[Company Name]'}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">${safeValues.party_a_address || ''}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">${safeValues.party_a_city || ''}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">Rep: ${safeValues.party_a_rep || '[Representative]'}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">${safeValues.party_a_email || ''}</p>
                </td>
                <td style="padding: 12px 0 12px 16px; border-bottom: 1px solid #e0e0e0; border-left: 1px solid #e0e0e0; vertical-align: top;">
                  <p style="font-size: 10px; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; color: #444444; margin: 0 0 6px 0;">Party B</p>
                  <p style="font-weight: bold; margin: 0 0 2px 0; color: #111111;">${safeValues.party_b_name || '[Company Name]'}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">${safeValues.party_b_address || ''}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">${safeValues.party_b_city || ''}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">Rep: ${safeValues.party_b_rep || '[Representative]'}</p>
                  <p style="color: #555555; margin: 2px 0; font-size: 12px;">${safeValues.party_b_email || ''}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">Recitals</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;"><strong>WHEREAS,</strong> ${safeValues.purpose || '[Purpose]'}</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 10px 0;"><strong>WHEREAS,</strong> the Parties desire to protect the confidentiality of such information and define the terms under which Confidential Information may be disclosed and used;</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>NOW, THEREFORE,</strong> in consideration of the mutual covenants herein, the Parties agree as follows:</p>
        </section>
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">1. Definition of Confidential Information</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;">&ldquo;Confidential Information&rdquo; means any and all technical and non-technical information disclosed by either Party, including but not limited to:</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.75; color: #111111;">
            <li style="margin-bottom: 4px;">Trade secrets, know-how, inventions, techniques, processes, algorithms, software programs</li>
            <li style="margin-bottom: 4px;">Business and technical information, customer lists, supplier lists</li>
            <li style="margin-bottom: 4px;">Information regarding research, development, marketing plans, and budgets</li>
            <li style="margin-bottom: 4px;">Any information designated as confidential or proprietary</li>
          </ul>
        </section>
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">2. Obligations of Receiving Party</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;"><strong>2.1</strong> The Receiving Party agrees to hold Confidential Information in strict confidence and take all reasonable precautions to protect such information.</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;"><strong>2.2</strong> The Receiving Party agrees not to divulge any Confidential Information to any third person without prior written consent.</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>2.3</strong> The Receiving Party agrees not to use the Confidential Information for any purpose except to evaluate the potential business relationship.</p>
        </section>
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">3. Term</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">This Agreement shall remain in effect for <strong>${safeValues.term_years} (${formValues.term_years === 1 ? 'one' : formValues.term_years === 2 ? 'two' : formValues.term_years === 3 ? 'three' : formValues.term_years}) year${formValues.term_years > 1 ? 's' : ''}</strong> from the Effective Date. Confidentiality obligations survive for <strong>${safeValues.confidentiality_years} (${formValues.confidentiality_years === 1 ? 'one' : formValues.confidentiality_years === 2 ? 'two' : formValues.confidentiality_years === 3 ? 'three' : formValues.confidentiality_years === 4 ? 'four' : formValues.confidentiality_years === 5 ? 'five' : formValues.confidentiality_years}) year${formValues.confidentiality_years > 1 ? 's' : ''}</strong> from the date of disclosure.</p>
        </section>
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">4. Governing Law</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;">This Agreement shall be governed by the laws of <strong>${safeValues.jurisdiction || '[Jurisdiction]'}</strong>, without regard to its conflicts of law provisions.</p>
        </section>
        <section style="margin-bottom: 20px;">
          <h2 style="font-size: 10px; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; border-bottom: 1px solid #000000; padding-bottom: 4px; margin: 0 0 12px 0; color: #000000;">5. Additional Provisions</h2>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;"><strong>5.1 Entire Agreement:</strong> This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof.</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;"><strong>5.2 Amendments:</strong> This Agreement may be amended only by a written instrument executed by both Parties.</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0 0 8px 0;"><strong>5.3 Severability:</strong> If any provision is found invalid, the remaining provisions shall continue in full force and effect.</p>
          <p style="font-size: 13px; line-height: 1.75; text-align: justify; color: #111111; margin: 0;"><strong>5.4 Counterparts:</strong> This Agreement may be executed in counterparts, each of which shall be deemed an original.</p>
        </section>
        <section style="margin-top: 40px; margin-bottom: 24px;">
          <p style="text-align: center; font-size: 13px; font-weight: bold; margin: 0 0 32px 0; color: #111111;">IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.</p>
          <div style="display: flex; justify-content: space-between; gap: 48px;">
            <div style="flex: 1;">
              <p style="font-weight: bold; margin: 0 0 24px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">${safeValues.party_a_name || 'PARTY A'}</p>
              <div style="border-bottom: 1px solid #000000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 4px 0; font-size: 12px; color: #444444;">By: ${safeValues.party_a_rep || '[Name]'}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #444444;">Date: _______________________</p>
            </div>
            <div style="flex: 1;">
              <p style="font-weight: bold; margin: 0 0 24px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em;">${safeValues.party_b_name || 'PARTY B'}</p>
              <div style="border-bottom: 1px solid #000000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 4px 0; font-size: 12px; color: #444444;">By: ${safeValues.party_b_rep || '[Name]'}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #444444;">Date: _______________________</p>
            </div>
          </div>
        </section>
        <div style="font-size: 9px; color: #666666; text-align: center; border-top: 1px solid #000000; padding-top: 10px; margin-top: 48px; letter-spacing: 0.08em; text-transform: uppercase;">CONFIDENTIAL &mdash; UNAUTHORIZED DISTRIBUTION PROHIBITED &middot; AIWMC Quantis &middot; aiwmcquantis.com</div>
      </div>
    `;
    
    // SECURITY: Final sanitization pass to catch any edge cases
    onPreviewUpdate(sanitizePreviewHTML(rawHTML));
  }, [formValues, onPreviewUpdate]);

  const onSubmit = (data: NDAFormData) => {
    onGenerate({
      header: {
        effective_date: data.effective_date,
        jurisdiction: data.jurisdiction,
      },
      parties: {
        party_a: {
          legal_name: data.party_a_name,
          address: data.party_a_address,
          city_state_zip: data.party_a_city,
          represented_by: data.party_a_rep,
          email: data.party_a_email,
        },
        party_b: {
          legal_name: data.party_b_name,
          address: data.party_b_address,
          city_state_zip: data.party_b_city,
          represented_by: data.party_b_rep,
          email: data.party_b_email,
        },
      },
      terms: {
        purpose: data.purpose,
        term_years: data.term_years,
        confidentiality_years: data.confidentiality_years,
      },
    });
  };

  // Handle auto-fill from analysis
  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('party_a_name', data.company_name);
    if (data.company_city) form.setValue('party_a_city', data.company_city);
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Auto-fill from Quantis Analysis */}
      <div className="flex items-center justify-between mb-2">
        <AutoFillButton onAutoFill={handleAutoFill} disabled={isGenerating} />
      </div>

      <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <Scale className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          This is a template for informational purposes. Consult with a qualified attorney before using this agreement for any legal purpose.
        </AlertDescription>
      </Alert>

      {/* Agreement Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Agreement Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Effective Date *</Label>
              <Input type="date" {...form.register('effective_date')} className="mt-1" />
            </div>
            <div>
              <Label>Governing Jurisdiction *</Label>
              <Input {...form.register('jurisdiction')} className="mt-1" placeholder="State of Colorado, United States" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Agreement Term (Years)</Label>
              <Input type="number" min={1} max={10} {...form.register('term_years', { valueAsNumber: true })} className="mt-1" />
            </div>
            <div>
              <Label>Confidentiality Period (Years)</Label>
              <Input type="number" min={1} max={10} {...form.register('confidentiality_years', { valueAsNumber: true })} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Party A (Your Company) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Party A (Your Company)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Legal Company Name *</Label>
            <Input {...form.register('party_a_name')} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Street Address *</Label>
              <Input {...form.register('party_a_address')} className="mt-1" />
            </div>
            <div>
              <Label>City, State ZIP *</Label>
              <Input {...form.register('party_a_city')} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Represented By (Name & Title) *</Label>
              <Input {...form.register('party_a_rep')} className="mt-1" placeholder="John Doe, CEO" />
            </div>
            <div>
              <Label>Contact Email *</Label>
              <Input type="email" {...form.register('party_a_email')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Party B (Other Company) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Party B (Other Company)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Legal Company Name *</Label>
            <Input {...form.register('party_b_name')} className="mt-1" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Street Address *</Label>
              <Input {...form.register('party_b_address')} className="mt-1" />
            </div>
            <div>
              <Label>City, State ZIP *</Label>
              <Input {...form.register('party_b_city')} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Represented By (Name & Title) *</Label>
              <Input {...form.register('party_b_rep')} className="mt-1" placeholder="Jane Smith, CFO" />
            </div>
            <div>
              <Label>Contact Email *</Label>
              <Input type="email" {...form.register('party_b_email')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purpose */}
      <Card>
        <CardHeader>
          <CardTitle>Purpose of Agreement</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Describe the business relationship being explored *</Label>
            <Textarea {...form.register('purpose')} rows={4} className="mt-1" />
            {form.formState.errors.purpose && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.purpose.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

    </form>
  );
}
