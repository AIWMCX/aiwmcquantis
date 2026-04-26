import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, AlertTriangle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { QuantisMath as QMath } from '@/lib/quantis-math';
import { generateInvoice, type InvoiceData, type InvoiceLineItem } from '@/services/docs-engine';
import { useToast } from '@/hooks/use-toast';
import { trackActivationEvent } from '@/lib/activationTracking';

interface InvoiceCreatorProps {
  analysisId: string;
  userId: string;
  onComplete: (invoice: InvoiceData) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  industryType?: string;
  benchmarkP25?: number;
}

interface LineItemDraft {
  id: string;
  description: string;
  quantity: string;
  rate: string;
}

const STEPS = ['Client Info', 'Services', 'Settings', 'Preview'] as const;

export function InvoiceCreator({
  analysisId,
  userId,
  onComplete,
  open,
  onOpenChange,
  industryType,
  benchmarkP25,
}: InvoiceCreatorProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Step 1 — Client Info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Step 2 — Line Items
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([
    { id: crypto.randomUUID(), description: '', quantity: '1', rate: '' },
  ]);

  // Step 3 — Settings
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');

  // Computed totals using QMath
  const totals = useMemo(() => {
    let subtotal = QMath.from(0);
    const computed: { description: string; quantity: number; unitPrice: number; total: number }[] = [];

    for (const item of lineItems) {
      const qty = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const lineTotal = QMath.multiply(qty, rate);
      subtotal = QMath.add(subtotal, lineTotal);
      computed.push({
        description: item.description,
        quantity: qty,
        unitPrice: rate,
        total: QMath.toNumber(lineTotal, 2),
      });
    }

    const tax = QMath.multiply(subtotal, parseFloat(taxRate) || 0);
    const total = QMath.add(subtotal, tax);

    return {
      items: computed,
      subtotal: QMath.toNumber(subtotal, 2),
      taxAmount: QMath.toNumber(tax, 2),
      total: QMath.toNumber(total, 2),
    };
  }, [lineItems, taxRate]);

  // Rate intelligence
  const showRateWarning = useMemo(() => {
    if (!benchmarkP25 || lineItems.length === 0) return false;
    const rates = lineItems
      .map((i) => parseFloat(i.rate) || 0)
      .filter((r) => r > 0);
    if (rates.length === 0) return false;
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    return avg < benchmarkP25;
  }, [lineItems, benchmarkP25]);

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: '1', rate: '' },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItemDraft, value: string) => {
    setLineItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const canProceed = () => {
    if (step === 0) return clientName.trim().length > 0;
    if (step === 1) return lineItems.some((i) => i.description.trim() && parseFloat(i.rate) > 0);
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { invoice } = await generateInvoice(
        userId,
        analysisId,
        { name: clientName, email: clientEmail || undefined },
        totals.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        {
          taxRate: parseFloat(taxRate) || 0,
          paymentTerms,
          notes: notes || undefined,
          industryType,
        }
      );
      onComplete(invoice);
      onOpenChange(false);
      void trackActivationEvent('invoice_created', { invoice_number: invoice.invoiceNumber });
      toast({ title: 'Invoice created', description: `Invoice ${invoice.invoiceNumber} saved.` });
    } catch (err) {
      toast({
        title: 'Invoice failed',
        description: err instanceof Error ? err.message : 'Try again',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Create Invoice</SheetTitle>
        </SheetHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 my-4">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
              {i < STEPS.length - 1 && (
                <Separator className="w-4" orientation="horizontal" />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-4 py-4">
          {/* Step 1: Client Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="billing@acme.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Services */}
          {step === 1 && (
            <div className="space-y-4">
              {showRateWarning && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                  <p className="text-yellow-700 dark:text-yellow-400">
                    Your average rate is below the market 25th percentile (${benchmarkP25?.toFixed(0)}).
                    Consider adjusting your pricing.
                  </p>
                </div>
              )}

              {lineItems.map((item, idx) => (
                <div key={item.id} className="space-y-2 p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Item {idx + 1}
                    </span>
                    {lineItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rate ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateLineItem(item.id, 'rate', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Total</Label>
                      <div className="h-10 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
                        ${QMath.toNumber(
                          QMath.multiply(
                            parseFloat(item.quantity) || 0,
                            parseFloat(item.rate) || 0
                          ),
                          2
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={addLineItem} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add line item
              </Button>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (decimal, e.g. 0.1 = 10%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment instructions, thank you note..."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-card space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                {clientEmail && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span>{clientEmail}</span>
                  </div>
                )}
                <Separator />
                {totals.items
                  .filter((i) => i.description)
                  .map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>
                        {item.description}{' '}
                        <span className="text-muted-foreground">
                          ×{item.quantity}
                        </span>
                      </span>
                      <span>${item.total.toLocaleString()}</span>
                    </div>
                  ))}
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totals.subtotal.toLocaleString()}</span>
                </div>
                {totals.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${totals.taxAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${totals.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Payment terms: {paymentTerms}</p>
                {notes && <p>Notes: {notes}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Running total bar */}
        <div className="flex items-center justify-between py-3 border-t">
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold text-lg">${totals.total.toLocaleString()}</span>
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button size="sm" disabled={!canProceed()} onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" disabled={submitting} onClick={handleSubmit}>
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Generate Invoice
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
