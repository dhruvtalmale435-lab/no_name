# Engineering checklist

Initial audit: empty workspace, no existing implementation or Git repository. Node 24 available. Python launcher unavailable. Official SIH26264 verified at https://sih.gov.in/sih2026PS on 24 October 2026. No PPT supplied. Both attached documents read.

Architecture choice: local React/TypeScript + Express + Node SQLite. SQLite is a real relational database with transactional writes; PostgreSQL migration is future work, not claimed. No external government connection or trained AI model.

- [x] Relational migrations and repeatable synthetic seed (SQLite)
- [x] Authentication and server authorization
- [x] Case registration, assignment, workflow and audit
- [x] Identity matching and manual unresolved/conflict review
- [x] Explainable overlap review and coordination
- [x] Dashboard, institution directory, filters, reports and notifications
- [x] Authorized supporting documents and CSV/JSON source import
- [x] Automated API/domain tests and actual Edge browser journeys
- [x] Production compilation, dependency review and final audit
- [x] Reproducible local setup and demo documentation
- [ ] Operational integrations / PostgreSQL / SSO / hosted deployment (limitations in FINAL_AUDIT)
