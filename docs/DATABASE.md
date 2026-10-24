# Database

SQLite, not PostgreSQL. Default ignored path `./data/institution360.sqlite`. Migration `server/migrations/001_initial.sql` runs idempotently from `openDb`; `schema_migrations` records version 1. Add versioned migrations for future changes; never modify a live schema with reset.

| Table | Purpose / constraints |
|---|---|
| schema_migrations | Applied version / timestamp |
| bureaus | RB, PGRC, RO identifiers |
| users | Unique email, salted password hash, constrained role and bureau FK |
| sessions | SHA-256 token hash, user FK, expiry |
| institutions | Unique permanent ID, name, region, address |
| aliases | Unique normalized approved alias, institution FK |
| sla_policies | Category, 1–365 calendar days, illustrative governing rule |
| cases | Unique ID, original name/ID/region, resolved institution FK, identity state, source, category, bureau/officer, state, deadlines, next action, restricted flag, version; unique source/reference pair |
| events | Case/actor/bureau FKs, action, remarks, UTC timestamp; update/delete triggers abort |
| relationships | Canonical sorted pair, type, heuristic score, JSON reasons, latest review/reviewer/version; unique pair |
| coordination_tasks | Relationship/officer FKs, deadline, next action, state |
| documents | Case/uploader FKs, TXT/PDF/PNG/JPG BLOB, verified MIME, name/date |
| notifications | User/case FKs, kind/message, read time, deduplication key |
| import_runs | Actor, source, created/skipped counts and timestamp |

Case events preserve prior review decisions even though the relationship table displays the latest decision. Original source references are never erased. Case/institution IDs are immutable in this prototype apart from officer-confirmed resolution of unresolved institution identities.

Transactions use `BEGIN IMMEDIATE`, nested savepoints, rollback on any failure. Optimistic versions reject stale case and review changes with HTTP 409. Indexed institution/status/bureau supports candidate retrieval. SQLite prepared bindings protect SQL parameters. No ORM required.

`npm run seed`: six entirely fictional institutions, verified aliases, five demo accounts and thirteen cases including overlap, unrelated issue, overdue, restricted, disposed and unresolved cases. Repeat execution skips existing database content. `npm run reset:demo` requires non-production, DEMO_MODE, password and a relative `./data/` database path. Stop server first. Backup a real SQLite database using the SQLite backup mechanism or stop/checkpoint the service before copying; do not copy a live main file while ignoring WAL. Production backup/restore procedures still require implementation and rehearsal.
