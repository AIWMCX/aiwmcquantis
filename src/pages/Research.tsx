import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, FlaskConical, Waves, Sparkles, BookOpen, ArrowRight, ExternalLink, Microscope, Atom } from 'lucide-react';
import { Link } from 'react-router-dom';

const citations = [
  { id: 1, authors: 'Elhage, N. et al.', year: 2022, title: 'Toy Models of Superposition', venue: 'Anthropic Research', type: 'Academic' },
  { id: 2, authors: 'Frankle, J. & Carlin, M.', year: 2019, title: 'The Lottery Ticket Hypothesis: Finding Sparse, Trainable Neural Networks', venue: 'ICLR 2019', type: 'Academic' },
  { id: 3, authors: 'Goldowsky-Dill, N. et al.', year: 2022, title: 'Rigorously Measuring Causal Effects: A New Toolkit for Analyzing LLMs', venue: 'Redwood Research', type: 'Academic' },
  { id: 4, authors: 'Wei, J. et al.', year: 2022, title: 'Emergent Abilities of Large Language Models', venue: 'TMLR', type: 'Academic' },
  { id: 5, authors: 'Power, A. et al.', year: 2022, title: 'Grokking: Generalization Beyond Overfitting on Small Algorithmic Datasets', venue: 'ICLR 2022 Workshop', type: 'Academic' },
];

export default function Research() {
  return (
    <AppLayout title="Research">
      <PageSEO
        title="AIWMC Research Foundation | Quantis"
        description="The AIWMC Research Foundation introduces the Quantis Information Metric (QIM) — a new theoretical framework for analyzing AI model reliability through causal influence fields."
        canonical="/research"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-14">
        {/* Header */}
        <header className="space-y-6 text-center">
          <div className="flex justify-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5">
              Current Status: Pre-Discovery
            </Badge>
            <Badge variant="outline" className="font-mono text-xs">
              v1.0 · March 2026
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            AIWMC Research Foundation
          </h1>
          <p className="text-sm font-mono text-muted-foreground">Artificial Intelligence Wave-Matter Causality</p>
          <div className="max-w-2xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              Current methods for analyzing AI models are approaching a systemic failure point due to their reliance on static, component-based units like neurons. This research introduces the <strong className="text-foreground">"AIWMC Quantis"</strong> — the smallest irreducible unit of causal influence within a model. We propose that Quantis are not static components but dynamic, transient structures, and present three falsifiable hypotheses to develop novel analysis techniques based on field theory, phase transitions, and a new information metric.
            </p>
          </div>
        </header>

        {/* AIWMC Definition */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <Atom className="w-6 h-6 text-primary" />
            Formal Definition
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-muted/50 border border-border rounded-lg p-5">
                <p className="text-sm font-semibold mb-2">AIWMC — Artificial Intelligence Wave-Matter Causality</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A research paradigm that models AI internals as an interplay between distributed, <em>wave-like</em> potential fields and discrete, <em>matter-like</em> computational events. The fundamental unit of analysis is the <strong>Quantis</strong>: the smallest unit of causal influence that produces a state change with measurable information content.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Unlike neurons (structural and static), a Quantis is <strong>functional and dynamic</strong> — it may span thousands of parameters and exist only transiently during a specific computation. This reframing resolves several paradoxes in current interpretability research.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Hypothesis 1 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <Waves className="w-6 h-6 text-primary" />
            Hypothesis 1: The Quantis Field
          </h2>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The fundamental unit of representation is not a discrete neuron but a <strong>"Quantis Field"</strong> — a pattern of potential influence distributed across thousands of parameters. A specific Quantis is a resonant excitation of this field, analogous to a particle in quantum field theory. Neurons are merely locations where this field is measured.
              </p>
              <div className="bg-muted/30 border border-border/50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resolution</p>
                <p className="text-sm text-muted-foreground">
                  This resolves the <em>Redundancy vs. Specificity Paradox</em>: individual neurons are not critical (the Lottery Ticket Hypothesis <sup>[2]</sup>), but the integrity of the distributed field pattern is. Polysemantic neurons <sup>[1]</sup> are simply nodes that participate in multiple field excitation patterns.
                </p>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Falsification Method</p>
                <p className="text-sm text-muted-foreground">
                  Perform spectral analysis on the model's weight matrices and activation manifolds. If correct, characteristic harmonic modes ("eigen-Quantis") will be more predictive of model behavior than individual neuron activations. If no such modes exist or they provide no predictive advantage, the hypothesis is false.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Hypothesis 2 */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <Sparkles className="w-6 h-6 text-primary" />
            Hypothesis 2: Causal Phase Transitions
          </h2>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Emergent abilities and catastrophic forgetting are not smooth processes but <strong>first-order phase transitions</strong> in the model's causal graph. A Quantis is a transient causal structure that "crystallizes" when the input data's information density crosses a critical threshold, and "melts" away otherwise.
              </p>
              <p className="text-sm text-muted-foreground">
                This explains phenomena like <em>grokking</em> <sup>[5]</sup>: the model trains for millions of steps with no generalization, then suddenly achieves near-perfect performance — a classic signature of a phase transition in a complex dynamical system.
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Falsification Method</p>
                <p className="text-sm text-muted-foreground">
                  Track the information geometry of the model's activation space under varying input distributions. If this hypothesis holds, we observe sudden, discontinuous shifts (bifurcations) in the topology of this space. If the geometry always evolves smoothly and linearly, the hypothesis is false.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Hypothesis 3: QIM */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <Brain className="w-6 h-6 text-primary" />
            Hypothesis 3: Quantis Information Metric (QIM)
          </h2>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The failure of models to distinguish truth from falsehood (hallucinations) stems from reliance on activation magnitude as a proxy for confidence. We propose a new composite metric:
              </p>
              <div className="bg-muted/50 border border-border rounded-lg p-6 text-center space-y-3">
                <p className="font-mono text-2xl font-bold tracking-wider text-foreground">QIM = A × C</p>
                <div className="grid sm:grid-cols-2 gap-4 text-left mt-4">
                  <div className="p-3 bg-background rounded-lg border border-border/50">
                    <p className="text-sm font-semibold mb-1 font-mono">A — Activation Magnitude</p>
                    <p className="text-xs text-muted-foreground">The strength of the model's internal response to a given input at state <em>i</em>.</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border border-border/50">
                    <p className="text-sm font-semibold mb-1 font-mono">C — Causal Leverage</p>
                    <p className="text-xs text-muted-foreground font-mono mb-1">C<sub>i</sub> = ‖ ∂L / ∂A<sub>i</sub> ‖₂</p>
                    <p className="text-xs text-muted-foreground">The L2 norm of the gradient of the objective function <em>L</em> with respect to activation <em>A<sub>i</sub></em>.</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A hallucination may exhibit high <span className="font-mono">A</span> but near-zero <span className="font-mono">C</span> — the output exists in a <strong>"causal dead zone"</strong> where the model is confident but causally ungrounded.
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Falsification Method</p>
                <p className="text-sm text-muted-foreground">
                  Compute QIM across internal states for a dataset of verified and hallucinatory outputs. If QIM is a significantly better discriminator of factual vs. hallucinatory outputs than <span className="font-mono">A</span> or <span className="font-mono">C</span> alone, the hypothesis is supported. If it provides no additional classificatory power, it is false.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Pilot Experiment */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <FlaskConical className="w-6 h-6 text-primary" />
            Pilot Experiment: "Grokking a Quantis"
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This experiment is designed to be the simplest possible test for a collective Quantis phenomenon, targeting the well-documented <em>grokking</em> transition <sup>[5]</sup>.
              </p>

              <div className="space-y-3">
                {[
                  { step: 'System', desc: 'A small (2–6 layer) transformer model.' },
                  { step: 'Task', desc: 'Modular addition a + b mod P — chosen because it reliably produces grokking.' },
                  { step: 'Capture', desc: 'Save full model state every N steps. For each checkpoint, run evaluation on a fixed probe dataset of M examples.' },
                  { step: 'Measure', desc: 'Capture full activation tensors for a target layer, yielding an M × D activation matrix. Compute the D × D covariance matrix.' },
                  { step: 'Decompose', desc: 'Perform SVD/PCA on the covariance matrix. The eigenvectors are the first proxy for "eigen-Quantis." Singular values represent each component\'s energy.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-xs font-mono font-bold text-primary bg-primary/10 rounded px-2 py-1 shrink-0">{i + 1}</span>
                    <div>
                      <span className="text-sm font-semibold">{item.step}:</span>
                      <span className="text-sm text-muted-foreground ml-1">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Experimental Hypothesis</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The emergence of generalization (grokking) will be preceded or accompanied by a sudden, non-linear realignment of the principal components of the activation covariance matrices. This structural realignment will be a better real-time correlate of the generalization event than the activation values of any single neuron.
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Falsification</p>
                <p className="text-sm text-muted-foreground">
                  The hypothesis is falsified if the correlation between spectral structure metrics (cosine similarity of top-k eigenvectors between epochs) and test accuracy is weaker than simpler metrics (weight norms, single neuron activations) over the grokking transition.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Product Integration */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <Microscope className="w-6 h-6 text-primary" />
            Product Integration: Proto-QIM in Quantis
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                While the full AIWMC Quantis framework awaits experimental validation, the Quantis product already implements <strong>proto-QIM principles</strong> in its analysis pipeline:
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-primary" /> Activation (A)
                  </p>
                  <p className="text-xs text-muted-foreground">Multi-Model Consensus scoring measures agreement magnitude between GPT and Gemini — a proxy for activation strength.</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-primary" /> Causal Leverage (C)
                  </p>
                  <p className="text-xs text-muted-foreground">The 10-rule Anti-BS Reconciliation Engine verifies that outputs causally influence the P&L — filtering "causal dead zones."</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-2">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <ArrowRight className="w-3 h-3 text-primary" /> QIM → QSL Badge
                  </p>
                  <p className="text-xs text-muted-foreground">The Confidence Badge (QSL 1–4) is effectively A × C: outputs must be both strongly supported and causally grounded.</p>
                </div>
              </div>
              <div className="text-center">
                <Link to="/methodology" className="text-sm text-primary underline underline-offset-2 hover:text-primary/80 inline-flex items-center gap-1">
                  View full methodology & safety levels <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Citations */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold border-b pb-2 flex items-center gap-2" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>
            <BookOpen className="w-6 h-6 text-primary" />
            References
          </h2>
          <div className="space-y-2">
            {citations.map((cite) => (
              <div key={cite.id} className="flex items-start gap-3 text-sm p-3 bg-muted/30 rounded-lg border border-border/50">
                <span className="font-mono text-xs text-muted-foreground shrink-0">[{cite.id}]</span>
                <div>
                  <span className="text-muted-foreground">{cite.authors} ({cite.year}). </span>
                  <span className="font-medium" style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}>{cite.title}</span>
                  <span className="text-muted-foreground">. {cite.venue}.</span>
                  <Badge variant="outline" className="text-xs ml-2">{cite.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer badge */}
        <div className="flex justify-center">
          <Badge className="bg-primary/10 text-primary border-primary/20 font-mono text-xs px-4 py-1.5">
            AIWMC Research Foundation · Pre-Discovery · 2026
          </Badge>
        </div>
      </div>
    </AppLayout>
  );
}
