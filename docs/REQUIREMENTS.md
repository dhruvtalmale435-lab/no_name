# SIH26264 requirement audit

Official source: https://sih.gov.in/sih2026PS (verified 24 October 2026). User-supplied PS matches. No PPT supplied; no slide claims audited. Both user attachments informed scope. Status reflects the prototype, not production readiness.

| Requirement | UI / API / storage | Acceptance evidence | Status |
|---|---|---|---|
| Central institution profile and permanent ID | Institutions / Institution profile; GET institutions and case filters; institutions, aliases, cases | Alias/ID conflict tests; institution browser journey | COMPLETE for seeded registry; registry administration absent |
| Unique complaint ID, date, category, status, bureau, officer, last/next action, deadlines | Registration and detail; POST/PATCH cases; cases/events | Real HTTP workflow, persistence, assignment and transition tests | COMPLETE |
| Cross-bureau overlap detection | Overview + comparison; GET overlaps; relationships | Related versus independent domain/API and browser tests | COMPLETE rules baseline; semantic matching unimplemented |
| Related-case mapping and human decision | Review form + tasks; overlap review/task endpoints | Review persists in both timelines; task browser test | COMPLETE |
| Institution identity ambiguity | Case detail verification; identity endpoint; original fields retained | Admin-only conflict verification API tests | COMPLETE manual verification; fuzzy suggestions absent |
| Total, pending, under process, disposed, transferred, escalated, overdue counts | Overview and Reports; GET analytics; scoped cases | Counts reconcile with real database and role visibility | COMPLETE |
| Institution and bureau workloads | Institution cards; workload bars; Reports | Database queries and UI journeys | COMPLETE |
| Chronological actions, actor, timestamps, remarks, transfer/escalation | Case timeline; GET case; events | Append-only, transfer and concurrency tests | COMPLETE |
| Supporting documents | Attach/download TXT/PDF/PNG/JPG; documents endpoints/table | Signature, type and object-access tests, browser upload | COMPLETE prototype; antivirus/CDR absent |
| Institution/name/ID/case/bureau/region/category/status/date filters | Registry and Reports filters; GET cases and export | API and browser source-reference search | COMPLETE |
| Duplicate/pending/SLA/escalation alerts | Persisted notifications; lazy SLA generation | Notification, privacy and browser tests | COMPLETE in-app; no email/SMS or background scheduler |
| Bureau/region/institution/status/ageing/disposal reports | Reports; GET analytics/export | Scoped stats/export and browser download | COMPLETE baseline |
| Monthly/quarterly performance | Receipt cohorts plus actual disposal-event counts by month/quarter, IST | Scoped event-count reconciliation test | COMPLETE baseline; reopened cases may count multiple disposal actions |
| Real-time consolidated view | 15-second polling and post-write refresh | Cross-role API and browser refresh tests | COMPLETE internally via polling; no live source sync |
| Roles and privacy | Admin/officer/viewer; authenticated API; users/sessions | Direct write/read/export/document denials | COMPLETE local auth; SSO/MFA not configured |
| Existing bureau integration | Atomic source CSV/JSON import; import_runs and source uniqueness | CSV quoting, repeat import and rollback tests | COMPLETE controlled import; live authorized APIs absent |
| Production rollout | Docker/config/docs | Frontend production build | BLOCKED for actual rollout: no credentials, approved data, SSO or security/operational approval |

No automated merge, close or legal determination is performed. No model accuracy is claimed. All case data is synthetic. Timeline configuration requires AICTE approval before real use.
