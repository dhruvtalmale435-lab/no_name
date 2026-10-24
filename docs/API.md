# HTTP API

All endpoints use `/api`. Health and login are public; all others require HttpOnly `session` cookie. Mutations accept JSON from the same origin. Errors: `{error:string}`, HTTP 400 validation, 401 authentication, 403 permission, 404 missing/restricted record, 409 stale edit/duplicate, 413 size, 429 login attempts. Never send a client-chosen role.

| Method / path | Contract |
|---|---|
| GET /health | Real DB readiness; status/database/demo |
| POST /login | `{email,password}` → Set-Cookie, `{ok:true}` |
| POST /logout | Invalidate server session and clear cookie |
| GET /me | `{user:{id,name,email,role,bureau},demo}` |
| GET /meta | Bureaus, officers, categories, statuses and policy definitions |
| GET /institutions | Registry and authorized case counts, bureaus, aliases |
| GET /cases | Filters q/bureau/status/category/region/institution_id/from/to; page (1-based), limit (1–100); `{items,total,page,limit}` |
| POST /cases | Create using contract below, HTTP 201; source pair unique |
| GET /cases/:id | Full allowed details, canWrite, events, document metadata |
| PATCH /cases/:id | `{version,status?,bureau?,officerId?,nextAction?,remarks}`; remarks ≥5 chars; 409 on stale version |
| POST /cases/:id/identity | Admin; `{version,institutionId,remarks,approveAlias?}`; only unresolved identity, ≥10 char justification |
| GET /overlaps | Both-readable relationship pairs, reasons, heuristic score, active state, tasks |
| POST /overlaps/:id/review | `{version,decision,justification,officerId?,dueAt?,nextAction?}`; justified human review |
| PATCH /tasks/:id | Assigned officer/admin; `{state:'Open'|'Completed'}` |
| POST /import | `{source:'RB import'|'PGRC import'|'RO import',records:[caseInput]}` or `{source,csv:string}` → `{created,skipped}`; 1–200 records, atomic; source must match bureau |
| GET /imports | Administrator all, others own runs |
| POST /cases/:id/documents | Writer only; `{name,base64}` for TXT/PDF/PNG/JPG up to 2 MB, or `{name:'evidence.txt',content:'plain text'}` up to 200,000 characters; extension/signature checks |
| GET /documents/:id | Reauthorize case; typed download with attachment disposition and nosniff |
| GET /notifications | Personal, authorized notifications; calculates due soon / overdue reminders |
| PATCH /notifications/:id | Mark own notification read |
| GET /analytics | Same filters as cases; total/active/disposed/overdue/dueSoon, distributions, age/month cohorts, monthlyPerformance and quarterlyPerformance with receipts (total) and actual disposalActions |
| GET /reports/export | Same filters; authorized CSV, formula-prefix neutralization |
| PATCH /policies/:category | Admin; `{days:1..365,rule:string}`; future records only |

## Registration / import record

```json
{
  "title":"Excess examination charges require review",
  "description":"Stakeholders report collection of excess examination fees during the autumn semester.",
  "institutionName":"N. Valley Inst. of Technology",
  "permanentId":"",
  "region":"Northern",
  "category":"Fees",
  "period":"2026 autumn",
  "evidenceRef":"EXAM-CIRCULAR-26",
  "bureau":"RB",
  "officerId":"rb",
  "receivedAt":"2026-10-24",
  "source":"Manual",
  "sourceId":"DEMO-RB-NEW-001",
  "restricted":false
}
```

Use a receipt date no later than current IST date and a unique source reference. Import endpoint supplies the enclosing source. Categories: Fees, Faculty salary, Infrastructure, Admission, Governance. Bureaus: RB, PGRC, RO. Officer IDs returned by `/meta`; officer must belong to the destination bureau.

CSV uses these same camelCase keys as headers. Quote fields containing commas/newlines and escape quotes by doubling them. `restricted` must be `true`, `false` or blank; blank officer is treated as unassigned. Example file: `examples/rb-import.csv`. Source imports skip existing references and retain original case/local review state rather than silently updating.

This intake adapter starts imported cases at Pending and calculates the illustrative policy deadline. It does not migrate legacy source dispositions/history; establish subsequent state through an authorized, audited workflow. Full historical/status synchronization requires an authorized versioned adapter.

Decisions: `Related — coordination required`, `Confirmed duplicate issue`, `Same institution — independent issues`, `Not related`, `Needs additional information`. First two require a participating officer, deadline no earlier than today and next action. Reviews do not mutate the original case disposition. Re-review uses current relationship version, with previous decisions preserved in case events.
