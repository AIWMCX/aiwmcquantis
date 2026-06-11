import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isEnabled } from '@/lib/flags';
import { WizardShell } from './_components/WizardShell';
import { Step1_TradeAndBasics, type Step1Value } from './_components/Step1_TradeAndBasics';
import { Step2_Scope } from './_components/Step2_Scope';
import { Step3_Modifiers } from './_components/Step3_Modifiers';
import { Step4_Pricing } from './_components/Step4_Pricing';
import {
  computeAndSaveQuote,
  getJob,
  listAssemblies,
  updateJob,
} from '@/services/serviceJob';
import type { JobModifiers, PricingProfile, ScopeItem } from '@/lib/service-job/types';

const STEP_LABELS = ['Basics', 'Scope', 'Modifiers', 'Pricing'];

export default function QuoteEdit() {
  const enabled = isEnabled('service_job');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['service-job', id],
    queryFn: () => getJob(id!),
    enabled: enabled && !!id,
  });
  const { data: assemblies = [] } = useQuery({
    queryKey: ['service-job-assemblies', job?.trade_id],
    queryFn: () => listAssemblies(job!.trade_id),
    enabled: !!job?.trade_id,
  });

  const [step1, setStep1] = useState<Step1Value | null>(null);
  const [scope, setScope] = useState<ScopeItem[]>([]);
  const [modifiers, setModifiers] = useState<JobModifiers>({});
  const [pricing, setPricing] = useState<PricingProfile | null>(null);

  useEffect(() => {
    if (!job) return;
    setStep1({
      trade_id: job.trade_id,
      client_name: job.client_name ?? '',
      site_address: job.site_address ?? '',
      site_zip: job.site_zip ?? '',
      building_type: job.building_type ?? '',
      year_built: job.year_built ?? null,
    });
    setScope(job.scope_items ?? []);
    setModifiers((job.modifiers ?? {}) as JobModifiers);
    setPricing(job.pricing_profile as PricingProfile);
  }, [job]);

  if (!enabled) return <Navigate to="/app" replace />;

  if (isLoading || !job || !step1 || !pricing) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const handleNext = async () => {
    if (step < 4) { setStep((s) => s + 1); return; }
    setSubmitting(true);
    try {
      await updateJob(job.id, {
        trade_id: step1.trade_id,
        client_name: step1.client_name || null,
        site_address: step1.site_address || null,
        site_zip: step1.site_zip || null,
        building_type: step1.building_type || null,
        year_built: step1.year_built,
        scope_items: scope,
        modifiers,
        pricing_profile: pricing,
      });
      await computeAndSaveQuote(job.id);
      await refetch();
      navigate(`/quote/${job.id}/result`);
    } catch (e) {
      console.error(e);
      toast.error('Could not recompute quote.');
    } finally { setSubmitting(false); }
  };

  return (
    <WizardShell
      step={step}
      totalSteps={4}
      stepLabels={STEP_LABELS}
      onBack={step === 1 ? () => navigate('/quote') : () => setStep((s) => s - 1)}
      onNext={handleNext}
      nextLabel={step === 4 ? 'Recalculate' : 'Next'}
      isSubmitting={submitting}
    >
      {step === 1 && <Step1_TradeAndBasics value={step1} onChange={setStep1} />}
      {step === 2 && <Step2_Scope assemblies={assemblies} value={scope} onChange={setScope} />}
      {step === 3 && <Step3_Modifiers value={modifiers} onChange={setModifiers} />}
      {step === 4 && <Step4_Pricing value={pricing} onChange={setPricing} />}
    </WizardShell>
  );
}
