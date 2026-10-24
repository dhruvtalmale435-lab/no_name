# Executed verification

Date: 24 October 2026. Host: Windows, Node 24.14.0, npm 11.9.0, Microsoft Edge. Test data is synthetic and isolated. No throughput or matching-accuracy statistics are inferred from these examples.

| Command | Observed result |
|---|---|
| `npm install` | Initial sandbox DNS ENOTFOUND; retried with network permission; dependencies installed, zero vulnerabilities reported |
| `npm test` | **29 passed, 0 failed** after fixing the seed's nested transaction failure and permitting local loopback test traffic |
| `npm run build` | TypeScript noEmit and Vite production compilation passed; final verification rerun after UI focus correction |
| `npm run test:e2e` | **6 passed**, using actual Microsoft Edge and compiled frontend against temporary SQLite-backed API |
| `npm run test:production` | Passed: production server startup, real DB health, built HTML/JS assets, CSP, Secure/HttpOnly session cookie |
| `npm audit --omit=dev` | **0 vulnerabilities** reported |
| `npm run seed` | Created **13** real persisted synthetic cases; repeatability also verified by integration test |
| `GET http://127.0.0.1:3000/api/health` | `{status:'ok', database:'sqlite', demo:true}` |

## 29 domain / API tests

22 integration tests cover public health/protected routes, credentials/session flags, seed repeatability/migration, create/read/filter/count consistency, invalid/future/duplicate rejection, role/bureau denials, restricted list/detail/export/count exclusion, status/assignment/transfer/history, concurrent stale update, related/independent review and task completion, institution verification, atomic/idempotent import, document permission/type checks, notification read state, policy scope/deadline retention, cross-origin rejection/SQL payload, append-only audit, logout/expiry, reopening the persistent database, CSV/source-bureau validation, binary signature/download policy, and monthly/quarterly event reconciliation.

Four domain tests cover ID/alias/conflict/unresolved identity, issue versus institution-level classification, deadline/month/leap-year/IST boundary arithmetic, salted password verification and permission helpers.

Three CSV/reset tests cover BOM, quoted comma/quote/newline handling, boolean parsing, malformed CSV rejection and resolved demo-reset path boundaries.

## Six actual browser journeys

1. Login, database-derived dashboard reconciliation, reload and logout; no page errors recorded in this journey.
2. UI registration using verified alias, registry search, refresh persistence, officer assignment, status history and Institution 360 visibility.
3. Explainable case comparison, justified review, coordination task completion, source timeline and unrelated salary counterexample.
4. Viewer action restrictions including direct API attempt, report CSV download and mobile width overflow check at 390 × 844.
5. Injected HTTP 503: visible error, dismissal, recovery and usable navigation.
6. CSV import, uploaded supporting evidence, rejected invalid direct disposal with retained form values, recovery and a second bureau user's read-only visibility.

Browser outputs: `playwright-report/index.html` and `test-results/` (ignored generated files). Screenshots: `docs/screenshots/overview.png`, `docs/screenshots/mobile.png`. Desktop screenshot visually inspected; final screenshot refresh is part of final browser rerun.

## Defects found and resolved

- Seed called a transaction-aware workflow from another transaction → nested savepoints preserve atomic seed behavior.
- Sandbox blocked npm DNS and local HTTP test connections → reran permitted commands; environmental failures are not represented as passing application tests.
- Exact dropdown labels were ambiguous to label-based automation → explicit accessible names; registration/review browser journeys then passed.
- Potential overlap notification could reveal restricted case reference → recipient check requires access to both records.
- Rapid filter requests could complete out of order → request-generation guard discards superseded responses.
- Modal focus could reset when polling rerendered the parent → stable effect with current close callback.
- Reset prefix check insufficient against `..` traversal → resolved path and direct data-directory checks; regression tests.
- Missing CSV and quarterly performance → implemented and verified instead of leaving as a claimed future feature.

## Verification boundaries

Docker execution, remote hosting, PostgreSQL, authorized government APIs, SSO, malware inspection, backup recovery, large-volume load, external notifications and independent labeled matching evaluation were **not** run. Unit examples are not an accuracy benchmark. No model accuracy/performance or regulatory compliance claim is made. Node's SQLite experimental warning is expected.
