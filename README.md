# BureauSetu

Working local prototype for **SIH26264 — Integrated Dashboard for Monitoring and Tracking Institution-Related Complaint Cases Across AICTE Bureaus/Cells**. Official requirements: [SIH 2026](https://sih.gov.in/sih2026PS). Independent prototype; no affiliation or live AICTE data connection is claimed.

The core journey is **register/import → verify institution → identify cross-bureau relationships → human review → coordinate → audit**. Same-institution activity is distinguished from potential issue overlap. A confirmed duplicate remains a human finding; neither source case is merged or automatically disposed.

## Local setup (PowerShell)

Requires Node **24.14 or newer in the 24.x line**, npm, and Microsoft Edge for the browser suite. The database uses Node's built-in SQLite (experimental warning expected). No Python or external database service is required.

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env: DEMO_MODE=true, choose DEMO_PASSWORD (12+ characters).
npm run seed
npm run dev
```

Open http://127.0.0.1:3000. Every account below uses the password you set in `DEMO_PASSWORD`; do not use a real personal password. Keep your configured password in the ignored `.env` file.

| Email | Role | Scope |
|---|---|---|
| admin@demo.local | Administrator | All cases, verification, policy changes |
| rb@demo.local | Officer | Writes RB cases; shared nonrestricted cross-bureau visibility |
| pgrc@demo.local | Officer | Writes PGRC cases; shared nonrestricted cross-bureau visibility |
| ro@demo.local | Officer | Writes Regional Office cases |
| viewer@demo.local | Monitoring | Read-only, no restricted case access |

Seeding is repeatable and skips populated databases. To change a seeded password, reset the demo after stopping its server (reset deletes only the configured demo database, never use on real records):

```powershell
npm run reset:demo
```

Reset requires `DEMO_MODE=true`, non-production mode, and a database under `./data/`. No reset endpoint exists. Seed fixtures have stable source references, relative dates, six fictional institutions and thirteen cases. Case IDs use UUID suffixes.

## Commands and verification

```powershell
npm test             # Domain and real HTTP/database integration tests
npm run build        # TypeScript check + production frontend compilation
npm run test:e2e      # Edge browser; temporary isolated DB and port 3100
npm run test:production # Requires build; temporary production server on port 3201
npm start            # Development unless NODE_ENV=production
```

Tests never mutate the local demonstration database. Edge must be installed. If unavailable, install a Playwright browser and change `channel` in `playwright.config.js`. Browser traces/reports appear under ignored `test-results/` and `playwright-report/`; selected screenshots appear in `docs/screenshots/`.

Production serves `dist` and the API from one Express process. Set `NODE_ENV=production` and use a trusted HTTPS reverse proxy; session cookies are Secure in that mode. `HOST` defaults to loopback. Configure an operational identity provider and initial users before a real deployment. Production seeding is deliberately refused. HTTP without TLS cannot authenticate in production mode.

`docker compose up --build` prepares the production service with a named SQLite volume and readiness probe. Container startup is prepared, **not verified on this host**. It does not provision production users or government connections. The container requires TLS termination to log in. For a local Docker demo, use a non-production configuration and separately provision an explicitly synthetic database.

## Architecture

### Hosting modes

The GitHub Pages workflow publishes a **BureauSetu static demonstration** using synthetic browser data from `src/mockData.ts`. It is not the authenticated server application: browser-preview records and actions are temporary, and no backend authorization or persistent database is provided by Pages. Use the local Node server or a properly configured Node/Docker host for the real API, authentication, audit history and SQLite persistence. The static-preview banner identifies this distinction.

### Judge demo access

The GitHub Pages login is prefilled with **admin@demo.local** / **LocalDemo-26264!**. The same details appear in the front-page **Judge demo access** card. Click **Start guided demo**, or sign in normally and select **Guided demo** from the sidebar. The walkthrough covers institution profiles, case comparison, coordination decisions, action timelines and reporting.

Browser demo changes are stored in `sessionStorage` for the current tab and survive reloads. **Reset browser demo** in the guided area restores the synthetic fixtures. This is simulated access for public demo accounts, not production authentication. Local HTTP demonstrations advertise this credential only when `DEMO_MODE=true`, `NODE_ENV` is not production, and the seed password is the published demo password. Custom passwords and production credentials are never displayed. API/network failures in the server-backed app do not silently switch to synthetic data.

React 19 + TypeScript + Vite → same-origin Express API → authorization/validation → domain services → SQLite with foreign keys, WAL, transactions and append-only events. Migrations execute on server startup. Cookie sessions store only token hashes in the database. Internal views poll every 15 seconds; external records are snapshots with provenance and freshness dates.

## Demonstrate

1. Sign in as admin; inspect database-derived overview counts.
2. Open Overlap review: examination-fee complaints from RB and PGRC share a verified institution, category, period and evidence reference.
3. Compare and record a justified review; assign an officer, deadline and next action.
4. Open both cases to inspect recorded decisions, then complete the coordination task.
5. Inspect faculty salary at the same institution: it remains institution activity, not an issue-duplicate finding.
6. Register another case using `NVIT` in Northern region, then search its source reference, refresh, and verify persistence.
7. Show a bureau officer cannot edit another bureau's case and viewer cannot submit changes.

Full walkthrough, requirement matrix, schemas, API contracts, test outcomes and deployment limitations are in `docs/`.

## Honest limits

SQLite instead of PostgreSQL; no live bureau adapters, SSO, semantic model, email/SMS, institution CRUD, retention automation, or hosted deployment. Imports accept CSV and JSON arrays. Attachments support TXT/PDF/PNG/JPG with a 2 MB limit, signature checks and authorized downloads; antivirus/CDR is not configured. Matching is explainable deterministic rules, not calibrated AI. Timeline policies are illustrative calendar days, not official AICTE rules. Monthly/quarterly reports count receipts and actual disposal actions, including repeated actions for reopened cases. A production pilot needs authorized data, identity provisioning, security/operational review and approved timelines. See `docs/FINAL_AUDIT.md`.
