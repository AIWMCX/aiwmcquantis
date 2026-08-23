# AIWMC Quantis — 160-Question GTM Decision Bank

**Created:** 2026-08-21
**Status:** Reference bank, not a report. Operating model is in `docs/QUANTIS_RD_SCOPE_2026-08-21.md` §9 (Track C). Do not answer all 160 at once — select 10 relevant to the current bottleneck, gather evidence, answer, convert unresolved high-impact ones into tasks/experiments, execute, measure, select the next 10.

**Filter for whether a question is worth investigating right now:** would answering it actually change a decision — product, sales, distribution, pricing, ICP, or resource allocation? If not, it waits.

## I. GTM Truth & Commercial Observability (1–10)
1. Can we reconstruct one external prospect's complete journey — first attributable visit → first analysis → scenario interaction → checkout → payment → repeat use?
2. What percentage of supposedly "external" activity is founder/QA/synthetic/test/bot/demo?
3. Do we have one canonical qualified-visitor definition, or are tools independently defining it?
4. Can every acquisition source be joined deterministically to an eventual `analysis_id` and authenticated user without losing pre-signup attribution?
5. What percentage of current analysis rows have a trustworthy acquisition source?
6. Can we distinguish "someone visited" from "a member of our actual ICP visited"?
7. Which commercial metrics come from event telemetry vs. persisted application state, and where can those disagree?
8. Which GTM decisions are being made today from metrics now known to be historically undercounted or contaminated?
9. Can the system auto-flag a commercial KPI as `UNRELIABLE` when event-to-database parity falls below threshold?
10. "How many unrelated professionals used Quantis for a real business decision this week?" — can production answer without manual forensics?

## II. ICP Precision (11–20)
11. Which ICP produces the highest probability of a second real analysis, not merely the highest signup rate?
12. Do fractional CFOs, consultants, valuation professionals, M&A advisors, business-plan consultants behave differently after their first analysis?
13. Which professional role has the highest frequency of repeated client decisions Quantis can support?
14. Which ICP already spends money on modeling/research/analyst labor/software Quantis can partially displace?
15. Which ICP has enough authority to buy without procurement?
16. Which ICP can experience value in a single 20–30 minute founder-led session?
17. Which ICP views Quantis as workflow infrastructure, not a novelty "AI validator"?
18. Which segment most often handles ambiguous client information before a formal model exists?
19. Which segment has the strongest need for a defensible first-pass analysis before deeper modeling/valuation/diligence?
20. If consultants/fractional CFOs are the wrong primary ICP, what observable result in the next 20 qualified sessions would falsify that thesis?

## III. Job-to-be-Done (21–30)
21. What specific client question causes a professional to open Quantis rather than Excel?
22. What event happens immediately before the user feels they need this analysis?
23. Is Quantis replacing research, spreadsheet setup, scenario construction, model review, report production, or decision explanation?
24. What is the user doing manually today that Quantis can reduce from hours to minutes without reducing quality?
25. Which job recurs frequently enough to justify subscription pricing?
26. Does the user want "business validation," or an answer to a narrower decision (hiring, pricing, expansion, acquisition, financing)?
27. Which client decisions have the highest economic cost if the consultant is wrong?
28. Which decision needs a fast structured first pass but doesn't justify a full custom model yet?
29. What output must Quantis deliver before the professional will show it to a client?
30. What makes a professional say "I need to run another company through this"?

## IV. Positioning & Category (31–40)
31. Does "business validation" sound episodic and founder-only?
32. Does "financial pre-mortem" improve comprehension or add unnecessary jargon?
33. Does "decision-support platform" sound valuable or too broad?
34. Which proposition produces more real analyses: "stress-test your business" or "structure a defensible first-pass model"?
35. Which wording makes consultants think "fits my workflow" vs. "competes with me"?
36. Does "90 seconds" messaging increase trial intent or undermine perceived rigor?
37. Do Monte Carlo/RVCE/deterministic-engine terms strengthen trust after value is understood but weaken the initial message?
38. Can a first-time visitor explain Quantis accurately after 15 seconds on the homepage?
39. Does the site communicate what decision the user should bring, not just what the product generates?
40. Is the real category "financial decision intelligence," "business stress testing," "pre-model diagnostics," or something buyer language actually demonstrates?

## V. Landing Page → Analysis Start (41–50)
41. What percentage of qualified `/consultants` visitors start an analysis?
42. Which page section correlates with analysis starts?
43. Are visitors asked for too much context before experiencing value?
44. Is there one visually dominant CTA matching the user's actual job?
45. Does the CTA say what happens next?
46. Can a consultant tell whether to enter their own company or a client case?
47. Is a sample decision visible before signup?
48. Does Quantis show a credible professional output before account creation?
49. Which page has the best `qualified_visit → analysis_started` ratio?
50. What exact field/UI state creates the largest abandonment before submission?

## VI. Free Analysis Reliability & First Value (51–60)
51. What percentage of clean external Free starts produce a rendered result?
52. What percentage succeed server-side but fail before the customer sees the result?
53. What is current p50/p95 time-to-first-decision-value?
54. Does a successful Free result make the verdict visually clear within 5 seconds?
55. Can the user immediately identify the 1–2 assumptions driving the answer?
56. Does the result show what's benchmark-modeled vs. user-supplied?
57. Does sparse input produce appropriately qualified output instead of artificial certainty?
58. Can analytics fail without the financial analysis itself failing?
59. Can AI narration fail while deterministic financial value is preserved?
60. After the Free result, is there exactly one obvious high-value next action?

## VII. Trust, Accuracy & Professional Credibility (61–70)
61. Which displayed number would a fractional CFO challenge first?
62. Can every material figure state whether it's user-supplied, source-observed, benchmark-derived, or calculated?
63. Can a consultant answer a client asking "where did this number come from"?
64. Do dashboard, scenario, PDF, Docs Studio, and shared report show the exact same canonical values?
65. What percentage of user-visible outputs have full formula lineage?
66. Are benchmarks shown with enough definition/period/geography/sample context to prevent misreading?
67. Does Quantis expose limitations clearly enough to increase trust rather than decrease it?
68. Is there any remaining "confidence/reliability/accuracy" value that could be mistaken for predictive accuracy?
69. Which inconsistency would be most damaging in a client meeting: payback, margin, runway, verdict, scenario delta, or source attribution?
70. Would a professional attach their own logo/name to today's report?

## VIII. Activation & Decision Interaction (71–80)
71. What percentage of users who render a result inspect a critical driver?
72. What percentage compare materially different scenarios?
73. What percentage change at least one material financial assumption?
74. Which assumption is most frequently changed first?
75. Do users understand assumption-changing is core product value?
76. Is `scenario_compared` a real comparison or just a page load?
77. Can we distinguish a trivial assumption change from a materially economic one?
78. Does the result screen create sensitivity curiosity, or feel "finished"?
79. Which first-session action most strongly predicts second use?
80. What would make `analysis_completed → assumption_changed` the primary activation path?

## IX. Second Use & Retention (81–90)
81. What percentage of external users run a second real analysis within 7 days?
82. How many second analyses are a second client vs. the same demo?
83. Does second use correlate more with scenario interaction, export, report sharing, or pricing-page exposure?
84. What's the median time between first and second real analysis?
85. Which ICP has the shortest time to second use?
86. Which first-analysis types most often produce repeat use?
87. Are users returning because of a recurring job, or just experimenting?
88. Can we classify repeat use into: same business, updated assumptions, new decision, different client?
89. What product state should persist to make returning materially easier?
90. Which missing workflow prevents Quantis becoming a weekly professional tool?

## X. Self-Conversion & Paid Boundary (91–100)
91. What exact behavior should trigger an upgrade prompt?
92. Are upgrade CTAs shown before enough value is experienced?
93. Is the strongest paid boundary quantity, scenario depth, report quality, client workflow, history, white-labeling, or evidence depth?
94. Which paid feature is valuable specifically because a professional repeats the workflow?
95. Do Free users understand why Plus exists?
96. Do Plus users understand why Pro exists?
97. Can an activated user describe Plus vs. Pro without opening the pricing page?
98. Does Pro feel like a professional workflow or just "more limits"?
99. Which feature would a consultant genuinely miss after losing Pro?
100. Does the product create an organic "I need this again" moment before asking for payment?

## XI. Pricing & Economic Packaging (101–110)
101. Is $49 Pro too low to signal professional value, or appropriately frictionless for early validation?
102. Would a professional prefer per-seat, per-client, per-analysis, subscription, or hybrid pricing?
103. Does Quantis save enough billable time to make $49 economically irrelevant?
104. What is the observed value of time saved on one real consultant engagement?
105. Could a higher-priced assisted "Decision Validation Sprint" create faster commercial learning than optimizing low-price self-serve conversion?
106. Should Quantis monetize the software alone, or the outcome/workflow around it?
107. Does Free give enough value to activate but too much to create urgency?
108. Which paid capability can be demonstrated in the first session vs. only explained theoretically?
109. Are annual plans relevant before monthly paid retention is demonstrated?
110. What observed willingness-to-pay result would justify raising/lowering/restructuring pricing?

## XII. Stripe, Billing & Entitlement GTM (111–120)
111. Can a customer complete payment and immediately receive the exact intended tier?
112. Can we prove Stripe subscription ↔ Supabase subscription ↔ entitlement parity for every paid user?
113. What happens when payment succeeds but provisioning fails?
114. Does a customer retain correct access after logout/login?
115. What happens after cancellation at period end?
116. What happens on `past_due`/`unpaid`/`paused`/payment-retry states?
117. Can an unknown Stripe Price ID accidentally map to a real paid tier?
118. Is checkout analytics linked to actual payment success, not just checkout creation?
119. Can QA fully test the revenue lifecycle without polluting live commercial data?
120. Would we detect and alert on `paid_without_access` before the customer contacts us?

## XIII. Sales Motion & Demo Design (121–130)
121. Does a live demo perform better when the prospect brings a real client case?
122. How fast can we move from "tell me about Quantis" to "let's run one of your actual cases"?
123. Which demo moment consistently causes the strongest reaction?
124. What objection appears immediately after the prospect sees output?
125. What objection appears only when asked to pay?
126. Which proof asset shortens the sales cycle most: live model, PDF, scenario comparison, methodology, benchmark evidence, client workflow?
127. Can the founder ask for payment in the same session value is demonstrated?
128. Conversion from qualified conversation → real-case session?
129. Conversion from successful real-case session → explicit payment ask?
130. What percentage of "this is useful" prospects ever produce a second behavioral commitment?

## XIV. Outbound, CRM & Lead Intelligence (131–140)
131. Which lead attributes predict replies rather than just high ICP score?
132. Does a direct published business email outperform company inboxes enough to change lead scoring?
133. Which current-offering services best predict Quantis relevance: modeling, cash flow, valuation, diligence, scenario planning, business planning?
134. Which personalization hook creates the highest response rate?
135. Should outreach sell Quantis, a "pre-model stress test," or a founder-led real-case session?
136. What percentage of high-fit prospects have already been contacted/followed-up/dispositioned correctly?
137. How many CRM records have stale or unknown outcome states?
138. Are we producing more new leads than we can follow up on professionally?
139. Which job-signal or service-signal indicates purchase timing rather than generic ICP fit?
140. Can Zoho auto-separate no-reply/not-now/wrong-fit/interested/real-case-booked/activated/paid without founder memory?

## XV. Content, SEO & Distribution (141–150)
141. Which content theme has actually generated a completed analysis?
142. Which content generated a qualified consultant visit vs. generic engagement?
143. Can every published post be attributed through UTM → visit → analysis → activation?
144. Should content optimize for impressions, conversations, or completed decision cases?
145. Which financial insight creates the strongest self-identification among consultants?
146. Are product posts outperforming educational "decision problem" posts, or the reverse?
147. Does the consultant landing page rank/receive traffic for real high-intent search terms?
148. Which search queries imply an immediate financial decision vs. informational browsing?
149. Does Quantis own enough indexable methodology/trust content for pre-purchase verification?
150. Which distribution channel has the best effort → qualified analysis ratio?

## XVI. Scale, Operations & GTM Readiness (151–160)
151. If 100 qualified users arrived tomorrow, which technical component fails first?
152. What is the verified concurrency capacity of `analyze-business` at current provider quotas?
153. What does one completed Free/Plus/Pro analysis actually cost AIWMC in infra + model usage?
154. Is there positive contribution margin at current pricing under realistic heavy usage?
155. Can rate limiting distinguish legitimate consultant use from abusive anonymous generation?
156. Which production failure would immediately invalidate an active GTM campaign?
157. Do we have alerts for zero completions, elevated failures, checkout failures, entitlement mismatches?
158. Can GTM safely scale founder-assisted → controlled cohort → self-service without architecture changes?
159. What exact technical and commercial gates must be green before 100/500/5,000 qualified users/day?
160. If Quantis gets 5,000 daily users but second-paid-use stays near zero, what have we actually scaled?

## The top 20 (tomorrow's actual queue — see RD_SCOPE §9)
1. How many `EXTERNAL_REAL` people completed an analysis in the last 7 days?
2. How many viewed the actual decision result?
3. How many compared a real scenario?
4. How many changed a material assumption?
5. How many returned for a second real analysis?
6. How many second analyses were for a different client/company?
7. Which first-session action best predicts second use?
8. Which ICP produces the highest second-use rate?
9. What is the largest current funnel loss with trustworthy evidence?
10. What single product change could reduce that loss?
11. How many qualified consultant/CFO conversations produced a real case?
12. How many successful real cases received an explicit payment ask?
13. What objection prevents payment most frequently?
14. Does payment → entitlement → login persistence work end-to-end?
15. Can an activated Free user explain why Pro is valuable?
16. What recurring professional job makes Quantis worth paying for monthly?
17. What does one analysis save a professional in time/labor?
18. Is distribution the bottleneck, or does the product fail to activate the people already sent to it?
19. What evidence would prove the consultant/fractional-CFO strategy wrong?
20. What would have to happen in the next 14 days to say, with evidence, "Quantis has begun commercial validation"?

North star chain these 160 questions exist to make measurable: **right professional → real decision → trusted analysis → meaningful interaction → second real use → payment → use after payment.**
