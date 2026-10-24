# Alignment with the supplied Institution 360 workflow

Reviewed against the user's workflow diagram, 24 October 2026. This check maps existing implementation rather than changing business rules.

| Diagram stage | Existing application | Assessment |
|---|---|---|
| Complaint received / data captured | Authorized officials register cases or import source CSV/JSON | Aligned for internal AICTE coordination. No public student complaint-submission portal is claimed. |
| Validate and normalize | Server validation, receipt-date checks, source uniqueness, normalized institution aliases | Aligned |
| Resolve institution identity | Trusted Permanent ID, verified name/alias with region; administrator confirms unresolved or conflicting inputs | Aligned. Fuzzy names never silently merge institutions. |
| Search same-institution cases | Candidate retrieval by verified institution, active status and different bureau | Aligned for cross-bureau coordination; closed records remain available in institution history. |
| No related case / create record | Every complaint is saved as its own case before candidate detection | Same outcome, different transaction order: preserves both source records even when related cases already exist. |
| Similarity / potential duplicate | Explainable rules distinguish institution activity from potential issue overlap | Aligned baseline. No trained AI, calibrated probability or measured accuracy is claimed. |
| Generate coordination alert | Persisted authorized overlap notifications and overview review queue | Aligned |
| Officer review / linking / task | Authorized relationship decision with justification, assignee, deadline and task history | Aligned with an intentional safeguard: review is mandatory before an official relationship decision; the diagram's “No review” branch never automates findings or case closure. |
| Independent handling | Institution-only activity does not become a duplicate finding | Aligned |
| Assignment / transfer / officer action | Bureau-controlled update service; officer membership checks; explicit valid transitions | Aligned |
| Status, remarks and documents | Case detail actions and authorized evidence uploads/downloads | Aligned |
| Audit and timeline | Append-only chronological case events with actor, bureau and timestamp | Aligned |
| Dashboard / reports / Institution 360 | Database-derived counts, history, workload, ageing, monthly/quarterly reports, filters and export | Aligned |
| SLA / escalation alerts | Illustrative deadline policies, in-app reminders and audited manual escalation | Prototype scope: reminders are generated during polling; escalation is officer-controlled, not an autonomous regulatory action. |

## Presentation update

Existing navigation, API contracts, permissions, database and business rules remain unchanged. The overview's four-step case-journey guide links into the existing registry, institutions, overlap review and reports pages. It is a navigation guide, not a fabricated progress indicator.

Typography is larger, metadata uses darker text, and statuses retain textual labels as well as color. The palette uses navy text, teal actions, restrained amber warnings and explicit status colors. Synthetic-data labeling, explainable matching, human review and confidentiality boundaries remain visible.
