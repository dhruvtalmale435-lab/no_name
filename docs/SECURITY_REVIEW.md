# Security review — prototype scope

Review date: 24 October 2026. This is a practical engineering review, not certification or a penetration-test attestation. No DPDP compliance claim is made.

| Area | Implemented / verified |
|---|---|
| Authentication | Salted scrypt password hashes; random 256-bit session tokens; only token digests stored; 8-hour expiry; server logout invalidation |
| Browser sessions | HttpOnly and SameSite=Strict; Secure in production; protected responses no-store |
| Login abuse | 15 failed attempts per IP / 15-minute window, process-local map; bounded stale-entry cleanup |
| Authorization | Server role/object checks on cases, updates, exports, reviews, identities, policies, documents and tasks; viewer writes rejected |
| Privacy | Restricted records omitted from lists/counts/exports and direct reads; overlap comparison and initial notifications require both readable cases |
| Input | Zod schemas, receipt-date validation, field limits, 3 MB JSON request limit, bounded import batches |
| SQL | Prepared statements for all user-controlled values; FK/unique/check constraints |
| HTML/XSS | React escaped text; no untrusted HTML rendering; Helmet CSP in production |
| Request origin | Cross-origin mutation rejection and same-site cookies; same-origin JSON API |
| Attachments | Writer upload authorization, reader download reauthorization, safe ASCII names, 2 MB size limit, allowlist TXT/PDF/PNG/JPG, binary signatures, download-only disposition and nosniff |
| CSV | Strict parser, atomic validation, duplicate references skipped; export formula-prefix escaping |
| Audit | Case events have update/delete-blocking database triggers; review and task actions append events in both histories |
| Concurrency | Case/review version checks; transaction rollback and nested savepoints |
| Demo isolation | No public reset endpoint; seed/reset refused in production; resolved target constrained to data/ SQLite; tests use temp DBs |
| Secrets | `.env`, database, reports and dependency folders ignored; no external credentials provided or fabricated; example password is synthetic demo-only |
| Dependencies | npm install reported zero vulnerabilities; `npm audit --omit=dev` reported zero vulnerabilities during this run |

Executed authorization/security assertions are recorded in TEST_REPORT.md. Production smoke checks verify CSP and Secure/HttpOnly headers. Protected source files and environment values are not served by production static middleware.

## Limits before any operational pilot

- No SSO/MFA, account administration/password reset, central identity provisioning or password rotation.
- Rate limits are process-local and IP-based, unsuitable alone for distributed deployments; reverse-proxy trust is limited to loopback.
- No malware scanning/CDR on PDF or images. Signature checking does not certify file safety. All attachments are downloads; use synthetic evidence for demonstrations.
- No encryption at rest, key management, automated retention, backup/restore rehearsal, monitoring or external audit-log sink.
- SQLite triggers resist normal application modification, not a host administrator with full database access. No cryptographic tamper-evidence claim.
- Institutional policy must approve what cross-bureau metadata is shareable, case sensitivity, review authority, retention and statutory deadlines.
- No real complaint data has been ingested; no formal security/availability/load assessment on pilot-scale data.
- Session expiry hides the workspace on polling failure. Previously viewed browser memory cannot be retroactively withdrawn by server revocation.

These limits prevent production-readiness claims. Use a loopback local demonstration with synthetic data until approved infrastructure and controls exist.
