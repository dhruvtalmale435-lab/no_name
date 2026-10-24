import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { createApp } from "../server/app.js";
import { seed } from "../server/seed.js";
import { deadline, indiaToday } from "../server/domain.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const password = "IntegrationPassword!";
let db, server, base, admin, rb, pgrc, viewer, temp;
async function request(
  path,
  { cookie, method = "GET", body, headers = {} } = {},
) {
  const res = await fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  return {
    status: res.status,
    data,
    cookie: res.headers.get("set-cookie")?.split(";")[0],
    headers: res.headers,
  };
}
async function login(email) {
  return (
    await request("/login", { method: "POST", body: { email, password } })
  ).cookie;
}
const body = (suffix = "1", overrides = {}) => ({
  title: "Examination fee allegation " + suffix,
  description:
    "Students allege unauthorized examination fees collected in the autumn semester.",
  institutionName: "N. Valley Inst. of Technology",
  permanentId: "",
  region: "Northern",
  category: "Fees",
  period: "2026 autumn",
  bureau: "RB",
  source: "API test",
  sourceId: "TEST-" + suffix,
  receivedAt: indiaToday(),
  ...overrides,
});
before(async () => {
  temp = mkdtempSync(join(tmpdir(), "bureausetu-"));
  db = openDb(join(temp, "test.sqlite"));
  seed(db, password);
  server = createApp(db, { demo: true }).listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
  admin = await login("admin@demo.local");
  rb = await login("rb@demo.local");
  pgrc = await login("pgrc@demo.local");
  viewer = await login("viewer@demo.local");
});
after(async () => {
  await new Promise((r) => server.close(r));
  db.close();
  rmSync(temp, { recursive: true, force: true });
});
test("Unauthenticated requests denied; health genuinely queries database", async () => {
  assert.equal((await request("/cases")).status, 401);
  assert.equal((await request("/health")).data.database, "sqlite");
});
test("Invalid credentials fail; session is HttpOnly and SameSite", async () => {
  const r = await request("/login", {
    method: "POST",
    body: { email: "admin@demo.local", password: "bad" },
  });
  assert.equal(r.status, 401);
  const good = await request("/login", {
    method: "POST",
    body: { email: "admin@demo.local", password },
  });
  assert.match(good.headers.get("set-cookie"), /HttpOnly/);
  assert.match(good.headers.get("set-cookie"), /SameSite=Strict/);
});
test("Seed is repeatable and migration tracked", () => {
  const count = db.prepare("SELECT count(*) n FROM cases").get().n;
  seed(db, password);
  assert.equal(db.prepare("SELECT count(*) n FROM cases").get().n, count);
  assert.equal(
    db.prepare("SELECT version FROM schema_migrations").get().version,
    1,
  );
});
test("Create persists, alias resolves, dashboard and filters reconcile", async () => {
  const r = await request("/cases", {
    cookie: rb,
    method: "POST",
    body: body("create"),
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.institution_id, "north-valley");
  const stored = await request("/cases/" + r.data.id, { cookie: admin });
  assert.equal(stored.data.events.length, 1);
  const listing = await request("/cases?q=" + r.data.id, { cookie: admin });
  assert.equal(listing.data.total, 1);
  const stats = await request("/analytics", { cookie: admin });
  assert.equal(
    stats.data.total,
    db.prepare("SELECT count(*) n FROM cases").get().n,
  );
});
test("Invalid input, future receipt and duplicate source rejected without storage", async () => {
  const count = db.prepare("SELECT count(*) n FROM cases").get().n;
  assert.equal(
    (
      await request("/cases", {
        cookie: rb,
        method: "POST",
        body: body("bad", { description: "short" }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/cases", {
        cookie: rb,
        method: "POST",
        body: body("future", { receivedAt: deadline(indiaToday(), 1) }),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/cases", {
        cookie: rb,
        method: "POST",
        body: body("create"),
      })
    ).status,
    409,
  );
  assert.equal(db.prepare("SELECT count(*) n FROM cases").get().n, count);
});
test("Viewer cannot create; officer cannot register into another bureau", async () => {
  assert.equal(
    (
      await request("/cases", {
        cookie: viewer,
        method: "POST",
        body: body("viewer"),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/cases", {
        cookie: rb,
        method: "POST",
        body: body("wrongbureau", { bureau: "PGRC" }),
      })
    ).status,
    403,
  );
});
test("Restricted case excluded from direct read, list, analytics and export", async () => {
  const restricted = db.prepare("SELECT * FROM cases WHERE restricted=1").get();
  assert.equal(
    (await request("/cases/" + restricted.id, { cookie: rb })).status,
    404,
  );
  const list = await request("/cases?limit=100", { cookie: rb });
  assert.ok(!list.data.items.some((c) => c.id === restricted.id));
  assert.equal(
    (await request("/analytics", { cookie: rb })).data.total,
    list.data.total,
  );
  assert.ok(
    !(await request("/reports/export", { cookie: rb })).data.includes(
      restricted.id,
    ),
  );
});
test("Status, assignment and transfer persist audit and enforce stale update protection", async () => {
  let c = (
    await request("/cases", {
      cookie: rb,
      method: "POST",
      body: body("workflow"),
    })
  ).data;
  assert.equal(
    (
      await request("/cases/" + c.id, {
        cookie: pgrc,
        method: "PATCH",
        body: {
          version: c.version,
          status: "Under Process",
          remarks: "Unauthorized action",
        },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/cases/" + c.id, {
        cookie: rb,
        method: "PATCH",
        body: {
          version: c.version,
          status: "Disposed",
          remarks: "Invalid transition",
        },
      })
    ).status,
    400,
  );
  let updated = await request("/cases/" + c.id, {
    cookie: rb,
    method: "PATCH",
    body: {
      version: c.version,
      status: "Under Process",
      officerId: "rb",
      remarks: "Initial assessment underway",
      nextAction: "Request evidence",
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.officer_id, "rb");
  assert.equal(
    (
      await request("/cases/" + c.id, {
        cookie: rb,
        method: "PATCH",
        body: { version: 1, remarks: "Stale update attempt" },
      })
    ).status,
    409,
  );
  updated = await request("/cases/" + c.id, {
    cookie: rb,
    method: "PATCH",
    body: {
      version: 2,
      status: "Transferred",
      bureau: "PGRC",
      officerId: "pgrc",
      remarks: "Transfer to grievance handling",
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.bureau, "PGRC");
  assert.equal(
    (
      await request("/cases/" + c.id, {
        cookie: rb,
        method: "PATCH",
        body: { version: 3, remarks: "Former owner cannot edit" },
      })
    ).status,
    403,
  );
  const detail = await request("/cases/" + c.id, { cookie: pgrc });
  assert.equal(detail.data.events.length, 3);
});
test("Concurrent updates allow one winner and reject second stale edit", async () => {
  const c = (
    await request("/cases", {
      cookie: rb,
      method: "POST",
      body: body("concurrent"),
    })
  ).data;
  const results = await Promise.all(
    [1, 2].map((i) =>
      request("/cases/" + c.id, {
        cookie: rb,
        method: "PATCH",
        body: {
          version: 1,
          status: "Under Process",
          remarks: "Concurrent action " + i,
        },
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
});
test("Issue and unrelated same-institution pairs remain distinct; reviewer decision and task audited", async () => {
  const r = (await request("/overlaps", { cookie: admin })).data;
  assert.ok(r.some((r) => r.kind === "Institution activity"));
  const pair = r.find((r) => r.active && r.kind === "Potential issue overlap");
  assert.ok(pair.reasons.includes("Same alleged event period"));
  const input = {
    version: pair.version,
    decision: "Related — coordination required",
    justification: "Shared fee circular requires joint evidence review",
    officerId: "rb",
    dueAt: deadline(indiaToday(), 3),
    nextAction: "Share evidence and agree lead bureau",
  };
  assert.equal(
    (
      await request("/overlaps/" + pair.id + "/review", {
        cookie: viewer,
        method: "POST",
        body: input,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/overlaps/" + pair.id + "/review", {
        cookie: admin,
        method: "POST",
        body: input,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/overlaps/" + pair.id + "/review", {
        cookie: admin,
        method: "POST",
        body: input,
      })
    ).status,
    409,
  );
  assert.ok(
    (await request("/cases/" + pair.a.id, { cookie: admin })).data.events.some(
      (e) => e.action === "Coordination review",
    ),
  );
  const task = db
    .prepare("SELECT * FROM coordination_tasks WHERE relationship_id=?")
    .get(pair.id);
  assert.equal(
    (
      await request("/tasks/" + task.id, {
        cookie: pgrc,
        method: "PATCH",
        body: { state: "Completed" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/tasks/" + task.id, {
        cookie: rb,
        method: "PATCH",
        body: { state: "Completed" },
      })
    ).status,
    200,
  );
});
test("Unresolved identity requires administrator confirmation and retains original input", async () => {
  let c = (
    await request("/cases", {
      cookie: rb,
      method: "POST",
      body: body("identity", {
        institutionName: "North Valley New Alias",
        permanentId: "UNKNOWN",
      }),
    })
  ).data;
  assert.equal(c.institution_id, null);
  const input = {
    institutionId: "north-valley",
    version: 1,
    remarks: "Institution confirmed using original correspondence",
    approveAlias: true,
  };
  assert.equal(
    (
      await request("/cases/" + c.id + "/identity", {
        cookie: rb,
        method: "POST",
        body: input,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/cases/" + c.id + "/identity", {
        cookie: admin,
        method: "POST",
        body: input,
      })
    ).status,
    200,
  );
  c = (await request("/cases/" + c.id, { cookie: admin })).data;
  assert.equal(c.institution_input, "North Valley New Alias");
  assert.equal(c.permanent_input, "UNKNOWN");
  assert.equal(c.institution_id, "north-valley");
});
test("Atomic imports are idempotent and preserve existing source/local history", async () => {
  const record = body("import");
  let r = await request("/import", {
    cookie: rb,
    method: "POST",
    body: { source: "RB import", records: [record] },
  });
  assert.equal(r.data.created, 1);
  r = await request("/import", {
    cookie: rb,
    method: "POST",
    body: { source: "RB import", records: [record] },
  });
  assert.equal(r.data.skipped, 1);
  const count = db.prepare("SELECT count(*) n FROM cases").get().n;
  r = await request("/import", {
    cookie: rb,
    method: "POST",
    body: {
      source: "RB import",
      records: [body("atomic"), { ...body("invalid"), description: "bad" }],
    },
  });
  assert.equal(r.status, 400);
  assert.equal(db.prepare("SELECT count(*) n FROM cases").get().n, count);
});
test("Attachments enforce authorization and restrictive file types", async () => {
  const c = (
    await request("/cases", {
      cookie: rb,
      method: "POST",
      body: body("attachment", { restricted: true }),
    })
  ).data;
  assert.equal(
    (
      await request("/cases/" + c.id + "/documents", {
        cookie: rb,
        method: "POST",
        body: { name: "unsafe.html", content: "<script>alert(1)</script>" },
      })
    ).status,
    400,
  );
  const doc = await request("/cases/" + c.id + "/documents", {
    cookie: rb,
    method: "POST",
    body: { name: "evidence.txt", content: "Synthetic document evidence" },
  });
  assert.equal(doc.status, 201);
  assert.equal(
    (await request("/documents/" + doc.data.id, { cookie: pgrc })).status,
    404,
  );
  assert.equal(
    (await request("/documents/" + doc.data.id, { cookie: rb })).data,
    "Synthetic document evidence",
  );
  const notices = (await request("/notifications", { cookie: pgrc })).data;
  assert.ok(!notices.some((n) => n.message.includes(c.id)));
});
test("Notifications are user-scoped and read status persists", async () => {
  const ns = (await request("/notifications", { cookie: rb })).data;
  assert.ok(ns.length);
  await request("/notifications/" + ns[0].id, { cookie: rb, method: "PATCH" });
  assert.ok(
    (await request("/notifications", { cookie: rb })).data.find(
      (n) => n.id === ns[0].id,
    ).read_at,
  );
});
test("Policies require admin and do not rewrite existing deadlines", async () => {
  const original = db.prepare("SELECT due_at FROM cases LIMIT 1").get().due_at;
  assert.equal(
    (
      await request("/policies/Fees", {
        cookie: rb,
        method: "PATCH",
        body: { days: 25, rule: "Illustrative revised demo policy" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/policies/Fees", {
        cookie: admin,
        method: "PATCH",
        body: { days: 25, rule: "Illustrative revised demo policy" },
      })
    ).status,
    200,
  );
  assert.equal(
    db.prepare("SELECT due_at FROM cases LIMIT 1").get().due_at,
    original,
  );
});
test("Cross-origin mutations rejected, unknown API is JSON, SQL payload does not alter tables", async () => {
  assert.equal(
    (
      await request("/logout", {
        cookie: rb,
        method: "POST",
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  assert.equal((await request("/missing", { cookie: rb })).status, 404);
  assert.equal(
    (
      await request(
        "/cases?q=" + encodeURIComponent("'; DROP TABLE users;--"),
        { cookie: rb },
      )
    ).data.total,
    0,
  );
  assert.equal(db.prepare("SELECT count(*) n FROM users").get().n, 5);
});
test("Audit events cannot be edited or deleted", () => {
  assert.throws(
    () => db.prepare("UPDATE events SET remarks='tampered'").run(),
    /append-only/,
  );
  assert.throws(() => db.prepare("DELETE FROM events").run(), /append-only/);
});
test("Logout and session expiry invalidate protected access", async () => {
  const cookie = await login("ro@demo.local");
  assert.equal(
    (await request("/logout", { cookie, method: "POST" })).status,
    200,
  );
  assert.equal((await request("/me", { cookie })).status, 401);
  const expired = await login("ro@demo.local");
  db.prepare(
    "UPDATE sessions SET expires_at='2000-01-01T00:00:00Z' WHERE user_id='ro'",
  ).run();
  assert.equal((await request("/me", { cookie: expired })).status, 401);
});
test("Database survives closing and reopening connection", () => {
  const second = openDb(join(temp, "test.sqlite"));
  assert.ok(
    second.prepare("SELECT id FROM cases WHERE source_id='TEST-create'").get(),
  );
  second.close();
});
test("CSV imports validate source bureau and idempotently persist quoted records", async () => {
  const record = body("csv", { title: "CSV, quoted examination complaint" });
  const headers = Object.keys(record),
    quote = (s) => '"' + String(s).replaceAll('"', '""') + '"';
  const csv = [
    headers.map(quote).join(","),
    headers.map((k) => quote(record[k])).join(","),
  ].join("\r\n");
  const payload = { source: "RB import", csv };
  assert.equal(
    (await request("/import", { cookie: rb, method: "POST", body: payload }))
      .data.created,
    1,
  );
  assert.equal(
    (await request("/import", { cookie: rb, method: "POST", body: payload }))
      .data.skipped,
    1,
  );
  assert.equal(
    (await request("/import", { cookie: pgrc, method: "POST", body: payload }))
      .status,
    403,
  );
  assert.equal(
    (
      await request("/import", {
        cookie: admin,
        method: "POST",
        body: { source: "PGRC import", records: [body("source-mismatch")] },
      })
    ).status,
    400,
  );
});
test("PDF and image uploads validate signatures and secure downloads", async () => {
  const c = (
    await request("/cases", {
      cookie: rb,
      method: "POST",
      body: body("binary"),
    })
  ).data;
  assert.equal(
    (
      await request("/cases/" + c.id + "/documents", {
        cookie: rb,
        method: "POST",
        body: {
          name: "fake.pdf",
          base64: Buffer.from("not PDF").toString("base64"),
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/cases/" + c.id + "/documents", {
        cookie: rb,
        method: "POST",
        body: {
          name: "fake.png",
          base64: Buffer.from("not PNG").toString("base64"),
        },
      })
    ).status,
    400,
  );
  const pdf = await request("/cases/" + c.id + "/documents", {
    cookie: rb,
    method: "POST",
    body: {
      name: "support.pdf",
      base64: Buffer.from("%PDF-1.4\nSynthetic test fixture\n%%EOF").toString(
        "base64",
      ),
    },
  });
  assert.equal(pdf.status, 201);
  const downloaded = await request("/documents/" + pdf.data.id, { cookie: rb });
  assert.equal(downloaded.headers.get("content-type"), "application/pdf");
  assert.match(downloaded.headers.get("content-disposition"), /^attachment;/);
});
test("Monthly and quarterly performance count actual scoped disposal events", async () => {
  const result = (await request("/analytics", { cookie: admin })).data;
  assert.equal(
    result.monthlyPerformance.reduce((n, r) => n + r.total, 0),
    result.total,
  );
  assert.equal(
    result.quarterlyPerformance.reduce((n, r) => n + r.total, 0),
    result.total,
  );
  const actual = db
    .prepare("SELECT count(*) n FROM events WHERE action LIKE '%→ Disposed'")
    .get().n;
  assert.equal(
    result.monthlyPerformance.reduce((n, r) => n + r.disposalActions, 0),
    actual,
  );
  assert.equal(
    result.quarterlyPerformance.reduce((n, r) => n + r.disposalActions, 0),
    actual,
  );
});
