// Synthetic demo data for standalone static preview (e.g. GitHub Pages)
export const mockMeta = {
  bureaus: [
    { id: "RB", name: "Regulation Bureau" },
    { id: "PGRC", name: "Public Grievance Redressal Cell" },
    { id: "RO", name: "Regional Office" },
  ],
  officers: [
    { id: "admin", name: "Ananya Rao", email: "admin@demo.local", role: "admin", bureau: null },
    { id: "rb", name: "Arjun Mehta", email: "rb@demo.local", role: "officer", bureau: "RB" },
    { id: "pgrc", name: "Priya Nair", email: "pgrc@demo.local", role: "officer", bureau: "PGRC" },
    { id: "ro", name: "Kabir Sen", email: "ro@demo.local", role: "officer", bureau: "RO" },
    { id: "viewer", name: "Meera Iyer", email: "viewer@demo.local", role: "viewer", bureau: null },
  ],
  categories: ["Fees", "Faculty salary", "Admission", "Infrastructure", "Governance"],
  statuses: ["Pending", "Under Process", "Escalated", "Disposed"],
  policies: [
    { category: "Fees", target_days: 21, description: "Illustrative demo policy — not an official AICTE timeline" },
    { category: "Faculty salary", target_days: 21, description: "Illustrative demo policy — not an official AICTE timeline" },
    { category: "Admission", target_days: 21, description: "Illustrative demo policy — not an official AICTE timeline" },
    { category: "Infrastructure", target_days: 30, description: "Illustrative demo policy — not an official AICTE timeline" },
    { category: "Governance", target_days: 21, description: "Illustrative demo policy — not an official AICTE timeline" },
  ],
};

export const mockInstitutions = [
  {
    id: "north-valley",
    code: "DEMO-1001",
    name: "North Valley Institute of Technology",
    region: "Northern",
    address: "12 Knowledge Park, Chandigarh · Synthetic address",
  },
  {
    id: "coastal",
    code: "DEMO-1002",
    name: "Coastal College of Engineering",
    region: "Southern",
    address: "8 Academic Road, Chennai · Synthetic address",
  },
  {
    id: "deccan",
    code: "DEMO-1003",
    name: "Deccan Technical Institute",
    region: "Western",
    address: "42 University Road, Pune · Synthetic address",
  },
  {
    id: "eastern",
    code: "DEMO-1004",
    name: "Eastern School of Technology",
    region: "Eastern",
    address: "16 Campus Avenue, Kolkata · Synthetic address",
  },
  {
    id: "north-valley-south",
    code: "DEMO-1005",
    name: "North Valley Institute of Technology, South",
    region: "Southern",
    address: "27 Learning Road, Bengaluru · Synthetic address",
  },
  {
    id: "himalayan",
    code: "DEMO-1006",
    name: "Himalayan Polytechnic",
    region: "Northern",
    address: "5 Hill Road, Shimla · Synthetic address",
  },
];

export let mockCases: any[] = [
  {
    id: "c-101",
    source_id: "DEMO-100",
    source: "Synthetic seed",
    bureau: "PGRC",
    category: "Fees",
    title: "Unauthorized semester examination fees",
    description: "Students report collection of excess examination fees during the 2026 autumn semester.",
    institution_id: "north-valley",
    institution_name: "North Valley Institute of Technology",
    region: "Northern",
    status: "Under Process",
    period: "2026 autumn",
    evidence_ref: "EXAM-CIRCULAR-26",
    received_at: "2026-10-20",
    due_at: "2026-11-10",
    officer_id: "pgrc",
    officer_name: "Priya Nair",
    version: 2,
    restricted: false,
    history: [
      { id: "e-1", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-20T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-2", action: "Pending → Under Process", remarks: "Synthetic demonstration workflow started", created_at: "2026-10-21T11:00:00Z", user_name: "Priya Nair" },
    ],
    attachments: [],
  },
  {
    id: "c-102",
    source_id: "DEMO-101",
    source: "Synthetic seed",
    bureau: "RB",
    category: "Fees",
    title: "Excess examination charges under scrutiny",
    description: "Regulatory scrutiny of unauthorized examination charges collected for the 2026 autumn semester.",
    institution_id: "north-valley",
    institution_name: "North Valley Institute of Technology",
    region: "Northern",
    status: "Under Process",
    period: "2026 autumn",
    evidence_ref: "EXAM-CIRCULAR-26",
    received_at: "2026-10-21",
    due_at: "2026-11-11",
    officer_id: "rb",
    officer_name: "Arjun Mehta",
    version: 2,
    restricted: false,
    history: [
      { id: "e-3", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-21T09:00:00Z", user_name: "Ananya Rao" },
      { id: "e-4", action: "Pending → Under Process", remarks: "Synthetic demonstration workflow started", created_at: "2026-10-22T10:00:00Z", user_name: "Arjun Mehta" },
    ],
    attachments: [],
  },
  {
    id: "c-103",
    source_id: "DEMO-102",
    source: "Synthetic seed",
    bureau: "RO",
    category: "Faculty salary",
    title: "Faculty salary payments delayed",
    description: "Faculty report unpaid monthly salaries and seek release of their employment dues.",
    institution_id: "north-valley",
    institution_name: "North Valley Institute of Technology",
    region: "Northern",
    status: "Pending",
    period: "September 2026",
    evidence_ref: "",
    received_at: "2026-10-15",
    due_at: "2026-11-05",
    officer_id: "ro",
    officer_name: "Kabir Sen",
    version: 1,
    restricted: false,
    history: [
      { id: "e-5", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-15T08:00:00Z", user_name: "Ananya Rao" },
    ],
    attachments: [],
  },
  {
    id: "c-104",
    source_id: "DEMO-103",
    source: "Synthetic seed",
    bureau: "PGRC",
    category: "Admission",
    title: "Admission refund remains pending",
    description: "A student seeks the return of admission fees following withdrawal before the course started.",
    institution_id: "coastal",
    institution_name: "Coastal College of Engineering",
    region: "Southern",
    status: "Escalated",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-09-18",
    due_at: "2026-10-09",
    officer_id: "pgrc",
    officer_name: "Priya Nair",
    version: 2,
    restricted: false,
    history: [
      { id: "e-6", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-09-18T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-7", action: "Pending → Escalated", remarks: "Exceeded initial SLA deadline", created_at: "2026-10-10T11:00:00Z", user_name: "Ananya Rao" },
    ],
    attachments: [],
  },
  {
    id: "c-105",
    source_id: "DEMO-104",
    source: "Synthetic seed",
    bureau: "RB",
    category: "Infrastructure",
    title: "Laboratory equipment safety concerns",
    description: "Inspection requested for laboratory equipment safety and maintenance at the institution.",
    institution_id: "coastal",
    institution_name: "Coastal College of Engineering",
    region: "Southern",
    status: "Under Process",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-09-16",
    due_at: "2026-10-16",
    officer_id: "rb",
    officer_name: "Arjun Mehta",
    version: 2,
    restricted: false,
    history: [
      { id: "e-8", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-09-16T12:00:00Z", user_name: "Ananya Rao" },
      { id: "e-9", action: "Pending → Under Process", remarks: "Inspection scheduled", created_at: "2026-09-20T14:00:00Z", user_name: "Arjun Mehta" },
    ],
    attachments: [],
  },
  {
    id: "c-106",
    source_id: "DEMO-105",
    source: "Synthetic seed",
    bureau: "RB",
    category: "Governance",
    title: "Required disclosure documents missing",
    description: "The institution has not published mandatory governance disclosures for the academic year.",
    institution_id: "deccan",
    institution_name: "Deccan Technical Institute",
    region: "Western",
    status: "Pending",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-09-30",
    due_at: "2026-10-21",
    officer_id: "rb",
    officer_name: "Arjun Mehta",
    version: 1,
    restricted: false,
    history: [
      { id: "e-10", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-09-30T10:00:00Z", user_name: "Ananya Rao" },
    ],
    attachments: [],
  },
  {
    id: "c-107",
    source_id: "DEMO-106",
    source: "Synthetic seed",
    bureau: "PGRC",
    category: "Fees",
    title: "Unapproved development fee collection",
    description: "Students allege an unapproved development fee collected in the 2026 autumn semester.",
    institution_id: "deccan",
    institution_name: "Deccan Technical Institute",
    region: "Western",
    status: "Pending",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-10-16",
    due_at: "2026-11-06",
    officer_id: "pgrc",
    officer_name: "Priya Nair",
    version: 1,
    restricted: false,
    history: [
      { id: "e-11", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-16T10:00:00Z", user_name: "Ananya Rao" },
    ],
    attachments: [],
  },
  {
    id: "c-108",
    source_id: "DEMO-107",
    source: "Synthetic seed",
    bureau: "RO",
    category: "Infrastructure",
    title: "Accessible campus routes requested",
    description: "Stakeholders request review of wheelchair access routes across academic buildings.",
    institution_id: "eastern",
    institution_name: "Eastern School of Technology",
    region: "Eastern",
    status: "Under Process",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-10-18",
    due_at: "2026-11-17",
    officer_id: "ro",
    officer_name: "Kabir Sen",
    version: 2,
    restricted: false,
    history: [
      { id: "e-12", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-18T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-13", action: "Pending → Under Process", remarks: "Site audit assigned", created_at: "2026-10-19T11:00:00Z", user_name: "Kabir Sen" },
    ],
    attachments: [],
  },
  {
    id: "c-109",
    source_id: "DEMO-108",
    source: "Synthetic seed",
    bureau: "PGRC",
    category: "Admission",
    title: "Admission document return delayed",
    description: "Student original admission documents were withheld after a withdrawal request.",
    institution_id: "eastern",
    institution_name: "Eastern School of Technology",
    region: "Eastern",
    status: "Disposed",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-10-06",
    due_at: "2026-10-27",
    officer_id: "pgrc",
    officer_name: "Priya Nair",
    version: 3,
    restricted: false,
    history: [
      { id: "e-14", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-06T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-15", action: "Pending → Under Process", remarks: "Notice sent to institute", created_at: "2026-10-08T11:00:00Z", user_name: "Priya Nair" },
      { id: "e-16", action: "Under Process → Disposed", remarks: "Documents returned and receipt acknowledged", created_at: "2026-10-20T15:00:00Z", user_name: "Priya Nair" },
    ],
    attachments: [],
  },
  {
    id: "c-110",
    source_id: "DEMO-109",
    source: "Synthetic seed",
    bureau: "RB",
    category: "Infrastructure",
    title: "Workshop inspection completed",
    description: "A workshop safety concern has been investigated and corrective evidence verified.",
    institution_id: "north-valley-south",
    institution_name: "North Valley Institute of Technology, South",
    region: "Southern",
    status: "Disposed",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-09-09",
    due_at: "2026-10-09",
    officer_id: "rb",
    officer_name: "Arjun Mehta",
    version: 3,
    restricted: false,
    history: [
      { id: "e-17", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-09-09T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-18", action: "Pending → Under Process", remarks: "Investigation ordered", created_at: "2026-09-12T11:00:00Z", user_name: "Arjun Mehta" },
      { id: "e-19", action: "Under Process → Disposed", remarks: "Synthetic evidence reviewed and case disposed", created_at: "2026-10-15T16:00:00Z", user_name: "Arjun Mehta" },
    ],
    attachments: [],
  },
  {
    id: "c-111",
    source_id: "DEMO-110",
    source: "Synthetic seed",
    bureau: "PGRC",
    category: "Faculty salary",
    title: "Employment dues awaiting response",
    description: "Former faculty seek payment of final salary and pending employment dues.",
    institution_id: "himalayan",
    institution_name: "Himalayan Polytechnic",
    region: "Northern",
    status: "Escalated",
    period: "September 2026",
    evidence_ref: "",
    received_at: "2026-09-26",
    due_at: "2026-10-17",
    officer_id: "pgrc",
    officer_name: "Priya Nair",
    version: 2,
    restricted: false,
    history: [
      { id: "e-20", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-09-26T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-21", action: "Pending → Escalated", remarks: "Reminder sent, pending formal response", created_at: "2026-10-18T12:00:00Z", user_name: "Priya Nair" },
    ],
    attachments: [],
  },
  {
    id: "c-112",
    source_id: "DEMO-111",
    source: "Synthetic seed",
    bureau: "RO",
    category: "Governance",
    title: "Institution response under assessment",
    description: "The regional office is reviewing an institutional response to a governance query.",
    institution_id: "himalayan",
    institution_name: "Himalayan Polytechnic",
    region: "Northern",
    status: "Under Process",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-10-12",
    due_at: "2026-11-02",
    officer_id: "ro",
    officer_name: "Kabir Sen",
    version: 2,
    restricted: false,
    history: [
      { id: "e-22", action: "Created → Pending", remarks: "Registered via seed", created_at: "2026-10-12T10:00:00Z", user_name: "Ananya Rao" },
      { id: "e-23", action: "Pending → Under Process", remarks: "Evaluating submitted affidavits", created_at: "2026-10-14T11:00:00Z", user_name: "Kabir Sen" },
    ],
    attachments: [],
  },
  {
    id: "c-113",
    source_id: "DEMO-UNRESOLVED",
    source: "Synthetic seed",
    bureau: "RB",
    category: "Fees",
    title: "Institution identity needs verification",
    description: "A fee complaint arrived with an incomplete institutional name and no permanent identifier.",
    institution_id: "",
    institution_name: "Northern Vally Technology Campus",
    region: "Northern",
    status: "Pending",
    period: "2026 autumn",
    evidence_ref: "",
    received_at: "2026-10-24",
    due_at: "2026-11-14",
    officer_id: "rb",
    officer_name: "Arjun Mehta",
    version: 1,
    restricted: false,
    history: [
      { id: "e-24", action: "Created → Pending", remarks: "Identity pending resolution", created_at: "2026-10-24T10:00:00Z", user_name: "Ananya Rao" },
    ],
    attachments: [],
  },
];

export const mockOverlaps = [
  {
    id: "ov-1",
    kind: "Potential issue overlap",
    case_a: "c-101",
    case_b: "c-102",
    a: mockCases[0],
    b: mockCases[1],
    reasons: [
      "Same verified institution: North Valley Institute of Technology",
      "Matching category: Fees",
      "Shared evidence circular EXAM-CIRCULAR-26",
    ],
    score: 92,
    summary:
      "Excess semester examination fees reported in both PGRC and Regulation Bureau (evidence: EXAM-CIRCULAR-26)",
    active: true,
    decision: null,
    tasks: [],
    detected_at: "2026-10-21T10:00:00Z",
  },
  {
    id: "ov-2",
    kind: "Same institution activity",
    case_a: "c-101",
    case_b: "c-103",
    a: mockCases[0],
    b: mockCases[2],
    reasons: [
      "Same institution: North Valley Institute of Technology",
      "Independent categories (Fees vs Faculty salary)",
    ],
    score: 45,
    summary:
      "Concurrent cases at North Valley Institute of Technology across Fees and Faculty salary",
    active: true,
    decision: "Institution context noted",
    tasks: [],
    detected_at: "2026-10-22T08:00:00Z",
  },
];


export const mockNotifications = [
  {
    id: "notif-1",
    title: "Cross-bureau overlap identified",
    message: "Cases c-101 (PGRC) and c-102 (RB) share evidence circular EXAM-CIRCULAR-26 at North Valley Institute of Technology.",
    read_at: null,
    created_at: "2026-10-21T10:05:00Z",
  },
  {
    id: "notif-2",
    title: "Identity resolution pending",
    message: "Case c-113 registered with unverified institute 'Northern Vally Technology Campus'.",
    read_at: null,
    created_at: "2026-10-24T09:30:00Z",
  },
];

export const mockImports = [
  {
    id: "imp-1",
    filename: "synthetic-q3-cases.csv",
    source_bureau: "PGRC",
    records_count: 5,
    imported_at: "2026-10-15T14:30:00Z",
    status: "Completed",
  },
];

export function getMockAnalytics() {
  const total = mockCases.length;
  const active = mockCases.filter((c) => c.status !== "Disposed").length;
  const disposed = total - active;
  const overdue = 2;
  const dueSoon = 3;

  const group = (key: string) => {
    const map = new Map<string, { name: string; total: number; pending: number; disposed: number }>();
    for (const c of mockCases) {
      const name = c[key] || "Unresolved";
      if (!map.has(name)) {
        map.set(name, { name, total: 0, pending: 0, disposed: 0 });
      }
      const entry = map.get(name)!;
      entry.total++;
      if (c.status === "Disposed") entry.disposed++;
      else entry.pending++;
    }
    return Array.from(map.values());
  };

  return {
    total,
    active,
    disposed,
    overdue,
    dueSoon,
    asOf: new Date().toISOString(),
    statuses: group("status"),
    bureaus: group("bureau"),
    regions: group("region"),
    institutions: group("institution_name"),
    ageing: [
      { name: "0-7 days", total: 4, pending: 4, disposed: 0 },
      { name: "8-14 days", total: 3, pending: 3, disposed: 0 },
      { name: "15-30 days", total: 4, pending: 3, disposed: 1 },
      { name: "30+ days", total: 2, pending: 1, disposed: 1 },
    ],
    monthly: [
      { name: "2026-09", total: 4, disposed: 1 },
      { name: "2026-10", total: 9, disposed: 1 },
    ],
    monthlyPerformance: [
      { name: "2026-09", total: 4, disposalActions: 0 },
      { name: "2026-10", total: 9, disposalActions: 2 },
    ],
    quarterlyPerformance: [
      { name: "2026 Q3", total: 4, disposalActions: 0 },
      { name: "2026 Q4", total: 9, disposalActions: 2 },
    ],
  };
}

let currentMockUser: any = null;

export function handleMockApi(path: string, options: RequestInit = {}): any {
  const method = (options.method || "GET").toUpperCase();
  const urlObj = new URL(path, "http://localhost");
  const pathname = urlObj.pathname.replace(/^\/api/, "");

  if (pathname === "/me") {
    return { user: currentMockUser, demo: true };
  }

  if (pathname === "/login") {
    currentMockUser = {
      id: "admin",
      name: "Ananya Rao",
      email: "admin@demo.local",
      role: "admin",
      bureau: null,
    };
    return { status: "ok", user: currentMockUser };
  }

  if (pathname === "/logout") {
    currentMockUser = null;
    return { status: "ok" };
  }

  if (pathname === "/meta") {
    return mockMeta;
  }

  if (pathname === "/analytics") {
    return getMockAnalytics();
  }

  if (pathname === "/cases") {
    if (method === "GET") {
      const q = urlObj.searchParams.get("q")?.toLowerCase() || "";
      const bureau = urlObj.searchParams.get("bureau") || "";
      const status = urlObj.searchParams.get("status") || "";
      let filtered = mockCases;
      if (q) {
        filtered = filtered.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.institution_name.toLowerCase().includes(q) ||
            c.source_id.toLowerCase().includes(q),
        );
      }
      if (bureau) filtered = filtered.filter((c) => c.bureau === bureau);
      if (status) filtered = filtered.filter((c) => c.status === status);
      return { items: filtered, total: filtered.length };
    }
    if (method === "POST" && options.body) {
      const body = JSON.parse(options.body as string);
      const newCase = {
        id: `c-${Date.now().toString().slice(-4)}`,
        source_id: `DEMO-${Date.now().toString().slice(-3)}`,
        source: "Manual entry",
        bureau: body.bureau || "PGRC",
        category: body.category || "Fees",
        title: body.title,
        description: body.description,
        institution_id: body.institutionId || "north-valley",
        institution_name: body.institutionName || "North Valley Institute of Technology",
        region: body.region || "Northern",
        status: "Pending",
        period: body.period || "2026 autumn",
        evidence_ref: body.evidenceRef || "",
        received_at: new Date().toISOString().slice(0, 10),
        due_at: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
        officer_id: "admin",
        officer_name: "Ananya Rao",
        version: 1,
        restricted: false,
        history: [
          { id: `e-${Date.now()}`, action: "Created → Pending", remarks: "Registered in demo mode", created_at: new Date().toISOString(), user_name: "Ananya Rao" }
        ],
        attachments: [],
      };
      mockCases.unshift(newCase);
      return newCase;
    }
  }

  if (pathname.startsWith("/cases/")) {
    const id = pathname.replace("/cases/", "");
    const found = mockCases.find((c) => c.id === id);
    if (!found) throw new Error("Case not found");
    if (method === "PATCH" && options.body) {
      const body = JSON.parse(options.body as string);
      if (body.status) found.status = body.status;
      if (body.officerId) found.officer_id = body.officerId;
      found.version = (found.version || 1) + 1;
      found.history.push({
        id: `e-${Date.now()}`,
        action: `Updated → ${found.status}`,
        remarks: body.remarks || "Updated in demo mode",
        created_at: new Date().toISOString(),
        user_name: "Ananya Rao",
      });
      return found;
    }
    return found;
  }

  if (pathname === "/institutions") {
    return mockInstitutions;
  }

  if (pathname === "/overlaps") {
    return mockOverlaps;
  }

  if (pathname.startsWith("/overlaps/") && pathname.endsWith("/review")) {
    const id = pathname.replace("/overlaps/", "").replace("/review", "");
    const ov = mockOverlaps.find((o) => o.id === id);
    if (ov) {
      ov.decision = "Review recorded in demo mode";
    }
    return { status: "ok" };
  }

  if (pathname === "/notifications") {
    return mockNotifications;
  }

  if (pathname === "/imports") {
    return mockImports;
  }

  return { status: "ok" };
}
