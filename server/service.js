import { randomUUID } from "node:crypto";
import {
  caseInput,
  resolveInstitution,
  compareCases,
  canRead,
  canWrite,
  deadline,
  indiaToday,
  transitions,
} from "./domain.js";
import { transaction } from "./db.js";
export const fail = (status, message) =>
  Object.assign(new Error(message), { status });
export const now = () => new Date().toISOString();
export function addEvent(db, c, user, action, remarks) {
  db.prepare("INSERT INTO events VALUES(?,?,?,?,?,?,?)").run(
    randomUUID(),
    c.id,
    user.id,
    c.bureau,
    action,
    remarks,
    now(),
  );
}
export function notify(db, c, message, kind, key) {
  for (const u of db
    .prepare("SELECT * FROM users WHERE role='admin' OR bureau=?")
    .all(c.bureau))
    db.prepare(
      "INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,?,?)",
    ).run(randomUUID(), u.id, c.id, message, kind, null, now(), key);
}
export function detect(db, c) {
  if (!c.institution_id || c.status === "Disposed") return;
  for (const other of db
    .prepare(
      "SELECT * FROM cases WHERE institution_id=? AND bureau<>? AND status<>'Disposed' AND id<>?",
    )
    .all(c.institution_id, c.bureau, c.id)) {
    const [a, b] = [c, other].sort((x, y) => x.id.localeCompare(y.id));
    const result = compareCases(a, b);
    const id = randomUUID();
    const inserted = db
      .prepare(
        "INSERT OR IGNORE INTO relationships(id,case_a,case_b,kind,score,reasons) VALUES(?,?,?,?,?,?)",
      )
      .run(
        id,
        a.id,
        b.id,
        result.kind,
        result.score,
        JSON.stringify(result.reasons),
      );
    if (inserted.changes && result.kind === "Potential issue overlap") {
      for (const u of db
        .prepare("SELECT * FROM users")
        .all()
        .filter(
          (u) =>
            canRead(u, a) &&
            canRead(u, b) &&
            (u.role === "admin" || [a.bureau, b.bureau].includes(u.bureau)),
        ))
        db.prepare(
          "INSERT OR IGNORE INTO notifications VALUES(?,?,?,?,?,?,?,?)",
        ).run(
          randomUUID(),
          u.id,
          c.id,
          `Potential overlapping cases – coordination required: ${a.id} / ${b.id}`,
          "Overlap",
          null,
          now(),
          id,
        );
    }
  }
}
export function createCase(db, user, raw) {
  if (user.role === "viewer") throw fail(403, "Monitoring role is read-only");
  const input = caseInput.parse(raw);
  if (user.role !== "admin" && input.bureau !== user.bureau)
    throw fail(403, "You may register records only for your bureau");
  if (input.receivedAt > indiaToday())
    throw fail(400, "Receipt date cannot be in the future");
  if (
    input.officerId &&
    !db
      .prepare(
        "SELECT id FROM users WHERE id=? AND bureau=? AND role='officer'",
      )
      .get(input.officerId, input.bureau)
  )
    throw fail(400, "Assignee must be an officer in the selected bureau");
  const existing = db
    .prepare("SELECT id FROM cases WHERE source=? AND source_id=?")
    .get(input.source, input.sourceId);
  if (existing)
    throw fail(
      409,
      "Source record already exists; existing cases and local review history are preserved",
    );
  const identity = resolveInstitution(db, input),
    sla = db
      .prepare("SELECT * FROM sla_policies WHERE category=?")
      .get(input.category);
  const c = {
    id: `${input.bureau}-${randomUUID().slice(0, 8).toUpperCase()}`,
    bureau: input.bureau,
  };
  const stamp = now();
  db.prepare(
    "INSERT INTO cases(id,institution_id,institution_input,permanent_input,region_input,identity_state,title,description,category,period,evidence_ref,bureau,officer_id,status,received_at,due_at,updated_at,next_action,source,source_id,synced_at,restricted) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    c.id,
    identity.id,
    input.institutionName,
    input.permanentId,
    input.region,
    identity.state,
    input.title,
    input.description,
    input.category,
    input.period,
    input.evidenceRef,
    input.bureau,
    input.officerId || null,
    "Pending",
    input.receivedAt,
    deadline(input.receivedAt, sla.days),
    stamp,
    "Initial scrutiny",
    input.source,
    input.sourceId,
    stamp,
    Number(input.restricted),
  );
  addEvent(
    db,
    c,
    user,
    "Registered",
    `${input.source} / ${input.sourceId}. ${identity.state}. SLA: ${sla.rule} (${sla.days} calendar days).`,
  );
  const record = db.prepare("SELECT * FROM cases WHERE id=?").get(c.id);
  detect(db, record);
  notify(
    db,
    record,
    `New case registered: ${record.id}`,
    "Assignment",
    `created:${record.id}`,
  );
  return record;
}
export function authorizedCase(db, user, id, write = false) {
  const c = db.prepare("SELECT * FROM cases WHERE id=?").get(id);
  if (!c || !canRead(user, c))
    throw fail(404, "Case not found or access restricted");
  if (write && !canWrite(user, c))
    throw fail(
      403,
      "Only the owning bureau or administrator may modify this case",
    );
  return c;
}
export function updateCase(db, user, id, input) {
  return transaction(db, () => {
    const c = authorizedCase(db, user, id, true);
    if (c.version !== input.version)
      throw fail(
        409,
        "Case changed since you opened it; refresh before saving",
      );
    if (
      input.status &&
      input.status !== c.status &&
      !transitions[c.status].includes(input.status)
    )
      throw fail(400, "Invalid status transition");
    if (
      input.status === "Transferred" &&
      (!input.bureau || input.bureau === c.bureau)
    )
      throw fail(400, "Transfer requires a different destination bureau");
    if (
      input.bureau &&
      input.bureau !== c.bureau &&
      input.status !== "Transferred"
    )
      throw fail(400, "Bureau changes require a transfer");
    const bureau = input.bureau || c.bureau;
    const officer =
      input.officerId === undefined
        ? bureau !== c.bureau
          ? null
          : c.officer_id
        : input.officerId;
    if (
      officer &&
      !db
        .prepare(
          "SELECT id FROM users WHERE id=? AND bureau=? AND role='officer'",
        )
        .get(officer, bureau)
    )
      throw fail(400, "Assignee must be an officer in destination bureau");
    db.prepare(
      "UPDATE cases SET status=?,bureau=?,officer_id=?,next_action=?,updated_at=?,version=version+1 WHERE id=?",
    ).run(
      input.status || c.status,
      bureau,
      officer,
      input.nextAction ?? c.next_action,
      now(),
      id,
    );
    addEvent(
      db,
      c,
      user,
      `Case updated: ${c.status} → ${input.status || c.status}`,
      `${input.remarks} | Bureau ${c.bureau} → ${bureau}; officer ${officer || "unassigned"}; next action: ${input.nextAction ?? c.next_action}`,
    );
    const updated = db.prepare("SELECT * FROM cases WHERE id=?").get(id);
    detect(db, updated);
    notify(
      db,
      updated,
      `Case updated: ${id}`,
      "Workflow",
      `update:${id}:${updated.version}`,
    );
    return updated;
  });
}
export function visibleCases(db, user, filters = {}) {
  let rows = db
    .prepare(
      "SELECT c.*,i.name AS institution_name,i.permanent_id,COALESCE(i.region,c.region_input) AS region,u.name AS officer_name FROM cases c LEFT JOIN institutions i ON i.id=c.institution_id LEFT JOIN users u ON u.id=c.officer_id ORDER BY c.updated_at DESC,c.id",
    )
    .all()
    .filter((c) => canRead(user, c));
  for (const key of [
    "bureau",
    "status",
    "category",
    "region",
    "institution_id",
  ])
    if (filters[key]) rows = rows.filter((c) => c[key] === filters[key]);
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    rows = rows.filter((c) =>
      [
        c.id,
        c.source_id,
        c.institution_name,
        c.institution_input,
        c.permanent_id,
        c.title,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters.from) rows = rows.filter((c) => c.received_at >= filters.from);
  if (filters.to) rows = rows.filter((c) => c.received_at <= filters.to);
  return rows;
}
export function visibleRelationships(db, user) {
  return db
    .prepare("SELECT * FROM relationships ORDER BY score DESC")
    .all()
    .flatMap((r) => {
      const a = db.prepare("SELECT * FROM cases WHERE id=?").get(r.case_a),
        b = db.prepare("SELECT * FROM cases WHERE id=?").get(r.case_b);
      if (!canRead(user, a) || !canRead(user, b)) return [];
      return [
        {
          ...r,
          reasons: JSON.parse(r.reasons),
          a,
          b,
          active:
            a.status !== "Disposed" &&
            b.status !== "Disposed" &&
            a.bureau !== b.bureau,
          tasks: db
            .prepare(
              "SELECT t.*,u.name AS officer_name FROM coordination_tasks t JOIN users u ON u.id=t.officer_id WHERE relationship_id=?",
            )
            .all(r.id),
        },
      ];
    });
}
export function slaNotifications(db) {
  const today = indiaToday(),
    soon = deadline(today, 3);
  for (const c of db
    .prepare("SELECT * FROM cases WHERE status<>'Disposed' AND due_at<=?")
    .all(soon))
    notify(
      db,
      c,
      `${c.due_at < today ? "Overdue" : "Due soon"}: ${c.id} · due ${c.due_at}`,
      "Timeline",
      `sla:${c.id}:${c.due_at}:${c.due_at < today ? "overdue" : "soon"}`,
    );
}
