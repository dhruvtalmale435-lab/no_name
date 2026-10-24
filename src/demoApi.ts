import { mockMeta, mockInstitutions, mockCases } from "./mockData";
import { ApiError } from "./apiError";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_STORAGE_KEY } from "./demoAccess";
type Row = Record<string, any>;
type DemoState = {
  user: Row | null;
  cases: Row[];
  institutions: Row[];
  policies: Row[];
  relationships: Row[];
  notifications: Row[];
  imports: Row[];
};
const KEY = DEMO_STORAGE_KEY;
function groupRows(
  rows: Row[],
  key: (row: Row) => string,
): Record<string, Row[]> {
  return rows.reduce(
    (groups, row) => {
      const name = key(row);
      (groups[name] ??= []).push(row);
      return groups;
    },
    {} as Record<string, Row[]>,
  );
}
const stamp = () => new Date().toISOString();
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const id = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
const normalized = (s: string) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const deadline = (s: string, days: number) => {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const aliases: Record<string, string[]> = {
  "north-valley": ["NVIT", "N. Valley Inst. of Technology"],
  coastal: ["Coastal Engineering College"],
  deccan: ["DTI Pune"],
};
const transitions: Record<string, string[]> = {
  Pending: ["Under Process", "Transferred", "Escalated"],
  "Under Process": ["Disposed", "Transferred", "Escalated"],
  Transferred: ["Under Process", "Escalated"],
  Escalated: ["Under Process", "Disposed", "Transferred"],
  Disposed: ["Under Process"],
};
function initial(): DemoState {
  const institutions = mockInstitutions.map((i) => ({
    ...i,
    permanent_id: i.code,
    aliases: aliases[i.id] || [],
  }));
  const cases = structuredClone(mockCases).map((c) => {
    const institution = institutions.find((i) => i.id === c.institution_id);
    return {
      ...c,
      institution_input: c.institution_name,
      permanent_id: institution?.permanent_id || "",
      permanent_input: institution?.permanent_id || "",
      region_input: c.region,
      identity_state: institution
        ? "Verified permanent ID"
        : "Unresolved: officer confirmation required",
      updated_at: c.history.at(-1)?.created_at || stamp(),
      synced_at: c.history.at(0)?.created_at || stamp(),
      next_action:
        c.status === "Disposed"
          ? "No further action"
          : "Review institution response",
      events: c.history.map((e: Row) => ({
        ...e,
        actor: e.user_name,
        actor_id:
          mockMeta.officers.find((u) => u.name === e.user_name)?.id || "admin",
        bureau: c.bureau,
      })),
      documents: [],
    };
  });
  const result: DemoState = {
    user: null,
    cases,
    institutions,
    policies: mockMeta.policies.map((p) => ({
      category: p.category,
      days: p.target_days,
      rule: p.description,
    })),
    relationships: [],
    notifications: [],
    imports: [],
  };
  detect(result);
  return result;
}
let state: DemoState;
function current(): DemoState {
  if (state) return state;
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      saved &&
      Array.isArray(saved.institutions) &&
      saved.institutions.every((i: Row) => Array.isArray(i.aliases)) &&
      Array.isArray(saved.cases) &&
      saved.cases.every(
        (c: Row) => Array.isArray(c.events) && Array.isArray(c.documents),
      )
    ) {
      state = saved;
      return state;
    }
  } catch {
    /* A corrupt or disabled tab store must never crash the workspace. */
  }
  state = initial();
  return state;
}
function save() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    throw new ApiError(
      "The browser demo storage is full or unavailable. Reset the demo or use the server application.",
      400,
    );
  }
}
function canRead(user: Row, c: Row) {
  return !c.restricted || user.role === "admin" || user.bureau === c.bureau;
}
function canWrite(user: Row, c: Row) {
  return (
    user.role === "admin" ||
    (user.role === "officer" && user.bureau === c.bureau)
  );
}
function requireUser(): Row {
  const u = current().user;
  if (!u) throw new ApiError("Sign in to the demo to continue", 401);
  return u;
}
function requireWriter(c?: Row) {
  const u = requireUser();
  if (u.role === "viewer" || (c && !canWrite(u, c)))
    throw new ApiError("This demo account cannot modify this record", 403);
  return u;
}
function getCase(caseId: string, write = false): Row {
  const u = requireUser(),
    c = current().cases.find((c) => c.id === caseId);
  if (!c || !canRead(u, c))
    throw new ApiError("Case not found or access restricted", 404);
  if (write) requireWriter(c);
  return c;
}
function event(c: Row, action: string, remarks: string) {
  const u = requireUser();
  c.events.push({
    id: id("event"),
    case_id: c.id,
    actor: u.name,
    actor_id: u.id,
    bureau: c.bureau,
    action,
    remarks,
    created_at: stamp(),
  });
}
function detect(s: DemoState) {
  for (let a = 0; a < s.cases.length; a++)
    for (let b = a + 1; b < s.cases.length; b++) {
      const x = s.cases[a],
        y = s.cases[b];
      if (
        !x.institution_id ||
        x.institution_id !== y.institution_id ||
        x.bureau === y.bureau ||
        x.status === "Disposed" ||
        y.status === "Disposed"
      )
        continue;
      if (
        s.relationships.some(
          (r) =>
            [r.case_a, r.case_b].includes(x.id) &&
            [r.case_a, r.case_b].includes(y.id),
        )
      )
        continue;
      const category = x.category === y.category,
        period = normalized(x.period) === normalized(y.period),
        evidence = !!x.evidence_ref && x.evidence_ref === y.evidence_ref;
      const words = (c: Row) => new Set(normalized(c.description).split(" ")),
        wx = words(x),
        wy = words(y),
        similarity =
          [...wx].filter((w) => wy.has(w)).length /
          Math.max(1, new Set([...wx, ...wy]).size);
      const kind =
        category && (period || evidence || similarity >= 0.3)
          ? "Potential issue overlap"
          : "Institution activity";
      const reasons = [
        "Same verified institution",
        "Active cases in different bureaus",
        ...(category ? ["Same complaint category"] : []),
        ...(period ? ["Same alleged event period"] : []),
        ...(evidence ? ["Shared evidence reference"] : []),
      ];
      const relationship = {
        id: id("overlap"),
        case_a: x.id,
        case_b: y.id,
        kind,
        reasons,
        score: Math.round(
          100 *
            (0.45 * similarity +
              0.2 * Number(category) +
              0.2 * Number(period) +
              0.15 * Number(evidence)),
        ),
        decision: null,
        justification: null,
        version: 1,
        tasks: [],
      };
      s.relationships.push(relationship);
      if (kind === "Potential issue overlap")
        s.notifications.push({
          id: id("notice"),
          case_id: x.id,
          relationship_id: relationship.id,
          kind: "Overlap",
          message: `Potential overlapping cases – coordination required: ${x.id} / ${y.id}`,
          created_at: stamp(),
          read_at: null,
        });
    }
}
function list(params: URLSearchParams): Row[] {
  const u = requireUser();
  let rows = current().cases.filter((c) => canRead(u, c));
  for (const key of [
    "institution_id",
    "bureau",
    "status",
    "category",
    "region",
  ])
    if (params.get(key)) rows = rows.filter((c) => c[key] === params.get(key));
  const q = normalized(params.get("q") || "");
  if (q)
    rows = rows.filter((c) =>
      normalized(
        [
          c.id,
          c.title,
          c.source_id,
          c.institution_name,
          c.institution_input,
          c.permanent_id,
        ].join(" "),
      ).includes(q),
    );
  if (params.get("from"))
    rows = rows.filter((c) => c.received_at >= params.get("from")!);
  if (params.get("to"))
    rows = rows.filter((c) => c.received_at <= params.get("to")!);
  return rows;
}
function relationships(): Row[] {
  const u = requireUser();
  return current().relationships.flatMap((r) => {
    const a = current().cases.find((c) => c.id === r.case_a),
      b = current().cases.find((c) => c.id === r.case_b);
    return a && b && canRead(u, a) && canRead(u, b)
      ? [
          {
            ...r,
            a,
            b,
            active:
              a.status !== "Disposed" &&
              b.status !== "Disposed" &&
              a.bureau !== b.bureau,
          },
        ]
      : [];
  });
}
function analytics(params: URLSearchParams) {
  const rows = list(params),
    active = rows.filter((c) => c.status !== "Disposed"),
    date = today();
  const group = (key: string) =>
    Object.entries(groupRows(rows, (c) => c[key] || "Unresolved")).map(
      ([name, items]) => ({
        name,
        total: items.length,
        pending: items.filter((c) => c.status !== "Disposed").length,
        disposed: items.filter((c) => c.status === "Disposed").length,
      }),
    );
  const performance = (quarter = false) => {
    const result = new Map<string, Row>();
    const key = (d: string) =>
      quarter
        ? `${d.slice(0, 4)} Q${Math.ceil(Number(d.slice(5, 7)) / 3)}`
        : d.slice(0, 7);
    const get = (d: string) => {
      const k = key(d);
      if (!result.has(k))
        result.set(k, { name: k, total: 0, disposalActions: 0 });
      return result.get(k)!;
    };
    for (const c of rows) {
      get(c.received_at).total++;
      for (const e of c.events)
        if (e.action.endsWith("→ Disposed"))
          get(e.created_at).disposalActions++;
    }
    return [...result.values()].sort((a, b) => a.name.localeCompare(b.name));
  };
  const monthly = Object.entries(
    groupRows(rows, (c) => c.received_at.slice(0, 7)),
  ).map(([name, items]) => ({
    name,
    total: items.length,
    disposed: items.filter((c) => c.status === "Disposed").length,
  }));
  return {
    total: rows.length,
    active: active.length,
    disposed: rows.length - active.length,
    overdue: active.filter((c) => c.due_at < date).length,
    dueSoon: active.filter(
      (c) => c.due_at >= date && c.due_at <= deadline(date, 3),
    ).length,
    statuses: group("status"),
    bureaus: group("bureau"),
    regions: group("region"),
    institutions: group("institution_name"),
    monthly,
    monthlyPerformance: performance(),
    quarterlyPerformance: performance(true),
    ageing: [
      ["0–7", 0, 7],
      ["8–30", 8, 30],
      ["31–60", 31, 60],
      ["61+", 61, Infinity],
    ].map(([name, min, max]) => ({
      name,
      total: active.filter((c) => {
        const age = (Date.parse(date) - Date.parse(c.received_at)) / 86400000;
        return age >= Number(min) && age <= Number(max);
      }).length,
    })),
    unresolved: rows.filter((c) => !c.institution_id).length,
    overlaps: relationships().filter(
      (r) => r.active && !r.decision && r.kind === "Potential issue overlap",
    ).length,
    asOf: stamp(),
  };
}
function create(body: Row, source?: string): Row {
  const u = requireWriter();
  const required: Record<string, number> = {
    title: 8,
    description: 20,
    institutionName: 3,
    region: 2,
    period: 4,
    sourceId: 2,
  };
  for (const [key, min] of Object.entries(required))
    if (typeof body[key] !== "string" || body[key].trim().length < min)
      throw new ApiError(`${key}: enter at least ${min} characters`, 400);
  if (
    !mockMeta.categories.includes(body.category) ||
    !["RB", "PGRC", "RO"].includes(body.bureau) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.receivedAt) ||
    body.receivedAt > today()
  )
    throw new ApiError("Select a valid category, bureau and receipt date", 400);
  if (u.role !== "admin" && body.bureau !== u.bureau)
    throw new ApiError("Register records only for your own bureau", 403);
  const origin = source || body.source || "Manual";
  if (
    current().cases.some(
      (c) => c.source === origin && c.source_id === body.sourceId,
    )
  )
    throw new ApiError("Source record already exists", 409);
  const byId = body.permanentId
    ? current().institutions.find((i) => i.permanent_id === body.permanentId)
    : null;
  const byName = current().institutions.find(
    (i) =>
      [i.name, ...i.aliases].some(
        (n) => normalized(n) === normalized(body.institutionName),
      ) && normalized(i.region) === normalized(body.region),
  );
  const institution = body.permanentId
    ? byId && (!byName || byName.id === byId.id)
      ? byId
      : null
    : byName;
  const c: Row = {
    id: id(body.bureau),
    title: body.title.trim(),
    description: body.description.trim(),
    institution_id: institution?.id || null,
    institution_input: body.institutionName,
    institution_name: institution?.name || body.institutionName,
    permanent_id: institution?.permanent_id || "",
    permanent_input: body.permanentId || "",
    region: institution?.region || body.region,
    region_input: body.region,
    identity_state: institution
      ? body.permanentId
        ? "Verified permanent ID"
        : "Verified name / alias and region"
      : "Unresolved: officer confirmation required",
    category: body.category,
    period: body.period,
    evidence_ref: body.evidenceRef || "",
    bureau: body.bureau,
    officer_id: body.officerId || null,
    officer_name:
      mockMeta.officers.find((o) => o.id === body.officerId)?.name || null,
    status: "Pending",
    received_at: body.receivedAt,
    due_at: deadline(
      body.receivedAt,
      current().policies.find((p) => p.category === body.category)?.days || 21,
    ),
    updated_at: stamp(),
    synced_at: stamp(),
    next_action: "Initial scrutiny",
    source: origin,
    source_id: body.sourceId,
    restricted: !!body.restricted,
    version: 1,
    events: [],
    documents: [],
  };
  current().cases.unshift(c);
  event(c, "Registered", `Browser demo intake: ${origin} / ${body.sourceId}`);
  detect(current());
  return c;
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let n = 0; n < text.length; n++) {
    const ch = text[n];
    if (ch === '"') {
      if (quoted && text[n + 1] === '"') {
        value += '"';
        n++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\n" || ch === "\r")) {
      row.push(value);
      value = "";
      if (ch !== ",") {
        if (ch === "\r" && text[n + 1] === "\n") n++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else value += ch;
  }
  if (quoted) throw new ApiError("CSV contains an unclosed quote", 400);
  row.push(value);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((s) => s.replace(/^\uFEFF/, "").trim());
  if (!headers?.length || new Set(headers).size !== headers.length)
    throw new ApiError("CSV requires unique headers", 400);
  return rows.map((r) => {
    if (r.length !== headers.length)
      throw new ApiError("CSV row does not match headers", 400);
    const item: Row = Object.fromEntries(headers.map((h, i) => [h, r[i]]));
    if (item.restricted !== undefined)
      item.restricted = item.restricted === "true";
    return item;
  });
}
function execute(path: string, options: RequestInit) {
  const method = (options.method || "GET").toUpperCase(),
    url = new URL(path, "https://demo.local"),
    p = url.pathname,
    params = url.searchParams,
    body = options.body ? JSON.parse(String(options.body)) : {};
  if (p === "/demo-access")
    return {
      enabled: true,
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      browserOnly: true,
    };
  if (p === "/me") return { user: current().user, demo: true };
  if (p === "/login") {
    const u = mockMeta.officers.find(
      (u) => u.email === String(body.email).toLowerCase(),
    );
    if (!u || body.password !== DEMO_PASSWORD)
      throw new ApiError(
        "Use one of the displayed demo accounts and the demo password",
        401,
      );
    current().user = { ...u };
    return { ok: true };
  }
  if (p === "/logout") {
    current().user = null;
    return { ok: true };
  }
  const user = requireUser();
  if (p === "/demo/reset" && method === "POST") {
    requireWriter();
    const account = { ...user };
    state = initial();
    state.user = account;
    return { ok: true };
  }
  if (p === "/meta")
    return {
      ...mockMeta,
      statuses: Object.keys(transitions),
      officers: mockMeta.officers.filter((u) => u.role === "officer"),
      policies: current().policies,
    };
  if (p === "/institutions")
    return current().institutions.map((i) => {
      const cases = list(new URLSearchParams({ institution_id: i.id }));
      return {
        ...i,
        cases: cases.length,
        active: cases.filter((c) => c.status !== "Disposed").length,
        bureaus: [...new Set(cases.map((c) => c.bureau))],
      };
    });
  if (p === "/analytics") return analytics(params);
  if (p === "/cases") {
    if (method === "POST") return create(body);
    const rows = list(params),
      page = Math.max(1, Number(params.get("page")) || 1),
      limit = Math.min(100, Math.max(1, Number(params.get("limit")) || 25));
    return {
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    };
  }
  const match = p.match(/^\/cases\/([^/]+)(?:\/(identity|documents))?$/);
  if (match) {
    const c = getCase(decodeURIComponent(match[1]), method !== "GET");
    if (match[2] === "identity") {
      if (user.role !== "admin")
        throw new ApiError("Administrator required", 403);
      if (c.version !== body.version)
        throw new ApiError("Case changed; refresh", 409);
      const i = current().institutions.find((i) => i.id === body.institutionId);
      if (!i || String(body.remarks || "").trim().length < 10)
        throw new ApiError(
          "Select a verified institution and provide a justification",
          400,
        );
      Object.assign(c, {
        institution_id: i.id,
        institution_name: i.name,
        permanent_id: i.permanent_id,
        region: i.region,
        identity_state: "Officer verified",
        version: c.version + 1,
      });
      if (body.approveAlias && !i.aliases.includes(c.institution_input))
        i.aliases.push(c.institution_input);
      event(c, "Identity verified", body.remarks);
      detect(current());
      return { ok: true };
    }
    if (match[2] === "documents") {
      if (!/^[\w .()-]+\.(txt|pdf|png|jpe?g)$/i.test(body.name || ""))
        throw new ApiError("Select TXT, PDF, PNG or JPG evidence", 400);
      const mime = body.name.endsWith(".txt")
        ? "text/plain"
        : body.name.endsWith(".pdf")
          ? "application/pdf"
          : body.name.endsWith(".png")
            ? "image/png"
            : "image/jpeg";
      const doc = {
        id: id("document"),
        case_id: c.id,
        name: body.name,
        mime,
        base64: body.base64 || btoa(body.content || ""),
        created_at: stamp(),
      };
      c.documents.push(doc);
      event(c, "Document attached", doc.name);
      return { id: doc.id };
    }
    if (method === "PATCH") {
      if (c.version !== body.version)
        throw new ApiError("Case changed; refresh before saving", 409);
      if (String(body.remarks || "").trim().length < 5)
        throw new ApiError("Provide action remarks", 400);
      if (
        body.status &&
        body.status !== c.status &&
        !transitions[c.status].includes(body.status)
      )
        throw new ApiError("Invalid status transition", 400);
      const bureau = body.bureau || c.bureau;
      if (
        (body.status === "Transferred" && bureau === c.bureau) ||
        (bureau !== c.bureau && body.status !== "Transferred")
      )
        throw new ApiError(
          "Transfer requires Transferred status and a different bureau",
          400,
        );
      if (
        body.officerId &&
        !mockMeta.officers.some(
          (o) =>
            o.id === body.officerId &&
            o.bureau === bureau &&
            o.role === "officer",
        )
      )
        throw new ApiError("Assignee must belong to the selected bureau", 400);
      const prior = c.status;
      Object.assign(c, {
        status: body.status || c.status,
        bureau,
        officer_id: body.officerId ?? null,
        officer_name:
          mockMeta.officers.find((o) => o.id === body.officerId)?.name || null,
        next_action: body.nextAction ?? c.next_action,
        updated_at: stamp(),
        version: c.version + 1,
      });
      event(c, `Case updated: ${prior} → ${c.status}`, body.remarks);
      detect(current());
      return c;
    }
    return {
      ...c,
      canWrite: canWrite(user, c),
      documents: c.documents.map(({ base64, ...d }: Row) => d),
    };
  }
  if (p.startsWith("/documents/")) {
    const doc = current()
      .cases.flatMap((c) => c.documents)
      .find((d) => d.id === p.slice(11));
    if (!doc) throw new ApiError("Document not found", 404);
    getCase(doc.case_id);
    return doc;
  }
  if (p === "/overlaps") return relationships();
  if (p.match(/^\/overlaps\/[^/]+\/review$/)) {
    const r = relationships().find((r) => r.id === p.split("/")[2]);
    if (!r) throw new ApiError("Relationship not found", 404);
    if (
      user.role === "viewer" ||
      (!canWrite(user, r.a) && !canWrite(user, r.b))
    )
      throw new ApiError("A participating officer must review this pair", 403);
    if (!r.active) throw new ApiError("This pair is historical", 400);
    if (r.version !== body.version)
      throw new ApiError("Review changed; refresh", 409);
    if (
      ![
        "Related — coordination required",
        "Confirmed duplicate issue",
        "Same institution — independent issues",
        "Not related",
        "Needs additional information",
      ].includes(body.decision) ||
      String(body.justification || "").trim().length < 10
    )
      throw new ApiError("Choose a decision and provide a justification", 400);
    const stored = current().relationships.find((x) => x.id === r.id)!;
    if (
      ["Related — coordination required", "Confirmed duplicate issue"].includes(
        body.decision,
      )
    ) {
      const officer = mockMeta.officers.find(
        (o) =>
          o.id === body.officerId &&
          o.role === "officer" &&
          [r.a.bureau, r.b.bureau].includes(o.bureau),
      );
      if (
        !officer ||
        !body.dueAt ||
        body.dueAt < today() ||
        String(body.nextAction || "").length < 5
      )
        throw new ApiError(
          "Select an officer, deadline and coordination action",
          400,
        );
      stored.tasks.push({
        id: id("task"),
        officer_id: officer.id,
        officer_name: officer.name,
        due_at: body.dueAt,
        next_action: body.nextAction,
        state: "Open",
      });
    }
    Object.assign(stored, {
      decision: body.decision,
      justification: body.justification,
      reviewer_id: user.id,
      reviewed_at: stamp(),
      version: stored.version + 1,
    });
    for (const c of [r.a, r.b])
      event(
        c,
        "Coordination review",
        `${body.decision}: ${body.justification}`,
      );
    return { ok: true };
  }
  if (p.startsWith("/tasks/")) {
    const r = relationships().find((r) =>
        r.tasks.some((t: Row) => t.id === p.slice(7)),
      ),
      task = r?.tasks.find((t: Row) => t.id === p.slice(7));
    if (!r || !task) throw new ApiError("Task not found", 404);
    if (user.role !== "admin" && user.id !== task.officer_id)
      throw new ApiError("Only the assigned officer may update this task", 403);
    if (!["Open", "Completed"].includes(body.state))
      throw new ApiError("Invalid task state", 400);
    task.state = body.state;
    for (const c of [r.a, r.b])
      event(c, "Coordination task", `${body.state}: ${task.next_action}`);
    return { ok: true };
  }
  if (p === "/notifications") {
    const notices = current().notifications.filter((n) => {
      try {
        getCase(n.case_id);
        return (
          !n.relationship_id ||
          relationships().some((r) => r.id === n.relationship_id)
        );
      } catch {
        return false;
      }
    });
    return notices.map((n) => ({ ...n, kind: n.kind || "Workflow" }));
  }
  if (p.startsWith("/notifications/")) {
    const n = current().notifications.find((n) => n.id === p.slice(15));
    if (n) n.read_at = stamp();
    return { ok: true };
  }
  if (p === "/imports") return current().imports;
  if (p === "/import") {
    requireWriter();
    const source = body.source,
      bureau = String(source).split(" ")[0];
    if (!["RB import", "PGRC import", "RO import"].includes(source))
      throw new ApiError("Select a valid source", 400);
    if (user.role !== "admin" && user.bureau !== bureau)
      throw new ApiError("Import only your own bureau source", 403);
    const records = body.records || parseCsv(body.csv || "");
    if (!Array.isArray(records) || !records.length || records.length > 200)
      throw new ApiError("Import 1–200 source records", 400);
    let created = 0,
      skipped = 0;
    for (const record of records) {
      if (record.bureau !== bureau)
        throw new ApiError(
          "Every record must belong to the selected source bureau",
          400,
        );
      if (
        current().cases.some(
          (c) => c.source === source && c.source_id === record.sourceId,
        )
      ) {
        skipped++;
        continue;
      }
      create(record, source);
      created++;
    }
    current().imports.unshift({
      id: id("import"),
      source,
      actor: user.name,
      count: created,
      skipped,
      created_at: stamp(),
    });
    return { created, skipped };
  }
  if (p.startsWith("/policies/")) {
    if (user.role !== "admin")
      throw new ApiError("Administrator required", 403);
    const policy = current().policies.find(
      (p) => p.category === decodeURIComponent(url.pathname.slice(10)),
    );
    if (!policy) throw new ApiError("Policy not found", 404);
    if (
      !Number.isInteger(body.days) ||
      body.days < 1 ||
      body.days > 365 ||
      String(body.rule || "").length < 10
    )
      throw new ApiError("Set 1–365 days and a governing rule", 400);
    Object.assign(policy, { days: body.days, rule: body.rule });
    return { ok: true };
  }
  if (p === "/reports/export") {
    const fields = [
      "id",
      "institution_name",
      "permanent_id",
      "region",
      "bureau",
      "category",
      "status",
      "received_at",
      "due_at",
    ];
    const quote = (v: any) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    return {
      csv:
        "\uFEFF" +
        [fields, ...list(params).map((c) => fields.map((k) => c[k]))]
          .map((row) => row.map(quote).join(","))
          .join("\r\n"),
      filename: "bureausetu-cases.csv",
    };
  }
  throw new ApiError("This action is unavailable in the browser demo", 404);
}
export async function handleDemoApi(
  path: string,
  options: RequestInit = {},
): Promise<any> {
  current();
  const before = structuredClone(state);
  try {
    const result = execute(path, options);
    if ((options.method || "GET") !== "GET") save();
    return structuredClone(result);
  } catch (error) {
    state = before;
    throw error;
  }
}
