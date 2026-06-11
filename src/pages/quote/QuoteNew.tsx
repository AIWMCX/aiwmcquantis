import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isEnabled } from '@/lib/flags';
import { WizardShell } from './_components/WizardShell';
import { Step1_TradeAndBasics, type Step1Value } from './_components/Step1_TradeAndBasics';
import { Step2_Scope } from './_components/Step2_Scope';
import { Step3_Modifiers } from './_components/Step3_Modifiers';
import { Step4_Pricing } from './_components/Step4_Pricing';
import {
  computeAndSaveQuote,
  createJob,
  listAssemblies,
  updateJob,
  QuoteGenNotAvailableError,
  QuoteGenLimitExceededError,
} from '@/services/serviceJob';
import { DEFAULT_PRICING_PROFILE } from '@/lib/service-job/schemas';
import type { JobModifiers, PricingProfile, ScopeItem } from '@/lib/service-job/types';
import { useQuoteGenUsage } from '@/hooks/useQuoteGenUsage';
import {
  QuoteGenFreeLock,
  QuoteGenUsagePill,
  QuoteGenExhaustedBanner,
} from './_components/QuoteGenPaywall';

const STEP_LABELS = ['Basics', 'Scope', 'Modifiers', 'Pricing'];
const DRAFT_KEY = 'service-job:wizard-draft:v1';

interface Draft {
  jobId: string | null;
  step1: Step1Value;
  scope: ScopeItem[];
  modifiers: JobModifiers;
  pricing: PricingProfile;
}

const EMPTY_DRAFT: Draft = {
  jobId: null,
  step1: { trade_id: 'electrical', client_name: '', site_address: '', site_zip: '', building_type: '', year_built: null },
  scope: [],
  modifiers: {},
  pricing: { ...DEFAULT_PRICING_PROFILE },
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export default function QuoteNew() {
  const enabled = isEnabled('service_job');
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(() => loadDraft());
  const [submitting, setSubmitting] = useState(false);
  const dirtyRef = useRef(false);
  const { status: quoteGenStatus, loading: quotaLoading, refetch: refetchQuota } = useQuoteGenUsage();

  const { data: assemblies = [] } = useQuery({
    queryKey: ['service-job-assemblies', draft.step1.trade_id],
    queryFn: () => listAssemblies(draft.step1.trade_id),
    enabled,
  });

  // Debounced localStorage save
  useEffect(() => {
    dirtyRef.current = true;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
    }, 2000);
    return () => clearTimeout(t);
  }, [draft]);

  // Warn on unload if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  if (!enabled) return <Navigate to="/app" replace />;

  const nextDisabled = (() => {
    if (step === 1) return !draft.step1.trade_id;
    if (step === 2) return draft.scope.length === 0;
    return false;
  })();

  const persist = async (): Promise<string> => {
    const payload = {
      trade_id: draft.step1.trade_id,
      client_name: draft.step1.client_name || null,
      site_address: draft.step1.site_address || null,
      site_zip: draft.step1.site_zip || null,
      building_type: draft.step1.building_type || null,
      year_built: draft.step1.year_built,
      scope_items: draft.scope,
      modifiers: draft.modifiers,
      pricing_profile: draft.pricing,
    };
    if (!draft.jobId) {
      const created = await createJob(payload);
      setDraft((d) => ({ ...d, jobId: created.id }));
      return created.id;
    }
    await updateJob(draft.jobId, payload);
    return draft.jobId;
  };

  const handleNext = async () => {
    if (step < 4) {
      setSubmitting(true);
      try {
        await persist();
        setStep((s) => s + 1);
      } catch (e) {
        console.error(e);
        toast.error('Could not save draft. Check your connection.');
      } finally { setSubmitting(false); }
      return;
    }
    // Final: compute (server-enforced QuoteGen quota inside computeAndSaveQuote)
    setSubmitting(true);
    try {
      const id = await persist();
      await computeAndSaveQuote(id);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
      dirtyRef.current = false;
      await refetchQuota();
      navigate(`/quote/${id}/result`);
    } catch (e) {
      console.error(e);
      if (e instanceof QuoteGenNotAvailableError) {
        toast.error('Sign in to use your 5 free QuoteGen quotes.');
        await refetchQuota();
        return;
      }
      if (e instanceof QuoteGenLimitExceededError) {
        toast.error(e.message);
        await refetchQuota();
        return;
      }
      toast.error('Could not compute quote. Please review inputs.');
    } finally { setSubmitting(false); }
  };

  const handleBack = step === 1 ? undefined : () => setStep((s) => s - 1);

  // Free tier (or any unauth/blocked) → show locked teaser instead of the wizard.
  if (!quotaLoading && !quoteGenStatus.isEnabled) {
    return (
      <div className="container max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <QuoteGenFreeLock />
      </div>
    );
  }

  return (
    <div>
      <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-4 flex items-center justify-between gap-3">
        <QuoteGenUsagePill status={quoteGenStatus} />
      </div>
      {quoteGenStatus.isExhausted && (
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-3">
          <QuoteGenExhaustedBanner status={quoteGenStatus} />
        </div>
      )}
      <WizardShell
        step={step}
        totalSteps={4}
        stepLabels={STEP_LABELS}
        onBack={handleBack}
        onNext={handleNext}
        nextLabel={step === 4 ? 'Calculate' : 'Next'}
        nextDisabled={nextDisabled || (step === 4 && quoteGenStatus.isExhausted)}
        isSubmitting={submitting}
      >
        {step === 1 && (
          <Step1_TradeAndBasics value={draft.step1} onChange={(v) => setDraft((d) => ({ ...d, step1: v }))} />
        )}
        {step === 2 && (
          <Step2_Scope
            assemblies={assemblies}
            value={draft.scope}
            onChange={(v) => setDraft((d) => ({ ...d, scope: v }))}
          />
        )}
        {step === 3 && (
          <Step3_Modifiers value={draft.modifiers} onChange={(v) => setDraft((d) => ({ ...d, modifiers: v }))} />
        )}
        {step === 4 && (
          <Step4_Pricing value={draft.pricing} onChange={(v) => setDraft((d) => ({ ...d, pricing: v }))} />
        )}
      </WizardShell>
    </div>
  );
}
