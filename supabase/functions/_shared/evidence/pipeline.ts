/**
 * Quantis Evidence Service — end-to-end pipeline orchestration (PR E2.1).
 *
 *   raw business input (idea, location)
 *         v
 *   privacyGate (redactSensitiveContent)
 *         v
 *   EvidenceRequestCompiler (compileEvidenceRequest)
 *         v
 *   ProviderRouter -> TavilyEvidenceProvider (or whatever is injected)
 *         v
 *   raw provider response
 *         v
 *   normalize URLs/sources (canonicalizeUrl) + build EvidenceSource/Passage
 *         v
 *   dedupe / independence (clusterSources)
 *         v
 *   EvidenceGraph (buildEvidenceClaim)
 *         v
 *   [numeric firewall -- see honesty note below]
 *         v
 *   buildEvidencePacket()
 *         v
 *   QuantisEvidencePacket
 *
 * NOT wired into RVCE, analyze-business, QOC, or any customer-visible
 * path. This function exists to be called manually / from tests / from a
 * future E6 shadow adapter -- nothing in this PR calls it automatically.
 *
 * HONESTY NOTE on two steps that are structurally present but
 * deliberately shallow in this slice, rather than faked to look more
 * complete than they are:
 *
 *   - Numeric observations: this pipeline does NOT extract
 *     NumericObservation candidates from passage text. Doing that
 *     correctly needs either an LLM extraction step (which then must be
 *     validated by numeric-firewall.ts before being trusted, per section
 *     15) or a rules-based extractor -- neither exists yet, and bolting
 *     one on hastily to make this pipeline's output look richer would be
 *     exactly the kind of unvalidated shortcut the master prompt warns
 *     against. `numericObservations` is always `[]` here. numeric-
 *     firewall.ts is fully built and tested (see its own test suite) and
 *     ready for whichever future slice adds real extraction.
 *
 *   - Claim construction is NAIVE: one claim per compiled question,
 *     statement is a template string echoing the question, and every
 *     source found for that question is marked SUPPORTS. Real
 *     support-vs-contradicts classification needs a semantic/entailment
 *     step this pipeline does not have. This means `deriveClaimStatus`'s
 *     CONTESTED path is exercised by evidence-graph.ts's own tests, but
 *     this pipeline will never itself produce a CONTESTED claim -- that
 *     is an honest limitation of this slice, not a claim that
 *     contradiction detection is "done."
 *
 * Everything else in this pipeline (privacy redaction, URL
 * canonicalization, dedup/independence clustering, packet content
 * hashing) is real, tested logic reused as-is from its own module.
 */
import type { EvidenceProvider, ProviderExecutionContext, ProviderSearchResult } from './provider.ts';
import type { EvidenceClaim, EvidencePassage, EvidenceRequest, EvidenceSource, SourceLens } from './types.ts';
import { redactSensitiveContent, type PrivacyFinding } from './privacy-gate.ts';
import { compileEvidenceRequest } from './request-compiler.ts';
import { ProviderRouter } from './provider-router.ts';
import { canonicalizeUrl } from './url-normalize.ts';
import { clusterSources } from './dedupe.ts';
import { buildEvidenceClaim } from './evidence-graph.ts';
import { classifyFreshness, rollUpFreshness } from './freshness.ts';
import { buildEvidencePacket, sha256Hex } from './packet.ts';
import type { QuantisEvidencePacket } from './types.ts';

const PIPELINE_VERSION = '0.1.0';

export interface RunEvidencePipelineInput {
  analysisRunId: string;
  idea: string;
  location: string;
  /** Caller-owned provider instances (secret injection happens at construction, not here). */
  providers: EvidenceProvider[];
  /** Injectable for deterministic tests. */
  idGenerator?: () => string;
  clock?: () => string;
}

export interface RunEvidencePipelineResult {
  packet: QuantisEvidencePacket;
  /** The compiled EvidenceRequest that drove this run -- needed by callers (E6 shadow worker) that persist evidence_requests alongside the packet. */
  request: EvidenceRequest;
  providerResults: ProviderSearchResult[];
  privacyFindings: PrivacyFinding[];
}

export async function runEvidencePipeline(input: RunEvidencePipelineInput): Promise<RunEvidencePipelineResult> {
  const startedAt = Date.now();
  const idGen = input.idGenerator ?? (() => crypto.randomUUID());
  const nowIso = input.clock ?? (() => new Date().toISOString());

  // 1. privacyGate on the raw idea/location text before anything derived
  //    from it leaves the process, per master prompt section 21.
  const ideaRedaction = redactSensitiveContent(input.idea);
  const locationRedaction = redactSensitiveContent(input.location);
  const privacyFindings: PrivacyFinding[] = [...ideaRedaction.findings, ...locationRedaction.findings];

  // 2. Deterministic, LLM-free query compilation.
  const request = compileEvidenceRequest({
    analysisRunId: input.analysisRunId,
    idea: ideaRedaction.redacted,
    location: locationRedaction.redacted,
  });

  const router = new ProviderRouter(input.providers);

  const allSources: EvidenceSource[] = [];
  const allPassages: EvidencePassage[] = [];
  const allClaims: EvidenceClaim[] = [];
  const unresolvedQuestions: string[] = [];
  const providerResults: ProviderSearchResult[] = [];
  const usedLenses = new Set<SourceLens>();
  let degraded = false;
  let totalCostUsd = 0;
  let anyCost = false;

  for (const question of request.questions) {
    // v0 routing: try each preferred lens in order, use the first that has an eligible+available provider.
    let providersForQuestion: EvidenceProvider[] = [];
    let chosenLens: SourceLens | undefined;
    for (const lens of question.preferredLenses) {
      const candidates = router.providersForLens(lens);
      if (candidates.length > 0) {
        providersForQuestion = candidates;
        chosenLens = lens;
        break;
      }
    }

    if (providersForQuestion.length === 0) {
      unresolvedQuestions.push(question.id);
      continue;
    }
    usedLenses.add(chosenLens!);

    const context: ProviderExecutionContext = { requestId: idGen(), analysisRunId: input.analysisRunId };
    const results = await Promise.all(
      providersForQuestion.map((p) => p.search({ query: question.query, lens: chosenLens }, context)),
    );
    providerResults.push(...results);

    const questionSources: EvidenceSource[] = [];
    for (const result of results) {
      if (result.status === 'FAILED') {
        degraded = true;
        continue;
      }
      if (result.status === 'DEGRADED') degraded = true;
      if (result.costUsd) {
        totalCostUsd += Number(result.costUsd);
        anyCost = true;
      }

      for (const raw of result.results) {
        const canon = canonicalizeUrl(raw.url);
        if (!canon.ok) continue;

        const sourceId = idGen();
        const passageId = idGen();
        const passageText = raw.content ?? '';
        const contentHash = await sha256Hex(passageText);

        questionSources.push({
          sourceId,
          canonicalUrl: canon.canonicalUrl!,
          publisher: raw.title,
          publishedAt: raw.publishedAt,
          retrievedAt: nowIso(),
          contentHash,
          // v0: no real source-type classification model exists yet --
          // OTHER is an honest "unclassified," not a guess dressed up as
          // a real answer.
          sourceType: 'OTHER',
          primaryStatus: 'UNKNOWN',
          // Deterministic default from publishedAt age -- see freshness.ts's
          // own header for why this is a v0 default, not a final per-
          // evidence-class policy.
          freshness: classifyFreshness(raw.publishedAt, new Date(nowIso())),
          // Conservative default matching Tavily's unresolved
          // caching/retention question in provider-registry.ts -- do not
          // widen this without a real terms clarification.
          storagePolicy: 'METADATA_ONLY',
          providerId: result.providerId,
        });

        allPassages.push({
          passageId,
          sourceId,
          text: passageText,
          extractedAt: nowIso(),
          contentHash,
        });
      }
    }

    const { sources: clustered } = clusterSources(questionSources);
    allSources.push(...clustered);

    if (clustered.length > 0) {
      const support = clustered.map((s) => ({
        sourceId: s.sourceId,
        passageId: allPassages.find((p) => p.sourceId === s.sourceId)!.passageId,
        relation: 'SUPPORTS' as const,
      }));
      allClaims.push(
        buildEvidenceClaim({
          claimId: idGen(),
          statement: `Evidence gathered for: ${question.query}`,
          support,
          sources: clustered,
          freshness: rollUpFreshness(clustered.map((s) => s.freshness)),
        }),
      );
    } else {
      unresolvedQuestions.push(question.id);
    }
  }

  const packet = await buildEvidencePacket({
    analysisRunId: input.analysisRunId,
    queryPlanVersion: PIPELINE_VERSION,
    providerSetVersion: PIPELINE_VERSION,
    rankingVersion: PIPELINE_VERSION,
    sourceLenses: Array.from(usedLenses),
    sources: allSources,
    passages: allPassages,
    claims: allClaims,
    numericObservations: [], // see module header honesty note
    unresolvedQuestions,
    contradictions: [], // see module header honesty note
    degraded,
    retrievalLatencyMs: Date.now() - startedAt,
    costUsd: anyCost ? totalCostUsd : undefined,
    idGenerator: idGen,
    clock: nowIso,
  });

  return { packet, request, providerResults, privacyFindings };
}
