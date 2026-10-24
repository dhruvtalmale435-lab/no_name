import test from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../server/db.js";
import { seed } from "../server/seed.js";
import {
  resolveInstitution,
  compareCases,
  deadline,
  canRead,
  canWrite,
  verifyPassword,
  hashPassword,
  indiaToday,
} from "../server/domain.js";
test("Identity: trusted permanent ID, verified alias, conflict and unresolved cases", () => {
  const db = openDb(":memory:");
  seed(db, "DomainTestPassword!");
  const base = {
    institutionName: "N. Valley Inst. of Technology",
    region: "Northern",
    permanentId: "",
  };
  assert.equal(resolveInstitution(db, base).id, "north-valley");
  assert.equal(
    resolveInstitution(db, {
      ...base,
      institutionName: "NVIT",
      region: "Southern",
    }).id,
    null,
  );
  assert.equal(
    resolveInstitution(db, { ...base, permanentId: "DEMO-1002" }).id,
    null,
  );
  assert.equal(
    resolveInstitution(db, { ...base, permanentId: "UNKNOWN" }).id,
    null,
  );
  assert.equal(
    resolveInstitution(db, {
      ...base,
      institutionName: "Unknown name",
      permanentId: "DEMO-1001",
    }).id,
    "north-valley",
  );
  assert.equal(
    resolveInstitution(db, {
      ...base,
      institutionName: "Northern Valley Technical",
    }).id,
    null,
  );
  db.close();
});
test("Same category and period raises candidate; unrelated issue stays institution activity", () => {
  const a = {
    description: "Unauthorized examination fees",
    category: "Fees",
    period: "2026 autumn",
    evidence_ref: "",
  };
  assert.equal(
    compareCases(a, { ...a, description: "Excess exam charges" }).kind,
    "Potential issue overlap",
  );
  assert.equal(
    compareCases(a, {
      ...a,
      category: "Faculty salary",
      description: "Salary arrears",
    }).kind,
    "Institution activity",
  );
});
test("Calendar deadlines across month and leap-year boundaries; IST boundary", () => {
  assert.equal(deadline("2024-02-28", 2), "2024-03-01");
  assert.equal(deadline("2026-12-31", 1), "2027-01-01");
  assert.equal(indiaToday(new Date("2026-10-23T20:00:00Z")), "2026-10-24");
});
test("Passwords are salted and verified; object read and write boundaries", () => {
  const hash = hashPassword("StrongPassword");
  assert.ok(verifyPassword("StrongPassword", hash));
  assert.equal(verifyPassword("wrong", hash), false);
  assert.notEqual(hash, hashPassword("StrongPassword"));
  const c = { bureau: "RB", restricted: 1 };
  assert.equal(canRead({ role: "officer", bureau: "PGRC" }, c), false);
  assert.equal(canWrite({ role: "viewer", bureau: "RB" }, c), false);
  assert.equal(canWrite({ role: "admin" }, c), true);
});
