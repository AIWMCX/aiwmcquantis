# Pre-Qualified Outreach — Batch 1 (2026-08-30)

Source: Zoho CRM, `Leads` module, `Lead_Status = 'Pre-Qualified'`, first 200 records (COQL `more_records: true` — more exist beyond this page, not yet pulled).

**Data-quality finding, not fixed here (flagging per truth rules, not silently cleaning):** of these 200 raw records, well over half are not actionable as outreach targets — bare Instagram-handle scrapes with no name/email/phone, `TBD <Company>` placeholder rows with no contact, and at least two records (`7466993000000694005`, `7466993000000694024`) where an automated enrichment step wrote its own uncertainty note directly into the `Full_Name` field (e.g. *"Lee D. (full surname obscured in source — verify in Apollo)"*) rather than a real name. This is a sourcing-pipeline defect worth fixing separately — it means a meaningful fraction of "Pre-Qualified" is not actually qualified data, just imported noise.

Below is the subset with a real name and a real email or phone — the only rows fit to contact today.

## Email-actionable (26)

| Name | Company | Email | Source |
|---|---|---|---|
| Marc Serrio | Csuite Financial Partners | marc.serrio@csuitefinancialpartners.com | Web Research |
| Chris Gauvin | C Suite Support | chris.gauvin@c-suitesupport.com | Web Research |
| Michael (surname unconfirmed) | Angelytix | info@angelytix.com | Web Research |
| Gary Perez | US Sales Talent | gary@quickads.ai | Traxy LinkedIn |
| Billy Hayes, EA, MBA | Pedroza & Hayes Accounting | billyh@pedrozahayesaccounting.com | Traxy LinkedIn |
| Jamie S. | She Strategy | jamiecorder@gmail.com | Traxy LinkedIn |
| Michael Kilner | AgentCFO | michael@agentcfo.co | Traxy LinkedIn |
| Farhan Chaudhry, EA | SELRON Tax & Advisory | farhan@share-ify.com | Traxy LinkedIn |
| Anna Chernyshova | Eques Staffing LLC | achernyshova@equesstaffing.com | Traxy LinkedIn |
| Jacob Stripling | Future State Careers, Inc. | jacob@wholestory.me | Traxy LinkedIn |
| Brian Ching | C Three Partners | bching@twinpacificpartners.com | Traxy LinkedIn |
| Rene Cole | The Career Doctor | rene@thecareerdoctor.io | Traxy LinkedIn |
| John Jenkins | Joustlist Recruiting | john@warmintrotalent.com | Traxy LinkedIn |
| Jerome Daksiewicz | DKGR | jerome.daksiewicz@dkgrar.com | Traxy LinkedIn |
| Jarett Gross | Human Robot Army | jarett@automateconstruction.com | Traxy LinkedIn |
| Sonny Bains | SBcollective | sonny@hairstory.com | Traxy LinkedIn |
| Cicely Tastle | Tastle Partners | cicely@tastlepartners.com | Traxy LinkedIn |
| Ari Levy | Landing Talent & Advisory | ari.levy@landingtalent.com | Traxy LinkedIn |
| Rackaye Christie, MBA | Manifest Tax Service | rackaye@manifesttaxservice.com | Traxy LinkedIn |
| Erin Dohan | Stratum Financial Partners | erin@stratumfp.com | Traxy LinkedIn |
| Taline Ainein | Invenio Talent Partners | taline@inveniotalent.com | Traxy LinkedIn |
| Edric Goh | Little Lions Social Club | edric@llsc.club | Traxy LinkedIn |
| Connor Gross | Constant Hire | connor@constanthire.com | Traxy LinkedIn |
| Lee D. (verify surname) | DigBI Consulting | lee@digbiconsulting.com | Web Research |
| Reno P. (verify surname) | LeniLani Consulting | reno@lenilani.com | Web Research |
| Pavi Gupta | Market Research Institute International | pgupta28@its.jnj.com | Traxy LinkedIn — **flag: corporate J&J address, check ICP fit before sending** |

*Excluded from the send list but present in the raw pull:* `icunvmerolo1@gmail.com` (Damian Rowe / "Damianism Inc") — free-gmail + generic-sounding company name pattern common to spam-trap/burner addresses. Recommend manual verification before contacting, not a blanket exclusion.

## Phone-actionable, no email (9)

| Name | Company | Phone | Source |
|---|---|---|---|
| Daniel Feiman | Build It Backwards | 818-522-2892 | Web Research |
| Charles Everett | Everett & Associates LLC | 315-263-0538 | Web Research |
| Dan Brewer | Dan Brewer Consults / Concise Consulting | 502-424-6543 | Web Research |
| Jeannette Hobson | Gateway Consulting Group LLC | 973-634-0715 | Web Research |
| Jon Seidel | EDP Consulting, Inc. | 510-530-6314 | Web Research |
| Michael Whatmore | Executive Coaching San Francisco | 650-444-5881 | Web Research |
| Stephen Kirkland | Atlantic Executive Consulting, LLC | 803-477-5973 | Web Research |
| Pat Heffernan | Marketing Partners, Inc. | 802-864-6710 | Web Research |
| Norman Eckstein | Eckstein Management Consulting | 312-649-6770 | Web Research |

## Totals for this batch

- Raw Pre-Qualified rows pulled: 200 (more exist in Zoho beyond this page)
- Actionable via email: 26
- Actionable via phone only: 9
- **Total actionable today: 35**
- Unusable as pulled (Instagram scrape / TBD placeholder / no contact method): ~165 of 200 — this is the data-quality gap to fix in the sourcing pipeline, not something to route into outreach.

## Suggested next step

Work the 35 actionable rows above today (Action #5–7 in the [Sales-First Operating Report](./2026-08-30-sales-first-operating-report.md)): contact, then create a real Zoho Contact record for anyone who responds — the first-ever conversion step in this CRM. Separately, decide whether to re-run the Instagram/Traxy sourcing batches through a stricter enrichment filter before pulling further pages, since roughly 80% of this page was not contact-ready.
