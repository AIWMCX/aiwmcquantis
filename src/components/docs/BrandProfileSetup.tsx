import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Palette, Receipt, Check, Upload, X } from 'lucide-react';
import { useBrandProfile } from '@/hooks/useBrandProfile';
import { useAuth } from '@/hooks/useAuth';
import { uploadLogo, deleteLogo } from '@/services/brand-asset-service';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BrandProfileSetupProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onComplete?: () => void;
  mode?: 'modal' | 'settings';
}

const STEPS = [
  { id: 1, label: 'Your Business', icon: Building2 },
  { id: 2, label: 'Your Brand', icon: Palette },
  { id: 3, label: 'Billing Info', icon: Receipt },
];

const INDUSTRIES = [
  'SaaS / Software', 'E-commerce', 'Consulting', 'Agency / Services',
  'Food & Beverage', 'Healthcare', 'Education', 'Real Estate',
  'FinTech', 'Marketplace', 'Logistics', 'Manufacturing', 'Other',
];

const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
];

export function BrandProfileSetup({ open, onOpenChange, onComplete, mode = 'modal' }: BrandProfileSetupProps) {
  const { user } = useAuth();
  const { profile, isLoading, upsertProfile, isSaving } = useBrandProfile();
  const [step, setStep] = useState(1);
  const [logoUploading, setLogoUploading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    company_name: '',
    website: '',
    email: '',
    phone: '',
    logo_url: null as string | null,
    primary_color: '#0F172A',
    accent_color: '#6366F1',
    secondary_color: '#64748B',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    tax_id: '',
    invoice_prefix: 'INV',
    font_preference: 'inter',
  });

  // Hydrate from existing profile
  useEffect(() => {
    if (profile) {
      setForm((prev) => ({
        ...prev,
        company_name: profile.company_name || '',
        website: profile.website || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || '',
        logo_url: profile.logo_url,
        primary_color: profile.primary_color || '#0F172A',
        accent_color: profile.accent_color || '#6366F1',
        secondary_color: profile.secondary_color || '#64748B',
        address_line1: profile.address_line1 || '',
        address_line2: profile.address_line2 || '',
        city: profile.city || '',
        state: profile.state || '',
        zip: profile.zip || '',
        tax_id: profile.tax_id || '',
        invoice_prefix: profile.invoice_prefix || 'INV',
        font_preference: profile.font_preference || 'inter',
      }));
    } else if (user?.email) {
      setForm((prev) => ({ ...prev, email: user.email || '' }));
    }
  }, [profile, user]);

  const updateField = useCallback((field: string, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setLogoUploading(true);
    try {
      const url = await uploadLogo(user.id, file);
      updateField('logo_url', url);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    setLogoUploading(true);
    try {
      await deleteLogo(user.id);
      updateField('logo_url', null);
      toast.success('Logo removed');
    } catch {
      toast.error('Failed to remove logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.company_name.trim()) {
      toast.error('Company name is required');
      setStep(1);
      return;
    }
    upsertProfile({
      company_name: form.company_name.trim(),
      website: form.website || null,
      email: form.email || null,
      phone: form.phone || null,
      logo_url: form.logo_url,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      secondary_color: form.secondary_color,
      address_line1: form.address_line1 || null,
      address_line2: form.address_line2 || null,
      city: form.city || null,
      state: form.state || null,
      zip: form.zip || null,
      tax_id: form.tax_id || null,
      invoice_prefix: form.invoice_prefix || 'INV',
      font_preference: form.font_preference,
    });
    onComplete?.();
    onOpenChange?.(false);
  };

  const content = (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-primary/10 text-primary',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step 1: Business */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="company_name">Company Name *</Label>
            <Input id="company_name" value={form.company_name} onChange={(e) => updateField('company_name', e.target.value)} placeholder="Acme Inc." />
          </div>
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Select onValueChange={(v) => updateField('font_preference', v)}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={form.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Brand */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <Label>Logo</Label>
            <div className="mt-1 flex items-center gap-3">
              {form.logo_url ? (
                <div className="relative h-16 w-32 rounded-md border border-border bg-muted overflow-hidden">
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                  <button onClick={handleRemoveLogo} disabled={logoUploading} className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-16 w-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors text-muted-foreground text-xs gap-1">
                  <Upload className="h-4 w-4" />
                  {logoUploading ? 'Uploading…' : 'Upload logo'}
                  <input type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} disabled={logoUploading} />
                </label>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} className="h-9 w-9 rounded border-0 cursor-pointer" />
                <Input value={form.primary_color} onChange={(e) => updateField('primary_color', e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label htmlFor="accent_color">Accent Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.accent_color} onChange={(e) => updateField('accent_color', e.target.value)} className="h-9 w-9 rounded border-0 cursor-pointer" />
                <Input value={form.accent_color} onChange={(e) => updateField('accent_color', e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
          </div>

          {/* Live mini preview */}
          <div className="rounded-lg border border-border p-4 space-y-3" style={{ fontFamily: 'system-ui' }}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</p>
            <div className="flex items-center gap-3">
              {form.logo_url && <img src={form.logo_url} alt="" className="h-8 object-contain" />}
              <span className="font-semibold text-sm" style={{ color: form.primary_color }}>
                {form.company_name || 'Your Company'}
              </span>
            </div>
            <div className="h-px w-full" style={{ background: form.accent_color }} />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Invoice #INV-000001</span>
              <span className="font-medium" style={{ color: form.accent_color }}>$1,250.00</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Billing */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input id="address_line1" value={form.address_line1} onChange={(e) => updateField('address_line1', e.target.value)} placeholder="123 Main St" />
          </div>
          <div>
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input id="address_line2" value={form.address_line2} onChange={(e) => updateField('address_line2', e.target.value)} placeholder="Suite 100" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => updateField('state', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" value={form.zip} onChange={(e) => updateField('zip', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tax_id">Tax ID / EIN</Label>
              <Input id="tax_id" value={form.tax_id} onChange={(e) => updateField('tax_id', e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label htmlFor="invoice_prefix">Invoice Prefix</Label>
              <Input id="invoice_prefix" value={form.invoice_prefix} onChange={(e) => updateField('invoice_prefix', e.target.value.toUpperCase().slice(0, 5))} maxLength={5} />
            </div>
          </div>
          <div>
            <Label>Default Payment Terms</Label>
            <Select defaultValue="net_30">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          Back
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
        ) : (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : mode === 'settings' ? 'Save Profile' : 'Complete Setup'}
          </Button>
        )}
      </div>
    </div>
  );

  if (mode === 'settings') return content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Up Your Brand Profile</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
