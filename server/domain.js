import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { z } from "zod";
export const statuses = [
  "Pending",
  "Under Process",
  "Disposed",
  "Transferred",
  "Escalated",
];
export const categories = [
  "Fees",
  "Faculty salary",
  "Infrastructure",
  "Admission",
  "Governance",
];
export const transitions = {
  Pending: ["Under Process", "Transferred", "Escalated"],
  "Under Process": ["Disposed", "Transferred", "Escalated"],
  Transferred: ["Under Process", "Escalated"],
  Escalated: ["Under Process", "Disposed", "Transferred"],
  Disposed: ["Under Process"],
};
export const caseInput = z.object({
  title: z.string().trim().min(8).max(180),
  description: z.string().trim().min(20).max(10000),
  institutionName: z.string().trim().min(3).max(200),
  permanentId: z.string().trim().max(60).default(""),
  region: z.string().trim().min(2).max(80),
  category: z.enum(categories),
  period: z.string().trim().min(4).max(60),
  evidenceRef: z.string().trim().max(100).default(""),
  bureau: z.enum(["RB", "PGRC", "RO"]),
  officerId: z.string().max(100).nullable().optional(),
  receivedAt: z.iso.date(),
  source: z.string().trim().min(2).max(50).default("Manual"),
  sourceId: z.string().trim().min(2).max(100),
  restricted: z.boolean().default(false),
});
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(key, "hex"),
  );
}
export const normalize = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function similarity(a, b) {
  const x = new Set(normalize(a).split(" ")),
    y = new Set(normalize(b).split(" "));
  return (
    [...x].filter((t) => y.has(t)).length /
    Math.max(1, new Set([...x, ...y]).size)
  );
}
export function resolveInstitution(db, input) {
  const byId = input.permanentId
    ? db
        .prepare("SELECT * FROM institutions WHERE permanent_id=?")
        .get(input.permanentId)
    : null;
  const byName = db
    .prepare(
      "SELECT i.* FROM institutions i LEFT JOIN aliases a ON a.institution_id=i.id WHERE lower(i.name)=lower(?) OR a.name=?",
    )
    .get(input.institutionName, normalize(input.institutionName));
  if (input.permanentId && !byId)
    return { id: null, state: "Unresolved: unknown permanent ID" };
  if (byId && byName && byId.id !== byName.id)
    return { id: null, state: "Conflict: name and permanent ID disagree" };
  if (byId) return { id: byId.id, state: "Verified permanent ID" };
  if (byName && normalize(byName.region) === normalize(input.region))
    return { id: byName.id, state: "Verified name / alias and region" };
  return { id: null, state: "Unresolved: officer confirmation required" };
}
export function compareCases(a, b) {
  const reasons = [
    "Same verified institution",
    "Active cases in different bureaus",
  ];
  const category = a.category === b.category,
    period = normalize(a.period) === normalize(b.period),
    evidence = !!a.evidence_ref && a.evidence_ref === b.evidence_ref;
  const text = similarity(a.description, b.description);
  if (category) reasons.push("Same complaint category");
  if (period) reasons.push("Same alleged event period");
  if (evidence) reasons.push("Shared evidence reference");
  const score =
    0.45 * text +
    0.2 * Number(category) +
    0.2 * Number(period) +
    0.15 * Number(evidence);
  return {
    kind:
      category && (period || evidence || text >= 0.3)
        ? "Potential issue overlap"
        : "Institution activity",
    score: Math.round(score * 100),
    reasons,
  };
}
export function canRead(user, c) {
  return !c.restricted || user.role === "admin" || user.bureau === c.bureau;
}
export function canWrite(user, c) {
  return (
    user.role === "admin" ||
    (user.role === "officer" && user.bureau === c.bureau)
  );
}
export function deadline(received, days) {
  const date = new Date(`${received}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function indiaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
