import React, { useEffect, useState, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  X,
  AlertTriangle,
  RefreshCw,
  Users,
  Link2,
  PlayCircle,
} from "lucide-react";
import { api, send, ApiError } from "./api";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_STORAGE_KEY,
  isBrowserPreview,
} from "./demoAccess";
import "./styles.css";
const browserPreview = isBrowserPreview();
type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  bureau: string | null;
};
type Case = Record<string, any>;
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const date = (s: string) =>
  s
    ? new Date(s.length === 10 ? s + "T00:00:00+05:30" : s).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        },
      )
    : "—";
const statusClass = (s: string) => s.toLowerCase().replaceAll(" ", "-");
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Empty({ text = "No records match this view." }: { text?: string }) {
  return (
    <div className="empty">
      <ShieldCheck size={26} />
      <p>{text}</p>
    </div>
  );
}
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    ref.current?.focus();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div className="overlay">
      <div
        ref={ref}
        tabIndex={-1}
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="icon-btn"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [boot, setBoot] = useState(true),
    [demo, setDemo] = useState(false),
    [page, setPage] = useState("Overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<any>({
      bureaus: [],
      officers: [],
      categories: [],
      statuses: [],
      policies: [],
    }),
    [stats, setStats] = useState<any>(null),
    [rows, setRows] = useState<Case[]>([]),
    [total, setTotal] = useState(0),
    [institutions, setInstitutions] = useState<any[]>([]),
    [overlaps, setOverlaps] = useState<any[]>([]),
    [notifications, setNotifications] = useState<any[]>([]),
    [imports, setImports] = useState<any[]>([]);
  const [filters, setFilters] = useState({
      q: "",
      bureau: "",
      status: "",
      region: "",
      category: "",
      from: "",
      to: "",
      institution_id: "",
    }),
    [currentPage, setCurrentPage] = useState(1),
    [detail, setDetail] = useState<any>(null),
    [dialog, setDialog] = useState(""),
    [review, setReview] = useState<any>(null),
    [selectedInstitution, setSelectedInstitution] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("admin@demo.local"),
    [loginPassword, setLoginPassword] = useState(
      browserPreview ? DEMO_PASSWORD : "",
    );
  const [demoAccess, setDemoAccess] = useState<any>(
    browserPreview
      ? { enabled: true, email: DEMO_EMAIL, password: DEMO_PASSWORD }
      : { enabled: false },
  );
  const loadGeneration = React.useRef(0);
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v),
  );
  const load = useCallback(async () => {
    if (!user) return;
    const generation = ++loadGeneration.current;
    setLoading(true);
    try {
      const q = new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v),
      );
      const [m, s, c, i, o, n, im] = await Promise.all([
        api("/meta"),
        api("/analytics?" + q),
        api("/cases?" + q + `&page=${currentPage}&limit=10`),
        api("/institutions"),
        api("/overlaps"),
        api("/notifications"),
        api("/imports"),
      ]);
      if (generation !== loadGeneration.current) return;
      setMeta(m);
      setStats(s);
      setRows(c.items);
      setTotal(c.total);
      setInstitutions(i);
      setOverlaps(o);
      setNotifications(n);
      setImports(im);
    } catch (e) {
      if (generation !== loadGeneration.current) return;
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setDetail(null);
        setDialog("");
        setReview(null);
        setSelectedInstitution(null);
        setRows([]);
        setStats(null);
      }
      setError((e as Error).message);
    } finally {
      if (generation === loadGeneration.current) setLoading(false);
    }
  }, [user, filters, currentPage]);
  useEffect(() => {
    api("/demo-access")
      .then((access) => setDemoAccess(access))
      .catch(() => {});
    api("/me")
      .then((r) => {
        setUser(r.user);
        setDemo(r.demo);
      })
      .catch(() => {})
      .finally(() => setBoot(false));
  }, []);
  useEffect(() => {
    if (!user && demoAccess.enabled) {
      setLoginEmail(demoAccess.email);
      setLoginPassword(demoAccess.password);
    }
  }, [user, demoAccess]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      clearInterval(timer);
      loadGeneration.current++;
    };
  }, [load]);
  const run = async (fn: () => Promise<any>, message = "Changes saved") => {
    setBusy(true);
    setError("");
    try {
      await fn();
      setNotice(message);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const openCase = async (id: string) => {
    try {
      setDetail(await api("/cases/" + id));
      setSelectedInstitution(null);
      setReview(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const changeFilter = (key: string, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setCurrentPage(1);
  };
  const go = (next: string) => {
    setPage(next);
    setFilters({
      q: "",
      bureau: "",
      status: "",
      region: "",
      category: "",
      from: "",
      to: "",
      institution_id: "",
    });
    setCurrentPage(1);
    setSelectedInstitution(null);
    setNotice("");
  };
  const signIn = async (guided = false) => {
    setBusy(true);
    setError("");
    try {
      await api(
        "/login",
        send("POST", {
          email: guided ? demoAccess.email : loginEmail,
          password: guided ? demoAccess.password : loginPassword,
        }),
      );
      const result = await api("/me");
      setUser(result.user);
      setDemo(result.demo);
      setPage(guided ? "Guided demo" : "Overview");
      setLoginPassword("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const downloadDemo = async (path: string) => {
    await run(async () => {
      const result = await api(path);
      const blob =
        result.csv !== undefined
          ? new Blob([result.csv], { type: "text/csv;charset=utf-8" })
          : new Blob(
              [
                Uint8Array.from(atob(result.base64), (c: string) =>
                  c.charCodeAt(0),
                ),
              ],
              { type: result.mime },
            );
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename || result.name;
      anchor.click();
      URL.revokeObjectURL(url);
    }, "Demo download prepared");
  };
  if (boot) return <div className="boot">Loading BureauSetu…</div>;
  if (!user)
    return (
      <div className="login">
        <div className="login-story">
          <div className="brand">
            <div className="brand-mark">
              <Building2 />
            </div>
            <span>
              Bureau<span className="brand-light">Setu</span>
            </span>
          </div>
          <div>
            <p className="eyebrow">AICTE · SIH26264 PROTOTYPE</p>
            <h1>
              One institution.
              <br />A coordinated
              <br />
              <em>way forward.</em>
            </h1>
            <p>
              Connect complaints across bureaus. Understand the overlap. Keep
              every decision accountable.
            </p>
            <div className="login-points">
              <span>
                <ShieldCheck size={18} /> Bureau ownership preserved
              </span>
              <span>
                <GitCompareArrows size={18} /> Explainable overlap intelligence
              </span>
              <span>
                <Activity size={18} /> Traceable decisions and actions
              </span>
            </div>
          </div>
          <small>Independent SIH prototype · No live AICTE integration</small>
        </div>
        <div className="login-panel">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await signIn();
            }}
          >
            <Badge tone="green">AUTHORIZED OFFICIALS</Badge>
            <h2>Welcome to your workspace</h2>
            <p>Sign in to monitor cases and coordinate across bureaus.</p>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                maxLength={200}
              />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={18} />
            </button>
            {demoAccess.enabled && (
              <section
                className="judge-access"
                aria-labelledby="judge-access-title"
              >
                <div className="judge-access-heading">
                  <PlayCircle size={20} />
                  <h3 id="judge-access-title">Judge demo access</h3>
                </div>
                <p>
                  The demo login is already filled. Use these backup details if
                  needed.
                </p>
                <dl>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <code>{demoAccess.email}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Password</dt>
                    <dd>
                      <code>{demoAccess.password}</code>
                    </dd>
                  </div>
                </dl>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => void signIn(true)}
                >
                  Start guided demo <ArrowRight size={16} />
                </button>
                <small>
                  Public credentials for synthetic demonstration data only.{" "}
                  {browserPreview
                    ? "This browser demo uses tab storage, not a server database."
                    : "This local demo uses the seeded demonstration database."}
                </small>
              </section>
            )}
            <div className="login-note">
              <ShieldCheck size={20} />
              <span>
                Local demo accounts are configured by the seed command. See the
                README for setup and available roles.
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  const pending = overlaps.filter(
      (r) => r.active && !r.decision && r.kind === "Potential issue overlap",
    ),
    unread = notifications.filter((n) => !n.read_at).length;
  const nav = [
    ["Overview", LayoutDashboard],
    ["Guided demo", PlayCircle],
    ["Case registry", FileText],
    ["Institutions", Building2],
    ["Overlap review", GitCompareArrows],
    ["Reports", Activity],
    ["Notifications", Bell],
    ["Imports & policies", Settings2],
  ] as const;
  function CaseTable({ items = rows }: { items?: Case[] }) {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Case / institution</th>
              <th>Category</th>
              <th>Bureau / officer</th>
              <th>Status</th>
              <th>Due date</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>
                  <button
                    className="table-link"
                    onClick={() => void openCase(c.id)}
                  >
                    {c.title}
                  </button>
                  <small>
                    {c.id} <span>·</span>{" "}
                    {c.institution_name || c.institution_input}
                  </small>
                </td>
                <td>{c.category}</td>
                <td>
                  <Badge>{c.bureau}</Badge>
                  <small>{c.officer_name || "Unassigned"}</small>
                </td>
                <td>
                  <Badge tone={statusClass(c.status)}>{c.status}</Badge>
                  {!c.institution_id && (
                    <small className="amber-text">Identity review</small>
                  )}
                </td>
                <td
                  className={
                    c.due_at < today() && c.status !== "Disposed"
                      ? "red-text"
                      : ""
                  }
                >
                  {date(c.due_at)}
                  {c.due_at < today() && c.status !== "Disposed" && (
                    <small>Past deadline</small>
                  )}
                </td>
                <td>
                  <button
                    aria-label={"Open " + c.id}
                    className="icon-btn"
                    onClick={() => void openCase(c.id)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && <Empty />}
      </div>
    );
  }
  const field = (
    label: string,
    name: string,
    options?: any[],
    required = true,
  ) => (
    <label>
      {label}
      {options ? (
        <select aria-label={label} name={name} required={required}>
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.id}
              value={typeof o === "string" ? o : o.id}
            >
              {typeof o === "string" ? o : o.name}
            </option>
          ))}
        </select>
      ) : (
        <input aria-label={label} name={name} required={required} />
      )}
    </label>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Building2 size={23} />
          </div>
          <span>
            Bureau<span className="brand-light">Setu</span>
          </span>
        </div>
        <div className="workspace-label">COORDINATION WORKSPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              aria-label={name}
              title={name}
              className={page === name ? "active" : ""}
              onClick={() => go(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Overlap review" && pending.length > 0 && (
                <b>{pending.length}</b>
              )}
              {name === "Notifications" && unread > 0 && <b>{unread}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="prototype-note">
            <ShieldCheck size={19} />
            <div>
              <strong>SIH 2026 · PS 26264</strong>
              <small>Independent working prototype</small>
            </div>
          </div>
          <div className="user-card">
            <span className="avatar">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.bureau || "All bureaus"} · {user.role}
              </small>
            </div>
            <button
              aria-label="Sign out"
              className="icon-btn"
              onClick={() =>
                void run(async () => {
                  await api("/logout", send("POST"));
                  setUser(null);
                  setDetail(null);
                  setDialog("");
                  setReview(null);
                  setSelectedInstitution(null);
                  setRows([]);
                  setStats(null);
                  setError("");
                }, "Signed out")
              }
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} /> <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="live">
              <i />
              {loading ? "Syncing" : "Updates every 15s"}
            </span>
            <button
              className="icon-btn"
              aria-label="Refresh data"
              onClick={() => void load()}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-btn notification-button"
              aria-label="Open notifications"
              onClick={() => go("Notifications")}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
          </div>
        </header>
        <main>
          <div className="demo-banner">
            <span>
              <span className="demo-dot" />
              {browserPreview
                ? "BUREAUSETU · STATIC PREVIEW"
                : demo
                  ? "DEMONSTRATION ENVIRONMENT"
                  : "WORKSPACE"}
            </span>
            <span>
              {browserPreview
                ? "Synthetic browser-only demonstration · No server database · Changes are temporary"
                : demo
                  ? "Synthetic institutions and complaints · Real database and workflows"
                  : "External bureau synchronization is not configured"}
              <span className="banner-extra"> · No live AICTE connection</span>
            </span>
          </div>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === "Overview"
                  ? "CROSS-BUREAU INTELLIGENCE"
                  : "BUREAUSETU"}
              </p>
              <h1>{page === "Overview" ? "Coordination overview" : page}</h1>
              <p>
                {
                  (
                    {
                      Overview:
                        "A shared view of complaints. A clear path to coordinated action.",
                      "Guided demo":
                        "A ready-to-present walkthrough of BureauSetu, using clearly labeled synthetic records.",
                      "Case registry":
                        "Trace every case from receipt to resolution.",
                      Institutions:
                        "One verified identity. The complete institution picture.",
                      "Overlap review":
                        "Understand the evidence before deciding the relationship.",
                      Reports:
                        "Operational reports derived from the current case records.",
                      Notifications:
                        "Case activity and timeline alerts for your authorized scope.",
                      "Imports & policies":
                        "Source provenance, controlled imports and illustrative timeline policies.",
                    } as Record<string, string>
                  )[page]
                }
              </p>
            </div>
            <div className="heading-actions">
              <a
                className="secondary"
                href={"/api/reports/export?" + query}
                onClick={(e) => {
                  if (browserPreview) {
                    e.preventDefault();
                    void downloadDemo("/reports/export?" + query);
                  }
                }}
              >
                <Download size={16} /> Export cases
              </a>
              {user.role !== "viewer" && (
                <button className="primary" onClick={() => setDialog("new")}>
                  <Plus size={17} /> Register case
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="success" role="status">
              <Check size={16} />
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {stats && page === "Overview" && (
            <>
              <section className="judge-demo-strip">
                <PlayCircle size={24} />
                <div>
                  <strong>Present BureauSetu in three minutes</strong>
                  <p>
                    Follow the guided demo: institution history, related cases,
                    officer review and reporting.
                  </p>
                </div>
                <button className="secondary" onClick={() => go("Guided demo")}>
                  Open guided demo <ArrowRight size={16} />
                </button>
              </section>
              <div className="stat-grid">
                {[
                  [
                    "Total cases",
                    stats.total,
                    FileText,
                    "Across authorized records",
                  ],
                  ["Active cases", stats.active, Clock3, "Awaiting disposal"],
                  [
                    "Disposed",
                    stats.disposed,
                    ShieldCheck,
                    `${stats.total ? Math.round((stats.disposed / stats.total) * 100) : 0}% disposal rate`,
                  ],
                  [
                    "Beyond timeline",
                    stats.overdue,
                    AlertTriangle,
                    "Requires officer attention",
                  ],
                ].map(([label, value, Icon, sub]: any) => (
                  <div
                    className={
                      "stat-card " + (label === "Beyond timeline" ? "warn" : "")
                    }
                    key={label}
                  >
                    <div>
                      <span>{label}</span>
                      <Icon size={19} />
                    </div>
                    <strong>{value}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <section
                className="workflow-guide"
                aria-labelledby="workflow-heading"
              >
                <div className="workflow-guide-heading">
                  <div>
                    <p className="eyebrow">THE CASE JOURNEY</p>
                    <h2 id="workflow-heading">
                      From receipt to accountable action
                    </h2>
                  </div>
                  <span>
                    <ShieldCheck size={16} /> Officer-led decisions
                  </span>
                </div>
                <ol>
                  {[
                    [
                      "01",
                      "Capture & validate",
                      "Original reference and complaint details",
                      "Case registry",
                      FileText,
                    ],
                    [
                      "02",
                      "Resolve institution",
                      "Permanent ID, verified name or alias",
                      "Institutions",
                      Building2,
                    ],
                    [
                      "03",
                      "Compare & coordinate",
                      "Explainable signals, reviewed by an officer",
                      "Overlap review",
                      GitCompareArrows,
                    ],
                    [
                      "04",
                      "Act & monitor",
                      "Assignments, history, timelines and reports",
                      "Reports",
                      Activity,
                    ],
                  ].map(([number, title, description, target, Icon]: any) => (
                    <li key={number}>
                      <button
                        onClick={() => go(target)}
                        aria-label={`Explore ${title}`}
                      >
                        <span className="workflow-step-icon">
                          <Icon size={19} />
                        </span>
                        <span className="workflow-step-body">
                          <small>STEP {number}</small>
                          <strong>{title}</strong>
                          <span>{description}</span>
                        </span>
                        <ArrowRight className="workflow-arrow" size={16} />
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
              <div className="overview-grid">
                <section className="panel priority-panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">PRIORITY WORKSPACE</p>
                      <h2>Coordination needs attention</h2>
                    </div>
                    <Badge tone="amber">{pending.length} to review</Badge>
                  </div>
                  <p className="section-copy">
                    Potential overlapping cases across bureaus. Review the
                    evidence and coordinate the next action.
                  </p>
                  {pending.slice(0, 2).map((r) => (
                    <div className="priority-case" key={r.id}>
                      <div className="priority-icon">
                        <GitCompareArrows size={20} />
                      </div>
                      <div className="priority-body">
                        <strong>
                          {institutions.find(
                            (i) => i.id === r.a?.institution_id,
                          )?.name ||
                            r.a?.institution_name ||
                            "Institution"}
                        </strong>
                        <p>{r.a?.title}</p>
                        <div className="inline-tags">
                          <Badge>{r.a?.bureau}</Badge>
                          <Link2 size={13} />
                          <Badge>{r.b?.bureau}</Badge>
                          <span>
                            {(r.reasons || []).length} matching signals
                          </span>
                        </div>
                      </div>
                      <button
                        className="secondary compact"
                        onClick={() => setReview(r)}
                      >
                        Review <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                  {!pending.length && (
                    <Empty text="No unreviewed issue overlaps in your scope." />
                  )}
                  <button
                    className="text-action"
                    onClick={() => go("Overlap review")}
                  >
                    Open overlap review center <ArrowRight size={15} />
                  </button>
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h2>Bureau workload</h2>
                    <Users size={18} />
                  </div>
                  <p className="section-copy">
                    Current ownership across all case statuses
                  </p>
                  <div className="workloads">
                    {stats.bureaus.map((b: any) => (
                      <div key={b.name}>
                        <div>
                          <strong>{b.name}</strong>
                          <span>{b.total} cases</span>
                        </div>
                        <div className="bar">
                          <i
                            style={{
                              width: `${stats.total ? (b.total / stats.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <small>
                          {b.pending} active · {b.disposed} disposed
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className="panel-foot">
                    <Clock3 size={16} />
                    {stats.dueSoon} active cases due within 3 days
                  </div>
                </section>
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Recent case activity</h2>
                    <p className="section-copy">
                      Latest updates from your authorized workspace
                    </p>
                  </div>
                  <button
                    className="text-action"
                    onClick={() => go("Case registry")}
                  >
                    View registry <ArrowRight size={15} />
                  </button>
                </div>
                <CaseTable items={rows.slice(0, 5)} />
              </section>
              <div className="overview-bottom">
                <span>
                  <ShieldCheck size={15} /> All actions retain their original
                  bureau ownership and audit history.
                </span>
                <span>As of {date(stats.asOf)} · IST</span>
              </div>
            </>
          )}
          {page === "Guided demo" && (
            <section
              className="panel guided-demo"
              aria-labelledby="guided-demo-heading"
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">JUDGE WALKTHROUGH</p>
                  <h2 id="guided-demo-heading">Show the coordination story</h2>
                </div>
                <Badge tone="green">Synthetic demonstration</Badge>
              </div>
              <p className="section-copy">
                Two bureaus receive related fee complaints about one
                institution. Show how BureauSetu connects the institution,
                explains the overlap and records an officer-led coordination
                decision.
              </p>
              <ol>
                {[
                  [
                    "1",
                    "See the institution picture",
                    "Open North Valley Institute of Technology. Review its Permanent ID, aliases, case history and participating bureaus.",
                    "Institutions",
                    "Open institutions",
                  ],
                  [
                    "2",
                    "Review the overlap",
                    "Compare the examination-fee cases. Inspect the category, event period and evidence signals. The salary complaint remains an independent issue.",
                    "Overlap review",
                    "Open overlap review",
                  ],
                  [
                    "3",
                    "Record accountable action",
                    "Review a pair with a justification, officer, deadline and next action. Open a source case to inspect the timeline, then complete the task.",
                    "Overlap review",
                    "Review and coordinate",
                  ],
                  [
                    "4",
                    "Show persistence and reporting",
                    "Search a source reference, open its case details, change an allowed status, and inspect the updated dashboard and report export.",
                    "Case registry",
                    "Open case registry",
                  ],
                  [
                    "5",
                    "Close with the outcome",
                    "Review scoped bureau/region reports and pending ageing. Explain how coordination avoids duplicate requests while preserving both original cases.",
                    "Reports",
                    "Open reports",
                  ],
                ].map(([number, title, text, target, label]) => (
                  <li key={number}>
                    <span className="demo-step-number">{number}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    <button className="secondary" onClick={() => go(target)}>
                      {label}
                      <ArrowRight size={15} />
                    </button>
                  </li>
                ))}
              </ol>
              <div className="info-note">
                <ShieldCheck size={22} />
                <div>
                  <strong>
                    {browserPreview
                      ? "Browser-only demo — no live AICTE data"
                      : "Local server demonstration"}
                  </strong>
                  <p>
                    {browserPreview
                      ? "Changes survive reloads in this browser tab. Reset restores synthetic fixtures. This is simulated access and coordination, not real officer authentication or an operational database."
                      : "This walkthrough uses the running API and its configured database. No live government integration is configured."}
                  </p>
                </div>
              </div>
              {browserPreview && user.role !== "viewer" && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api("/demo/reset", send("POST"));
                      setDetail(null);
                      setReview(null);
                      setSelectedInstitution(null);
                    }, "Synthetic browser demo restored")
                  }
                >
                  Reset browser demo
                </button>
              )}
            </section>
          )}
          {["Case registry", "Reports"].includes(page) && (
            <div className="filter-panel">
              <div className="search">
                <Search size={17} />
                <input
                  aria-label="Search cases"
                  placeholder="Search institution, permanent ID or case reference…"
                  value={filters.q}
                  onChange={(e) => changeFilter("q", e.target.value)}
                />
              </div>
              {[
                ["bureau", "Bureau", meta.bureaus.map((b: any) => b.id)],
                ["status", "Status", meta.statuses],
                [
                  "region",
                  "Region",
                  [...new Set(institutions.map((i) => i.region))],
                ],
                ["category", "Category", meta.categories],
              ].map(([key, label, options]: any) => (
                <select
                  key={key}
                  aria-label={label}
                  value={(filters as any)[key]}
                  onChange={(e) => changeFilter(key, e.target.value)}
                >
                  <option value="">All {label.toLowerCase()}s</option>
                  {options.map((o: string) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ))}
              <label className="date-filter">
                From
                <input
                  type="date"
                  aria-label="Received from"
                  value={filters.from}
                  onChange={(e) => changeFilter("from", e.target.value)}
                />
              </label>
              <label className="date-filter">
                To
                <input
                  type="date"
                  aria-label="Received to"
                  value={filters.to}
                  onChange={(e) => changeFilter("to", e.target.value)}
                />
              </label>
            </div>
          )}
          {page === "Case registry" && (
            <section className="panel">
              <div className="section-heading">
                <h2>
                  All cases <span className="count">{total}</span>
                </h2>
                <Badge>{stats?.unresolved || 0} unresolved identities</Badge>
              </div>
              <CaseTable />
              <div className="pagination">
                <span>
                  Page {currentPage} · {total} matching records
                </span>
                <div>
                  <button
                    className="icon-btn"
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Next page"
                    disabled={currentPage * 10 >= total}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {page === "Institutions" && (
            <>
              <div className="search institution-search">
                <Search size={18} />
                <input
                  aria-label="Search institutions"
                  placeholder="Find by institution name, alias or permanent ID…"
                  value={filters.q}
                  onChange={(e) => changeFilter("q", e.target.value)}
                />
              </div>
              <div className="institution-grid">
                {institutions
                  .filter((i) =>
                    [i.name, i.permanent_id, ...(i.aliases || [])]
                      .join(" ")
                      .toLowerCase()
                      .includes(filters.q.toLowerCase()),
                  )
                  .map((i) => (
                    <button
                      key={i.id}
                      className="institution-card"
                      onClick={async () => {
                        setSelectedInstitution({
                          ...i,
                          records: (
                            await api(
                              "/cases?institution_id=" + i.id + "&limit=100",
                            )
                          ).items,
                        });
                      }}
                    >
                      <div className="institution-icon">
                        <Building2 size={24} />
                      </div>
                      <Badge>{i.region}</Badge>
                      <h2>{i.name}</h2>
                      <p>{i.permanent_id}</p>
                      <div>
                        <span>
                          <strong>{i.cases}</strong> cases
                        </span>
                        <span>
                          <strong>{i.active}</strong> active
                        </span>
                        <ArrowUpRight size={19} />
                      </div>
                      <small>
                        {(i.bureaus || []).join(" · ") || "No cases"}
                      </small>
                    </button>
                  ))}
              </div>
            </>
          )}
          {page === "Overlap review" && (
            <>
              <div className="info-note">
                <GitCompareArrows size={21} />
                <div>
                  <strong>
                    Same institution does not mean the same issue.
                  </strong>
                  <p>
                    Rule-based signals identify candidates. Only an authorized
                    officer can confirm a relationship. Original case records
                    are never merged.
                  </p>
                </div>
              </div>
              <div className="overlap-list">
                {overlaps.map((r) => (
                  <section className="panel overlap-card" key={r.id}>
                    <div className="section-heading">
                      <Badge
                        tone={
                          !r.active
                            ? "neutral"
                            : r.kind === "Potential issue overlap"
                              ? "amber"
                              : "green"
                        }
                      >
                        {!r.active ? "Historical relationship" : r.kind}
                      </Badge>
                      <Badge>
                        {r.decision ? "Reviewed" : "Awaiting review"}
                      </Badge>
                    </div>
                    <h2>
                      {institutions.find((i) => i.id === r.a?.institution_id)
                        ?.name ||
                        r.a?.institution_name ||
                        "Institution"}
                    </h2>
                    <div className="comparison">
                      <div>
                        <Badge>{r.a?.bureau}</Badge>
                        <button
                          className="table-link"
                          onClick={() => void openCase(r.a?.id)}
                        >
                          {r.a?.title}
                        </button>
                        <small>
                          {r.a?.id} · {r.a?.category}
                        </small>
                      </div>
                      <Link2 size={20} />
                      <div>
                        <Badge>{r.b?.bureau}</Badge>
                        <button
                          className="table-link"
                          onClick={() => void openCase(r.b?.id)}
                        >
                          {r.b?.title}
                        </button>
                        <small>
                          {r.b?.id} · {r.b?.category}
                        </small>
                      </div>
                    </div>
                    <div className="signals">
                      {r.reasons.map((reason: string) => (
                        <span key={reason}>
                          <Check size={13} />
                          {reason}
                        </span>
                      ))}
                    </div>
                    {r.decision && (
                      <p className="decision-text">
                        <strong>{r.decision}</strong> · {r.justification}
                      </p>
                    )}
                    <div className="overlap-footer">
                      <small>
                        Rule score {r.score}/100 · ranking signal, not
                        duplication probability
                      </small>
                      <button
                        className="secondary"
                        onClick={() => setReview(r)}
                      >
                        {r.decision ? "View decision" : "Compare & review"}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                    {r.tasks.map((t: any) => (
                      <div className="task-row" key={t.id}>
                        <Clock3 size={17} />
                        <div>
                          <strong>{t.next_action}</strong>
                          <small>
                            {t.officer_name} · Due {date(t.due_at)} · {t.state}
                          </small>
                        </div>
                        {(user.role === "admin" ||
                          user.id === t.officer_id) && (
                          <button
                            className="secondary compact"
                            disabled={busy}
                            onClick={() =>
                              void run(() =>
                                api(
                                  "/tasks/" + t.id,
                                  send("PATCH", {
                                    state:
                                      t.state === "Open" ? "Completed" : "Open",
                                  }),
                                ),
                              )
                            }
                          >
                            {t.state === "Open"
                              ? "Complete task"
                              : "Reopen task"}
                          </button>
                        )}
                      </div>
                    ))}
                  </section>
                ))}
                {!overlaps.length && (
                  <Empty text="No cross-bureau relationships in your authorized scope." />
                )}
              </div>
            </>
          )}
          {page === "Reports" && stats && (
            <>
              <div className="stat-grid">
                {[
                  ["Matching cases", stats.total],
                  ["Active", stats.active],
                  ["Overdue", stats.overdue],
                  [
                    "Disposal rate",
                    `${stats.total ? Math.round((stats.disposed / stats.total) * 100) : 0}%`,
                  ],
                ].map(([k, v]) => (
                  <div className="stat-card" key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <div className="report-grid">
                {[
                  ["By bureau", stats.bureaus],
                  ["By region", stats.regions],
                  ["By institution", stats.institutions],
                  ["By status", stats.statuses],
                  ["Pending case age · calendar days", stats.ageing],
                  ["Receipt month / disposed subset", stats.monthly],
                  ["Monthly performance", stats.monthlyPerformance],
                  ["Quarterly performance", stats.quarterlyPerformance],
                ].map(([label, items]: any) => (
                  <section className="panel" key={label}>
                    <h2>{label}</h2>
                    {items.map((i: any) => (
                      <div className="report-row" key={i.name}>
                        <span>{i.name}</span>
                        <strong>{i.total}</strong>
                        {i.disposed !== undefined && (
                          <small>{i.disposed} disposed</small>
                        )}
                        {i.disposalActions !== undefined && (
                          <small>{i.disposalActions} disposal actions</small>
                        )}
                      </div>
                    ))}
                    {!items.length && <Empty />}
                  </section>
                ))}
              </div>
              <p className="muted">
                Performance counts show receipts and recorded disposal actions
                in each period (IST). A reopened case may have multiple disposal
                actions. All reports and exports honor the case filters.
              </p>
            </>
          )}
          {page === "Notifications" && (
            <section className="panel">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={"notification-row " + (!n.read_at ? "unread" : "")}
                >
                  <div className="notification-icon">
                    {n.kind === "Timeline" ? (
                      <Clock3 size={19} />
                    ) : (
                      <Bell size={19} />
                    )}
                  </div>
                  <div>
                    <strong>{n.message}</strong>
                    <small>
                      {n.kind} · {date(n.created_at)}
                    </small>
                  </div>
                  {n.case_id && (
                    <button
                      className="text-action"
                      onClick={() => void openCase(n.case_id)}
                    >
                      Open case
                    </button>
                  )}
                  {!n.read_at && (
                    <button
                      className="icon-btn"
                      aria-label={"Mark read " + n.id}
                      onClick={() =>
                        void run(
                          () => api("/notifications/" + n.id, send("PATCH")),
                          "Notification marked read",
                        )
                      }
                    >
                      <Check size={18} />
                    </button>
                  )}
                </div>
              ))}
              {!notifications.length && <Empty text="No notifications yet." />}
            </section>
          )}
          {page === "Imports & policies" && (
            <>
              <div className="info-note">
                <Upload size={22} />
                <div>
                  <strong>Controlled source import</strong>
                  <p>
                    CSV and JSON imports preserve source IDs and skip records
                    already imported. The batch is atomic. Live bureau adapters
                    are not configured.
                  </p>
                </div>
                {user.role !== "viewer" && (
                  <button
                    className="secondary"
                    onClick={() => setDialog("import")}
                  >
                    Import records
                  </button>
                )}
              </div>
              <section className="panel">
                <h2>Import history</h2>
                {imports.map((i) => (
                  <div className="report-row" key={i.id}>
                    <span>
                      {i.source} · {i.actor}
                    </span>
                    <strong>
                      {i.count} created / {i.skipped} skipped
                    </strong>
                    <small>{date(i.created_at)}</small>
                  </div>
                ))}
                {!imports.length && (
                  <Empty text="No source imports have been run." />
                )}
              </section>
              <section className="panel policy-panel">
                <h2>Timeline policies</h2>
                <p className="section-copy">
                  Illustrative calendar-day policies. Updates apply to new
                  cases; existing deadlines keep their original policy.
                </p>
                {meta.policies.map((p: any) => (
                  <form
                    className="policy-row"
                    key={p.category}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const data = new FormData(e.currentTarget);
                      void run(() =>
                        api(
                          "/policies/" + encodeURIComponent(p.category),
                          send("PATCH", {
                            days: Number(data.get("days")),
                            rule: data.get("rule"),
                          }),
                        ),
                      );
                    }}
                  >
                    <strong>{p.category}</strong>
                    <label>
                      Days
                      <input
                        aria-label={p.category + " deadline days"}
                        name="days"
                        type="number"
                        min="1"
                        max="365"
                        defaultValue={p.days}
                        disabled={user.role !== "admin"}
                        required
                      />
                    </label>
                    <label>
                      Rule / authority
                      <input
                        aria-label={p.category + " policy rule"}
                        name="rule"
                        defaultValue={p.rule}
                        minLength={10}
                        maxLength={300}
                        disabled={user.role !== "admin"}
                        required
                      />
                    </label>
                    {user.role === "admin" && (
                      <button className="secondary compact" disabled={busy}>
                        Save policy
                      </button>
                    )}
                  </form>
                ))}
              </section>
            </>
          )}
          <footer>
            BureauSetu <span>·</span> SIH26264 <span>·</span> Authorized
            coordination workspace{" "}
            <span className="footer-right">All dates shown in IST</span>
          </footer>
        </main>
      </div>
      {dialog === "new" && (
        <Modal
          title="Register a complaint / case"
          close={() => setDialog("")}
          wide
        >
          <p className="modal-intro">
            Record the original reference and institution details. Potential
            relationships are identified after saving.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget),
                body = Object.fromEntries(f);
              if (
                await run(
                  () =>
                    api(
                      "/cases",
                      send("POST", {
                        ...body,
                        restricted: f.get("restricted") === "on",
                      }),
                    ),
                  "Case registered and matching completed",
                )
              )
                setDialog("");
            }}
          >
            <div className="form-grid">
              <label className="span-2">
                Complaint title
                <input name="title" minLength={8} maxLength={180} required />
              </label>
              {field("Institution name", "institutionName")}
              {field("AICTE Permanent ID", "permanentId", undefined, false)}
              {field("Region", "region", [
                ...new Set(institutions.map((i) => i.region)),
              ])}
              {field(
                "Bureau",
                "bureau",
                meta.bureaus.filter(
                  (b: any) => user.role === "admin" || b.id === user.bureau,
                ),
              )}
              {field("Category", "category", meta.categories)}
              <label>
                Date received
                <input
                  type="date"
                  name="receivedAt"
                  defaultValue={today()}
                  max={today()}
                  required
                />
              </label>
              {field("Alleged event period", "period")}
              {field("Source reference", "sourceId")}
              {field(
                "Shared evidence reference",
                "evidenceRef",
                undefined,
                false,
              )}
              <label>
                Source
                <input
                  name="source"
                  defaultValue="Manual"
                  required
                  maxLength={50}
                />
              </label>
              <label className="span-2">
                Allegations / description
                <textarea
                  name="description"
                  minLength={20}
                  maxLength={10000}
                  rows={4}
                  required
                />
              </label>
              <label className="checkbox span-2">
                <input type="checkbox" name="restricted" /> Restrict details to
                owning bureau and administrators
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDialog("")}
              >
                Cancel
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Registering…" : "Register & check overlap"}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dialog === "import" && (
        <Modal
          title="Import bureau source records"
          close={() => setDialog("")}
          wide
        >
          <p className="modal-intro">
            Paste CSV with case-field headers or a JSON array using the case
            registration contract. Required fields and a sample are available in
            docs/API.md. Existing source IDs are skipped; no source update is
            silently applied.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const content = String(f.get("records"));
                const data =
                  f.get("format") === "csv"
                    ? { csv: content }
                    : { records: JSON.parse(content) };
                if (
                  await run(async () => {
                    const result = await api(
                      "/import",
                      send("POST", { source: f.get("source"), ...data }),
                    );
                    setNotice(
                      `${result.created} created, ${result.skipped} existing records skipped`,
                    );
                  }, "Import complete")
                )
                  setDialog("");
              } catch {
                setError("Enter valid source records in the selected format");
              }
            }}
          >
            <label>
              Format
              <select aria-label="Import format" name="format">
                <option value="json">JSON array</option>
                <option value="csv">CSV with headers</option>
              </select>
            </label>
            <label>
              Source
              <select aria-label="Import source" name="source">
                {["RB import", "PGRC import", "RO import"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Records
              <textarea
                name="records"
                required
                rows={14}
                placeholder="[{ ...case record... }]"
              />
            </label>
            <div className="modal-actions">
              <button className="primary" disabled={busy}>
                <Upload size={16} /> Validate & import
              </button>
            </div>
          </form>
        </Modal>
      )}
      {selectedInstitution && (
        <Modal
          title="Institution profile"
          close={() => setSelectedInstitution(null)}
          wide
        >
          <div className="institution-detail">
            <Building2 size={32} />
            <div>
              <h2>{selectedInstitution.name}</h2>
              <p>
                {selectedInstitution.permanent_id} ·{" "}
                {selectedInstitution.region}
              </p>
              <small>{selectedInstitution.address}</small>
            </div>
          </div>
          <div className="info-note">
            <div>
              <strong>Verified aliases</strong>
              <p>
                {(selectedInstitution.aliases || []).join(" · ") ||
                  "No aliases recorded"}
              </p>
            </div>
          </div>
          <h3>Consolidated case history</h3>
          <CaseTable items={selectedInstitution.records} />
        </Modal>
      )}
      {detail && (
        <Modal title={detail.id} close={() => setDetail(null)} wide>
          <div className="detail-title">
            <Badge tone={statusClass(detail.status)}>{detail.status}</Badge>
            <Badge>{detail.bureau}</Badge>
            {!!detail.restricted && <Badge tone="amber">Restricted</Badge>}
            <h2>{detail.title}</h2>
            <p>{detail.description}</p>
          </div>
          <dl className="detail-grid">
            {[
              ["Institution", detail.institution_input],
              ["Identity", detail.identity_state],
              ["Category", detail.category],
              ["Alleged period", detail.period],
              ["Received", date(detail.received_at)],
              ["Expected disposal", date(detail.due_at)],
              ["Source reference", `${detail.source} / ${detail.source_id}`],
              ["Last source synchronization", date(detail.synced_at)],
              ["Next action", detail.next_action],
              ["Shared evidence", detail.evidence_ref || "None"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {new Date().getTime() - new Date(detail.synced_at).getTime() >
            86400000 && (
            <div className="info-note">
              Source snapshot is older than 24 hours. No live source
              synchronization is configured.
            </div>
          )}
          {!detail.institution_id && user.role === "admin" && (
            <form
              className="subform"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await run(
                    () =>
                      api(
                        "/cases/" + detail.id + "/identity",
                        send("POST", {
                          institutionId: f.get("institutionId"),
                          version: detail.version,
                          remarks: f.get("remarks"),
                          approveAlias: f.get("approveAlias") === "on",
                        }),
                      ),
                    "Institution identity verified",
                  )
                ) {
                  await openCase(detail.id);
                }
              }}
            >
              <h3>Verify institution identity</h3>
              {field("Verified institution", "institutionId", institutions)}
              <label>
                Verification justification
                <textarea
                  name="remarks"
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </label>
              <label className="checkbox">
                <input type="checkbox" name="approveAlias" /> Approve submitted
                name as a verified alias
              </label>
              <button className="secondary" disabled={busy}>
                Confirm identity
              </button>
            </form>
          )}
          {detail.canWrite && (
            <form
              className="subform"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const body = {
                  version: detail.version,
                  status: f.get("status"),
                  bureau: f.get("bureau"),
                  officerId: f.get("officerId") || null,
                  nextAction: f.get("nextAction"),
                  remarks: f.get("remarks"),
                };
                if (
                  await run(() =>
                    api("/cases/" + detail.id, send("PATCH", body)),
                  )
                )
                  await openCase(detail.id);
              }}
            >
              <h3>Record an action</h3>
              <div className="form-grid">
                <label>
                  Status
                  <select
                    aria-label="Status"
                    name="status"
                    defaultValue={detail.status}
                  >
                    {meta.statuses.map((s: string) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Responsible bureau
                  <select
                    aria-label="Responsible bureau"
                    name="bureau"
                    defaultValue={detail.bureau}
                  >
                    {meta.bureaus.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Assigned officer
                  <select
                    aria-label="Assigned officer"
                    name="officerId"
                    defaultValue={detail.officer_id || ""}
                  >
                    <option value="">Unassigned</option>
                    {meta.officers.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.name} · {o.bureau}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Next action
                  <input
                    name="nextAction"
                    defaultValue={detail.next_action}
                    maxLength={1000}
                  />
                </label>
                <label className="span-2">
                  Action / justification
                  <textarea
                    name="remarks"
                    required
                    minLength={5}
                    maxLength={2000}
                  />
                </label>
              </div>
              <p className="muted">
                A transfer requires status “Transferred”, a different bureau and
                an officer in the destination bureau (or Unassigned). Disposed
                cases can be reopened to Under Process.
              </p>
              <button className="primary" disabled={busy}>
                Save action
              </button>
            </form>
          )}
          <h3>Supporting documents</h3>
          <div className="documents">
            {detail.documents.map((d: any) => (
              <a
                className="secondary"
                key={d.id}
                href={"/api/documents/" + d.id}
                onClick={(e) => {
                  if (browserPreview) {
                    e.preventDefault();
                    void downloadDemo("/documents/" + d.id);
                  }
                }}
              >
                <FileText size={15} />
                {d.name}
                <Download size={14} />
              </a>
            ))}
            {!detail.documents.length && <small>No documents attached.</small>}
          </div>
          {detail.canWrite && (
            <form
              className="upload-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  file = f.get("file") as File;
                if (file.size > 2 * 1024 * 1024) {
                  setError("Attachment must be 2 MB or smaller");
                  return;
                }
                const base64 = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () =>
                    resolve(String(reader.result).split(",")[1]);
                  reader.onerror = () =>
                    reject(new Error("File could not be read"));
                  reader.readAsDataURL(file);
                });
                if (
                  await run(
                    () =>
                      api(
                        "/cases/" + detail.id + "/documents",
                        send("POST", { name: file.name, base64 }),
                      ),
                    "Document attached",
                  )
                )
                  await openCase(detail.id);
              }}
            >
              <label>
                Attach evidence (TXT, PDF, PNG, JPG · up to 2 MB)
                <input
                  type="file"
                  name="file"
                  accept=".txt,.pdf,.png,.jpg,.jpeg"
                  required
                />
              </label>
              <button className="secondary compact" disabled={busy}>
                <Upload size={15} /> Attach
              </button>
            </form>
          )}
          <h3>Chronological action history</h3>
          <div className="timeline">
            {detail.events.map((e: any) => (
              <div key={e.id}>
                <i />
                <div>
                  <strong>{e.action}</strong>
                  <p>{e.remarks}</p>
                  <small>
                    {e.actor} · {e.bureau} ·{" "}
                    {new Date(e.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}{" "}
                    IST
                  </small>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {review && (
        <Modal title="Compare & coordinate" close={() => setReview(null)} wide>
          <div className="info-note">
            <GitCompareArrows />
            <div>
              <strong>{review.kind}</strong>
              <p>
                Signals suggest a relationship; this is not an automatic finding
                of duplication.
              </p>
            </div>
          </div>
          <div className="comparison review-comparison">
            {[review.a, review.b].map((c: any) => (
              <div key={c.id}>
                <Badge>{c.bureau}</Badge>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
                <small>
                  {c.id} · {c.category} · {c.period}
                </small>
              </div>
            ))}
          </div>
          <div className="signals">
            {review.reasons.map((r: string) => (
              <span key={r}>
                <Check size={14} />
                {r}
              </span>
            ))}
          </div>
          <p className="muted">
            Rule score {review.score}/100. This is a ranking heuristic, not a
            probability or validated accuracy measure.
          </p>
          {review.decision && (
            <div className="success">
              Last decision: {review.decision} · {review.justification} ·{" "}
              {date(review.reviewed_at)}
            </div>
          )}
          {user.role !== "viewer" &&
            review.active &&
            (user.role === "admin" ||
              [review.a.bureau, review.b.bureau].includes(user.bureau)) && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  if (
                    await run(
                      () =>
                        api(
                          "/overlaps/" + review.id + "/review",
                          send("POST", {
                            version: review.version,
                            decision: f.get("decision"),
                            justification: f.get("justification"),
                            ...(f.get("officerId")
                              ? { officerId: f.get("officerId") }
                              : {}),
                            ...(f.get("dueAt")
                              ? { dueAt: f.get("dueAt") }
                              : {}),
                            nextAction: f.get("nextAction"),
                          }),
                        ),
                      "Review recorded in both case histories",
                    )
                  )
                    setReview(null);
                }}
              >
                <label>
                  Relationship decision
                  <select aria-label="Relationship decision" name="decision">
                    {[
                      "Related — coordination required",
                      "Confirmed duplicate issue",
                      "Same institution — independent issues",
                      "Not related",
                      "Needs additional information",
                    ].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Decision justification
                  <textarea
                    name="justification"
                    minLength={10}
                    maxLength={2000}
                    required
                    rows={3}
                  />
                </label>
                <p className="muted">
                  For related or duplicate issues, assign a coordination task
                  below.
                </p>
                <div className="form-grid">
                  {field(
                    "Responsible officer",
                    "officerId",
                    meta.officers.filter((o: any) =>
                      [review.a.bureau, review.b.bureau].includes(o.bureau),
                    ),
                    false,
                  )}
                  <label>
                    Coordination deadline
                    <input type="date" name="dueAt" min={today()} />
                  </label>
                  <label className="span-2">
                    Coordination action
                    <input
                      name="nextAction"
                      maxLength={1000}
                      placeholder="e.g. Share evidence and agree the lead bureau"
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <button className="primary" disabled={busy}>
                    Record review & coordination
                  </button>
                </div>
              </form>
            )}
        </Modal>
      )}
    </div>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="boot">
        <h1>Workspace could not render</h1>
        <p>
          {browserPreview
            ? "Reset the synthetic browser demo to return to the prefilled login. Server records are not affected."
            : "Reload to reconnect to the saved server state."}
        </p>
        <button
          onClick={() => {
            if (browserPreview) sessionStorage.removeItem(DEMO_STORAGE_KEY);
            location.reload();
          }}
        >
          {browserPreview ? "Reset browser demo" : "Reload workspace"}
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
