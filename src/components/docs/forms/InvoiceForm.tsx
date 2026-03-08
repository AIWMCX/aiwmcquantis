import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { escapeFormValues, sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2, CheckCircle, FileText, Building2 } from 'lucide-react';
import { RateIntelligenceBadge } from '@/components/docs/RateIntelligenceBadge';
import { AutoFillButton } from '@/components/docs/AutoFillButton';
import { DocDraftBanner } from '@/components/docs/DocDraftBanner';
import { useDocFormDraft } from '@/hooks/useDocFormDraft';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { useCreateInvoice } from '@/hooks/useInvoices';
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

const InvoiceFormSchema = z.object({
  company_name: z.string().min(2, 'Company name required'),
  company_address: z.string().min(5, 'Address required'),
  company_city: z.string().min(3, 'City required'),
  company_email: z.string().email('Valid email required'),
  company_phone: z.string().optional(),
  client_name: z.string().min(2, 'Client name required'),
  client_company: z.string().optional(),
  client_address: z.string().min(5, 'Client address required'),
  client_city: z.string().min(3, 'Client city required'),
  client_email: z.string().email('Valid email required'),
  payment_terms: z.string(),
  line_items: z.array(
    z.object({
      description: z.string().min(3, 'Description required'),
      quantity: z.number().min(1, 'Min 1'),
      unit_price: z.number().min(0, 'Min 0'),
    })
  ).min(1, 'At least one item required'),
  tax_rate: z.number().min(0).max(100),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof InvoiceFormSchema>;

interface InvoiceFormProps {
  template: DocTemplate | undefined;
  onGenerate: (data: any) => void;
  onPreviewUpdate: (html: string) => void;
  isGenerating: boolean;
  industryType?: string;
}

export function InvoiceForm({ template, onGenerate, onPreviewUpdate, isGenerating, industryType }: InvoiceFormProps) {
  const { profile: brandProfile, isLoading: brandLoading } = useBrandProfile();
  const createInvoice = useCreateInvoice();
  const defaultValues = useMemo(() => {
    const templateJson = template?.template_json as Record<string, any> | undefined;
    const prefilled = templateJson?.prefilled_content;
    if (!prefilled) {
      return {
        company_name: '',
        company_address: '',
        company_city: '',
        company_email: '',
        company_phone: '',
        client_name: '',
        client_company: '',
        client_address: '',
        client_city: '',
        client_email: '',
        payment_terms: 'Net 30',
        line_items: [
          { description: '', quantity: 1, unit_price: 0 },
        ],
        tax_rate: 0,
        notes: '',
      };
    }
    
    return {
      company_name: prefilled.header?.company_name || '',
      company_address: prefilled.header?.company_address || '',
      company_city: prefilled.header?.company_city || '',
      company_email: prefilled.header?.company_email || '',
      company_phone: prefilled.header?.company_phone || '',
      client_name: prefilled.bill_to?.client_name || '',
      client_company: prefilled.bill_to?.client_company || '',
      client_address: prefilled.bill_to?.client_address || '',
      client_city: prefilled.bill_to?.client_city || '',
      client_email: prefilled.bill_to?.client_email || '',
      payment_terms: prefilled.invoice_details?.payment_terms || 'Net 30',
      line_items: prefilled.line_items || [
        { description: '', quantity: 1, unit_price: 0 },
      ],
      tax_rate: (prefilled.tax_rate || 0) * 100,
      notes: prefilled.notes || '',
    };
  }, [template]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(InvoiceFormSchema),
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
    templateId: 'professional-invoice',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items',
  });

  // Invoice customization state
  const today = new Date().toISOString().split('T')[0];
  const defaultDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [invoiceNumber, setInvoiceNumber] = useState('INV-000001');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  // Auto-populate from brand profile
  useEffect(() => {
    if (!brandProfile) return;
    const currentName = form.getValues('company_name');
    if (!currentName && brandProfile.company_name) {
      form.setValue('company_name', brandProfile.company_name);
    }
    if (!form.getValues('company_email') && brandProfile.email) {
      form.setValue('company_email', brandProfile.email);
    }
    if (!form.getValues('company_phone') && brandProfile.phone) {
      form.setValue('company_phone', brandProfile.phone);
    }
    if (!form.getValues('company_address') && brandProfile.address_line1) {
      form.setValue('company_address', brandProfile.address_line1);
    }
    if (!form.getValues('company_city') && brandProfile.city) {
      const cityState = [brandProfile.city, brandProfile.state, brandProfile.zip].filter(Boolean).join(', ');
      form.setValue('company_city', cityState);
    }
    if (brandProfile.invoice_prefix && brandProfile.invoice_counter) {
      setInvoiceNumber(`${brandProfile.invoice_prefix}-${String(brandProfile.invoice_counter + 1).padStart(6, '0')}`);
    }
  }, [brandProfile, form]);

  // Watch form values for preview and calculations
  const formValues = form.watch();
  
  // Ref for debounced preview updates
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate totals (reactive for UI display)
  const calculations = useMemo(() => {
    const subtotal = formValues.line_items?.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
      0
    ) || 0;
    const taxAmount = subtotal * ((formValues.tax_rate || 0) / 100);
    const discount = formValues.discount_amount || 0;
    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, discount, total };
  }, [formValues.line_items, formValues.tax_rate, formValues.discount_amount]);

  // Debounced preview update to prevent constant re-renders during typing
  useEffect(() => {
    // Clear existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Debounce the preview update (300ms delay)
    previewTimeoutRef.current = setTimeout(() => {
      // SECURITY: Escape all form values before template interpolation to prevent XSS
      const safeValues = escapeFormValues(formValues);
      const safeLineItems = (safeValues.line_items || []) as typeof formValues.line_items;
      
      const formattedInvoiceDate = invoiceDate 
        ? new Date(invoiceDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      const formattedDueDate = dueDate 
        ? new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      
      const rawHTML = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb;">
            <div>
              <h1 style="font-size: 32px; font-weight: 700; color: #2563eb; margin: 0 0 8px 0;">INVOICE</h1>
              <p style="color: #6b7280; margin: 4px 0;">Invoice #: ${invoiceNumber}</p>
              <p style="color: #6b7280; margin: 4px 0;">Date: ${formattedInvoiceDate}</p>
              <p style="color: #6b7280; margin: 4px 0;">Due: ${formattedDueDate}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-weight: 600; font-size: 18px; margin: 0;">${safeValues.company_name || ''}</p>
              <p style="color: #6b7280; margin: 4px 0;">${safeValues.company_address || ''}</p>
              <p style="color: #6b7280; margin: 4px 0;">${safeValues.company_city || ''}</p>
              <p style="color: #6b7280; margin: 4px 0;">${safeValues.company_email || ''}</p>
              <p style="color: #6b7280; margin: 4px 0;">${safeValues.company_phone || ''}</p>
            </div>
          </div>
          
          <!-- Bill To -->
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <p style="font-weight: 600; color: #374151; margin: 0 0 8px 0;">Bill To:</p>
            <p style="font-weight: 600; margin: 0;">${safeValues.client_name || ''}</p>
            <p style="color: #6b7280; margin: 4px 0;">${safeValues.client_company || ''}</p>
            <p style="color: #6b7280; margin: 4px 0;">${safeValues.client_address || ''}, ${safeValues.client_city || ''}</p>
            <p style="color: #6b7280; margin: 4px 0;">${safeValues.client_email || ''}</p>
          </div>
          
          <!-- Line Items -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #2563eb; color: white;">
                <th style="padding: 12px; text-align: left; border-radius: 4px 0 0 0;">Description</th>
                <th style="padding: 12px; text-align: center; width: 80px;">Qty</th>
                <th style="padding: 12px; text-align: right; width: 120px;">Unit Price</th>
                <th style="padding: 12px; text-align: right; width: 120px; border-radius: 0 4px 0 0;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${safeLineItems.map((item, i) => `
                <tr style="border-bottom: 1px solid #e5e7eb; ${i % 2 === 1 ? 'background: #f9fafb;' : ''}">
                  <td style="padding: 12px;">${item.description || ''}</td>
                  <td style="padding: 12px; text-align: center;">${item.quantity || 0}</td>
                  <td style="padding: 12px; text-align: right;">$${(item.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 500;">$${((item.quantity || 0) * (item.unit_price || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Totals -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
            <div style="width: 280px;">
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280;">Subtotal:</span>
                <span style="font-weight: 500;">$${calculations.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="color: #6b7280;">Tax (${safeValues.tax_rate || 0}%):</span>
                <span style="font-weight: 500;">$${calculations.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 12px 0; background: #2563eb; color: white; margin-top: 8px; border-radius: 4px; padding-left: 12px; padding-right: 12px;">
                <span style="font-weight: 600;">Total Due:</span>
                <span style="font-weight: 700; font-size: 18px;">$${calculations.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          
          <!-- Notes -->
          ${safeValues.notes ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0;">
              <p style="font-weight: 600; margin: 0 0 8px 0; color: #92400e;">Notes</p>
              <p style="margin: 0; color: #78350f;">${safeValues.notes}</p>
            </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>Payment Terms: ${safeValues.payment_terms || 'Net 30'} | Please include invoice number in payment reference</p>
            <p style="margin-top: 8px; font-size: 10px; color: #d1d5db;">Generated with <a href="https://aiwmcquantis.com" style="color: #3B82F6; text-decoration: none;">AIWMC Quantis</a></p>
          </div>
        </div>
      `;
      
      // SECURITY: Final sanitization pass to catch any edge cases
      onPreviewUpdate(sanitizePreviewHTML(rawHTML));
    }, 300);
    
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [formValues, calculations, onPreviewUpdate, invoiceNumber, invoiceDate, dueDate]);

  const onSubmit = (data: InvoiceFormData) => {
    clearDraft(); // Clear draft on successful submit

    const lineItemsWithAmount = data.line_items.map(item => ({
      description: item.description || '',
      quantity: item.quantity || 0,
      unit_price: item.unit_price || 0,
      amount: (item.quantity || 0) * (item.unit_price || 0),
    }));

    // Persist invoice record in DB
    createInvoice.mutate({
      client_name: data.client_name,
      client_email: data.client_email,
      client_company: data.client_company || undefined,
      client_address: `${data.client_address}, ${data.client_city}`,
      line_items: lineItemsWithAmount,
      subtotal: calculations.subtotal,
      tax_rate: data.tax_rate / 100,
      tax_amount: calculations.taxAmount,
      total_amount: calculations.total,
      issue_date: invoiceDate,
      due_date: dueDate || undefined,
      payment_terms: data.payment_terms,
      notes: data.notes || undefined,
    });

    onGenerate({
      header: {
        company_name: data.company_name,
        company_address: data.company_address,
        company_city: data.company_city,
        company_email: data.company_email,
        company_phone: data.company_phone,
      },
      bill_to: {
        client_name: data.client_name,
        client_company: data.client_company,
        client_address: data.client_address,
        client_city: data.client_city,
        client_email: data.client_email,
      },
      invoice_details: {
        payment_terms: data.payment_terms,
      },
      line_items: lineItemsWithAmount,
      tax_rate: data.tax_rate / 100,
      notes: data.notes,
      calculated: calculations,
    });
  };

  // Handle auto-fill from analysis
  const handleAutoFill = useCallback((data: AutoFillData) => {
    if (data.company_name) form.setValue('company_name', data.company_name);
    if (data.company_city) form.setValue('company_city', data.company_city);
  }, [form]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Draft Recovery Banner */}
      <DocDraftBanner
        hasDraft={hasDraft}
        draftAge={draftAge}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onRestore={restoreDraft}
        onDismiss={dismissDraft}
      />

      {/* Auto-fill from Quantis Analysis */}
      <div className="flex items-center justify-between">
        <AutoFillButton onAutoFill={handleAutoFill} disabled={isGenerating} />
      </div>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Your Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Company Name *</Label>
              <Input {...form.register('company_name')} className="mt-1" />
              {form.formState.errors.company_name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.company_name.message}</p>
              )}
            </div>
            <div>
              <Label>Address *</Label>
              <Input {...form.register('company_address')} className="mt-1" />
            </div>
            <div>
              <Label>City, State ZIP *</Label>
              <Input {...form.register('company_city')} className="mt-1" />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" {...form.register('company_email')} className="mt-1" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input type="tel" {...form.register('company_phone')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card>
        <CardHeader>
          <CardTitle>Bill To (Client)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Client Name *</Label>
              <Input {...form.register('client_name')} className="mt-1" />
            </div>
            <div>
              <Label>Company</Label>
              <Input {...form.register('client_company')} className="mt-1" />
            </div>
            <div>
              <Label>Address *</Label>
              <Input {...form.register('client_address')} className="mt-1" />
            </div>
            <div>
              <Label>City, State ZIP *</Label>
              <Input {...form.register('client_city')} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label>Email *</Label>
              <Input type="email" {...form.register('client_email')} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="p-4 border border-border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Item {index + 1}</Label>
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
              <Textarea
                {...form.register(`line_items.${index}.description`)}
                placeholder="Service description..."
                rows={2}
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    {...form.register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Unit Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    {...form.register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <Input
                    type="text"
                    value={`$${((form.watch(`line_items.${index}.quantity`) || 0) * (form.watch(`line_items.${index}.unit_price`) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    disabled
                    className="bg-muted font-medium"
                  />
                </div>
              </div>
            </div>
          ))}
          
          {/* Totals Summary */}
          <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">${calculations.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({formValues.tax_rate || 0}%):</span>
                <span className="font-medium">${calculations.taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-primary/20">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-primary">${calculations.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Details */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Payment Terms</Label>
              <Controller
                name="payment_terms"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                {...form.register('tax_rate', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Notes / Payment Instructions</Label>
            <Textarea {...form.register('notes')} rows={3} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Number & Date Customization */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="mt-1"
                placeholder="INV-000001"
              />
            </div>
            <div>
              <Label>Invoice Date</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
