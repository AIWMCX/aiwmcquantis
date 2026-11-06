---
title: "PREDICTA: What to Learn From Palantir"
owner: AIWMC LLC, Bogdan Jeltov (founder)
received: 2026-11-06 (pasted by the founder in the Quantis session)
status: governing architecture reference for the PREDICTA build and its integration into AIWMC Quantis
companion: 2026-10-18-PREDICTA-STRATEGY-AND-TECHNICAL-SPEC-v1.0.md
---

## PREDICTA: What to Learn From Palantir

Use Palantir as an architectural reference for governed data and operational workflows—not as a product template, codebase, or claim that PREDICTA has equivalent enterprise capabilities.

The core idea to adopt is:

> Every answer, number, recommendation, and action must be traceable back through a governed chain of evidence, transformations, permissions, and review.

### 1. Build a domain model, not just a search index

PREDICTA should organize information as connected business objects.

```text
Research Request
  → Provider Run
  → Source
  → Evidence Passage
  → Observation
  → Claim
  → Calculation
  → Decision
  → Quantis Import Preview
```

| Object | Purpose |
|---|---|
| `ResearchRequest` | The question, geography, period, filters, policy and budget. |
| `ProviderRun` | One provider call: status, latency, cost, query, failure reason and retrieval time. |
| `Source` | Canonical URL, publisher, title, publication date, rights and source hash. |
| `EvidencePassage` | The exact relevant passage, table cell or dataset field—not only a link. |
| `Observation` | A normalized fact with units, geography, period, population and evidence references. |
| `Claim` | A human-readable statement supported by one or more observations. |
| `Calculation` | A deterministic transformation with inputs, formula, units and output. |
| `Decision` | A customer or analyst decision, assumptions accepted/rejected, and rationale. |
| `QuantisImportPreview` | Proposed evidence mapping sent to Quantis for human approval. |

A source link alone is not a trustworthy research object. PREDICTA must preserve what was observed, when, under what scope, and how it was transformed.

### 2. Separate data, reasoning, and actions

PREDICTA needs three layers.

```text
Data layer
Sources, passages, observations, datasets, metadata, hashes

Reasoning layer
Retrieval, ranking, contradiction detection, calculations, verification,
confidence and uncertainty

Action layer
Create research run, export pack, request review, approve an assumption,
send an import preview to Quantis, monitor a source
```

This prevents an AI response from becoming an unreviewed business fact or financial input.

### 3. Treat lineage as a product feature

Every result should answer:

- Where did this come from?
- When was it published, observed, retrieved and last checked?
- What geography, population, period, currency and units does it cover?
- Which provider retrieved it?
- Was it calculated, quoted, inferred or supplied by a customer?
- Which other evidence supports or contradicts it?
- Can a user open the original source?

The lineage chain should look like:

```text
Claim
  ← Observation
    ← Evidence Passage
      ← Source
        ← Provider Run
          ← Research Request
```

A hash proves the record was not altered after capture. It does not prove the source is true, current, comparable, or suitable for a financial model.

### 4. Use policy checks before every external action

Like Palantir’s governed operational model, PREDICTA should have a policy layer between requests and providers.

It decides:

- Is the user allowed to run this request?
- Is the source permitted for this use?
- Is the query public, private or sensitive?
- Can the requested geography, language or date filter be honored?
- Is there remaining request, cost and time budget?
- Is the result allowed into a shared cache?
- May it be exported or sent to Quantis?

```text
Browser / API
  → Query Gateway
  → Policy and Budget Check
  → Retrieval Broker
  → Provider
  → Evidence Repository
  → Verifier
  → Answer, Pack or Import Preview
```

### 5. Make provider failures visible

Each provider run must end in a real state:

```text
SUCCEEDED
DEGRADED
FAILED
RATE_LIMITED
TIMED_OUT
SKIPPED_BY_POLICY
UNAVAILABLE_CREDENTIALS
```

Never convert a provider error into an empty-looking successful answer. PREDICTA should show partial coverage clearly:

> “Three sources completed. SEC data was unavailable. No comparable wage dataset was retrieved.”

### 6. Keep public search separate from private research

```text
Public search
- No account required within fair-use limits
- Shared, rights-checked cache only
- No private documents, customer names or sensitive query content

Private workspace research
- Account and workspace identity required
- Tenant-scoped evidence, files, caches and exports
- Opaque IDs; sensitive text never placed in public URLs or analytics
- Explicit sharing and publishing controls
```

This is essential before PREDICTA accepts client documents, financial assumptions, or Quantis-connected workflows.

### 7. Quantis must remain the financial authority

PREDICTA researches external evidence. Quantis models financial decisions.

```text
PREDICTA
  produces candidate observations and evidence packets
        ↓
Quantis Import Preview
  validates schema, scope, units and lineage
        ↓
Human accepts, rejects or modifies assumptions
        ↓
QUANTIS
  performs deterministic financial calculations
```

Rules:

- PREDICTA cannot silently write to Quantis financial inputs.
- Public benchmarks are not customer facts.
- Every imported assumption needs explicit review.
- Quantis calculations must preserve the imported PREDICTA evidence references.
- A rejected observation remains visible as rejected; it is not deleted from audit history.

### 8. Start with a modular monolith

Do not begin with a graph database, massive crawler, agent fleet, or distributed search cluster.

Build these modules with explicit contracts first:

1. Query Gateway
2. Policy and Budget Engine
3. Retrieval Broker
4. Provider Registry
5. Evidence Repository
6. Calculation Engine
7. Verification and Composition Layer
8. Export Service
9. Quantis Import Preview
10. Evaluation and Operations

Use a relational database first. Add graph projections later when evidence and decision relationships create a demonstrated need.

### 9. Initial PREDICTA release sequence

**Stage 1 — source truth and search correctness**

- Map deployed site, repository, commit and rollback target.
- Fix stale response, clearing-input, duplicate-source and hidden-failure defects.
- Make Enter search inside PREDICTA rather than redirecting away.
- Show original links, source status and partial results.

**Stage 2 — governed evidence**

- Add provider registry, deadlines, rate limits and source metadata.
- Store source, passage, observation and claim records.
- Export Markdown and CSV with a source appendix.
- Add unit, geography, period and scale validation.

**Stage 3 — reviewed decision workflow**

- Build a bounded evidence-pack intake.
- Add saved research runs, review states and deterministic calculations.
- Create Quantis import previews with no automatic financial-input changes.

**Stage 4 — durable operations**

- Add jobs, retries, cancellation, idempotency, quotas, monitoring and evaluation.
- Add narrow source monitoring only after the evidence-pack workflow is useful.

### 10. What not to copy from Palantir

Do not copy:

- Palantir branding, terminology, UI, proprietary implementation, or sales claims.
- A huge ontology before real customer tasks require it.
- Enterprise-scale infrastructure before demand, workload and cost justify it.
- Automated recommendations without inspectable evidence and customer approval.
- A “single source of truth” claim when sources are contradictory or incomplete.

The right PREDICTA goal is not “be Palantir.” It is:

> Build a trustworthy research-to-decision system where a consultant can inspect evidence, understand uncertainty, correct assumptions, and hand approved inputs to Quantis.

This is the architectural document we should use to guide the PREDICTA build.
