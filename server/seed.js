import { openDb, transaction } from "./db.js";
import {
  hashPassword,
  normalize,
  categories,
  deadline,
  indiaToday,
} from "./domain.js";
import { createCase, updateCase } from "./service.js";
import { existsSync, unlinkSync, lstatSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
export function demoResetPath(path) {
  const target = resolve(path),
    root = resolve("./data");
  if (
    dirname(target) !== root ||
    extname(target) !== ".sqlite" ||
    (existsSync(root) && lstatSync(root).isSymbolicLink())
  )
    throw new Error(
      "Reset restricted to a .sqlite file directly inside the workspace data directory",
    );
  return target;
}
export function seed(db, password) {
  if (!password || password.length < 12)
    throw new Error("Set DEMO_PASSWORD with at least 12 characters");
  if (db.prepare("SELECT count(*) AS n FROM users").get().n)
    return { skipped: true };
  return transaction(db, () => {
    for (const [id, name] of [
      ["RB", "Regulation Bureau"],
      ["PGRC", "Public Grievance Redressal Cell"],
      ["RO", "Regional Office"],
    ])
      db.prepare("INSERT INTO bureaus VALUES(?,?)").run(id, name);
    const hash = hashPassword(password);
    for (const [id, name, email, role, bureau] of [
      ["admin", "Ananya Rao", "admin@demo.local", "admin", null],
      ["rb", "Arjun Mehta", "rb@demo.local", "officer", "RB"],
      ["pgrc", "Priya Nair", "pgrc@demo.local", "officer", "PGRC"],
      ["ro", "Kabir Sen", "ro@demo.local", "officer", "RO"],
      ["viewer", "Meera Iyer", "viewer@demo.local", "viewer", null],
    ])
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(
        id,
        name,
        email,
        hash,
        role,
        bureau,
      );
    for (const category of categories)
      db.prepare("INSERT INTO sla_policies VALUES(?,?,?)").run(
        category,
        category === "Infrastructure" ? 30 : 21,
        "Illustrative demo policy — not an official AICTE timeline",
      );
    const institutions = [
      [
        "north-valley",
        "DEMO-1001",
        "North Valley Institute of Technology",
        "Northern",
        "12 Knowledge Park, Chandigarh · Synthetic address",
      ],
      [
        "coastal",
        "DEMO-1002",
        "Coastal College of Engineering",
        "Southern",
        "8 Academic Road, Chennai · Synthetic address",
      ],
      [
        "deccan",
        "DEMO-1003",
        "Deccan Technical Institute",
        "Western",
        "42 University Road, Pune · Synthetic address",
      ],
      [
        "eastern",
        "DEMO-1004",
        "Eastern School of Technology",
        "Eastern",
        "16 Campus Avenue, Kolkata · Synthetic address",
      ],
      [
        "north-valley-south",
        "DEMO-1005",
        "North Valley Institute of Technology, South",
        "Southern",
        "27 Learning Road, Bengaluru · Synthetic address",
      ],
      [
        "himalayan",
        "DEMO-1006",
        "Himalayan Polytechnic",
        "Northern",
        "5 Hill Road, Shimla · Synthetic address",
      ],
    ];
    for (const i of institutions)
      db.prepare("INSERT INTO institutions VALUES(?,?,?,?,?)").run(...i);
    for (const [alias, id] of [
      ["N. Valley Inst. of Technology", "north-valley"],
      ["NVIT", "north-valley"],
      ["Coastal Engineering College", "coastal"],
      ["DTI Pune", "deccan"],
    ])
      db.prepare("INSERT INTO aliases VALUES(?,?)").run(normalize(alias), id);
    const admin = db.prepare("SELECT * FROM users WHERE id=?").get("admin"),
      today = indiaToday();
    const data = [
      [
        0,
        "PGRC",
        "Fees",
        "Unauthorized semester examination fees",
        "Students report collection of excess examination fees during the 2026 autumn semester.",
        4,
        "Under Process",
      ],
      [
        0,
        "RB",
        "Fees",
        "Excess examination charges under scrutiny",
        "Regulatory scrutiny of unauthorized examination charges collected for the 2026 autumn semester.",
        3,
        "Under Process",
      ],
      [
        0,
        "RO",
        "Faculty salary",
        "Faculty salary payments delayed",
        "Faculty report unpaid monthly salaries and seek release of their employment dues.",
        9,
        "Pending",
      ],
      [
        1,
        "PGRC",
        "Admission",
        "Admission refund remains pending",
        "A student seeks the return of admission fees following withdrawal before the course started.",
        36,
        "Escalated",
      ],
      [
        1,
        "RB",
        "Infrastructure",
        "Laboratory equipment safety concerns",
        "Inspection requested for laboratory equipment safety and maintenance at the institution.",
        38,
        "Under Process",
      ],
      [
        2,
        "RB",
        "Governance",
        "Required disclosure documents missing",
        "The institution has not published mandatory governance disclosures for the academic year.",
        24,
        "Pending",
      ],
      [
        2,
        "PGRC",
        "Fees",
        "Unapproved development fee collection",
        "Students allege an unapproved development fee collected in the 2026 autumn semester.",
        8,
        "Pending",
      ],
      [
        3,
        "RO",
        "Infrastructure",
        "Accessible campus routes requested",
        "Stakeholders request review of wheelchair access routes across academic buildings.",
        6,
        "Under Process",
      ],
      [
        3,
        "PGRC",
        "Admission",
        "Admission document return delayed",
        "Student original admission documents were withheld after a withdrawal request.",
        18,
        "Disposed",
      ],
      [
        4,
        "RB",
        "Infrastructure",
        "Workshop inspection completed",
        "A workshop safety concern has been investigated and corrective evidence verified.",
        45,
        "Disposed",
      ],
      [
        5,
        "PGRC",
        "Faculty salary",
        "Employment dues awaiting response",
        "Former faculty seek payment of final salary and pending employment dues.",
        28,
        "Escalated",
      ],
      [
        5,
        "RO",
        "Governance",
        "Institution response under assessment",
        "The regional office is reviewing an institutional response to a governance query.",
        12,
        "Under Process",
      ],
    ];
    for (let n = 0; n < data.length; n++) {
      const [ix, bureau, category, title, description, age, status] = data[n],
        i = institutions[ix];
      const c = createCase(db, admin, {
        institutionName: n === 1 ? "N. Valley Inst. of Technology" : i[2],
        permanentId: n === 1 ? "" : i[1],
        region: i[3],
        bureau,
        category,
        title,
        description,
        period:
          category === "Faculty salary" ? "September 2026" : "2026 autumn",
        source: "Synthetic seed",
        sourceId: `DEMO-${100 + n}`,
        receivedAt: deadline(today, -age),
        evidenceRef: n < 2 ? "EXAM-CIRCULAR-26" : "",
        officerId: bureau.toLowerCase(),
        restricted: n === 10,
      });
      if (status !== "Pending") {
        let current = updateCase(db, admin, c.id, {
          version: 1,
          status: status === "Disposed" ? "Under Process" : status,
          remarks: "Synthetic demonstration workflow started",
          nextAction: "Review institution response",
        });
        if (status === "Disposed")
          updateCase(db, admin, c.id, {
            version: current.version,
            status: "Disposed",
            remarks: "Synthetic evidence reviewed and case disposed",
            nextAction: "No further action",
          });
      }
    }
    createCase(db, admin, {
      institutionName: "Northern Vally Technology Campus",
      permanentId: "",
      region: "Northern",
      bureau: "RB",
      category: "Fees",
      title: "Institution identity needs verification",
      description:
        "A fee complaint arrived with an incomplete institutional name and no permanent identifier.",
      period: "2026 autumn",
      source: "Synthetic seed",
      sourceId: "DEMO-UNRESOLVED",
      receivedAt: today,
    });
    return { created: 13 };
  });
}
if (
  process.argv[1] &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  if (process.env.DEMO_MODE !== "true" || process.env.NODE_ENV === "production")
    throw new Error("Seed/reset allowed only in non-production DEMO_MODE=true");
  const path = process.env.DATABASE_PATH || "./data/institution360.sqlite";
  if (process.argv.includes("--reset")) {
    const resetTarget = demoResetPath(path);
    if (!process.env.DEMO_PASSWORD || process.env.DEMO_PASSWORD.length < 12)
      throw new Error("Set DEMO_PASSWORD before reset");
    for (const suffix of ["", "-wal", "-shm"])
      if (existsSync(resetTarget + suffix)) unlinkSync(resetTarget + suffix);
  }
  const db = openDb(path);
  console.log(seed(db, process.env.DEMO_PASSWORD));
  db.close();
}
