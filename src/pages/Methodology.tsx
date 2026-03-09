import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { ShieldCheck, Database, Bot, FileCheck, Info, AlertTriangle, TestTube, Wrench, ExternalLink, Shield } from 'lucide-react';
import { LastAuditedBadge } from '@/components/analysis/LastAuditedBadge';
import { GOLDEN_VECTORS } from '@/lib/golden-test-vectors';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Methodology() {
  const { data: provenanceSources, isLoading: sourcesLoading } = useQuery({
    queryKey: ['methodology-provenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_provenance')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const licenseColor = (license: string) => {
    if (['public_domain', 'cc0'].includes(license)) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    if (license === 'cc_by_4.0') return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  };

  return (
    <AppLayout title="Methodology & Safety">
      <PageSEO
        title="Methodology | AIWMC Quantis"
        description="Learn about the Quantis Safety Levels (QSL), our data provenance, and the Dual-AI validation engine powering our business analysis."
        canonical="/methodology"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <div className="space-y-4 text-center">
          <div className="flex justify-center mb-4">
            <LastAuditedBadge size="md" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Accuracy & Safety Methodology</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transparency is at the core of Quantis. Discover how we source our data, validate assumptions, and assign safety levels to our financial models.
          </p>
          <Badge variant="outline" className="text-xs font-mono">
            Engine Version: 2.0.0-precision
          </Badge>
        </div>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Quantis Safety Levels (QSL)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { level: 'QSL-4', name: 'Deterministic Verification', color: 'border-blue-500 bg-blue-500/5', desc: 'Mathematical certainty. Outputs are calculated using absolute formulas (e.g., Gross Profit = Revenue - COGS) with strict bounds.' },
              { level: 'QSL-3', name: 'Golden Benchmark Aligned', color: 'border-green-500 bg-green-500/5', desc: 'High confidence. The model\'s assumptions fall well within the P25-P75 interquartile range of verified industry data.' },
              { level: 'QSL-2', name: 'Plausible Extrapolation', color: 'border-amber-500 bg-amber-500/5', desc: 'Moderate confidence. Some inputs deviate from typical benchmarks, triggering stress tests. Manual review is recommended.' },
              { level: 'QSL-1', name: 'Speculative Warning', color: 'border-red-500 bg-red-500/5', desc: 'Low confidence. Assumptions break physical or economic constraints (e.g., negative CAC, >100% market capture). Hard warnings apply.' }
            ].map((qsl) => (
              <div key={qsl.level} className={`p-5 rounded-xl border-l-4 ${qsl.color} space-y-2 bg-card`}>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <span className="bg-background px-2 py-1 rounded text-xs font-mono border border-border">{qsl.level}</span>
                  {qsl.name}
                </h3>
                <p className="text-sm text-muted-foreground">{qsl.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" />
            Data Provenance & Sources
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Our financial baseline is built on multiple verified data sources. Every dataset is tracked with license type, allowed uses, and freshness indicators for full audit compliance.
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <FileCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Continuous Audits:</strong> Benchmarks are programmatically verified. Any data point older than 180 days is flagged as stale by our Research Agent.</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <FileCheck className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Location Calibration:</strong> Base metrics are adjusted using cost-of-living indices, typical rent variations, and salary expectations for over 50 global hubs.</span>
              </li>
            </ul>
          </div>

          {/* Dynamic Data Sources from DB */}
          {sourcesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : provenanceSources && provenanceSources.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Verified Data Sources</h3>
              {provenanceSources.map((source: any) => (
                <div key={source.id} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                  <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{source.source_name}</span>
                      <Badge variant="outline" className={`text-xs ${licenseColor(source.license_type)}`}>
                        {source.license_type.replace(/_/g, ' ')}
                      </Badge>
                      {source.source_url && (
                        <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    {source.coverage_description && (
                      <p className="text-xs text-muted-foreground mt-1">{source.coverage_description}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground/70">
                      {source.record_count && <span>{source.record_count.toLocaleString()} records</span>}
                      {source.date_range_start && <span>{source.date_range_start} → {source.date_range_end}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            Dual-Engine Consensus
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              To eliminate single-model bias, Quantis employs a multi-agent architecture:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                <h4 className="font-medium mb-1">Generative Engine</h4>
                <p className="text-xs text-muted-foreground">Extracts qualitative nuances from the user's idea, matching it to sub-industries and identifying unique value propositions.</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border/50">
                <h4 className="font-medium mb-1">Reconciliation Engine</h4>
                <p className="text-xs text-muted-foreground">Acts as an adversarial critic. It compares the Generative Engine's assumptions against the Golden Test Vectors, strictly bounding outputs.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Golden Test Vectors Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2">
            <TestTube className="w-6 h-6 text-primary" />
            Golden Test Vectors
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Every engine update is regression-tested against canonical business archetypes. These vectors define expected financial outcomes with ±15% tolerance.
            </p>
            <div className="grid gap-3">
              {GOLDEN_VECTORS.map((vector) => (
                <div key={vector.id} className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="font-mono text-xs">{vector.vectorCode}</Badge>
                    <span className="text-xs text-muted-foreground">{vector.location}</span>
                  </div>
                  <h4 className="font-medium text-sm capitalize">{vector.businessType.replace(/_/g, ' ')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{vector.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Known Limitations Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Known Limitations & Roadmap
          </h2>
          <div className="bg-card border border-amber-500/20 rounded-xl p-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              We believe in transparent reporting of our system's current limitations. The following gaps are actively being addressed:
            </p>
            <div className="space-y-3">
              {[
                { id: 'GOV-001', title: 'Safety Governance', desc: 'Research Agent lacks formal veto authority over deployments. QSL gates being implemented.', status: 'In Progress' },
                { id: 'UX-001', title: 'Confidence Theater', desc: 'Confidence badges now connected to systematic safety_evaluations pipeline as of v2.0.0.', status: 'Resolved' },
                { id: 'DATA-001', title: 'Benchmark Staleness', desc: 'Implementing benchmark_versions freshness checks with 180-day staleness warnings.', status: 'In Progress' },
                { id: 'DATA-002', title: 'Multi-Source Provenance', desc: 'Data provenance registry now tracks 5+ open data sources with license compliance and freshness indicators.', status: 'Resolved' },
                { id: 'TEST-001', title: 'Regression Coverage', desc: 'Golden test vector suite expanded to 3 canonical archetypes with weekly automated runs.', status: 'Active' },
                { id: 'FB-001', title: 'User Feedback Loop', desc: 'Realism feedback widget now captures per-dimension scoring for model calibration.', status: 'Resolved' }
              ].map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <Wrench className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.title}</span>
                      <Badge 
                        variant={item.status === 'Resolved' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    <span className="text-xs font-mono text-muted-foreground/70">{item.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* System Audit Status - Large Badge */}
        <section className="flex justify-center">
          <LastAuditedBadge size="lg" />
        </section>
        
        <div className="flex items-start gap-3 p-4 bg-primary/5 text-primary-foreground/90 border border-primary/20 rounded-xl text-sm">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-primary">
            <strong>Disclaimer:</strong> Quantis is a stress-testing tool intended to validate hypotheses. While our methodology minimizes hallucinations, real-world execution carries inherent risks. Always consult with certified financial advisors before deploying capital.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
