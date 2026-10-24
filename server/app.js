import express from "express";
import helmet from "helmet";
import { parseCsv } from "./import.js";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { transaction } from "./db.js";
import {
  verifyPassword,
  canRead,
  canWrite,
  normalize,
  indiaToday,
  categories,
  statuses,
} from "./domain.js";
import {
  fail,
  now,
  createCase,
  authorizedCase,
  updateCase,
  visibleCases,
  visibleRelationships,
  addEvent,
  detect,
  slaNotifications,
} from "./service.js";
const digest = (s) => createHash("sha256").update(s).digest("hex");
const updateInput = z.object({
  version: z.number().int().positive(),
  status: z.enum(statuses).optional(),
  bureau: z.enum(["RB", "PGRC", "RO"]).optional(),
  officerId: z.string().max(100).nullable().optional(),
  nextAction: z.string().trim().max(1000).optional(),
  remarks: z.string().trim().min(5).max(2000),
});
export function createApp(db, { production = false, demo = false } = {}) {
  const app = express(),
    attempts = new Map();
  app.disable("x-powered-by");
  if (production) app.set("trust proxy", "loopback");
  app.use(
    helmet({
      contentSecurityPolicy: production ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: "3mb" }));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.get("host")}`
    )
      return res.status(403).json({ error: "Cross-origin mutation refused" });
    next();
  });
  app.get("/api/health", (req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok", database: "sqlite", demo });
  });
  app.post("/api/login", (req, res) => {
    const { email, password } = z
      .object({
        email: z.email().max(200),
        password: z.string().min(1).max(200),
      })
      .parse(req.body);
    const key = req.ip,
      entry = attempts.get(key) || { count: 0, until: Date.now() + 900000 };
    if (entry.until < Date.now()) {
      entry.count = 0;
      entry.until = Date.now() + 900000;
    }
    if (entry.count >= 15)
      throw fail(429, "Too many attempts; try again in 15 minutes");
    entry.count++;
    attempts.set(key, entry);
    if (attempts.size > 10000)
      for (const [k, v] of attempts)
        if (v.until < Date.now()) attempts.delete(k);
    const u = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(email.toLowerCase());
    if (!u || !verifyPassword(password, u.password))
      throw fail(401, "Email or password is incorrect");
    attempts.delete(key);
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now());
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      digest(token),
      u.id,
      new Date(Date.now() + 8 * 3600000).toISOString(),
    );
    res.cookie("session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: production,
      maxAge: 8 * 3600000,
      path: "/",
    });
    res.json({ ok: true });
  });
  app.use("/api", (req, res, next) => {
    const raw = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("session="))
      ?.slice(8);
    const u =
      raw &&
      db
        .prepare(
          "SELECT u.id,u.name,u.email,u.role,u.bureau FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires_at>?",
        )
        .get(digest(raw), now());
    if (!u) return res.status(401).json({ error: "Sign in to continue" });
    req.user = u;
    req.sessionHash = digest(raw);
    next();
  });
  app.post("/api/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token=?").run(req.sessionHash);
    res.clearCookie("session", { path: "/" });
    res.json({ ok: true });
  });
  app.get("/api/me", (req, res) => res.json({ user: req.user, demo }));
  app.get("/api/meta", (req, res) =>
    res.json({
      bureaus: db.prepare("SELECT * FROM bureaus").all(),
      officers: db
        .prepare("SELECT id,name,bureau FROM users WHERE role='officer'")
        .all(),
      categories,
      statuses,
      policies: db.prepare("SELECT * FROM sla_policies").all(),
    }),
  );
  app.get("/api/institutions", (req, res) =>
    res.json(
      db
        .prepare("SELECT * FROM institutions ORDER BY name")
        .all()
        .map((i) => {
          const rows = visibleCases(db, req.user, { institution_id: i.id });
          return {
            ...i,
            cases: rows.length,
            active: rows.filter((c) => c.status !== "Disposed").length,
            bureaus: [...new Set(rows.map((c) => c.bureau))],
            aliases: db
              .prepare("SELECT name FROM aliases WHERE institution_id=?")
              .all(i.id)
              .map((a) => a.name),
          };
        }),
    ),
  );
  app.get("/api/cases", (req, res) => {
    const rows = visibleCases(db, req.user, req.query);
    const page = Math.max(1, Number(req.query.page) || 1),
      limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    res.json({
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    });
  });
  app.post("/api/cases", (req, res) =>
    res
      .status(201)
      .json(transaction(db, () => createCase(db, req.user, req.body))),
  );
  app.get("/api/cases/:id", (req, res) => {
    const c = authorizedCase(db, req.user, req.params.id);
    res.json({
      ...c,
      canWrite: canWrite(req.user, c),
      events: db
        .prepare(
          "SELECT e.*,u.name AS actor FROM events e JOIN users u ON u.id=e.actor_id WHERE case_id=? ORDER BY created_at,id",
        )
        .all(c.id),
      documents: db
        .prepare(
          "SELECT id,name,mime,created_at FROM documents WHERE case_id=?",
        )
        .all(c.id),
    });
  });
  app.patch("/api/cases/:id", (req, res) =>
    res.json(
      updateCase(db, req.user, req.params.id, updateInput.parse(req.body)),
    ),
  );
  app.post("/api/cases/:id/identity", (req, res) => {
    if (req.user.role !== "admin")
      throw fail(403, "Institution verification requires an administrator");
    const input = z
      .object({
        institutionId: z.string(),
        version: z.number().int(),
        remarks: z.string().trim().min(10).max(2000),
        approveAlias: z.boolean().default(false),
      })
      .parse(req.body);
    res.json(
      transaction(db, () => {
        const c = authorizedCase(db, req.user, req.params.id, true);
        if (c.version !== input.version)
          throw fail(409, "Case changed; refresh");
        if (c.institution_id)
          throw fail(400, "Only unresolved identities may be confirmed");
        if (
          !db
            .prepare("SELECT id FROM institutions WHERE id=?")
            .get(input.institutionId)
        )
          throw fail(400, "Unknown institution");
        db.prepare(
          "UPDATE cases SET institution_id=?,identity_state=?,updated_at=?,version=version+1 WHERE id=?",
        ).run(input.institutionId, "Officer verified", now(), c.id);
        if (input.approveAlias) {
          const name = normalize(c.institution_input),
            existing = db
              .prepare("SELECT * FROM aliases WHERE name=?")
              .get(name);
          if (existing && existing.institution_id !== input.institutionId)
            throw fail(409, "Alias belongs to another institution");
          db.prepare("INSERT OR IGNORE INTO aliases VALUES(?,?)").run(
            name,
            input.institutionId,
          );
        }
        addEvent(
          db,
          c,
          req.user,
          "Identity verified",
          `${input.remarks}; institution ${input.institutionId}; original input retained`,
        );
        detect(db, db.prepare("SELECT * FROM cases WHERE id=?").get(c.id));
        return { ok: true };
      }),
    );
  });
  app.get("/api/overlaps", (req, res) =>
    res.json(visibleRelationships(db, req.user)),
  );
  app.post("/api/overlaps/:id/review", (req, res) => {
    const input = z
      .object({
        version: z.number().int().positive(),
        decision: z.enum([
          "Related — coordination required",
          "Confirmed duplicate issue",
          "Same institution — independent issues",
          "Not related",
          "Needs additional information",
        ]),
        justification: z.string().trim().min(10).max(2000),
        officerId: z.string().optional(),
        dueAt: z.iso.date().optional(),
        nextAction: z.string().trim().max(1000).optional(),
      })
      .parse(req.body);
    res.json(
      transaction(db, () => {
        const r = visibleRelationships(db, req.user).find(
          (r) => r.id === req.params.id,
        );
        if (!r) throw fail(404, "Relationship not found");
        if (
          req.user.role === "viewer" ||
          (!canWrite(req.user, r.a) && !canWrite(req.user, r.b))
        )
          throw fail(403, "Review requires ownership of a participating case");
        if (r.version !== input.version)
          throw fail(409, "Review changed; refresh");
        if (!r.active)
          throw fail(
            400,
            "This pair is historical; its cases are no longer active in separate bureaus",
          );
        if (
          [
            "Related — coordination required",
            "Confirmed duplicate issue",
          ].includes(input.decision)
        ) {
          const o = db
            .prepare("SELECT * FROM users WHERE id=? AND role='officer'")
            .get(input.officerId || "");
          if (
            !o ||
            ![r.a.bureau, r.b.bureau].includes(o.bureau) ||
            !input.dueAt ||
            input.dueAt < indiaToday() ||
            !input.nextAction ||
            input.nextAction.length < 5
          )
            throw fail(
              400,
              "Select a participating officer, future deadline and coordination action",
            );
          db.prepare(
            "INSERT INTO coordination_tasks VALUES(?,?,?,?,?,?,?)",
          ).run(
            randomUUID(),
            r.id,
            o.id,
            input.dueAt,
            input.nextAction,
            "Open",
            now(),
          );
        }
        db.prepare(
          "UPDATE relationships SET decision=?,justification=?,reviewer_id=?,reviewed_at=?,version=version+1 WHERE id=?",
        ).run(input.decision, input.justification, req.user.id, now(), r.id);
        for (const c of [r.a, r.b])
          addEvent(
            db,
            c,
            req.user,
            "Coordination review",
            `${input.decision}: ${input.justification}`,
          );
        return { ok: true };
      }),
    );
  });
  app.patch("/api/tasks/:id", (req, res) => {
    const { state } = z
      .object({ state: z.enum(["Open", "Completed"]) })
      .parse(req.body);
    const task = db
      .prepare("SELECT * FROM coordination_tasks WHERE id=?")
      .get(req.params.id);
    if (!task) throw fail(404, "Task not found");
    const r = visibleRelationships(db, req.user).find(
      (r) => r.id === task.relationship_id,
    );
    if (!r || (req.user.role !== "admin" && req.user.id !== task.officer_id))
      throw fail(
        403,
        "Only the assigned officer or administrator may change the task",
      );
    transaction(db, () => {
      db.prepare("UPDATE coordination_tasks SET state=? WHERE id=?").run(
        state,
        task.id,
      );
      for (const c of [r.a, r.b])
        addEvent(
          db,
          c,
          req.user,
          "Coordination task",
          `${state}: ${task.next_action}`,
        );
    });
    res.json({ ok: true });
  });
  app.post("/api/import", (req, res) => {
    if (req.user.role === "viewer")
      throw fail(403, "Import is unavailable for monitoring role");
    const input = z
      .object({
        source: z.enum(["RB import", "PGRC import", "RO import"]),
        records: z
          .array(z.record(z.string(), z.unknown()))
          .min(1)
          .max(200)
          .optional(),
        csv: z.string().min(1).max(2000000).optional(),
      })
      .refine(
        (v) => Boolean(v.records) !== Boolean(v.csv),
        "Provide either records or csv",
      )
      .parse(req.body);
    const { source } = input;
    const sourceBureau = source.split(" ")[0];
    if (req.user.role !== "admin" && req.user.bureau !== sourceBureau)
      throw fail(403, "You may import only your own bureau source");
    const records = z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(200)
      .parse(input.records || parseCsv(input.csv));
    const result = transaction(db, () => {
      let created = 0,
        skipped = 0;
      for (const raw of records) {
        if (raw.bureau !== sourceBureau)
          throw fail(
            400,
            "Every imported record must belong to the selected source bureau",
          );
        if (
          db
            .prepare("SELECT id FROM cases WHERE source=? AND source_id=?")
            .get(source, String(raw.sourceId || ""))
        ) {
          skipped++;
          continue;
        }
        createCase(db, req.user, { ...raw, source });
        created++;
      }
      db.prepare("INSERT INTO import_runs VALUES(?,?,?,?,?,?)").run(
        randomUUID(),
        source,
        req.user.id,
        created,
        skipped,
        now(),
      );
      return { created, skipped };
    });
    res.json(result);
  });
  app.get("/api/imports", (req, res) =>
    res.json(
      db
        .prepare(
          "SELECT r.*,u.name AS actor FROM import_runs r JOIN users u ON u.id=r.actor_id ORDER BY created_at DESC",
        )
        .all()
        .filter((r) => req.user.role === "admin" || r.actor_id === req.user.id),
    ),
  );
  app.post("/api/cases/:id/documents", (req, res) => {
    const c = authorizedCase(db, req.user, req.params.id, true);
    const input = z
      .object({
        name: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(
            /^[\w .()-]+\.(txt|pdf|png|jpe?g)$/i,
            "Supported documents: TXT, PDF, PNG, JPG",
          ),
        content: z.string().min(1).max(200000).optional(),
        base64: z
          .string()
          .min(4)
          .max(2800000)
          .regex(/^[A-Za-z0-9+/]*={0,2}$/)
          .optional(),
      })
      .refine(
        (v) => Boolean(v.content) !== Boolean(v.base64),
        "Provide content or base64",
      )
      .parse(req.body);
    const buffer = input.base64
      ? Buffer.from(input.base64, "base64")
      : Buffer.from(input.content);
    if (!buffer.length || buffer.length > 2 * 1024 * 1024)
      throw fail(400, "Attachment must be between 1 byte and 2 MB");
    const ext = input.name.split(".").pop().toLowerCase();
    const mime = {
      txt: "text/plain",
      pdf: "application/pdf",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    }[ext];
    if (ext === "pdf" && buffer.subarray(0, 5).toString() !== "%PDF-")
      throw fail(400, "PDF signature does not match file extension");
    if (
      ext === "png" &&
      buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    )
      throw fail(400, "PNG signature does not match file extension");
    if (
      ["jpg", "jpeg"].includes(ext) &&
      buffer.subarray(0, 3).toString("hex") !== "ffd8ff"
    )
      throw fail(400, "JPEG signature does not match file extension");
    if (ext === "txt" && buffer.includes(0))
      throw fail(400, "Binary content is not allowed in TXT");
    const id = randomUUID();
    transaction(db, () => {
      db.prepare("INSERT INTO documents VALUES(?,?,?,?,?,?,?)").run(
        id,
        c.id,
        req.user.id,
        input.name,
        mime,
        buffer,
        now(),
      );
      addEvent(db, c, req.user, "Document attached", input.name);
    });
    res.status(201).json({ id });
  });
  app.get("/api/documents/:id", (req, res) => {
    const d = db
      .prepare("SELECT * FROM documents WHERE id=?")
      .get(req.params.id);
    if (!d) throw fail(404, "Document not found");
    authorizedCase(db, req.user, d.case_id);
    res
      .set({
        "Content-Type": d.mime,
        "Content-Disposition": `attachment; filename="${d.name}"`,
        "X-Content-Type-Options": "nosniff",
      })
      .send(Buffer.from(d.content));
  });
  app.get("/api/notifications", (req, res) => {
    slaNotifications(db);
    res.json(
      db
        .prepare(
          "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
        )
        .all(req.user.id)
        .filter(
          (n) =>
            !n.case_id ||
            (() => {
              const c = db
                .prepare("SELECT * FROM cases WHERE id=?")
                .get(n.case_id);
              return c && canRead(req.user, c);
            })(),
        ),
    );
  });
  app.patch("/api/notifications/:id", (req, res) => {
    db.prepare(
      "UPDATE notifications SET read_at=? WHERE id=? AND user_id=?",
    ).run(now(), req.params.id, req.user.id);
    res.json({ ok: true });
  });
  app.get("/api/analytics", (req, res) => {
    const rows = visibleCases(db, req.user, req.query),
      today = indiaToday(),
      active = rows.filter((c) => c.status !== "Disposed"),
      overdue = active.filter((c) => c.due_at < today),
      group = (key) =>
        Object.entries(Object.groupBy(rows, (r) => r[key] || "Unresolved")).map(
          ([name, cases]) => ({
            name,
            total: cases.length,
            pending: cases.filter((c) => c.status !== "Disposed").length,
            disposed: cases.filter((c) => c.status === "Disposed").length,
          }),
        );
    const ids = new Set(rows.map((c) => c.id));
    const disposalEvents = db
      .prepare(
        "SELECT case_id,created_at FROM events WHERE action LIKE '%→ Disposed'",
      )
      .all()
      .filter((e) => ids.has(e.case_id));
    const performance = (quarter = false) => {
      const result = new Map();
      const period = (d) =>
        quarter
          ? `${d.slice(0, 4)} Q${Math.ceil(Number(d.slice(5, 7)) / 3)}`
          : d.slice(0, 7);
      const get = (key) => {
        if (!result.has(key))
          result.set(key, { name: key, total: 0, disposalActions: 0 });
        return result.get(key);
      };
      for (const c of rows) get(period(c.received_at)).total++;
      for (const e of disposalEvents)
        get(period(indiaToday(new Date(e.created_at)))).disposalActions++;
      return [...result.values()].sort((a, b) => a.name.localeCompare(b.name));
    };
    res.json({
      total: rows.length,
      active: active.length,
      disposed: rows.length - active.length,
      overdue: overdue.length,
      dueSoon: active.filter(
        (c) =>
          c.due_at >= today &&
          new Date(c.due_at) - new Date(today) <= 3 * 86400000,
      ).length,
      statuses: group("status"),
      bureaus: group("bureau"),
      regions: group("region"),
      institutions: group("institution_name"),
      monthly: group("received_at").reduce((a, x) => {
        const month = x.name.slice(0, 7),
          existing = a.find((v) => v.name === month);
        if (existing) {
          existing.total += x.total;
          existing.disposed += x.disposed;
        } else a.push({ ...x, name: month });
        return a;
      }, []),
      monthlyPerformance: performance(),
      quarterlyPerformance: performance(true),
      ageing: [
        ["0–7", 0, 7],
        ["8–30", 8, 30],
        ["31–60", 31, 60],
        ["61+", 61, Infinity],
      ].map(([label, min, max]) => ({
        name: label,
        total: active.filter((c) => {
          const days = Math.floor(
            (new Date(today) - new Date(c.received_at)) / 86400000,
          );
          return days >= min && days <= max;
        }).length,
      })),
      unresolved: rows.filter((c) => !c.institution_id).length,
      overlaps: visibleRelationships(db, req.user).filter(
        (r) => r.active && !r.decision && r.kind === "Potential issue overlap",
      ).length,
      asOf: now(),
    });
  });
  app.get("/api/reports/export", (req, res) => {
    const rows = visibleCases(db, req.user, req.query),
      keys = [
        "id",
        "institution_name",
        "permanent_id",
        "region",
        "bureau",
        "officer_name",
        "category",
        "status",
        "received_at",
        "due_at",
        "source",
        "source_id",
      ];
    const csv = (s) =>
      '"' +
      String(s ?? "")
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    res
      .set({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="institution360-cases.csv"',
      })
      .send(
        "\uFEFF" +
          [keys, ...rows.map((r) => keys.map((k) => r[k]))]
            .map((row) => row.map(csv).join(","))
            .join("\r\n"),
      );
  });
  app.patch("/api/policies/:category", (req, res) => {
    if (req.user.role !== "admin") throw fail(403, "Administrator required");
    const input = z
      .object({
        days: z.number().int().min(1).max(365),
        rule: z.string().trim().min(10).max(300),
      })
      .parse(req.body);
    if (!categories.includes(req.params.category))
      throw fail(404, "Policy not found");
    db.prepare("UPDATE sla_policies SET days=?,rule=? WHERE category=?").run(
      input.days,
      input.rule,
      req.params.category,
    );
    res.json({
      ok: true,
      notice:
        "Applies to future cases; existing deadlines retain their original policy",
    });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API endpoint not found" }),
  );
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request exceeds size limit" });
    if (err instanceof SyntaxError && "body" in err)
      return res.status(400).json({ error: "Invalid JSON" });
    if (!err.status) console.error(err);
    res
      .status(err.status || 500)
      .json({ error: err.status ? err.message : "Unexpected server error" });
  });
  return app;
}
