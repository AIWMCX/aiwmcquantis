import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CompactAnalysisForm } from '@/components/analysis/CompactAnalysisForm';
import { AccuracyTransparentResults } from '@/components/analysis/AccuracyTransparentResults';
import { useAnalysis } from '@/hooks/useAnalysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, TrendingDown, Activity, ArrowLeft } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';

/**
 * Pre-Mortem Stress Test — Plus-only module.
 *
 * Re-uses the analysis engine but reframes the question:
 *   Business Validator (Module 1):  "Should I start this?"
 *   Pre-Mortem (Module 2):          "Where will this break?"
 *
 * Defaults to `analysis_depth = 'deep'` so users get the heaviest Monte Carlo
 * + scenario stress test that the engine supports.
 */
export default function PreMortem() {
  const navigate = useNavigate();
  const {
    idea, setIdea, location, setLocation,
    financialInputs, setFinancialInputs,
    errors, clearError, result, setResult,
    isLoading, handleSubmit, reset, isFormValid,
    files, isUploading, uploadFiles, removeFile, maxFiles, allowedExtensions,
  } = useAnalysis();

  const [showResults, setShowResults] = useState(false);

  const onSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    handleSubmit(undefined, 'deep');
    setShowResults(true);
  };

  return (
    <AppLayout title="Pre-Mortem Stress Test">
      <PageSEO
        title="Pre-Mortem Stress Test — Quantis"
        description="Stress-test your existing business against churn shocks, cost spikes, and seasonal collapse. Plus-only financial pre-mortem powered by Monte Carlo simulation."
        canonical="/app/pre-mortem"
      />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Pre-Mortem Stress Test</h1>
                <Badge variant="default" className="text-[10px]">PLUS</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Find the failure modes before your customers, your bank, or your runway find them first.
              </p>
            </div>
          </div>
        </div>

        {/* Stress dimensions strip */}
        {!showResults && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: TrendingDown, label: 'Revenue collapse', desc: '−40% demand shock' },
              { icon: Activity, label: 'Churn spike', desc: '2× monthly attrition' },
              { icon: AlertTriangle, label: 'Cost inflation', desc: '+25% OpEx pressure' },
              { icon: ShieldAlert, label: 'Concentration risk', desc: 'Top-1 client leaves' },
            ].map((s) => (
              <div
                key={s.label}
                className="p-3 rounded-lg border border-border/60 bg-card flex items-start gap-2.5"
              >
                <s.icon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        {!showResults && (
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">Describe the business to stress-test</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Existing business or specific scenario. The deeper your numbers, the harsher we can stress-test them.
              </p>
            </div>

            <CompactAnalysisForm
              idea={idea}
              location={location}
              financialInputs={financialInputs}
              errors={errors}
              isLoading={isLoading}
              isFormValid={isFormValid}
              onIdeaChange={setIdea}
              onLocationChange={setLocation}
              onFinancialInputsChange={setFinancialInputs}
              onClearError={clearError}
              onSubmit={onSubmit}
              files={files}
              isUploading={isUploading}
              maxFiles={maxFiles}
              allowedExtensions={allowedExtensions}
              onUploadFiles={uploadFiles}
              onRemoveFile={removeFile}
            />
          </div>
        )}

        {/* Results */}
        {showResults && result && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Stress-tested across pessimistic / base / optimistic scenarios.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  setShowResults(false);
                }}
              >
                Run another stress test
              </Button>
            </div>
            <AccuracyTransparentResults result={result} />
          </>
        )}

        {showResults && isLoading && !result && (
          <div className="rounded-xl border border-border/60 bg-card p-10 text-center">
            <Activity className="w-8 h-8 text-primary mx-auto animate-pulse" />
            <p className="mt-3 text-sm text-foreground font-medium">Running stress-test simulation…</p>
            <p className="text-xs text-muted-foreground mt-1">
              Modeling 1,000+ Monte Carlo paths across 4 stress dimensions
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
