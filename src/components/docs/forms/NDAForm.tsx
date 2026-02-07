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
      <div style="font-family: 'Times New Roman', Georgia, serif; max-width: 800px; margin: 0 auto; padding: 32px; color: #1f2937; line-height: 1.8;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 2px;">MUTUAL NON-DISCLOSURE AGREEMENT</h1>
          <p style="color: #6b7280; font-style: italic; margin: 0;">Confidential Information Protection</p>
        </div>

        <!-- Introduction -->
        <p style="text-align: justify; margin-bottom: 24px;">
          <strong>This Mutual Non-Disclosure Agreement</strong> (the "Agreement") is entered into as of 
          <strong>${effectiveDate}</strong> (the "Effective Date"), by and between:
        </p>

        <!-- Parties -->
        <div style="margin-bottom: 24px; padding: 20px; background: #f9fafb; border-radius: 8px;">
          <div style="margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #2563eb;">PARTY A:</p>
            <p style="margin: 4px 0 0 0;"><strong>${safeValues.party_a_name || '[Company Name]'}</strong></p>
            <p style="margin: 2px 0; color: #6b7280;">${safeValues.party_a_address || '[Address]'}</p>
            <p style="margin: 2px 0; color: #6b7280;">${safeValues.party_a_city || '[City, State ZIP]'}</p>
            <p style="margin: 2px 0; color: #6b7280;">Represented by: ${safeValues.party_a_rep || '[Representative]'}</p>
            <p style="margin: 2px 0; color: #6b7280;">Email: ${safeValues.party_a_email || '[Email]'}</p>
          </div>
          <div>
            <p style="margin: 0; font-weight: 600; color: #2563eb;">PARTY B:</p>
            <p style="margin: 4px 0 0 0;"><strong>${safeValues.party_b_name || '[Company Name]'}</strong></p>
            <p style="margin: 2px 0; color: #6b7280;">${safeValues.party_b_address || '[Address]'}</p>
            <p style="margin: 2px 0; color: #6b7280;">${safeValues.party_b_city || '[City, State ZIP]'}</p>
            <p style="margin: 2px 0; color: #6b7280;">Represented by: ${safeValues.party_b_rep || '[Representative]'}</p>
            <p style="margin: 2px 0; color: #6b7280;">Email: ${safeValues.party_b_email || '[Email]'}</p>
          </div>
        </div>

        <!-- Recitals -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">RECITALS</h2>
          <p style="text-align: justify; margin-bottom: 12px;">
            <strong>WHEREAS,</strong> ${safeValues.purpose || '[Purpose]'}
          </p>
          <p style="text-align: justify;">
            <strong>WHEREAS,</strong> the Parties desire to protect the confidentiality of such information and to define the terms and conditions under which Confidential Information may be disclosed and used;
          </p>
        </div>

        <!-- Agreement -->
        <p style="text-align: justify; margin-bottom: 24px;">
          <strong>NOW, THEREFORE,</strong> in consideration of the mutual covenants and agreements contained herein, the Parties agree as follows:
        </p>

        <!-- Terms -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">1. DEFINITION OF CONFIDENTIAL INFORMATION</h2>
          <p style="text-align: justify; margin-bottom: 12px;">
            "Confidential Information" means any and all technical and non-technical information disclosed by either Party (the "Disclosing Party") to the other Party (the "Receiving Party"), including but not limited to:
          </p>
          <ul style="margin: 0 0 12px 20px; padding: 0;">
            <li style="margin-bottom: 8px;">Trade secrets, know-how, inventions, techniques, processes, algorithms, software programs</li>
            <li style="margin-bottom: 8px;">Business and technical information, customer lists, supplier lists</li>
            <li style="margin-bottom: 8px;">Information regarding research, development, marketing plans, budgets</li>
            <li style="margin-bottom: 8px;">Any information designated as confidential or proprietary</li>
          </ul>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">2. OBLIGATIONS OF RECEIVING PARTY</h2>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>2.1</strong> The Receiving Party agrees to hold the Confidential Information in strict confidence and to take all reasonable precautions to protect such information.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>2.2</strong> The Receiving Party agrees not to divulge any Confidential Information to any third person without prior written consent.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>2.3</strong> The Receiving Party agrees not to use the Confidential Information for any purpose except to evaluate the potential business relationship.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">3. TERM</h2>
          <p style="text-align: justify;">
            This Agreement shall remain in effect for a period of <strong>${safeValues.term_years} (${formValues.term_years === 1 ? 'one' : formValues.term_years === 2 ? 'two' : formValues.term_years === 3 ? 'three' : formValues.term_years}) year${formValues.term_years > 1 ? 's' : ''}</strong> from the Effective Date. The obligations of the Receiving Party shall survive for a period of <strong>${safeValues.confidentiality_years} (${formValues.confidentiality_years === 1 ? 'one' : formValues.confidentiality_years === 2 ? 'two' : formValues.confidentiality_years === 3 ? 'three' : formValues.confidentiality_years === 4 ? 'four' : formValues.confidentiality_years === 5 ? 'five' : formValues.confidentiality_years}) year${formValues.confidentiality_years > 1 ? 's' : ''}</strong> from the date of disclosure.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">4. GOVERNING LAW</h2>
          <p style="text-align: justify;">
            This Agreement shall be governed by and construed in accordance with the laws of <strong>${safeValues.jurisdiction || '[Jurisdiction]'}</strong>, without regard to its conflicts of law provisions.
          </p>
        </div>

        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 12px 0; color: #2563eb;">5. ADDITIONAL PROVISIONS</h2>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>5.1 Entire Agreement:</strong> This Agreement constitutes the entire agreement between the Parties with respect to the subject matter hereof.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>5.2 Amendments:</strong> This Agreement may be amended only by a written instrument executed by both Parties.
          </p>
          <p style="text-align: justify; margin-bottom: 8px;">
            <strong>5.3 Severability:</strong> If any provision is found invalid, the remaining provisions shall continue in full force and effect.
          </p>
          <p style="text-align: justify;">
            <strong>5.4 Counterparts:</strong> This Agreement may be executed in counterparts, each of which shall be deemed an original.
          </p>
        </div>

        <!-- Signature Blocks -->
        <div style="margin-top: 48px; page-break-inside: avoid;">
          <p style="text-align: center; margin-bottom: 32px; font-weight: 600;">
            IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.
          </p>
          
          <div style="display: flex; justify-content: space-between; gap: 48px;">
            <div style="flex: 1;">
              <p style="font-weight: 600; color: #2563eb; margin: 0 0 24px 0;">${safeValues.party_a_name || 'PARTY A'}</p>
              <div style="border-bottom: 1px solid #000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 4px 0; font-size: 14px;">By: ${safeValues.party_a_rep || '[Name]'}</p>
              <p style="margin: 4px 0; font-size: 14px;">Title: ${(safeValues.party_a_rep as string)?.split(',')[1]?.trim() || '[Title]'}</p>
              <p style="margin: 4px 0; font-size: 14px;">Date: _______________________</p>
            </div>
            <div style="flex: 1;">
              <p style="font-weight: 600; color: #2563eb; margin: 0 0 24px 0;">${safeValues.party_b_name || 'PARTY B'}</p>
              <div style="border-bottom: 1px solid #000; margin-bottom: 8px; height: 40px;"></div>
              <p style="margin: 4px 0; font-size: 14px;">By: ${safeValues.party_b_rep || '[Name]'}</p>
              <p style="margin: 4px 0; font-size: 14px;">Title: ${(safeValues.party_b_rep as string)?.split(',')[1]?.trim() || '[Title]'}</p>
              <p style="margin: 4px 0; font-size: 14px;">Date: _______________________</p>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px;">
          <p style="color: #dc2626; font-weight: 600;">CONFIDENTIAL - Unauthorized distribution is prohibited</p>
          <p>This document is a template and should be reviewed by legal counsel before execution.</p>
          <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis™</a></p>
        </div>
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

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="submit" size="lg" disabled={isGenerating} className="min-w-[200px]">
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Generate NDA
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
