# Live demonstration guide

## Preparation

Run `npm ci`, configure `.env`, `npm run seed`, `npm run dev`. Open http://127.0.0.1:3000. Use `admin@demo.local` and the password you configured in the ignored `.env` file. Other roles: `rb@demo.local`, `pgrc@demo.local`, `ro@demo.local`, `viewer@demo.local`, same local demo password.

All institutions, officers and complaints are synthetic. There is no live government connection. State that explicitly at the beginning. Dates are IST. Timeline deadlines are illustrative calendar-day rules. Internal views poll every 15 seconds, and successful local actions refresh the dashboard.

## 30-second opening

“When two AICTE bureaus handle complaints about the same institution, each can act without seeing the other's investigation. Institution 360 resolves institution identity, highlights explainable cross-bureau relationships, and lets an accountable official coordinate action while preserving both original cases. This demonstration uses synthetic records in a real local database.”

## Three-minute story

1. **Overview (20s):** show 13 seeded cases, active/disposed/overdue counts and bureau workload. Counts come from the database and respect the logged-in role.
2. **Overlap review (45s):** find North Valley's unauthorized examination fees / excess examination charges pair. Click Compare & review. Show verified institution, same category, same period and shared evidence reference. The rule score is a heuristic, not an accuracy percentage.
3. **Decision (40s):** choose Related — coordination required. Enter “Both bureaus should review the shared circular before requesting duplicate evidence.” Assign Arjun Mehta, pick today or a future date and enter “Exchange evidence and agree lead bureau”. Submit.
4. **Audit (30s):** open either source case, show the chronological Coordination review event, actor and timestamp. Close. Show the task and complete it. Source cases remain separate.
5. **Negative example (30s):** show Faculty salary payments delayed at the same institution. It is Institution activity rather than a duplicate issue.
6. **Outcome (15s):** explain that officials can coordinate evidence collection while retaining their independent case responsibilities.

## Five-minute story

Add source import before the review:

1. Imports & policies → Import records → CSV with headers → RB import.
2. Paste `examples/rb-import.csv`; update its receipt date if needed to today or earlier. Validate & import.
3. Import it again and show “skipped” for the existing source reference. No records or local review decisions are overwritten.
4. Registry → search `CSV-DEMO-RB-001` → open case. The alias resolves to the verified institution without needing a Permanent ID.
5. Change Pending to Under Process, assign Arjun, add remarks and next action. Save and refresh; show persistence.
6. Show the new relationship in Overlap review. Record a justified coordination decision.
7. Reports → filter RB → export CSV. Counts and export use the same authorized record set.

## Full technical walkthrough

- Show schema version, foreign keys and unique `(source,source_id)` constraint in `server/migrations/001_initial.sql`.
- Explain identity precedence and unresolved/conflicting ID queue. Open “Institution identity needs verification”, select a verified institution and provide a justification as administrator. Only unresolved identity can be confirmed; original inputs stay preserved.
- Describe matching evidence and the unrelated salary counterexample. No institution fuzzy auto-merging or autonomous case closing.
- Demonstrate transfer: choose Transferred, destination PGRC and Priya (or Unassigned), then remarks and next action. RB loses edit rights after transfer.
- Try Pending → Disposed without intermediate scrutiny: server rejects, form text stays in place.
- Attach a synthetic TXT/PDF/PNG/JPG, download it through authorized endpoint. No inline document preview or malware inspection claimed.
- Log in as viewer: no registration action, direct POST denied. An RB officer cannot open the restricted PGRC salary case. API integration tests cover direct requests, reports and attachments.
- Change a policy as admin: future registrations use new calendar-day value; existing deadlines remain unchanged.
- Show `npm test`, `npm run build`, `npm run test:e2e`, `npm run test:production` and their recorded outputs in TEST_REPORT.md.

## Backup and reset

The demonstration needs no internet after dependencies are installed. Stop the server, then `npm run reset:demo` for a fresh dataset; start again. Reset is refused in production and outside the workspace `data/` SQLite target. Never reset while serving real records. Browser tests use their own temporary databases and do not alter the demonstration environment.

Backup flow if source import is unavailable: use the existing seeded pair and show browser screenshots in `docs/screenshots/`. Screenshots are supporting evidence, not a replacement for claiming a live demonstration. No hosted URL is claimed.

## Troubleshooting

| Symptom | Action |
|---|---|
| Empty database / login failure | Confirm `.env`, seed, use configured password; seeding skips an already-populated database |
| Session rejected in production over HTTP | Secure cookies require HTTPS; use development for local HTTP demo |
| 409 stale edit | Close and reopen case/review; another action changed its version |
| Transfer rejected | Set Transferred + different bureau + matching destination officer or Unassigned |
| CSV fails | Check headers, comma/quote escaping, source bureau, receipt date and required category |
| Browser tests cannot launch | Install Edge, free port 3100, permit loopback/browser execution |
| Seed/reset refused | Non-production DEMO_MODE=true, password ≥12 chars, `.sqlite` directly under data/ |
| SQLite experimental warning | Expected with built-in Node 24 SQLite, not a failed database connection |

## Likely judge questions

- **Is this live AICTE data?** No. Synthetic records exercise real persistence, rules, role checks and coordination.
- **Why not CPGRAMS?** The prototype explores institution identity and coordination across independent bureau records. It is not a replacement public grievance portal.
- **What happens if matching is wrong?** An officer reviews explanations and records a justified decision; no records merge automatically.
- **What is the AI?** No trained AI is used. Exact identity rules, verified aliases, token similarity and rule-based relationship classification.
- **Can AICTE deploy tomorrow?** No. Authorized adapters/data, approved policies, SSO, security review and pilot operations are required.
- **What does real-time mean here?** Internal data refreshes every 15 seconds or after a local action; imported source data shows snapshot freshness.
- **Is the deadline official?** No. Demo-only policy; operational rules need approval.
