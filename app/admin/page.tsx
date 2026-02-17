"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

/* ================================================================
   TYPES
   ================================================================ */
interface OverviewData {
  counts: { decks: number; cards: number; logs: number; webVitals: number; totalReviews: number; todayReviews: number; dueCards: number };
  cardStates: { new: number; learning: number; review: number; relearning: number };
  todayGrades: { again: number; hard: number; good: number; easy: number };
  recentDecks: Array<{ id: string; name: string; created_at: string; updated_at: string }>;
  recentLogs: Array<{ id: string; level: string; message: string; data?: Record<string, unknown>; created_at: string }>;
  user: { id: string; email: string | null; name: string; avatar: string | null; lastSignIn: string | null; createdAt: string | null };
}

interface ApiEndpoint {
  id: string;
  method: "GET" | "POST";
  path: string;
  name: string;
  description: string;
  category: "sync" | "tools" | "admin" | "backup" | "monitoring";
  rateLimit: string;
  auth: string;
  params?: Array<{ name: string; type: string; required: boolean; description: string; default?: string }>;
  bodyExample?: string;
  dangerous?: boolean;
}

interface ApiResult {
  status: number;
  statusText: string;
  data: unknown;
  duration: number;
  headers: Record<string, string>;
}

/* ================================================================
   API REGISTRY — every endpoint in the system
   ================================================================ */
const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "sync-get", method: "GET", path: "/api/sync", name: "Sync — Load State",
    description: "Loads all decks, cards, and settings from the cloud. If the 'since' parameter is provided, only changes after that time are returned (delta sync).",
    category: "sync", rateLimit: "30/min", auth: "Required",
    params: [{ name: "since", type: "string", required: false, description: "ISO timestamp — only changes after this time (delta sync)", default: "" }],
  },
  {
    id: "sync-post", method: "POST", path: "/api/sync", name: "Sync — Save Changes",
    description: "Saves changes to the cloud. Change types: DECK_CREATE, DECK_UPDATE, CARD_CREATE, CARD_UPDATE, DECK_DELETE, CARD_DELETE, REVIEW_LOG",
    category: "sync", rateLimit: "20/min", auth: "Required",
    bodyExample: JSON.stringify({ changes: [{ type: "DECK_CREATE", data: { id: "example-uuid", name: "Test Deck" }, timestamp: new Date().toISOString() }], lastSyncedAt: null }, null, 2),
  },
  {
    id: "generate", method: "POST", path: "/api/generate", name: "Generate TSV",
    description: "Generates TSV file from flashcard data for Anki import.",
    category: "tools", rateLimit: "30/min", auth: "Required",
    bodyExample: JSON.stringify({ cards: [{ term: "Hello", definition: "Salom" }], deckName: "Test" }, null, 2),
  },
  {
    id: "parse", method: "POST", path: "/api/parse", name: "Parse Text → Cards",
    description: "Parses text into flashcard pairs. Separators: ==, ->, =>, :, tab. Google Docs URLs are also supported.",
    category: "tools", rateLimit: "30/min", auth: "Required",
    bodyExample: JSON.stringify({ text: "Hello == Salom\nWorld == Dunyo\nBook == Kitob", separator: "==" }, null, 2),
  },
  {
    id: "translate", method: "POST", path: "/api/translate", name: "Translate Text",
    description: "Translates text (Google Translate). Automatic language detection, Uzbek ↔ English.",
    category: "tools", rateLimit: "20/min", auth: "Required",
    bodyExample: JSON.stringify({ text: "Hello, how are you?", target: "uz" }, null, 2),
  },
  {
    id: "logs", method: "POST", path: "/api/logs", name: "System Log",
    description: "Writes to system log. Levels: INFO, WARN, ERROR, DEBUG",
    category: "monitoring", rateLimit: "60/min", auth: "Required",
    bodyExample: JSON.stringify({ level: "INFO", message: "Admin panel test log", data: { source: "admin" } }, null, 2),
  },
  {
    id: "analytics", method: "POST", path: "/api/analytics", name: "Web Vitals",
    description: "Saves Web Vitals metrics (LCP, CLS, FCP, TTFB, INP). Sent automatically.",
    category: "monitoring", rateLimit: "100/min", auth: "Required",
    bodyExample: JSON.stringify({ name: "LCP", value: 1200, rating: "good", delta: 1200, id: "v4-test", navigationType: "navigate" }, null, 2),
  },
  {
    id: "backup-export", method: "GET", path: "/api/backup/export", name: "Export Backup",
    description: "Exports all data in JSON format (decks, cards, review logs, settings).",
    category: "backup", rateLimit: "10/min", auth: "Required",
    params: [{ name: "include_logs", type: "string", required: false, description: "Include review logs (true/false)", default: "true" }],
  },
  {
    id: "backup-import", method: "POST", path: "/api/backup/import", name: "Import Backup",
    description: "⚠️ DANGEROUS: Restores from JSON backup. All existing data will be DELETED and replaced!",
    category: "backup", rateLimit: "5/min", auth: "Required", dangerous: true,
    bodyExample: '{ "version": 1, "decks": [...], "cards": [...] }',
  },
  {
    id: "admin-overview", method: "GET", path: "/api/admin/overview", name: "Admin Overview",
    description: "Dashboard overview statistics — decks, cards, logs, today's reviews, card states.",
    category: "admin", rateLimit: "30/min", auth: "Admin only",
  },
  {
    id: "admin-metrics", method: "GET", path: "/api/admin/metrics", name: "Admin Metrics",
    description: "Statistical analysis of Web Vitals metrics — average, median, p75, p95, rating distribution.",
    category: "admin", rateLimit: "30/min", auth: "Admin only",
    params: [
      { name: "days", type: "number", required: false, description: "Number of days of data (default: 7)", default: "7" },
      { name: "metric", type: "string", required: false, description: "Metric name filter (LCP, CLS, FCP, TTFB, INP)", default: "" },
    ],
  },
];

const CATEGORIES = [
  { id: "all", label: "📋 All", count: API_ENDPOINTS.length },
  { id: "sync", label: "🔄 Sync", count: API_ENDPOINTS.filter(e => e.category === "sync").length },
  { id: "tools", label: "🛠️ Tools", count: API_ENDPOINTS.filter(e => e.category === "tools").length },
  { id: "backup", label: "💾 Backup", count: API_ENDPOINTS.filter(e => e.category === "backup").length },
  { id: "monitoring", label: "📊 Monitoring", count: API_ENDPOINTS.filter(e => e.category === "monitoring").length },
  { id: "admin", label: "🛡️ Admin", count: API_ENDPOINTS.filter(e => e.category === "admin").length },
];

type Tab = "overview" | "api" | "data" | "logs" | "health";

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<OverviewData | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API Tester state
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [apiBody, setApiBody] = useState("");
  const [apiParams, setApiParams] = useState<Record<string, string>>({});
  const [apiResult, setApiResult] = useState<ApiResult | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Data management
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const fetchOverview = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/overview");
      if (res.status === 403) { setIsForbidden(true); return; }
      if (res.ok) setData(await res.json());
      else setError("Failed to load dashboard");
    } catch { setError("Network error"); }
    finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // When selecting an endpoint, populate its example body
  useEffect(() => {
    if (!selectedEndpoint) return;
    const ep = API_ENDPOINTS.find(e => e.id === selectedEndpoint);
    if (ep?.bodyExample) setApiBody(ep.bodyExample);
    else setApiBody("");
    setApiParams({});
    setApiResult(null);
  }, [selectedEndpoint]);

  /* === API Tester === */
  const executeApi = async () => {
    const ep = API_ENDPOINTS.find(e => e.id === selectedEndpoint);
    if (!ep) return;
    setApiLoading(true);
    setApiResult(null);
    const start = performance.now();

    try {
      let url = ep.path;
      const queryParams = new URLSearchParams();
      if (ep.params) {
        ep.params.forEach(p => {
          const val = apiParams[p.name] || p.default || "";
          if (val) queryParams.set(p.name, val);
        });
      }
      const qs = queryParams.toString();
      if (qs) url += `?${qs}`;

      const opts: RequestInit = { method: ep.method, credentials: "same-origin" };
      if (ep.method === "POST" && apiBody) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = apiBody;
      }

      const res = await fetch(url, opts);
      const duration = Math.round(performance.now() - start);
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });

      let responseData: unknown;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("json")) responseData = await res.json();
      else responseData = await res.text();

      setApiResult({ status: res.status, statusText: res.statusText, data: responseData, duration, headers });
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - start);
      setApiResult({ status: 0, statusText: "Network Error", data: { error: String(err) }, duration, headers: {} });
    } finally {
      setApiLoading(false);
    }
  };

  /* === Quick Actions === */
  const doFullSync = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch("/api/sync");
      setSyncResult(await res.json());
    } catch (err) { setSyncResult({ error: String(err) }); }
    finally { setSyncLoading(false); }
  };

  const doExportBackup = async () => {
    try {
      const res = await fetch("/api/backup/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ankiflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) { console.error("Export failed:", e); }
  };

  /* === Guards === */
  if (loading || !user) {
    return <div style={S.center}><div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem" }}>⏳</div><p>Loading...</p></div></div>;
  }
  if (isForbidden) {
    return (
      <div style={S.center}>
        <div style={{ ...S.card, textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Access Denied</h1>
          <p style={{ color: "var(--text-secondary)", margin: "0.5rem 0 1.5rem" }}>Admin panel faqat administratorlar uchun.</p>
          <a href="/app" style={S.btnPrimary}>← Ilovaga qaytish</a>
        </div>
      </div>
    );
  }

  const ep = selectedEndpoint ? API_ENDPOINTS.find(e => e.id === selectedEndpoint) : null;
  const filteredEndpoints = categoryFilter === "all" ? API_ENDPOINTS : API_ENDPOINTS.filter(e => e.category === categoryFilter);

  const stateTotal = data ? data.cardStates.new + data.cardStates.learning + data.cardStates.review + data.cardStates.relearning : 0;
  const gradeTotal = data ? data.todayGrades.again + data.todayGrades.hard + data.todayGrades.good + data.todayGrades.easy : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* === HEADER === */}
      <header style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", padding: "0.75rem 1.5rem", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <a href="/app" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem" }}>←</a>
            <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>🛡️ Admin Panel</h1>
          </div>
          {data?.user && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {data.user.avatar && <img src={data.user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} />}
              <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{data.user.name}</span>
            </div>
          )}
        </div>
      </header>

      {/* === TABS === */}
      <nav style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", padding: "0 1.5rem", position: "sticky", top: 49, zIndex: 19 }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", display: "flex", gap: "0", overflowX: "auto" }}>
          {([
            { id: "overview" as Tab, label: "📊 Overview" },
            { id: "api" as Tab, label: "🔌 API Tester" },
            { id: "data" as Tab, label: "🗂️ Data" },
            { id: "logs" as Tab, label: "📋 Logs" },
            { id: "health" as Tab, label: "💚 Health" },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "0.75rem 1.25rem",
                background: "none",
                border: "none",
                borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
                color: tab === t.id ? "var(--accent)" : "var(--text-secondary)",
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: "0.85rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {/* === CONTENT === */}
      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "1.5rem" }}>
        {isLoading && tab === "overview" ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>⏳ Loading...</div>
        ) : error && tab === "overview" ? (
          <div style={{ ...S.card, textAlign: "center", padding: "3rem" }}>
            <p>⚠️ {error}</p>
            <button onClick={fetchOverview} style={S.btnPrimary}>Retry</button>
          </div>
        ) : (
          <>
            {/* ===== TAB: OVERVIEW ===== */}
            {tab === "overview" && data && (
              <>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.6rem", marginBottom: "1.25rem" }}>
                  <Stat emoji="📚" label="Decks" value={data.counts.decks} />
                  <Stat emoji="��" label="Cards" value={data.counts.cards} />
                  <Stat emoji="🔄" label="Due" value={data.counts.dueCards} color="#f59e0b" />
                  <Stat emoji="📝" label="Bugun" value={data.counts.todayReviews} color="#22c55e" />
                  <Stat emoji="📊" label="Jami Review" value={data.counts.totalReviews} />
                  <Stat emoji="⚡" label="Vitals" value={data.counts.webVitals} />
                  <Stat emoji="📋" label="Loglar" value={data.counts.logs} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  {/* Card States */}
                  <div style={S.card}>
                    <h3 style={S.h3}>🗂️ Card holatlari</h3>
                    {stateTotal > 0 ? (
                      <>
                        <Bar items={[
                          { value: data.cardStates.new, color: "#3b82f6" },
                          { value: data.cardStates.learning, color: "#f59e0b" },
                          { value: data.cardStates.review, color: "#22c55e" },
                          { value: data.cardStates.relearning, color: "#ef4444" },
                        ]} total={stateTotal} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                          <Legend color="#3b82f6" label="New" v={data.cardStates.new} />
                          <Legend color="#f59e0b" label="Learning" v={data.cardStates.learning} />
                          <Legend color="#22c55e" label="Review" v={data.cardStates.review} />
                          <Legend color="#ef4444" label="Relearning" v={data.cardStates.relearning} />
                        </div>
                      </>
                    ) : <p style={S.muted}>Cardlar yo'q</p>}
                  </div>

                  {/* Grades */}
                  <div style={S.card}>
                    <h3 style={S.h3}>📝 Bugungi baholar</h3>
                    {gradeTotal > 0 ? (
                      <>
                        <Bar items={[
                          { value: data.todayGrades.again, color: "#ef4444" },
                          { value: data.todayGrades.hard, color: "#f59e0b" },
                          { value: data.todayGrades.good, color: "#22c55e" },
                          { value: data.todayGrades.easy, color: "#3b82f6" },
                        ]} total={gradeTotal} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                          <div>❌ Again: <b>{data.todayGrades.again}</b></div>
                          <div>😐 Hard: <b>{data.todayGrades.hard}</b></div>
                          <div>✅ Good: <b>{data.todayGrades.good}</b></div>
                          <div>🚀 Easy: <b>{data.todayGrades.easy}</b></div>
                        </div>
                      </>
                    ) : <p style={S.muted}>Bugun review yo'q</p>}
                  </div>
                </div>

                {/* Recent Decks + Quick Actions */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div style={S.card}>
                    <h3 style={S.h3}>📚 So'nggi decklar</h3>
                    {data.recentDecks?.length ? data.recentDecks.map(d => (
                      <div key={d.id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>{d.name}</span>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{timeAgo(d.updated_at)}</span>
                      </div>
                    )) : <p style={S.muted}>Decklar yo'q</p>}
                  </div>
                  <div style={S.card}>
                    <h3 style={S.h3}>⚡ Tezkor amallar</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <button onClick={() => setTab("api")} style={S.actionBtn}>🔌 API Tester</button>
                      <button onClick={() => { setTab("api"); setSelectedEndpoint("sync-get"); }} style={S.actionBtn}>🔄 Sync State</button>
                      <button onClick={doExportBackup} style={S.actionBtn}>💾 Export Backup</button>
                      <a href="/admin/metrics" style={S.actionBtn}>📊 Web Vitals</a>
                      <a href="/app" style={S.actionBtn}>🗂️ Ilovani ochish</a>
                    </div>
                  </div>
                </div>

                {/* Account */}
                {data.user && (
                  <div style={S.card}>
                    <h3 style={S.h3}>👤 Hisob ma'lumotlari</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem", fontSize: "0.8rem" }}>
                      <div><div style={S.muted}>ID</div><div style={{ fontFamily: "monospace", fontSize: "0.7rem", wordBreak: "break-all" }}>{data.user.id}</div></div>
                      <div><div style={S.muted}>Email</div><div>{data.user.email}</div></div>
                      <div><div style={S.muted}>Yaratilgan</div><div>{data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : "—"}</div></div>
                      <div><div style={S.muted}>Oxirgi kirish</div><div>{data.user.lastSignIn ? timeAgo(data.user.lastSignIn) : "—"}</div></div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ===== TAB: API TESTER ===== */}
            {tab === "api" && (
              <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1rem", alignItems: "start" }}>
                {/* Sidebar — endpoint list */}
                <div style={S.card}>
                  <h3 style={{ ...S.h3, marginBottom: "0.75rem" }}>🔌 API Endpoints ({API_ENDPOINTS.length})</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.75rem" }}>
                    {CATEGORIES.map(c => (
                      <button key={c.id} onClick={() => setCategoryFilter(c.id)}
                        style={{ padding: "0.25rem 0.6rem", borderRadius: "1rem", border: "1px solid var(--border)", background: categoryFilter === c.id ? "var(--accent)" : "transparent", color: categoryFilter === c.id ? "#fff" : "var(--text-secondary)", fontSize: "0.7rem", cursor: "pointer", fontWeight: categoryFilter === c.id ? 700 : 400 }}>
                        {c.label} ({c.count})
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "60vh", overflowY: "auto" }}>
                    {filteredEndpoints.map(e => (
                      <button key={e.id} onClick={() => setSelectedEndpoint(e.id)}
                        style={{
                          padding: "0.6rem 0.75rem", borderRadius: "0.5rem", textAlign: "left", cursor: "pointer", width: "100%",
                          background: selectedEndpoint === e.id ? "var(--accent)" : "var(--bg-primary)",
                          color: selectedEndpoint === e.id ? "#fff" : "var(--text-primary)",
                          border: `1px solid ${selectedEndpoint === e.id ? "var(--accent)" : "var(--border)"}`,
                          fontSize: "0.8rem",
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "0.2rem", background: e.method === "GET" ? "#22c55e30" : "#3b82f630", color: e.method === "GET" ? "#22c55e" : "#3b82f6" }}>
                            {e.method}
                          </span>
                          <span style={{ fontWeight: 600 }}>{e.name}</span>
                          {e.dangerous && <span style={{ fontSize: "0.7rem" }}>⚠️</span>}
                        </div>
                        <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "0.2rem", fontFamily: "monospace" }}>{e.path}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main — endpoint detail + tester */}
                <div>
                  {!ep ? (
                    <div style={{ ...S.card, textAlign: "center", padding: "4rem" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔌</div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>API Endpoint tanlang</h2>
                      <p style={S.muted}>Chapdan endpoint tanlang, so'ng test qiling</p>
                    </div>
                  ) : (
                    <>
                      {/* Info */}
                      <div style={{ ...S.card, marginBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "0.25rem", background: ep.method === "GET" ? "#22c55e30" : "#3b82f630", color: ep.method === "GET" ? "#22c55e" : "#3b82f6" }}>
                            {ep.method}
                          </span>
                          <code style={{ fontSize: "0.9rem", fontWeight: 600 }}>{ep.path}</code>
                          {ep.dangerous && <span style={{ background: "#ef444420", color: "#ef4444", padding: "0.15rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.7rem", fontWeight: 700 }}>XAVFLI</span>}
                        </div>
                        <p style={{ fontSize: "0.85rem", margin: "0 0 0.75rem", lineHeight: 1.5 }}>{ep.description}</p>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem" }}>
                          <span style={S.muted}>🔒 {ep.auth}</span>
                          <span style={S.muted}>⏱️ {ep.rateLimit}</span>
                        </div>
                      </div>

                      {/* Params */}
                      {ep.params && ep.params.length > 0 && (
                        <div style={{ ...S.card, marginBottom: "1rem" }}>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }}>📝 Query Parameters</h4>
                          {ep.params.map(p => (
                            <div key={p.name} style={{ marginBottom: "0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                <code style={{ fontSize: "0.8rem", fontWeight: 600 }}>{p.name}</code>
                                <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>({p.type}){p.required ? " *required" : ""}</span>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>{p.description}</div>
                              <input
                                type="text"
                                placeholder={p.default || p.name}
                                value={apiParams[p.name] || ""}
                                onChange={e => setApiParams(prev => ({ ...prev, [p.name]: e.target.value }))}
                                style={S.input}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Body editor (POST only) */}
                      {ep.method === "POST" && (
                        <div style={{ ...S.card, marginBottom: "1rem" }}>
                          <h4 style={{ fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.5rem" }}>📦 Request Body (JSON)</h4>
                          <textarea
                            value={apiBody}
                            onChange={e => setApiBody(e.target.value)}
                            rows={8}
                            style={{ ...S.input, fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical", minHeight: 120 }}
                          />
                        </div>
                      )}

                      {/* Execute */}
                      <div style={{ marginBottom: "1rem" }}>
                        <button onClick={executeApi} disabled={apiLoading}
                          style={{ ...S.btnPrimary, opacity: apiLoading ? 0.6 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {apiLoading ? "⏳ Yuborilmoqda..." : `🚀 ${ep.method} so'rov yuborish`}
                        </button>
                      </div>

                      {/* Result */}
                      {apiResult && (
                        <div style={S.card}>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                            <span style={{
                              padding: "0.2rem 0.6rem", borderRadius: "0.25rem", fontWeight: 700, fontSize: "0.8rem",
                              background: apiResult.status >= 200 && apiResult.status < 300 ? "#22c55e20" : apiResult.status >= 400 ? "#ef444420" : "#f59e0b20",
                              color: apiResult.status >= 200 && apiResult.status < 300 ? "#22c55e" : apiResult.status >= 400 ? "#ef4444" : "#f59e0b",
                            }}>
                              {apiResult.status} {apiResult.statusText}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>⏱️ {apiResult.duration}ms</span>
                          </div>
                          <pre style={{
                            background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "0.5rem",
                            padding: "1rem", fontSize: "0.75rem", overflow: "auto", maxHeight: 400, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
                          }}>
                            {typeof apiResult.data === "string" ? apiResult.data : JSON.stringify(apiResult.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ===== TAB: DATA ===== */}
            {tab === "data" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div style={S.card}>
                    <h3 style={S.h3}>🔄 Cloud Sync</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0 0 0.75rem" }}>
                      Load all data from Supabase (GET /api/sync)
                    </p>
                    <button onClick={doFullSync} disabled={syncLoading} style={S.btnPrimary}>
                      {syncLoading ? "⏳ Loading..." : "🔄 Full Sync"}
                    </button>
                    {syncResult && (
                      <pre style={{ ...S.codeBlock, marginTop: "0.75rem", maxHeight: 300 }}>
                        {JSON.stringify(syncResult, null, 2)}
                      </pre>
                    )}
                  </div>

                  <div style={S.card}>
                    <h3 style={S.h3}>💾 Backup</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                        Export all data to JSON file
                      </p>
                      <button onClick={doExportBackup} style={S.btnPrimary}>💾 Export JSON</button>
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>
                        <p style={{ fontSize: "0.8rem", color: "#ef4444", margin: "0 0 0.5rem", fontWeight: 600 }}>
                          ⚠️ Import — all existing data will be deleted!
                        </p>
                        <button onClick={() => { setTab("api"); setSelectedEndpoint("backup-import"); }} style={{ ...S.actionBtn, color: "#ef4444", borderColor: "#ef444440" }}>
                          📥 Go to Import page
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DB Tables overview */}
                <div style={S.card}>
                  <h3 style={S.h3}>🗃️ Database Tables</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                    {[
                      { name: "decks", desc: "Flashcard decks", count: data?.counts.decks },
                      { name: "cards", desc: "Flashcards", count: data?.counts.cards },
                      { name: "review_logs", desc: "Review history", count: data?.counts.totalReviews },
                      { name: "user_data", desc: "Settings & progress", count: 1 },
                      { name: "system_logs", desc: "System logs", count: data?.counts.logs },
                      { name: "web_vitals", desc: "Performance metrics", count: data?.counts.webVitals },
                      { name: "profiles", desc: "User profile", count: 1 },
                    ].map(t => (
                      <div key={t.name} style={{ padding: "0.75rem", background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "0.5rem" }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", fontFamily: "monospace" }}>{t.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{t.desc}</div>
                        {t.count !== undefined && <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "0.25rem" }}>{t.count.toLocaleString()}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ===== TAB: LOGS ===== */}
            {tab === "logs" && (
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ ...S.h3, margin: 0 }}>📋 System Logs</h3>
                  <button onClick={fetchOverview} style={{ ...S.actionBtn, width: "auto", padding: "0.4rem 0.75rem" }}>🔄 Refresh</button>
                </div>
                {data?.recentLogs?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {data.recentLogs.map(log => (
                      <div key={log.id} style={{
                        padding: "0.6rem 0.75rem", borderRadius: "0.4rem", background: "var(--bg-primary)",
                        border: `1px solid ${log.level === "ERROR" ? "#ef444440" : log.level === "WARN" ? "#f59e0b40" : "var(--border)"}`,
                        display: "flex", gap: "0.75rem", alignItems: "flex-start", fontSize: "0.8rem",
                      }}>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "0.2rem",
                          background: log.level === "ERROR" ? "#ef444420" : log.level === "WARN" ? "#f59e0b20" : log.level === "DEBUG" ? "#8b5cf620" : "#3b82f620",
                          color: log.level === "ERROR" ? "#ef4444" : log.level === "WARN" ? "#f59e0b" : log.level === "DEBUG" ? "#8b5cf6" : "#3b82f6",
                          flexShrink: 0,
                        }}>
                          {log.level}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ wordBreak: "break-word" }}>{log.message}</div>
                          {log.data && Object.keys(log.data).length > 0 && (
                            <pre style={{ fontSize: "0.7rem", color: "var(--text-secondary)", margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          )}
                        </div>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {timeAgo(log.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✨</div>
                    <p style={S.muted}>No logs — system running clean</p>
                    <button onClick={() => { setTab("api"); setSelectedEndpoint("logs"); }} style={{ ...S.actionBtn, width: "auto", display: "inline-flex", marginTop: "0.5rem" }}>
                      📝 Send test log
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: HEALTH ===== */}
            {tab === "health" && (
              <>
                {/* System Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
                  <div style={S.card}>
                    <h3 style={S.h3}>🏭 System Architecture</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem" }}>
                      {[
                        ["Framework", "Next.js 14 (App Router)"],
                        ["Database", "Supabase PostgreSQL"],
                        ["Auth", "Supabase SSR (Google OAuth)"],
                        ["Hosting", "Vercel (iad1)"],
                        ["Domain", "anki.sodops.uz"],
                        ["SRS Algorithm", "ts-fsrs (custom)"],
                      ].map(([k, v]) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>{k}</span>
                          <span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={S.card}>
                    <h3 style={S.h3}>🔐 Security</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.8rem" }}>
                      {[
                        { label: "API Auth", status: "✅", desc: "All APIs require authentication" },
                        { label: "RLS", status: "✅", desc: "Row Level Security on all tables" },
                        { label: "Rate Limiting", status: "⚠️", desc: "In-memory (limited in serverless)" },
                        { label: "CSP Headers", status: "✅", desc: "Configured in next.config.js" },
                        { label: "Admin Access", status: "✅", desc: "Restricted by ADMIN_EMAILS" },
                        { label: "HTTPS", status: "✅", desc: "Provided by Vercel" },
                      ].map(s => (
                        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0", borderBottom: "1px solid var(--border)" }}>
                          <span>{s.status}</span>
                          <span style={{ fontWeight: 600, minWidth: 100 }}>{s.label}</span>
                          <span style={{ color: "var(--text-secondary)" }}>{s.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* API Endpoints summary table */}
                <div style={S.card}>
                  <h3 style={S.h3}>📡 All API Endpoints</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
                          <th style={S.th}>Method</th>
                          <th style={S.th}>Path</th>
                          <th style={S.th}>Name</th>
                          <th style={S.th}>Auth</th>
                          <th style={S.th}>Rate</th>
                          <th style={S.th}>Test</th>
                        </tr>
                      </thead>
                      <tbody>
                        {API_ENDPOINTS.map(e => (
                          <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={S.td}>
                              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "0.2rem", background: e.method === "GET" ? "#22c55e20" : "#3b82f630", color: e.method === "GET" ? "#22c55e" : "#3b82f6" }}>
                                {e.method}
                              </span>
                            </td>
                            <td style={{ ...S.td, fontFamily: "monospace" }}>{e.path}</td>
                            <td style={S.td}>{e.name} {e.dangerous ? "⚠️" : ""}</td>
                            <td style={S.td}>{e.auth}</td>
                            <td style={S.td}>{e.rateLimit}</td>
                            <td style={S.td}>
                              <button onClick={() => { setTab("api"); setSelectedEndpoint(e.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 600, fontSize: "0.75rem" }}>
                                Test →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ================================================================
   HELPER COMPONENTS
   ================================================================ */
function Stat({ emoji, label, value, color }: { emoji: string; label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.6rem", padding: "0.75rem 1rem" }}>
      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.15rem" }}>{emoji} {label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "var(--text-primary)" }}>{value.toLocaleString()}</div>
    </div>
  );
}

function Bar({ items, total }: { items: { value: number; color: string }[]; total: number }) {
  return (
    <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden" }}>
      {items.map((item, i) => (
        <div key={i} style={{ width: `${(item.value / total) * 100}%`, background: item.color }} />
      ))}
    </div>
  );
}

function Legend({ color, label, v }: { color: string; label: string; v: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}: <b>{v}</b>
    </div>
  );
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hozirgina";
  if (m < 60) return `${m} daq oldin`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat oldin`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} kun oldin`;
  return new Date(d).toLocaleDateString();
}

/* ================================================================
   STYLES
   ================================================================ */
const S: Record<string, React.CSSProperties> = {
  center: { minHeight: "100vh", background: "var(--bg-primary)", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" },
  card: { background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "0.6rem", padding: "1.25rem" },
  h3: { fontSize: "0.95rem", fontWeight: 600, margin: "0 0 0.75rem" },
  muted: { color: "var(--text-secondary)", margin: 0, fontSize: "0.8rem" },
  btnPrimary: { display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.25rem", borderRadius: "0.5rem", background: "var(--accent)", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", textDecoration: "none" },
  actionBtn: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.75rem", borderRadius: "0.4rem", background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", textDecoration: "none", width: "100%", textAlign: "left" as const },
  input: { width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.4rem", border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" as const },
  codeBlock: { background: "var(--bg-primary)", border: "1px solid var(--border)", borderRadius: "0.4rem", padding: "0.75rem", fontSize: "0.7rem", overflow: "auto", margin: 0, whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const },
  th: { padding: "0.5rem 0.75rem", fontWeight: 600 },
  td: { padding: "0.5rem 0.75rem" },
};
