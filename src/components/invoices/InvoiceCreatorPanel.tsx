import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2, CheckCircle, Building2, Copy, Users, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { useCreateInvoice } from '@/hooks/useInvoices';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const InvoiceSchema = z.object({
  company_name: z.string().min(2, 'Company name required'),
  company_address: z.string().min(3, 'Address required'),
  company_city: z.string().min(2, 'City required'),
  company_email: z.string().email('Valid email required'),
  company_phone: z.string().optional(),
  client_name: z.string().min(2, 'Client name required'),
  client_company: z.string().optional(),
  client_address: z.string().min(3, 'Client address required'),
  client_city: z.string().min(2, 'Client city required'),
  client_email: z.string().email('Valid email required'),
  payment_terms: z.string(),
  line_items: z.array(
    z.object({
      description: z.string().min(1, 'Description required'),
      quantity: z.number().min(1),
      unit_price: z.number().min(0),
    })
  ).min(1),
  tax_rate: z.number().min(0).max(100),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof InvoiceSchema>;

const STEPS = ['Client', 'Items', 'Settings', 'Review'] as const;

interface InvoiceCreatorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceCreatorPanel({ open, onOpenChange }: InvoiceCreatorPanelProps) {
  const { profile: brandProfile } = useBrandProfile();
  const createInvoice = useCreateInvoice();
  const [step, setStep] = useState(0);

  const today = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(InvoiceSchema),
    defaultValues: {
      company_name: '', company_address: '', company_city: '',
      company_email: '', company_phone: '',
      client_name: '', client_company: '', client_address: '',
      client_city: '', client_email: '',
      payment_terms: 'Net 30',
      line_items: [{ description: '', quantity: 1, unit_price: 0 }],
      tax_rate: 0, discount_amount: 0, notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'line_items' });

  // Auto-populate from brand profile
  useEffect(() => {
    if (!brandProfile || !open) return;
    if (!form.getValues('company_name') && brandProfile.company_name) form.setValue('company_name', brandProfile.company_name);
    if (!form.getValues('company_email') && brandProfile.email) form.setValue('company_email', brandProfile.email);
    if (!form.getValues('company_phone') && brandProfile.phone) form.setValue('company_phone', brandProfile.phone);
    if (!form.getValues('company_address') && brandProfile.address_line1) form.setValue('company_address', brandProfile.address_line1);
    if (!form.getValues('company_city') && brandProfile.city) {
      form.setValue('company_city', [brandProfile.city, brandProfile.state, brandProfile.zip].filter(Boolean).join(', '));
    }
  }, [brandProfile, open, form]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setStep(0); form.reset(); }, 300);
    }
  }, [open, form]);

  const formValues = form.watch();
  const calculations = useMemo(() => {
    const subtotal = formValues.line_items?.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0), 0) || 0;
    const taxAmount = subtotal * ((formValues.tax_rate || 0) / 100);
    const discount = formValues.discount_amount || 0;
    return { subtotal, taxAmount, discount, total: subtotal + taxAmount - discount };
  }, [formValues.line_items, formValues.tax_rate, formValues.discount_amount]);

  const onSubmit = useCallback((data: InvoiceFormData) => {
    const lineItemsWithAmount = data.line_items.map(item => ({
      description: item.description, quantity: item.quantity,
      unit_price: item.unit_price, amount: item.quantity * item.unit_price,
    }));

    createInvoice.mutate({
      client_name: data.client_name,
      client_email: data.client_email,
      client_company: data.client_company || undefined,
      client_address: `${data.client_address}, ${data.client_city}`,
      line_items: lineItemsWithAmount,
      subtotal: calculations.subtotal,
      tax_rate: data.tax_rate / 100,
      tax_amount: calculations.taxAmount,
      discount_amount: calculations.discount,
      total_amount: calculations.total,
      issue_date: invoiceDate,
      due_date: dueDate || undefined,
      payment_terms: data.payment_terms,
      notes: data.notes || undefined,
    }, {
      onSuccess: () => onOpenChange(false),
    });
  }, [calculations, invoiceDate, dueDate, createInvoice, onOpenChange]);

  const canNext = () => {
    if (step === 0) {
      const v = form.getValues();
      return v.client_name.length >= 2 && v.client_address.length >= 3 && v.client_email.includes('@');
    }
    if (step === 1) return fields.length > 0 && formValues.line_items?.[0]?.description?.length > 0;
    return true;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0 flex flex-col bg-background">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle className="text-lg font-bold">New Invoice</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </SheetDescription>
          {/* Step indicator */}
          <div className="flex gap-1.5 mt-3">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Step 0: Client Info */}
            {step === 0 && (
              <>
                <SectionLabel icon={<Building2 className="w-4 h-4" />} title="Your Company" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label className="text-xs">Company Name *</Label>
                    <Input {...form.register('company_name')} className="mt-1 h-9 text-sm" />
                  </div>
                  <div><Label className="text-xs">Address *</Label><Input {...form.register('company_address')} className="mt-1 h-9 text-sm" /></div>
                  <div><Label className="text-xs">City/State/ZIP *</Label><Input {...form.register('company_city')} className="mt-1 h-9 text-sm" /></div>
                  <div><Label className="text-xs">Email *</Label><Input type="email" {...form.register('company_email')} className="mt-1 h-9 text-sm" /></div>
                  <div><Label className="text-xs">Phone</Label><Input type="tel" {...form.register('company_phone')} className="mt-1 h-9 text-sm" /></div>
                </div>

                <SectionLabel icon={<Users className="w-4 h-4" />} title="Bill To" />
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">Client Name *</Label><Input {...form.register('client_name')} className="mt-1 h-9 text-sm" /></div>
                  <div><Label className="text-xs">Company</Label><Input {...form.register('client_company')} className="mt-1 h-9 text-sm" /></div>
                  <div><Label className="text-xs">Address *</Label><Input {...form.register('client_address')} className="mt-1 h-9 text-sm" /></div>
                  <div><Label className="text-xs">City/State/ZIP *</Label><Input {...form.register('client_city')} className="mt-1 h-9 text-sm" /></div>
                  <div className="col-span-2"><Label className="text-xs">Email *</Label><Input type="email" {...form.register('client_email')} className="mt-1 h-9 text-sm" /></div>
                </div>
              </>
            )}

            {/* Step 1: Line Items */}
            {step === 1 && (
              <>
                <div className="flex items-center justify-between">
                  <SectionLabel icon={<List className="w-4 h-4" />} title="Line Items" />
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="p-3 border border-border rounded-lg space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Item {index + 1}</span>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => { const c = form.getValues(`line_items.${index}`); append({ ...c }); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Textarea {...form.register(`line_items.${index}.description`)} placeholder="Description…" rows={2} className="text-sm" />
                    <div className="grid grid-cols-3 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">Qty</Label>
                        <Input type="number" min={1} {...form.register(`line_items.${index}.quantity`, { valueAsNumber: true })} className="h-8 text-sm" /></div>
                      <div><Label className="text-[10px] text-muted-foreground">Unit Price ($)</Label>
                        <Input type="number" step="0.01" min={0} {...form.register(`line_items.${index}.unit_price`, { valueAsNumber: true })} className="h-8 text-sm" /></div>
                      <div><Label className="text-[10px] text-muted-foreground">Amount</Label>
                        <Input disabled className="h-8 text-sm bg-muted font-mono" value={`$${((form.watch(`line_items.${index}.quantity`) || 0) * (form.watch(`line_items.${index}.unit_price`) || 0)).toFixed(2)}`} /></div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Step 2: Settings */}
            {step === 2 && (
              <>
                <SectionLabel icon={<List className="w-4 h-4" />} title="Invoice Settings" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Invoice Date</Label>
                    <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Payment Terms</Label>
                    <Controller name="payment_terms" control={form.control} render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                          <SelectItem value="Net 15">Net 15</SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                        </SelectContent>
                      </Select>
                    )} />
                  </div>
                  <div>
                    <Label className="text-xs">Tax Rate (%)</Label>
                    <Input type="number" step="0.01" min={0} max={100} {...form.register('tax_rate', { valueAsNumber: true })} className="mt-1 h-9 text-sm" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Discount ($)</Label>
                    <Input type="number" step="0.01" min={0} {...form.register('discount_amount', { valueAsNumber: true })} className="mt-1 h-9 text-sm" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea {...form.register('notes')} rows={3} className="mt-1 text-sm" placeholder="Payment instructions or additional notes…" />
                </div>
              </>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <SectionLabel icon={<CheckCircle className="w-4 h-4" />} title="Review & Submit" />
                <ReviewRow label="Client" value={`${formValues.client_name}${formValues.client_company ? ` · ${formValues.client_company}` : ''}`} />
                <ReviewRow label="Email" value={formValues.client_email} />
                <ReviewRow label="Address" value={`${formValues.client_address}, ${formValues.client_city}`} />
                <div className="border-t border-border pt-3 space-y-1.5">
                  {formValues.line_items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[200px]">{item.description || `Item ${i + 1}`}</span>
                      <span className="font-mono font-medium">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <ReviewRow label="Payment Terms" value={formValues.payment_terms} />
                <ReviewRow label="Issue Date" value={invoiceDate} />
                <ReviewRow label="Due Date" value={dueDate} />
                {formValues.notes && <ReviewRow label="Notes" value={formValues.notes} />}
              </div>
            )}
          </div>

          {/* Sticky footer with totals + navigation */}
          <div className="shrink-0 border-t border-border px-6 py-4 space-y-3 bg-background">
            {/* Running total */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">${calculations.subtotal.toFixed(2)}</span></div>
              {calculations.taxAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({formValues.tax_rate}%)</span><span className="font-mono">${calculations.taxAmount.toFixed(2)}</span></div>}
              {calculations.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono text-destructive">-${calculations.discount.toFixed(2)}</span></div>}
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>Total</span>
                <span className="text-primary font-mono text-base">${calculations.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Nav buttons */}
            <div className="flex gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" className="flex-1 gap-1" onClick={() => setStep(s => s - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" className="flex-1 gap-1" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button type="submit" className="flex-1 gap-1" disabled={createInvoice.isPending}>
                  {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Create Invoice
                </Button>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground pt-1">
      {icon}
      {title}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right max-w-[250px] truncate">{value}</span>
    </div>
  );
}
