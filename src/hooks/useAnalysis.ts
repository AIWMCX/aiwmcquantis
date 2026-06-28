import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateAnalysis, validateIdea, validateLocation } from '@/services/analysisApi';
import { saveAnalysis, saveAnonymousAnalysis, cacheAnalysisLocally } from '@/services/analysisDb';
import { useAnalysisHistory } from './useAnalysisHistory';
import { useAuth } from './useAuth';
import { useFileUpload } from './useFileUpload';
import { useProAnalysisJob, type ProJobState } from './useProAnalysisJob';
import type {
  AnalysisRequest,
  BusinessAnalysisResult,
  OptionalFinancialInputs,
  AnalysisGenerationResult,
} from '@/types/analysis';
import { isQueuedAnalysisJob } from '@/types/analysis';
import { trackActivationEvent } from '@/lib/activationTracking';
import { normalizeAnalysisResult } from '@/lib/analysis-normalizer';

import { logger } from '@/lib/logger';
interface FormErrors {
  idea?: string;
  location?: string;
}

const EMPTY_FINANCIAL_INPUTS: OptionalFinancialInputs = {};

export function useAnalysis() {
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [financialInputs, setFinancialInputs] =
    useState<OptionalFinancialInputs>(EMPTY_FINANCIAL_INPUTS);

  // Debounced activation tracking for idea/location entry — fires once user pauses typing.
  // Internal dedupe (30s window in trackActivationEvent) prevents spam on remounts.
  useEffect(() => {
    if (idea.trim().length < 8) return;
    const t = setTimeout(() => {
      void trackActivationEvent('idea_entered', { length: idea.length });
    }, 1200);
    return () => clearTimeout(t);
  }, [idea]);

  useEffect(() => {
    if (location.trim().length < 3) return;
    const t = setTimeout(() => {
      void trackActivationEvent('location_entered', { length: location.length });
    }, 1200);
    return () => clearTimeout(t);
  }, [location]);

  const [errors, setErrors] = useState<FormErrors>({});
  const [result, setResult] = useState<BusinessAnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Pro-depth async job tracking. When the backend returns 202+job_id we set
  // these and useProAnalysisJob (below) starts polling analysis_jobs.
  const [proJobId, setProJobId] = useState<string | null>(null);
  const [proRequestId, setProRequestId] = useState<string | null>(null);
  // Snapshot of the last submitted request so we can auto-retry at Full depth
  // if the Pro poll times out.
  const lastRequestRef = useRef<AnalysisRequest | null>(null);
  // Guard so we only auto-fall-back once per Pro submission.
  const fallbackFiredRef = useRef(false);

  const { addEntry } = useAnalysisHistory();
  const { user, isAuthenticated } = useAuth();

  // File upload functionality
  const fileUpload = useFileUpload(user?.id);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    const ideaValidation = validateIdea(idea);
    if (!ideaValidation.valid) {
      newErrors.idea = ideaValidation.error;
    }

    const locationValidation = validateLocation(location);
    if (!locationValidation.valid) {
      newErrors.location = locationValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [idea, location]);

  /**
   * Persist a completed analysis to DB (authenticated) or localStorage (guest)
   * and mirror it into history. Shared by both the synchronous mutation success
   * path and the async Pro job completion path.
   */
  const persistCompletedResult = useCallback(
    async (data: BusinessAnalysisResult) => {
      const safeData = normalizeAnalysisResult(data);
      setResult(safeData);
      void trackActivationEvent('calculation_completed', { idea_length: idea.length });

      const trimmedIdea = idea.trim();
      const trimmedLocation = location.trim();

      const requestedDepth = lastRequestRef.current?.analysis_depth;
      const depthFromResult = (data as any)?.depth_used;
      const finalDepth: 'quick' | 'full' | 'pro' =
        depthFromResult === 'pro' || depthFromResult === 'full' || depthFromResult === 'quick'
          ? depthFromResult
          : requestedDepth === 'deep' || requestedDepth === 'pro'
            ? 'pro'
            : ((requestedDepth as 'quick' | 'full' | undefined) ?? 'full');

      let savedId: string | null = null;
      if (isAuthenticated && user) {
        const saved = await saveAnalysis(
          user.id,
          trimmedIdea,
          trimmedLocation,
          safeData,
          finalDepth
        );
        if (saved) {
          savedId = saved.id;
          cacheAnalysisLocally(saved.id, {
            idea: trimmedIdea,
            location: trimmedLocation,
            result: safeData,
          });
          addEntry({
            id: saved.id,
            idea: trimmedIdea,
            location: trimmedLocation,
            result: safeData,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        const saved = await saveAnonymousAnalysis(
          trimmedIdea,
          trimmedLocation,
          safeData,
          finalDepth
        );
        if (saved) {
          savedId = saved.id;
          addEntry({
            id: saved.id,
            idea: trimmedIdea,
            location: trimmedLocation,
            result: safeData,
            created_at: new Date().toISOString(),
          });
          // Device memory: mark this browser as having run an analysis, and stash
          // the analysis id so that if the visitor signs up from the post-result
          // prompt, useAuth's SIGNED_IN handler claims this run into their new
          // account (claim_anonymous_analysis). Previously these were only set on
          // the /r/:id page, so dashboard-flow signups never claimed the result.
          try {
            localStorage.setItem('has_run_analysis', '1');
            localStorage.setItem('quantis_claim_analysis_id', saved.id);
          } catch { /* storage unavailable — non-fatal */ }
        }
      }
      setAnalysisId(savedId);
    },
    [idea, location, isAuthenticated, user, addEntry]
  );

  const mutation = useMutation({
    mutationFn: (request: AnalysisRequest) => generateAnalysis(request),
    onSuccess: async (data: AnalysisGenerationResult) => {
      // Pro/Deep async path — backend enqueued a background job. Switch the UI
      // into "Pro processing" mode; useProAnalysisJob will poll and call us
      // back via onSettled when it terminates.
      if (isQueuedAnalysisJob(data)) {
        fallbackFiredRef.current = false;
        setProRequestId(data.request_id ?? null);
        setProJobId(data.job_id);
        toast.info('Pro Audit is running in the background', {
          description:
            'This is the deepest analysis we offer — Monte Carlo + scenario stress test. Typical run: 30–90 seconds. You can stay on this page; we’ll show progress in real time.',
          duration: 8000,
        });
        return;
      }

      // Synchronous path — Quick / Full completed inside the edge function.
      await persistCompletedResult(data);
      toast.success('Analysis complete! ✅', {
        description: 'Scroll down to view your full results',
        duration: 6000,
      });
    },
    onError: (error: Error, variables) => {
      logger.error('Analysis error:', error);

      const msg = error.message || '';
      const isRateLimit =
        msg.includes('RATE_LIMIT_EXCEEDED') || msg.includes('429') || msg.includes('RATE_LIMIT');
      const isInvalidIdea = msg.includes('INVALID_BUSINESS_IDEA');
      const isQuota = msg.includes('402') || msg.includes('PAYMENT') || msg.includes('USAGE_LIMIT');
      // TIER_GATE: explicit 402 from edge function — quota exhausted or feature locked.
      // Extract the human-readable message and upgrade URL embedded by analysisApi.ts.
      const isTierGate =
        msg.includes('TIER_GATE') ||
        (msg.includes('QUOTA_EXCEEDED') && msg.includes('upgrade_url='));
      const isNetwork = /network|fetch|Failed to fetch|ECONN|NetworkError/i.test(msg);
      const isTimeout = /timeout|abort|ETIMEDOUT/i.test(msg);
      const isServer = /\b5\d{2}\b|server|INTERNAL/i.test(msg);
      // Schema/validation rejection at the request or response boundary. Since
      // BUG-034 the backend coerces inputs, so this is now rare — but it must
      // NEVER surface as a raw "REQUEST_SCHEMA_INVALID" code to the user.
      const isSchema =
        /REQUEST_SCHEMA_INVALID|RESPONSE_SCHEMA_INVALID|SCHEMA_INVALID|VALIDATION/i.test(msg);
      // NOTE: we deliberately no longer treat "AI provider returned…" as a
      // first-class category here — Pro depth used to surface as that error
      // because the queued response was mis-parsed. With the new
      // {queued, job_id} branch above, that path is gone.
      const isAi = /provider returned|model error|JSON parse/i.test(msg);

      // Specific message — falls back to raw error if nothing matches.
      let title: string;
      let description: string | undefined;
      // Upgrade URL embedded in TIER_GATE messages: "… | upgrade_url=/pricing"
      let upgradeHref: string | undefined;

      // Strip embedded metadata suffixes (" | retry_after=N", " | upgrade_url=…") from messages
      // before displaying — these are machine-readable annotations, not user-facing text.
      const cleanMsg = (raw: string) =>
        raw.replace(/\s*\|\s*(retry_after|upgrade_url|reset_at)=\S*/gi, '').trim();

      if (isTierGate) {
        // Strip the "TIER_GATE: " prefix and "| upgrade_url=…" suffix for display.
        const urlMatch = msg.match(/upgrade_url=([^\s|]+)/);
        upgradeHref = urlMatch?.[1] || '/pricing';
        const stripped = cleanMsg(msg.replace(/^TIER_GATE:\s*/i, ''));
        const isQuotaMsg = /quota|limit.*reached|used.*free/i.test(stripped);
        title = isQuotaMsg
          ? "You've used all your free analyses this month"
          : stripped || 'This feature requires a higher plan';
        description = isQuotaMsg
          ? 'Upgrade to Plus for unlimited analyses — Monte Carlo, 36-month P&L, and full action plan included.'
          : 'Upgrade to Plus to unlock this feature.';
      } else if (isRateLimit) {
        // RateLimitBanner (inline, persistent, with countdown) handles this display.
        // Do NOT also fire a sonner toast — that would be double notification.
        setRateLimitError(msg);
        return; // RateLimitBanner is the sole UI for rate-limit errors
      } else if (isInvalidIdea) {
        title = msg.replace('INVALID_BUSINESS_IDEA: ', '');
      } else if (isQuota) {
        title = 'Monthly analysis limit reached. Upgrade your plan for more analyses.';
      } else if (isNetwork) {
        title = 'Network error — check your connection and retry.';
      } else if (isTimeout) {
        title = 'Server took too long to respond. The analysis may still complete on retry.';
      } else if (isServer) {
        title = 'Our analysis engine is having a hiccup. Please try again.';
      } else if (isAi) {
        title = 'AI provider returned an unexpected response. Retry usually fixes this.';
      } else if (isSchema) {
        title = 'We had trouble reading one of your inputs. Double-check your numbers and retry.';
        description =
          'Make sure financial fields contain plain numbers (e.g. 100, not "100 USD") and churn is between 0 and 100.';
      } else {
        // Final fallback: NEVER show a raw SCREAMING_CODE prefix to the user.
        // Strip any leading "CODE: " and embedded metadata; if nothing readable
        // remains, use a friendly generic message.
        const stripped = cleanMsg(msg.replace(/^[A-Z][A-Z0-9_]{2,}\s*[:|]\s*/, '')).trim();
        const looksLikeCode = /^[A-Z0-9_ ]+$/.test(stripped) || stripped.length < 3;
        title = looksLikeCode ? 'Something went wrong while running your analysis.' : stripped;
      }

      // Transient failures get an actionable Try-again button. The underlying
      // generateAnalysis() already retries twice silently — this surfaces a
      // third user-initiated attempt with a fresh request.
      const isTransient = isNetwork || isTimeout || isServer || isAi || isSchema;
      toast.error(title, {
        duration: isTierGate ? 12000 : isInvalidIdea ? 8000 : isTransient ? 10000 : 5000,
        description,
        action: isTierGate
          ? {
              label: 'Upgrade to Plus →',
              onClick: () => {
                window.location.href = upgradeHref || '/pricing';
              },
            }
          : isTransient
            ? {
                label: 'Try again',
                onClick: () => mutation.mutate(variables),
              }
            : undefined,
      });
    },
  });

  // ───────────────────────────────────────────────────────────────────
  // Pro job polling. When proJobId is set, useProAnalysisJob polls the
  // analysis_jobs row every 2 s up to a 90 s budget. On terminal status
  // we either persist the result, surface the failure, or auto-fall-back
  // to Full depth (timeout only — never for explicit failures).
  // ───────────────────────────────────────────────────────────────────
  const handleJobSettled = useCallback(
    (s: ProJobState) => {
      if (s.phase === 'completed' && s.result) {
        setProJobId(null);
        void persistCompletedResult(s.result).then(() => {
          toast.success('Pro Audit complete ✅', {
            description: 'Scroll down to review the full deep-dive.',
            duration: 6000,
          });
        });
        return;
      }

      if (s.phase === 'failed') {
        setProJobId(null);
        const last = lastRequestRef.current;
        if (last && !fallbackFiredRef.current) {
          fallbackFiredRef.current = true;
          toast.info('Pro hit a worker error — switching to Full depth', {
            description:
              'We are rerunning the same inputs with Full depth now so you still get a complete analysis result.',
            duration: 8000,
          });
          mutation.mutate({ ...last, analysis_depth: 'full' });
        } else {
          toast.error('Pro Audit failed', {
            description:
              s.errorMessage || 'The deep analysis hit an error. Try again or run a Full analysis.',
            duration: 10000,
          });
        }
        return;
      }

      if (s.phase === 'timed_out') {
        setProJobId(null);
        // Auto-retry Full depth ONCE per Pro submission, only on timeout.
        const last = lastRequestRef.current;
        if (last && !fallbackFiredRef.current) {
          fallbackFiredRef.current = true;
          toast.info('Pro is still running — switching to Full depth', {
            description:
              'Your Pro Audit is taking longer than 90 seconds. We started a Full analysis with the same inputs so you get results now.',
            duration: 8000,
          });
          mutation.mutate({ ...last, analysis_depth: 'full' });
        } else {
          toast.error('Pro Audit timed out', {
            description: 'Try Full depth or retry Pro in a moment.',
            duration: 8000,
          });
        }
      }
    },
    [persistCompletedResult, mutation]
  );

  const proJobState = useProAnalysisJob({
    jobId: proJobId,
    intervalMs: 2000,
    timeoutMs: 90_000,
    onSettled: handleJobSettled,
  });

  const handleSubmit = useCallback(
    (e?: React.FormEvent, depth?: string) => {
      e?.preventDefault();

      if (!validate()) return;

      // Only include financial inputs that have values. Numeric fields must be
      // finite positive numbers; `selected_industry` is a string and must be
      // preserved (a `v > 0` test silently dropped it → industry benchmarks were
      // never sent to the backend — see BUG-035). Churn is clamped to [0,100] so
      // a typo never trips the server boundary schema.
      const cleanedFinancialInputs = Object.fromEntries(
        Object.entries(financialInputs).filter(([k, v]) => {
          if (k === 'selected_industry') return typeof v === 'string' && v.length > 0;
          return typeof v === 'number' && Number.isFinite(v) && v > 0;
        })
      ) as OptionalFinancialInputs;
      if (typeof cleanedFinancialInputs.churn_rate === 'number') {
        cleanedFinancialInputs.churn_rate = Math.max(
          0,
          Math.min(100, cleanedFinancialInputs.churn_rate)
        );
      }

      const hasFinancialInputs = Object.keys(cleanedFinancialInputs).length > 0;

      // Get ready files with parsed content AND extracted financials
      const readyFiles = fileUpload.getReadyFiles();
      const documents = readyFiles.map((f) => ({
        name: f.name,
        type: f.type,
        parsedContent: f.parsedContent || '',
        extractedFinancials: f.extractedFinancials || undefined,
      }));

      const request: AnalysisRequest = {
        idea: idea.trim(),
        location: location.trim(),
        ...(hasFinancialInputs && { financial_inputs: cleanedFinancialInputs }),
        ...(documents.length > 0 && { documents }),
        ...(depth && { analysis_depth: depth as 'quick' | 'full' | 'deep' }),
      };

      // Snapshot for potential auto-fallback to Full on Pro timeout.
      lastRequestRef.current = request;
      fallbackFiredRef.current = false;
      // Cancel any in-flight Pro poll from a previous submission.
      setProJobId(null);

      mutation.mutate(request);
    },
    [idea, location, financialInputs, validate, mutation, fileUpload]
  );

  // Auto-fill form when documents are parsed with financial data
  const handleAutoFillFromDocuments = useCallback(() => {
    const suggestions = fileUpload.getSuggestedInputs();
    if (Object.keys(suggestions).length > 0) {
      setFinancialInputs((prev) => ({ ...prev, ...suggestions }));
      toast.success('Form auto-filled with document data!');
    }
  }, [fileUpload]);

  // Watch for new document extractions and offer auto-fill.
  // Use a ref-tracked signature so we only toast when the *set* of extracted
  // financial keys actually changes (prevents re-render toast spam — ISSUE-008).
  const lastSuggestionSigRef = useRef<string>('');
  useEffect(() => {
    const readyFiles = fileUpload.getReadyFiles();
    const hasExtractedData = readyFiles.some(
      (f) => f.extractedFinancials && Object.keys(f.extractedFinancials).length > 0
    );
    if (!hasExtractedData) return;

    const suggestions = fileUpload.getSuggestedInputs();
    const keys = Object.keys(suggestions).sort();
    if (keys.length === 0) return;

    const sig = keys.join('|');
    if (sig === lastSuggestionSigRef.current) return;
    lastSuggestionSigRef.current = sig;

    toast.info(`Found ${keys.length} financial data points in your documents`, {
      action: { label: 'Auto-fill Form', onClick: handleAutoFillFromDocuments },
      duration: 8000,
    });
  }, [fileUpload, handleAutoFillFromDocuments]);

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setIdea('');
    setLocation('');
    setFinancialInputs(EMPTY_FINANCIAL_INPUTS);
    setErrors({});
    setResult(null);
    setAnalysisId(null);
    setRateLimitError(null);
    setProJobId(null);
    setProRequestId(null);
    lastRequestRef.current = null;
    fallbackFiredRef.current = false;
    fileUpload.clearFiles();
    mutation.reset();
  }, [mutation, fileUpload]);

  const clearRateLimitError = useCallback(() => setRateLimitError(null), []);

  // While a Pro background job is being polled we are still "loading" from
  // the user's perspective, even though the underlying mutation already
  // resolved with {queued: true}. Surface that as a single isLoading flag so
  // existing form components keep working unchanged.
  const isProJobActive = proJobState.phase === 'queued' || proJobState.phase === 'running';
  const isLoading = mutation.isPending || isProJobActive;

  const isFormValid =
    idea.trim().length >= 10 && location.trim().length >= 2 && !fileUpload.isUploading;

  return {
    // Form state
    idea,
    setIdea,
    location,
    setLocation,
    financialInputs,
    setFinancialInputs,
    errors,
    clearError,

    // Analysis state
    result,
    setResult,
    analysisId,
    isLoading,
    isError: mutation.isError,
    error: mutation.error as Error | null,
    retry: () => {
      // Re-runs the last mutation with the same variables (preserves form state).
      if (mutation.variables) mutation.mutate(mutation.variables);
    },
    rateLimitError,
    clearRateLimitError,

    // Pro background-job progress (queued / running / completed / failed / timed_out).
    // Components can render a status panel by reading proJobState.
    proJobState,
    proRequestId,
    isProJobActive,

    // Actions
    handleSubmit,
    reset,
    isFormValid,
    handleAutoFillFromDocuments,

    // File upload
    files: fileUpload.files,
    isUploading: fileUpload.isUploading,
    uploadFiles: fileUpload.uploadFiles,
    removeFile: fileUpload.removeFile,
    maxFiles: fileUpload.maxFiles,
    allowedExtensions: fileUpload.allowedExtensions,
    getDocumentSummary: fileUpload.getDocumentSummary,
  };
}
