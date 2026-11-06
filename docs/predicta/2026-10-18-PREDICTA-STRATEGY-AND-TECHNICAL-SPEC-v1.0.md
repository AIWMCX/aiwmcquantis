---
title: "Predicta Strategy and Technical Specification"
version: 1.0
date: 2026-10-18
owner: AIWMC LLC | AIWMC.org
prepared_for: Bogdan Jeltov, Founder and CEO
received: 2026-11-06 (pasted by the founder in the Quantis session; tables re-set as Markdown, wording unchanged)
status: planning and engineering specification. Proposed features, prices, budgets, schedules and targets are not claims of implementation, customer traction or measured performance.
companion: 2026-11-06-PREDICTA-PALANTIR-LESSONS.md
---

# Predicta Strategy and Technical Specification

AIWMC LLC | AIWMC.org | Version 1.0 | 18 October 2026

Prepared for Bogdan Jeltov, Founder and CEO. Planning and engineering specification. Proposed features, prices, budgets, schedules and targets are not claims of implementation, customer traction or measured performance.

## 1 Executive decision

Build Predicta as a research and analytical execution platform with a free public search interface. A user should be able to find information, investigate a question, work with data, inspect the evidence behind a conclusion, and return later to see what changed. The long-term ambition is a globally useful research institution implemented in software, capable of many concurrent investigations and specialized analytical tasks.

The founder’s comparison to thousands of exceptional researchers expresses the intended scale and quality of work. Translate that into demonstrable task competence, parallel throughput, reproducibility and cost. Human IQ scores, academic titles and agent counts are not valid measures of this product’s intelligence. Predicta earns a strong claim by completing difficult customer tasks reliably against credible alternatives.

The recommended entry market is independent business consultants and fractional CFOs preparing client feasibility, expansion or pricing decisions. The first paid deliverable is an assumption evidence pack: a concise memo, structured observations, source passages, contradictions, missing information and calculations that the customer can inspect and use. Quantis supplies the existing financial decision workflow; Predicta supplies research inputs through a governed boundary.

This initial specialization funds and tests the larger platform. Keep public discovery broad enough to be useful, while focusing product development and paid acquisition on one repeatable job. Expansion should follow observed adjacent demand. Leadership in a valuable workflow is a more actionable milestone than a percentage of all global searches.

Recommended decisions are to preserve and reconcile Quantis’s existing Evidence Service, build a bounded research executor, validate a $149 reviewed pilot before a subscription, and operate a daily evaluation and maintenance process. Do not allocate capital to a general web crawler, foundation-model training, or a large permanent agent fleet before proving the underlying demand and economics.

## 2 Evidence and current state

The following distinguishes observations made during this conversation from historical reports and proposals. The live-page inspection was an HTTP and source-code inspection, not a complete interactive or load test. Repository presence does not establish deployed behavior.

| Item | Evidence class | Finding and consequence |
|---|---|---|
| AIWMC.org | Live response and served HTML inspected | Predicta page returns HTTP 200. The script contains six source entries, 48 external search directions, and an Enter action opening Google. |
| Live source identity | Unresolved | Served HTML differs from the inspected Predicta repository. Map deployment project and immutable commit before modifying production. |
| AIWMCX/predicta | Repository inspected | Default branch master contains the v6 prototype, modular source, tests and the September reconciliation document. |
| Quantis Evidence Service | Branch files inspected | feature/evidence-service contains EvidenceProvider and hashed EvidencePacket implementations. Compatibility with current main still requires review. |
| Quantis orchestration | Main-branch file inspected | qoc-orchestrate exists on main. Its current production execution was not tested here. |
| RVCE count of 697 | Historical report only | Appears in the September reconciliation document. No current database count was obtained. |
| Existing test totals | Historical documentation | Previously reported suites were not rerun in this planning pass. |
| Predicta PMF and revenue | Not established | No verified Predicta payment, retention, conversion or production-cost dataset was available. |

The live script has concrete issues to investigate first. English queries appear to request English Wikipedia twice. Clearing input returns before aborting the preceding request. The summary response lacks an explicit generation guard. Provider failures are swallowed while completion is displayed. These are source-level findings requiring regression tests; this document does not claim that every issue was reproduced interactively.

The existing Quantis evidence contract was verified directly. Preserve its provider request fields query, lens and maxResults, its execution context requestId, analysisRunId and timeoutMs, and its SUCCESS, DEGRADED and FAILED outcomes unless a reviewed migration justifies changes. Its result fields already include URL, title, content, publication time, latency and cost. The new public search interface should adapt to these contracts where appropriate, not create a competing financial evidence schema.

## 3 Market and competitive position

Current primary sources show that searching, cited answers, multi-step research and background information agents are already competitive categories. This establishes buyer alternatives, not Predicta demand. Vendor descriptions are evidence of advertised capabilities; they are not independent comparative benchmarks.

| Competitor category | Verified capability | Implication for Predicta |
|---|---|---|
| Google Search | Google describes conversational AI search and information agents [S1] | Broad discovery and recurring monitoring alone are insufficient differentiation. |
| OpenAI | Deep research combines web, files and enabled apps into documented reports [S2] | A long report with citations is already an available alternative. |
| Anthropic | Its research system delegates parallel investigations [S3] | Agent orchestration is a component; task quality and economics determine value. |
| Perplexity | Offers free search and paid research, file and enterprise capabilities [S4] | Free discovery plus paid workflows is credible, but Predicta must prove willingness to switch. |
| Palantir | AIP connects enterprise objects, actions, permissions and evaluation [S5] | Learn from evidence lineage and governed workflows; enterprise operations require much more than public search. |
| Brave and Exa | Supply search and related retrieval capabilities through APIs [S6, S7] | Buy initial coverage through replaceable providers while developing a useful specialized collection. |

Predicta’s proposed differentiation is a persistent relationship between a business question, its evidence, a calculation, a decision and subsequent changes. The user should be able to inspect a number’s original source, understand its scope, see why two observations conflict, and update a previous brief without repeating the whole investigation. This proposition remains a hypothesis until users prefer it and pay for it.

The competitive comparison must include the customer’s existing workflow: ordinary search, spreadsheets, public datasets, their preferred AI subscription, and their own expertise. A product that beats an intentionally weak chatbot demonstration has not established an advantage. Test the entire time to an acceptable deliverable, including verification and corrections.

### Initial customer and job

The primary customer is a consultant or fractional CFO with an active client decision due within 30 days, authority to buy a small research service, and a recurring need to justify external assumptions. A relevant job is: “Prepare evidence for whether a service business should enter a new market, and identify what remains unknown before I build the financial scenarios.”

The buyer supplies the decision, geography, time horizon and assumptions under question. Predicta returns a source-backed evidence pack and a reviewable handoff to Quantis. Public observations are not represented as the client’s actual costs or demand. The customer can decline each proposed assumption and record their own value with a reason.

Small strategy and research boutiques are the next segment to test, especially for recurring competitor or vendor monitoring. General consumers, large regulated enterprises and arbitrary scientific discovery should not compete for the first sprint’s attention. The platform architecture supports expansion; the first offer needs a clear buyer and deliverable.

### Reachable opportunity rather than invented market size

No defensible global TAM has been established in this research. Size the initial opportunity from verified reachable accounts, qualification, purchase and repeat behavior. Deduplicate and requalify the existing CRM; its historic lead count is not a count of current potential buyers.

An illustrative funnel of 100 relevant accounts, 25 substantive conversations, 10 qualified offers and 3 paid pilots would produce $447 at $149 per pilot. These are test assumptions, not a forecast or industry conversion benchmark. Record denominators, exclusions and dates so actual results can replace every assumption.

At a hypothetical $99 monthly price, 100 retained paying accounts correspond to $9,900 MRR and $118,800 annualized recurring revenue; 500 correspond to $49,500 MRR and $594,000 annualized revenue. Neither figure establishes attainable demand, retention or profit. The practical sizing question is how many accounts one repeatable channel can acquire and retain at positive contribution.

## 4 Product modes and experience

Use one product with three explicit modes. Simple searches should not pay the cost of a research team. The interface should show when a request becomes a longer, metered investigation and let the user cancel it.

| Mode | User receives | Initial proposed execution bound |
|---|---|---|
| Search | Ranked source links, snippets, dates where known and source filters | Cache or owned index first; at most two external providers; no mandatory language-model call |
| Answer | Short synthesis with inspectable supporting passages and gaps | Search plus one composer and validation; at most one follow-up retrieval round |
| Research | Saved evidence pack, comparison or dataset with reproducible calculations | Durable job; at most three concurrent specialist workers; initial maximum 12 task nodes and bounded verifier work |

These are initial policies to measure and tune. They are not statements of maximum long-term capacity. A thousand concurrent investigations means aggregate capacity across customers, not a thousand agent calls on every question.

Search results must open the original source, while Enter submits the query inside Predicta. External search engines can remain an explicit fallback. Provide query filters for language, geography, date and source class; mark filters that a provider cannot honor. A snippet or autocomplete suggestion is not a verified answer.

Use separate timestamps for publication, observation period, retrieval and last verification. Display uncertainty in ordinary language such as “No directly comparable source found” or “These sources cover different populations.” Show partial results if a provider fails and state the missing coverage.

Public search should work without an account within fair-use limits. Require an account for saved research, private uploads, monitoring and paid usage. Public query URLs may be shareable; private requests use opaque workspace IDs and must not place sensitive query text in the URL, analytics or referrer headers. Sharing private work requires an explicit publish action and preview.

Design for mobile, keyboard and screen-reader use. Acceptance includes visible focus, correctly announced result counts, stable keyboard selection, meaningful link text, usable contrast, reduced-motion support and a layout that works at 320 CSS pixels. Build language support explicitly: launch with tested English and Russian behavior, accept other scripts, and label coverage limits rather than silently treating all non-Cyrillic text as English.

### First paid workflow

Intake asks for one decision, one geography, the relevant period, up to five assumptions, allowed sources, prohibited private details and the deadline. The initial pack covers up to five research questions with a fixed effort allowance. It contains a short decision context, evidence table, contradictions and gaps, reproducible transformations, and questions the customer must answer from their own business.

For example, a consultant considering a new location might investigate public wage observations, relevant population trends and competitors’ published services. Predicta must distinguish those public observations from the client’s actual staffing plan, achievable price and capacity. Quantis then models customer-approved assumptions. A numerical recommendation requires explicit reasoning and cannot be inferred merely because a public number exists.

The pack is usable when the customer can cite it, correct it, export it and revisit it. Export Markdown and CSV first; add DOCX or PDF when pilot buyers need them. A source appendix must travel with every export. Include the run ID and version so a later refresh does not silently rewrite the original record.

## 5 System architecture

Start with a modular application, a relational database, object storage and a durable queue with a worker process. Define strong module contracts before introducing separate services. A graph database, distributed search cluster or multi-cloud topology should follow a demonstrated bottleneck.

The request path is browser to gateway, then retrieval or job scheduling, then evidence and computation, then validation and presentation. The policy layer checks identity, allowed tools, data scope and remaining budget before every external call. Search can return immediately; longer research returns a job ID and streams progress.

| Component | Responsibility | Stored output |
|---|---|---|
| Query gateway | Validate input, classify intent and sensitivity, establish quotas and request ID | Redacted request metadata and policy version |
| Retrieval broker | Route queries, apply provider deadlines, normalize results, retain provenance | Search results and provider outcomes |
| Evidence repository | Version sources and passages; connect claims and contradictions | Sources, spans, observations and claim links |
| Job scheduler | Enforce task dependencies, concurrency, deadlines and reserved budgets | Job and task state transitions |
| Analytical worker | Execute bounded extraction, comparison and research tasks | Structured artifacts with evidence references |
| Computation worker | Run restricted deterministic transformations | Calculation records and output datasets |
| Verifier and composer | Check support and numerical compatibility; render qualified findings | Reviewed answer or partial report |
| Evaluation and operations | Measure outcomes, reliability, expense and release changes | Evaluation runs, traces and change records |

Keep public retrieval identity separate from private workspace identity. Publicly reusable material may enter a shared collection only after rights and sensitivity checks. Private source documents, embeddings, extracted passages and answer caches remain tenant-scoped. A public query can use common infrastructure without granting access to private customer content.

Choose the initial hosting path after mapping AIWMC.org’s actual deployment. Existing AIWMC infrastructure can reduce operational work, but the site’s Cloudflare response is not sufficient evidence of its build source. Record canonical repository, branch, build command, deployment project, artifact digest, deployed commit and rollback target.

### Reconcile Quantis before integration

Inspect the Evidence Service branch against current main in an isolated checkout. Inventory reusable contracts, dependencies, test suites and migrations. Identify how System A retrieval relates to System B orchestration and System C RVCE validation. Record one owner for each responsibility; do not merge a stale branch wholesale merely because its design is useful.

Reuse compatible provider, packet, privacy, freshness and numerical checks through small reviewed changes. The Quantis deterministic financial engine remains the authority for model calculations. Predicta’s public search service should not become a parallel financial engine or receive unrestricted access to Quantis databases.

Start with a preview or shadow handoff: Predicta supplies candidate evidence, Quantis validates its schema and renders an import preview. The user sees proposed fields and accepts them individually. A hash verifies packet integrity, not the truth of a claim. Any later load-bearing activation must satisfy the existing Quantis charter and release controls after those are read and reconciled.

## 6 Retrieval and owned search

Begin with licensed or otherwise permitted provider access for broad coverage and a small curated collection for the paid workflow. The World Bank documents an Indicators API, and the SEC documents APIs for filing data [S8, S9]. They are candidate structured sources, not evidence that every required business benchmark is available or comparable.

Maintain a provider registry containing capabilities, permitted uses, credentials reference, rate limit, timeout, cost estimator, supported geography/language, freshness behavior and health status. Distinguish unavailable credentials, invalid requests, rate limits, zero results, source changes and upstream failure. An error response must never be converted to a plausible-looking empty dataset.

Route by intent. Exact identifiers and names favor lexical matching; conceptual questions may benefit from semantic retrieval; numerical questions require datasets with compatible metadata. Retrieve only the fields needed. Normalize canonical URLs and detect duplicates while retaining source lineage. Two sites repeating the same original report do not constitute independent evidence.

Start with lexical retrieval over the small owned collection. Evaluate a hybrid candidate list using rank fusion only after a labeled test set exists. A proposed reciprocal rank fusion score is the sum, across retrieval lists, of 1 divided by 60 plus the item’s rank. The constant 60 is an initial parameter to evaluate, not an established optimum for Predicta. Rerank a bounded candidate set against task relevance, source quality, temporal fit and scope compatibility.

Do not interpret ranking scores as truth probabilities. Source authority, relevance and factual support are different dimensions. Preserve dissenting evidence even when it ranks below a more convenient result. Measure retrieval quality on judged queries using nDCG at 10, recall against the judged source pool, source diversity and freshness; acknowledge that the judged pool is not the whole web.

Cache keys include normalized query, language, geography, time filters, source policy, schema version and visibility scope. Add tenant and access-policy versions for private results. A permissions change must invalidate relevant cached access. Cache expiration is source-specific: current prices, historical indicators and timeless definitions require different policies. Cached results retain their actual retrieval time and stale status.

Future indexing follows demand. Admit a source only after checking usefulness, reuse constraints, extraction quality, refresh cost and deletion handling. A crawler requires per-domain limits, robots handling, redirect and network safeguards, page-size limits and a controlled frontier. Start with selected collections; do not equate the number of stored pages with search quality. Public accessibility does not by itself establish permission to redistribute content or train a model on it.

### Index expansion gate

Expand a collection when at least ten real qualified tasks expose the same coverage gap, an admitted source can address it, and a measured comparison shows better accepted results or lower cost. This is a proposed planning threshold, not a statistical proof. Record why each collection exists and when it should be retired.

## 7 Research execution and specialist roles

The orchestrator creates a directed acyclic graph of tasks: classify, plan, retrieve independent branches, extract, calculate, verify, compose and persist. Dependencies determine which work can run concurrently. A scheduler enforces constraints independently of the model. Agents can request more work; they cannot authorize their own spending or access changes.

| Role | Work product | Independence or control |
|---|---|---|
| Planner | Questions, dependencies and stopping conditions | Cannot exceed scheduler policy |
| Retrieval specialist | Candidate sources and coverage gaps | Uses approved sources and tools |
| Data engineer | Parsed tables and typed observations | Rejects malformed or ambiguous fields |
| Analyst | Comparisons and calculations | Uses versioned deterministic functions |
| Contradiction reviewer | Conflicting observations and alternative explanations | Searches for disconfirming evidence |
| Verifier | Claim support and numerical compatibility decisions | Reads original spans, not only summaries |
| Editor | Clear answer with qualifications | Cannot manufacture support or remove material caveats |

Roles are responsibilities, not mandatory separate model calls. A simple task may use one worker and deterministic validation. Use separate reasoning workers when questions genuinely separate or independent verification changes the result. Model agreement on the same inadequate evidence is not independent confirmation.

Anthropic’s engineering account describes improved performance on an internal research evaluation alongside much higher token use for multi-agent work [S3]. It supports testing parallel research where the task warrants it; it does not establish that Predicta will achieve the same improvement or economics.

Each task records task_id, job_id, dependencies, input schema, output schema, model and prompt versions, allowed tools, data scope, deadline, retry allowance, token allowance and monetary allowance. Pass artifact references between workers rather than repeatedly copying full conversations. Store concise decision records and tool traces; private model reasoning is not required for auditability.

Use durable states: queued, running, waiting, succeeded, partial, failed, canceled and expired. Acquire work through leases with heartbeat and stale-lease recovery. At-least-once execution requires idempotent writes and deduplicated provider results; do not promise exactly-once external execution. Cancellation propagates to queued tasks and abortable requests, while the ledger records already incurred costs.

Reserve the worst-case permitted cost before launching parallel tasks. Settle the reservation against actual provider usage afterward. Deny new work when the remaining allowance cannot cover it. Unknown final usage stays reserved until reconciled. Retries consume the same job budget; provider failure cannot trigger unlimited fallback calls.

Initial research bounds are three concurrent workers, 12 task nodes, a 180-second interactive execution deadline and a $2 external-compute reservation. Return a useful partial result when the bound is reached. More expensive work requires an explicit paid tier or revised scope. These proposed defaults require load and quality tests before release.

## 8 Data contracts and evidence integrity

The objects below define required information, not a second implementation of Quantis’s existing packet. Map them to its authoritative types during reconciliation. Version schemas and reject unknown critical fields rather than silently coercing incompatible data.

| Object | Required information |
|---|---|
| SourceRecord | source_id, canonical_url, publisher, title, language, published_at nullable, retrieved_at, content_hash, parser_version, storage reference, rights metadata, retrieval status |
| EvidenceSpan | evidence_id, source_id, source version, page or paragraph or table-cell locator, permitted excerpt, extraction method and quality |
| ClaimRecord | claim_id, text, type, supporting and contradicting evidence IDs, status, verification method and timestamp |
| NumericObservation | decimal value, unit, scale, currency if applicable, period, geography, population, denominator when relevant, nominal or real basis, revision vintage and evidence ID |
| CalculationRecord | function or code hash, input IDs, transformations, rounding policy, result, runtime and library versions |
| ResearchArtifact | run ID, version, question, scope, sources, claims, calculations, gaps, review status and export references |

Claims are typed as observed, calculated, inferred or user-provided. Status is supported, conflicting, insufficient or stale. Do not display unexplained confidence percentages. Unknown publication time stays unknown; retrieval time is not publication time. Every numerical transformation preserves the original observation.

Financial compatibility checks must distinguish currency, nominal versus real values, annual versus monthly periods, stocks versus flows, totals versus per-capita values, percentages versus percentage points, and non-overlapping populations. Missing is not zero. A source estimate remains an estimate. Currency conversions record the exchange-rate source and date; inflation adjustments record the base year and series.

Use decimal arithmetic and explicit rounding for financial values. Code execution runs in an isolated environment with limited CPU, memory, duration and filesystem access. Disable network access by default for calculations. Accept an allowlisted set of analytical functions before accepting arbitrary generated programs. Spreadsheet exports must neutralize formula injection in source text.

Evidence validation checks that the cited passage actually supports the claim, not merely that a URL exists. A source hash detects content changes; it does not prove accuracy. Where full snapshots are not permitted, preserve allowed excerpts, locators and metadata and disclose limits on later reproduction. Version updates instead of replacing historical evidence invisibly.

### Proposed public and workspace interfaces

POST /v1/search accepts query, mode, locale, geography, time filters and optional workspace reference. The server derives the actual quota and permissions from identity; it must ignore attempts to supply a higher client budget. The response includes results, source outcomes, partial status, retrieval time and request ID.

POST /v1/research/jobs accepts a question, scope, approved source policy and an idempotency key. It returns HTTP 202 with job_id, state and allowance. GET /v1/research/jobs/{id} returns authorized progress and artifacts. POST /v1/research/jobs/{id}/cancel requests cancellation. A server-sent event stream can expose progress without exposing internal prompts or private tool credentials.

POST /v1/evidence/import-preview is a proposed authenticated integration boundary. Quantis validates packet integrity, schema and tenant authorization and returns candidate mappings and rejection reasons. Acceptance creates a versioned reference and customer action record. It does not directly mutate canonical financial assumptions from a public search response.

Use explicit error codes for invalid input, insufficient evidence, provider unavailable, quota exhausted, permission denied, canceled and expired. Return a retry indication only when a retry is appropriate. A partial result remains visibly partial in UI, API and exports.

## 9 Privacy and security requirements

Treat source pages, PDFs, tool results and uploaded documents as untrusted content. Their text cannot grant permissions, change budgets, reveal secrets or issue system instructions. Keep tool capabilities outside retrieved content and restrict outbound actions to the approved workflow.

The fetcher must block private and local network destinations, metadata endpoints, unsafe schemes and disallowed ports. Validate resolved addresses and every redirect at connection time to address DNS rebinding. Limit response size, decompression, redirects and parsing duration. Browser CORS is not a server-side security control. Credentials stay on the server and never appear in model context unless the specific tool requires a scoped reference.

Enforce authorization at every database query, artifact fetch, vector retrieval and job endpoint. Test that identical queries from two tenants cannot expose shared private results. Delete or revoke private data consistently across documents, derived passages, embeddings, caches and exports under the configured retention policy. Backups need a documented retention and deletion lifecycle as well.

Draft retention defaults for review are seven days for minimized operational traces, 30 days for opted-in diagnostic samples, and workspace-controlled retention for saved research. These are proposed product defaults, not a claim of legal compliance. Do not store raw confidential query text in general analytics. Default private uploads and customer evidence out of model training and public benchmark publication.

Apply rate limits by account, workload and infrastructure signals with a fair recovery path; a shared IP must not automatically block a whole school or office. Quotas protect legitimate access as well as expense. Use a global circuit breaker and separate free and paid queues so a public traffic spike does not starve paid work.

Customer data cannot become Research Foundation training material or public research by default. Require explicit permission, a defined purpose, suitable rights and a separate de-identification review. Synthetic records must remain labeled synthetic. A private customer correction may improve that workspace without becoming shared training data.

## 10 Daily improvement and growth

Daily self-improvement means the system performs useful maintenance, measures failures and proposes tested changes. It does not guarantee that performance improves every day. When evidence is weak, keeping the current version is the correct outcome.

Use four separate loops. The evidence loop refreshes permitted sources and tracks revisions. The quality loop converts consented failures into reviewed test cases. The cost loop measures routing, cache and model choices against accepted outcomes. The business loop studies actual activation, repeat use and paid conversion. These loops share measurements but must not certify one another’s success automatically.

| Daily operation | Proposed automation | Release boundary |
|---|---|---|
| Source health and freshness | Check admitted feeds and refresh due public records | Automatic within existing source and spending policies |
| Failure triage | Group minimized errors and source drift | Human review before adding sensitive examples |
| Evaluation maintenance | Propose labeled cases from reviewed failures | Labels verified; holdout kept separate |
| Candidate improvements | Suggest routing, ranking or prompt changes | Offline evaluation before exposure |
| Release comparison | Compare quality, cost and latency with baseline | Human approval initially; bounded canary later |
| Commercial review | Report qualified activation, repeat tasks and payments | Real customer evidence only |

Keep a fixed regression suite, a development set and an isolated holdout. The improving agent must not see holdout answers or certify its own output as ground truth. Record benchmark contamination and retire leaked cases. Automated judges need calibration against human judgments; use independent calculation checks for numerical tasks. Agent evaluation should test completed outcomes and repeated trials, as discussed in Anthropic’s evaluation guidance [S10].

Initially allow automatic index refresh and approved maintenance, but require review of behavioral changes. Later automate only narrowly defined updates that pass validated gates. Canary releases must track cost, errors and quality samples, keep jobs pinned to their starting version, and support rollback without corrupting artifacts. Low traffic may be insufficient for a meaningful A/B test; do not label a tiny fluctuation a win.

Daily operational targets are candidate observations and verified fixes, not a quota of new pages or features. Never publish generated findings simply to create SEO volume. Do not train a model on unverified generated answers and then cite those answers as independent evidence.

### Growth mechanisms to test

Shareable public evidence pages may bring a recipient into a useful search workflow; measure recipient activation, not shares alone. Saved investigations and updates may create repeat use; measure whether changes actually matter to the customer. Consultant exports may introduce Predicta to client teams; make attribution optional and preserve confidentiality. Reviewed Research Foundation demonstrations may earn relevant traffic; publish methodology and limits. Quantis integration may improve completion of a financial task; measure accepted evidence imports and completed analyses.

Each mechanism is a hypothesis. Track whether additional users improve source coverage or product decisions with consent. More usage does not automatically create a network effect. Durable advantage would come from a valuable, maintained evidence collection, customer workflow fit, validated evaluations and reliable delivery. API wrappers and unbounded agent counts are easy for competitors to reproduce.

This specification does not activate scheduled jobs, outreach, publishing or autonomous deployment. Those require an implemented scheduler, operational budget and verified release process.

## 11 Measurement and evaluation

The primary product measure is accepted useful tasks per active account, with quality and contribution constraints. A task is accepted when the user confirms the result is usable and a quality check finds no unresolved material issue. Keep automated acceptance, founder approval and customer acceptance as separate events.

Instrument search_submitted, results_shown, source_opened, research_started, research_completed, evidence_accepted, export_created, paid_offer_presented, payment_succeeded, repeat_payment and subscription_canceled. Store event ID, timestamp, pseudonymous account or session, cohort, mode, run ID, version and cost reference. Collect raw query content only under the appropriate workspace or explicit diagnostic policy. Deduplicate events by ID and reconcile payment events to the payment system; a checkout click is not revenue.

The commercial funnel is qualified visit, useful search, accepted research task, scoped paid offer, successful payment and repeat use. Measure conversion within stated windows and segment by acquisition channel and job type. A person using public search once is not an activated consulting customer. Define consulting activation as completing a real evidence task and accepting or exporting it for current work within seven days of signup. Confirm actual use in pilot follow-up; export alone is only a behavioral proxy.

Define a material error as a mistake that changes the relevant conclusion, comparability, calculation or customer action. A small formatting issue is not equivalent to an incorrect period or invented source. Record severity, discovery time, correction time and affected artifacts.

| Metric | Definition | Initial proposed gate |
|---|---|---|
| Citation support precision | Supported checked claim-citation pairs divided by all checked pairs | At least 95 percent on 100 human-checked pairs, plus zero unresolved critical errors |
| Claim coverage | Material factual claims with adequate support divided by all material factual claims | Every material claim supported or explicitly marked inferred or insufficient |
| Numeric compatibility | Passes on defined unit, period, currency and denominator fixtures | All critical fixtures pass |
| Search usefulness | Human judgment on representative result sets | Improve against current Predicta and chosen alternatives |
| Research acceptance | Delivered jobs accepted for actual work divided by delivered eligible jobs | At least 3 of first 5 paid pilot packs used in real work |
| Cost per accepted job | All successful and failed job expense divided by accepted jobs | Fits the paid offer and stated free subsidy |
| Repeat purchase | Customers paying for another eligible task | At least 2 early repeats before subscription expansion |
| Reliability | Completed or honestly partial jobs, errors and recoveries by mode | No silent success on failed or corrupted work |

These thresholds are proposed release and learning gates. A 95-of-100 citation result is not a guarantee of 95 percent population accuracy; its approximate 95 percent Wilson interval is 88.8 to 97.8 percent. Sample across source types and difficulty, record the denominator, and report failures. Zero observed security failures is also not proof of universal security.

Start with 50 representative tasks: 10 navigation, 10 factual lookup, 10 numerical research, 5 comparisons, 5 multilingual, 5 insufficient-or-conflicting-evidence and 5 adversarial-source tasks. Add programmatic timeout, cancellation, retry, budget, tenant-isolation and corrupted-input tests. Grow to a 200-case suite as actual failure modes justify it. Run at least three trials for stochastic high-risk cases.

Compare against the customer’s current workflow and at least one credible research tool on the same brief, available sources and time budget. Blind the evaluator where possible. Measure time to an acceptable result including corrections, direct expense, unsupported claims and critical omissions. A proposed commercial benchmark is at least 30 percent less total completion time on the selected workflow with no increase in material error rate. It is a target to test, not a sales claim.

Initial engineering objectives are p95 under 3 seconds for uncached Search, under 12 seconds for Answer, and under 180 seconds for the bounded Research run. Report geography, network, load, warm versus cold cache and provider contribution. Load-test a proposed initial envelope of 10 search requests per second and 5 simultaneous research jobs. Do not advertise these objectives until measured.

Before paid self-service, target 99.5 percent monthly request availability for the defined service boundary, excluding customer cancellation but including provider-dependent failures. Establish the actual baseline first. Recovery objectives of 24-hour maximum data loss and four-hour restoration are initial proposals for noncritical saved artifacts; test restore and tighten them if customer needs require it. No contractual SLA is established here.

## 12 Early payment and product market fit

Offer one clearly scoped reviewed pilot at a proposed $149 upfront. Include up to five assumptions, one geography, one decision brief, a source appendix and one correction round. Offer delivery within two business days only when capacity is available and confirmed. Disclose founder review and agree scope before charging. Define a remedy if the agreed deliverable cannot be produced; do not sell guaranteed business conclusions.

Keep this offer distinct from existing Quantis financial-review products. Predicta researches external evidence; a Quantis engagement may include financial modeling and decision review. Do not silently change Quantis pricing or create confusing overlapping checkout products. Record pilot revenue as reviewed service revenue until repeatable self-service use is demonstrated.

| Period | Action | Evidence to retain |
|---|---|---|
| Days 1 and 2 | Prepare one labeled demonstration and qualify a deduplicated target list | Example pack, qualification criteria, actual contact permissions |
| Days 3 to 5 | Conduct ten problem interviews and examine recent work | Trigger, current workflow, time, rework, deadline and budget owner |
| Days 4 to 10 | Present the same scoped paid offer to ten qualified buyers | Offer date, price, response, objection and payment status |
| Days 6 to 12 | Deliver three to five paid pilots if sold | Costs, founder minutes, corrections and actual customer use |
| Days 10 to 14 | Ask for a second paid task or an appropriate recurring plan | Repeat payment, reason for return or reason for refusal |

Ask about the last real task before describing features. Useful questions are: What decision was due? What did you search for? Which number did you not trust? How did you verify it? What was the consequence of delay or error? Who could approve a small purchase? Ask to inspect a redacted recent artifact. Compliments, survey interest and free signups are weaker evidence than actual work and payment.

The proposed problem gate is at least 6 of 10 qualified interviewees showing a recent relevant problem. The payment gate is at least 3 unrelated paying customers from at least 10 qualified offers. The usefulness gate is at least 3 of 5 delivered packs used in client work; if only three are delivered, report 3 of 3 rather than silently using a denominator of five. The recurrence gate is two repeat paid orders or genuine subscriptions.

Zero purchases after ten qualified offers should trigger a diagnosis of audience, urgency, trust, price and deliverable, followed by a revised experiment. It does not mathematically prove no market. Repeated rejection because existing tools solve the same job is a reason to narrow or change the proposition before building more infrastructure.

Stronger PMF evidence requires multiple cohorts, repeated payments, task-level retention and acquisition beyond the founder’s personal persuasion. After at least 30 paying accounts across three cohorts, inspect eight-week task retention and renewal by customer type. A proposed directional target is at least half continuing the relevant paid workflow after eight weeks, adjusted for the natural frequency of the job. Report raw counts and cancellation reasons; do not promote this threshold as a universal definition of PMF.

A provisional $99 monthly workspace could include two bounded evidence packs and one monitored topic with weekly checks of up to five admitted source pages. Test it only after delivery costs and review time fit the allowance. Initially offer repeated $149 packs if the service still requires substantial manual work. Later paid features may include team permissions, private sources, more monitoring and metered API access.

## 13 Unit economics and free access

Free access needs an explicit subsidy and workload limit. The verified Brave Search price is $5 per 1,000 requests at the time of research [S6]. One million uncached single-call searches therefore cost $5,000 for retrieval alone. This excludes synthesis, fetching, storage, operations and support. Provider credits are introductory or limited benefits, not the foundation of a permanent free service.

Use cost per accepted outcome as the operating measure. Add input-token cost, output-token cost, retrieval calls, fetch and compute cost, retries, delivery labor and support. Include failed jobs in the numerator. Measure payment fees, refunds and acquisition expense separately so revenue does not disguise losses.

The following search scenarios are illustrative. The provider rate is verified; hit rates, call counts and $0.0002 other variable cost per request are assumptions. Caching is only available where applicable rights and provider terms permit it. There is no language-model synthesis in these Search-mode scenarios.

| Scenario | Cache hit rate | Calls per miss | Cost per request | Cost per 100000 requests |
|---|---|---|---|---|
| Efficient | 90 percent | 1 | $0.0007 | $70 |
| Planning case | 60 percent | 1 | $0.0022 | $220 |
| Stress | 20 percent | 3 | $0.0122 | $1220 |

Calculation: variable cost per request equals one minus hit rate, multiplied by provider calls per miss, multiplied by $0.005, plus $0.0002. At an illustrative $100 monthly variable-cost cap, these cases support about 142,857, 45,454 and 8,196 requests respectively. Fixed hosting and labor are additional. No spending authorization or purchased capacity is implied.

Research cost assumptions below use $3 per million input tokens and $15 per million output tokens as modeling inputs, not a quote for any selected model. The actual model and its contracted rates must replace them. Review labor is valued at an illustrative $25 per hour. A $149 payment uses an illustrative fee of 3 percent plus $0.30, not a verified payment-provider tariff.

| Cost component per pilot | Efficient | Planning case | Stress |
|---|---|---|---|
| Input tokens | 20000 | 60000 | 400000 |
| Output tokens | 4000 | 12000 | 60000 |
| Retrieval calls | 4 | 12 | 80 |
| Fetch and compute allowance | $0.02 | $0.04 | $0.20 |
| Retry allowance | $0.02 | $0.14 | $0.30 |
| Total machine expense | $0.18 | $0.60 | $3.00 |
| Human review minutes | 10 | 30 | 120 |
| Human review expense | $4.17 | $12.50 | $50.00 |
| Payment fee assumption | $4.77 | $4.77 | $4.77 |
| Other variable delivery allowance | $2.00 | $2.00 | $2.00 |
| Contribution before acquisition and fixed costs | $137.88 | $129.13 | $89.23 |

The stress case exceeds the proposed $2 automated research reservation and therefore requires a separately approved allowance, shorter scope or a partial result. Human delivery may still be expensive even when model calls are cheap. Two founder hours spent acquiring one pilot add $50 of imputed acquisition labor at the assumed rate; planning-case contribution then falls to $79.13 before fixed costs and taxes. Record actual labor instead of using these assumptions as achieved margins.

For the proposed $99 subscription, an illustrative month with two $0.60 machine runs, ten review minutes per pack, $2 monitoring expense, $3.27 payment fees, $5 support and $1 storage produces about $20.80 variable cost and $78.20 contribution. This roughly 79 percent margin depends on the assumptions. Do not sell the allowance if measured review effort, retries or support exceed it. Set a proposed minimum 70 percent contribution after variable delivery costs before expanding self-service.

If 10 percent of a target $69.30 contribution on a $99 account funds free search, $6.93 supports approximately 3,150 planning-case searches. One hundred such paid accounts would fund about 315,000 searches at those assumptions. This is a subsidy illustration, not a traffic or revenue forecast. Set both absolute and revenue-linked caps; grants or sponsorship can add capacity only after funding is secured.

The monetization sequence is paid reviewed work, bounded recurring workspace, team controls, then metered API. Avoid unlimited research promises. Keep any future advertising clearly labeled and separate from evidence ranking; customer trust is part of the product’s value. Selling private query histories is not part of this plan.

## 14 Implementation backlog and release gates

The following work packages are ordered by dependency. The founder owns prioritization and commercial acceptance. Engineering, security, research-quality and operations are named responsibilities; they do not imply that AIWMC currently employs separate teams.

| ID | Work package | Completion evidence |
|---|---|---|
| P01 | Map live source and deployment | Canonical repository and commit linked to live artifact; documented rollback |
| P02 | Audit existing Quantis evidence branch | Responsibility map, migration review and minimal reuse proposal |
| P03 | Repair current search lifecycle | Tests for clearing input, stale responses, duplicate sources and failures |
| P04 | Internal search results | Enter stays in Predicta; original source links, filters and partial status work |
| P05 | Provider broker and budgets | Per-call deadlines, rate limits, cost reservations and failure tests |
| P06 | Evidence records and export | Traceable claims and source versions; valid CSV and Markdown exports |
| P07 | Numerical validation | Critical unit, period, scale and calculation fixtures pass |
| P08 | Reviewed paid pilot | Real payment, scoped delivery and recorded customer use |
| P09 | Durable research jobs | Cancellation, restart recovery, idempotency and quota enforcement verified |
| P10 | Quantis import preview | Authorized candidate mapping; no silent assumption replacement |
| P11 | Monitoring and change reports | Versioned changes, suppression of duplicate alerts and reviewable updates |
| P12 | Evaluation and daily maintenance | Held-out comparisons, source-health checks and rollback procedure |
| P13 | Self-service recurring plan | Retention, contribution, support and security gates satisfied |

The first ten engineering days should emphasize P01 through P07 and the minimum job persistence required to deliver pilots. P08 runs commercially in parallel. The full research executor, broad integrations and generalized monitoring should follow evidence from those pilots. Days are working-day planning units, not a promised delivery date; source access, branch divergence and founder capacity can change the sequence.

### Proposed 90 day sequence

Days 1 to 14 establish source truth, interview buyers, sell and deliver supervised pilots, and fix the search path. The exit decision depends on payments, utility and actual effort. A polished interface without paid evidence does not satisfy the commercial gate.

Days 15 to 30 automate the repeated parts of successful packs, add versioned evidence and export, and validate the Quantis import preview. Target a small cohort of paying accounts rather than a broad launch. Pause expansion if customer use or numerical quality is weak.

Days 31 to 60 add durable research, bounded specialists, narrow monitoring and a recurring plan if the economics support it. Measure repeat use, cancellation reasons and support time. Build the daily evaluation process before allowing automatic behavioral changes.

Days 61 to 90 improve the strongest acquisition channel, test the next adjacent workflow, and expand only the collections that address measured demand. Infrastructure scaling follows queue latency, actual concurrency and expense. A failed PMF test should change the roadmap, not merely extend it.

### Longer term capability gates

After sustained repeat use, build a richer evidence graph connecting entities, observations, calculations and decisions. Add customer-authorized private connectors and team review. Later, evaluate metered APIs, partner integrations and multilingual collections. Each extension needs a validated customer job, source rights, operational ownership and a cost model.

Large-scale research capacity requires load evidence. By Little’s Law, average concurrent jobs equal arrivals per second multiplied by average job duration. One research job per second lasting 120 seconds implies 120 concurrent jobs; three active workers each could imply 360 worker slots. Eight such jobs per second imply 960 jobs and up to 2,880 slots. These are illustrative capacity calculations, not demonstrated capability, and actual worker occupancy may be lower.

A foundation model, general web index or autonomous scientific-discovery program belongs behind separate investment gates: unique rights-cleared data, a measured deficit that existing models cannot solve economically, sufficient capital, domain evaluation and sustained customer demand. The long-term vision remains broad; funding these systems requires evidence.

## 15 Review by discipline

These are planning reviews, not certifications, penetration-test results or a completed code audit. Market and architecture received separate agent reviews. The economics review was completed in the main synthesis after a partial independent review. All numerical scenarios are explicit assumptions checked arithmetically.

| Discipline | Finding | Severity | Release requirement |
|---|---|---|---|
| Product | Broad intelligence is not a specific first purchase | P0 commercial | One repeatable paid job and proof of actual use |
| Engineering | Live site and repository differ | P0 release | Traceable source-to-deployment mapping |
| Architecture | Three evidence-related systems already exist in Quantis | P0 integration | Assign responsibilities and reuse compatible contracts |
| Financial correctness | Public observations can be misapplied to client assumptions | P0 integration | Typed metadata, deterministic checks and explicit acceptance |
| Security | Private content could enter shared retrieval or logs | P0 private release | Tenant-isolation tests and reviewed data flow |
| Operations | Parallel agents can exceed budgets or repeat work | P0 autonomous release | Reservations, idempotency, deadlines and cancellation |
| Research quality | Citations and model agreement can conceal weak support | P1 | Passage-level checking and contradiction review |
| Economics | Free usage has a nonzero cost curve | P0 scale | Metering, subsidy cap and measured contribution |
| Growth | Generated content and clicks may be mistaken for demand | P1 | Customer acceptance, repeat purchases and cohort tracking |
| Accessibility | Current language and interaction assumptions limit reach | P1 public release | Keyboard, screen-reader, mobile and language checks |
| Data governance | Indexing and training permissions differ | P1 collection release | Source-level rights and retention decisions |
| Evaluation | A self-modifying judge can certify its own regressions | P0 autonomous release | Isolated holdout, human calibration and rollback |

P0 means the relevant release or expansion must wait until the condition is resolved. It does not mean all research and commercial validation must stop. For example, a reviewed public-source pilot can proceed while private workspace integration is being secured.

The most important unresolved assumptions are whether buyers face this problem frequently, whether a structured pack improves their actual work, whether they will pay twice, whether review labor falls with repetition, and whether the canonical production source can be established. These should receive more attention than the number of agents or providers.

## 16 Engineering handoff

Use this document as a proposed implementation contract. Begin by recording repository state, deployment linkage and relevant local instructions. Preserve uncommitted work and inspect the existing evidence implementation before designing a replacement. Work in an isolated branch, with small changes that can be tested and rolled back.

The first deliverable is a functioning internal search flow with bounded retrieval, honest source status and stale-response protection. The second is one reviewed evidence-pack workflow with traceable numerical observations and exports. The third is a Quantis import preview that validates existing packet contracts. Only then expand worker orchestration and scheduled monitoring based on measured demand.

Every completed work package must report the exact code revision, tested behavior, observed result, remaining limitation and production status. Separate code-complete, test-passed, deployed and live-verified states. A merge is not a live verification. A successful demo is not PMF. A generated evaluation answer is not ground truth.

No implementation, paid offer, subscription, scheduler or production change was activated by creating this specification. The document defines what to build, how to test it, what to sell first and what evidence should authorize the next stage.

## 17 Source register

Public sources were retrieved on 18 October 2026. Recheck prices, availability and terms before implementation or procurement. Source descriptions below are deliberately narrow. Most of this document consists of proposed product and engineering decisions, not claims made by these sources.

- [S1] Google. A new era for AI Search. 19 May 2026. Official product announcement covering AI search and information agents. https://blog.google/products-and-platforms/products/search/search-io-2026/
- [S2] OpenAI. Deep research in ChatGPT. Official help documentation describing web, file and enabled-app research with documented reports. https://help.openai.com/en/articles/10500283-deep-research-in-chatgpt
- [S3] Anthropic. How we built our multi-agent research system. 13 June 2025. Historical engineering account; vendor-specific evaluation findings must not be presented as Predicta performance. https://www.anthropic.com/engineering/multi-agent-research-system
- [S4] Perplexity. Which Perplexity Subscription Plan is right for you. Official plan description confirming free, paid and enterprise categories. Exact consumer pricing is not used in this plan. https://www.perplexity.ai/help-center/en/articles/11187416-which-perplexity-subscription-plan-is-right-for-you
- [S5] Palantir. AIP architecture. Official architecture documentation for enterprise data, Ontology, governance, evaluation and applications. https://www.palantir.com/docs/foundry/architecture-center/aip-architecture
- [S6] Brave Search API. Pricing. Search listed at $5 per 1,000 requests when retrieved. All financial calculations here identify additional assumptions separately. https://api-dashboard.search.brave.com/documentation/pricing
- [S7] Exa. API pricing. Official description of search and related retrieval offerings. Provider selection requires a separate task-level comparison and current terms review. https://exa.ai/pricing
- [S8] World Bank. About the Indicators API Documentation. Candidate structured-data source; availability is not evidence of suitability for every business assumption. https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation
- [S9] US Securities and Exchange Commission. EDGAR Application Programming Interfaces. Candidate filing-data source. https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- [S10] Anthropic. Demystifying evals for AI agents. 9 January 2026. Guidance on outcome evaluation, trials and calibrated graders. https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
- [R1] AIWMCX/predicta README and reconciliation document, inspected in this conversation. Historical report dated 4 September 2026. https://github.com/AIWMCX/predicta/blob/master/docs/PHASE3-QUANTIS-RECONCILIATION.md
- [R2] Quantis EvidenceProvider contract, inspected on feature/evidence-service. https://github.com/AIWMCX/aiwmcquantis/blob/feature/evidence-service/supabase/functions/_shared/evidence/provider.ts
- [R3] Quantis EvidencePacket construction, inspected on feature/evidence-service. https://github.com/AIWMCX/aiwmcquantis/blob/feature/evidence-service/supabase/functions/_shared/evidence/packet.ts
- [R4] Quantis qoc-orchestrate entry point, inspected on main. https://github.com/AIWMCX/aiwmcquantis/blob/main/supabase/functions/qoc-orchestrate/index.ts
- [R5] AIWMC.org HTTP response and served HTML, inspected in this conversation. This inspection establishes source-level behavior, not complete browser, security or load verification. https://aiwmc.org/
