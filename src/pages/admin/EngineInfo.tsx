import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import {
  QUANTIS_BUSINESS_LOGIC_VERSION,
  PRODUCT_IDENTITY,
  TWELVE_FINANCIAL_VARIABLES,
  MONTE_CARLO_ITERATIONS,
  ENGINE_TIME_BUDGET_SEC,
  BENCHMARK_COUNT,
  LTV_CAC_THRESHOLDS,
  VERDICT_THRESHOLDS,
  MANDATORY_DISCLAIMER,
} from "@/lib/businessLogic";

const SPEC_HASH = "26a9e7bccf7b3e248dd2b411f887a2f5";
const SPEC_URL = "/docs/QUANTIS_BUSINESS_LOGIC.md";

const BUSINESS_LOGIC_DOCS: { name: string; path: string; note: string }[] = [
  {
    name: "QUANTIS_BUSINESS_LOGIC.md",
    path: SPEC_URL,
    note: `Canonical engine spec — v${QUANTIS_BUSINESS_LOGIC_VERSION} (single source of truth)`,
  },
  {
    name: "AI_SAFETY_ARCHITECTURE.md",
    path: "/docs/AI_SAFETY_ARCHITECTURE.md",
    note: "8-layer safety architecture incl. RVCE (referenced in spec §4)",
  },
  {
    name: "GROWTH_TECHNICAL_SPEC.md",
    path: "/docs/GROWTH_TECHNICAL_SPEC.md",
    note: "Activation + growth instrumentation",
  },
  {
    name: "INCIDENT_RESPONSE_RUNBOOK.md",
    path: "/docs/INCIDENT_RESPONSE_RUNBOOK.md",
    note: "On-call runbook for engine + payments incidents",
  },
  {
    name: "DIRECTORY_MASTER_TABLE.md",
    path: "/docs/DIRECTORY_MASTER_TABLE.md",
    note: "Submission directory tracker",
  },
  {
    name: "strict-mode-rollout.md",
    path: "/docs/strict-mode-rollout.md",
    note: "Strict-TS rollout plan (financial-engine first)",
  },
  {
    name: "sentry-alert-rules.md",
    path: "/docs/sentry-alert-rules.md",
    note: "Sentry alert routing + thresholds",
  },
];

// Only the in-repo spec + the public-served copy are available at runtime.
// The other markdown files live in `docs/` (repo) — use code--view in dev.
const PUBLIC_AVAILABLE = new Set<string>([SPEC_URL]);

export default function EngineInfo() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSEO
        title="Engine Info | AIWMC Quantis Admin"
        description="Live engine version, thresholds, and Business Logic spec links."
        canonical="/admin/engine"
        noindex
      />
      <Header darkMode={false} onToggleTheme={() => {}} />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Engine &amp; Business Logic</h1>
              <p className="text-sm text-muted-foreground">
                Confirms the {PRODUCT_IDENTITY.fullName} engine constants currently
                shipping in production.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
          </Button>
        </div>

        {/* Live engine version */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Production engine version</span>
              <Badge variant="default" className="font-mono">
                v{QUANTIS_BUSINESS_LOGIC_VERSION}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
            <Field label="Spec file">
              <a
                href={SPEC_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                {SPEC_URL} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Field>
            <Field label="Spec MD5 (verified at build)">
              <code className="font-mono text-xs">{SPEC_HASH}</code>
            </Field>
            <Field label="Legal entity">{PRODUCT_IDENTITY.legalEntity}</Field>
            <Field label="Domain">{PRODUCT_IDENTITY.domain}</Field>
            <Field label="Monte Carlo iterations">
              {MONTE_CARLO_ITERATIONS.toLocaleString('en-US')}
            </Field>
            <Field label="Engine time budget">{ENGINE_TIME_BUDGET_SEC}s</Field>
            <Field label="Benchmark count">
              {BENCHMARK_COUNT.toLocaleString('en-US')}
            </Field>
            <Field label="12 financial variables">
              {TWELVE_FINANCIAL_VARIABLES.length} present
            </Field>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Verdict &amp; LTV:CAC thresholds</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Score → verdict</h3>
              <ul className="space-y-1 font-mono text-xs">
                <li>≥ {VERDICT_THRESHOLDS.STRONG_PROCEED} → STRONG PROCEED</li>
                <li>
                  ≥ {VERDICT_THRESHOLDS.PROCEED_WITH_CAUTION} → PROCEED WITH CAUTION
                </li>
                <li>
                  ≥ {VERDICT_THRESHOLDS.PIVOT_RECOMMENDED} → PIVOT RECOMMENDED
                </li>
                <li>&lt; {VERDICT_THRESHOLDS.PIVOT_RECOMMENDED} → DO NOT PROCEED</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">LTV:CAC bands</h3>
              <ul className="space-y-1 font-mono text-xs">
                <li>&lt; {LTV_CAC_THRESHOLDS.critical} → critical</li>
                <li>&lt; {LTV_CAC_THRESHOLDS.highRisk} → high risk</li>
                <li>&lt; {LTV_CAC_THRESHOLDS.caution} → caution</li>
                <li>≥ {LTV_CAC_THRESHOLDS.healthy} → healthy</li>
                <li>≥ {LTV_CAC_THRESHOLDS.strong} → strong</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 12 variables list */}
        <Card>
          <CardHeader>
            <CardTitle>The 12 mandatory financial variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
              {TWELVE_FINANCIAL_VARIABLES.map((v) => (
                <code
                  key={v}
                  className="px-2 py-1 rounded bg-muted text-foreground"
                >
                  {v}
                </code>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Docs index */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Business Logic docs index
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              All Business Logic source documents that ship with this repo. The
              canonical spec is also served at{" "}
              <code className="font-mono">{SPEC_URL}</code> for direct linking
              from emails, alerts, and the admin UI.
            </p>
            <ul className="divide-y">
              {BUSINESS_LOGIC_DOCS.map((doc) => {
                const isAvailable = PUBLIC_AVAILABLE.has(doc.path);
                return (
                  <li
                    key={doc.path}
                    className="py-3 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-mono text-sm truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.note}
                        </p>
                      </div>
                    </div>
                    {isAvailable ? (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={doc.path}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        repo only
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Disclaimer footer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mandatory disclaimer (live)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {MANDATORY_DISCLAIMER}
            </p>
          </CardContent>
        </Card>
      </main>

    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
