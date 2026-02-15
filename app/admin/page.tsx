"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

interface OverviewData {
  counts: {
    decks: number;
    cards: number;
    logs: number;
    webVitals: number;
    totalReviews: number;
    todayReviews: number;
    dueCards: number;
  };
  cardStates: {
    new: number;
    learning: number;
    review: number;
    relearning: number;
  };
  todayGrades: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  recentDecks: Array<{
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  }>;
  recentLogs: Array<{
    id: string;
    level: string;
    message: string;
    data?: Record<string, unknown>;
    created_at: string;
  }>;
  user: {
    id: string;
    email: string | null;
    name: string;
    avatar: string | null;
    lastSignIn: string | null;
    createdAt: string | null;
  };
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const fetchOverview = async () => {
      setIsLoading(true);
      setIsForbidden(false);
      setError(null);
      try {
        const response = await fetch("/api/admin/overview");
        if (response.status === 403) {
          setIsForbidden(true);
          return;
        }
        if (response.ok) {
          setData(await response.json());
        } else {
          setError("Failed to load dashboard data");
        }
      } catch (err) {
        console.error("Failed to load admin overview:", err);
        setError("Network error — could not reach server");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, [user]);

  if (loading || !user) {
    return (
      <div style={styles.centeredFull}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ color: "var(--text-secondary)" }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div style={styles.centeredFull}>
        <div style={styles.card}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }}>🚫</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", textAlign: "center" }}>Access Denied</h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", textAlign: "center" }}>
            This dashboard is restricted to administrators.
          </p>
          <div style={{ textAlign: "center" }}>
            <a href="/app" style={styles.primaryBtn}>← Back to App</a>
          </div>
        </div>
      </div>
    );
  }

  const totalGrades = (data?.todayGrades.again || 0) + (data?.todayGrades.hard || 0) +
    (data?.todayGrades.good || 0) + (data?.todayGrades.easy || 0);
  const stateTotal = (data?.cardStates.new || 0) + (data?.cardStates.learning || 0) +
    (data?.cardStates.review || 0) + (data?.cardStates.relearning || 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        padding: "1.25rem 2rem",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <a href="/app" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.25rem" }}>←</a>
            <div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>🛡️ Admin Control Center</h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", margin: 0 }}>System overview & management</p>
            </div>
          </div>
          {data?.user && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {data.user.avatar && (
                <img
                  src={data.user.avatar}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border)" }}
                />
              )}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{data.user.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{data.user.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem 2rem 3rem" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            <div style={{ color: "var(--text-secondary)" }}>Loading dashboard...</div>
          </div>
        ) : error ? (
          <div style={{ ...styles.card, textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⚠️</div>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
            <button onClick={() => window.location.reload()} style={{ ...styles.primaryBtn, marginTop: "1rem", border: "none", cursor: "pointer" }}>
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* === STAT CARDS === */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <StatCard emoji="📚" label="Decks" value={data?.counts.decks || 0} />
              <StatCard emoji="🃏" label="Cards" value={data?.counts.cards || 0} />
              <StatCard emoji="🔄" label="Due Now" value={data?.counts.dueCards || 0} color="#f59e0b" />
              <StatCard emoji="📝" label="Today" value={data?.counts.todayReviews || 0} color="#22c55e" />
              <StatCard emoji="📊" label="All Reviews" value={data?.counts.totalReviews || 0} />
              <StatCard emoji="⚡" label="Web Vitals" value={data?.counts.webVitals || 0} />
              <StatCard emoji="📋" label="Logs" value={data?.counts.logs || 0} />
            </div>

            {/* === CARD STATES + TODAY'S GRADES === */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {/* Card State Distribution */}
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>🗂️ Card States</h2>
                {stateTotal > 0 ? (
                  <>
                    <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: "0.75rem" }}>
                      <div style={{ width: `${(data!.cardStates.new / stateTotal) * 100}%`, background: "#3b82f6" }} />
                      <div style={{ width: `${(data!.cardStates.learning / stateTotal) * 100}%`, background: "#f59e0b" }} />
                      <div style={{ width: `${(data!.cardStates.review / stateTotal) * 100}%`, background: "#22c55e" }} />
                      <div style={{ width: `${(data!.cardStates.relearning / stateTotal) * 100}%`, background: "#ef4444" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
                      <LegendItem color="#3b82f6" label="New" value={data!.cardStates.new} />
                      <LegendItem color="#f59e0b" label="Learning" value={data!.cardStates.learning} />
                      <LegendItem color="#22c55e" label="Review" value={data!.cardStates.review} />
                      <LegendItem color="#ef4444" label="Relearning" value={data!.cardStates.relearning} />
                    </div>
                  </>
                ) : (
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>No cards yet</p>
                )}
              </div>

              {/* Today's Grades */}
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>📝 Today&apos;s Grades</h2>
                {totalGrades > 0 ? (
                  <>
                    <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: "0.75rem" }}>
                      <div style={{ width: `${(data!.todayGrades.again / totalGrades) * 100}%`, background: "#ef4444" }} />
                      <div style={{ width: `${(data!.todayGrades.hard / totalGrades) * 100}%`, background: "#f59e0b" }} />
                      <div style={{ width: `${(data!.todayGrades.good / totalGrades) * 100}%`, background: "#22c55e" }} />
                      <div style={{ width: `${(data!.todayGrades.easy / totalGrades) * 100}%`, background: "#3b82f6" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.85rem" }}>
                      <div>❌ Again: <strong>{data!.todayGrades.again}</strong></div>
                      <div>😐 Hard: <strong>{data!.todayGrades.hard}</strong></div>
                      <div>✅ Good: <strong>{data!.todayGrades.good}</strong></div>
                      <div>🚀 Easy: <strong>{data!.todayGrades.easy}</strong></div>
                    </div>
                  </>
                ) : (
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>No reviews today</p>
                )}
              </div>
            </div>

            {/* === QUICK ACTIONS + RECENT DECKS === */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {/* Quick Actions */}
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <ActionLink href="/admin/metrics" emoji="📊" label="Web Vitals Dashboard" />
                  <ActionLink href="/app" emoji="🗂️" label="Open App" />
                  <ActionLink href="/login" emoji="🔐" label="Auth Settings" />
                  <button
                    onClick={async () => {
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
                      } catch (e) {
                        console.error("Export failed:", e);
                      }
                    }}
                    style={styles.actionBtn}
                  >
                    <span>💾</span> <span>Export Backup</span> <span style={{ marginLeft: "auto", color: "var(--text-secondary)" }}>↓</span>
                  </button>
                </div>
              </div>

              {/* Recent Decks */}
              <div style={styles.card}>
                <h2 style={styles.sectionTitle}>📚 Recent Decks</h2>
                {data?.recentDecks?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {data.recentDecks.map((deck) => (
                      <div key={deck.id} style={{
                        padding: "0.75rem",
                        borderRadius: "0.5rem",
                        background: "var(--bg-primary)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{ fontWeight: 500, fontSize: "0.9rem" }}>{deck.name}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {timeAgo(deck.updated_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-secondary)", margin: 0 }}>No decks found</p>
                )}
              </div>
            </div>

            {/* === SYSTEM LOGS === */}
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>📋 Recent System Logs</h2>
              {data?.recentLogs?.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {data.recentLogs.slice(0, 10).map((log) => (
                    <div key={log.id} style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      background: "var(--bg-primary)",
                      border: `1px solid ${log.level === "ERROR" ? "#ef444440" : log.level === "WARN" ? "#f59e0b40" : "var(--border)"}`,
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                    }}>
                      <span style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.5rem",
                        borderRadius: "0.25rem",
                        background: log.level === "ERROR" ? "#ef444420" : log.level === "WARN" ? "#f59e0b20" : "#3b82f620",
                        color: log.level === "ERROR" ? "#ef4444" : log.level === "WARN" ? "#f59e0b" : "#3b82f6",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        marginTop: "0.1rem",
                      }}>
                        {log.level}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.875rem", wordBreak: "break-word" }}>{log.message}</div>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {timeAgo(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-secondary)", margin: 0 }}>No system logs — running clean ✨</p>
              )}
            </div>

            {/* === ACCOUNT INFO === */}
            {data?.user && (
              <div style={{ ...styles.card, marginTop: "1rem" }}>
                <h2 style={styles.sectionTitle}>👤 Account Info</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.875rem" }}>
                  <div>
                    <div style={{ color: "var(--text-secondary)", marginBottom: "0.2rem" }}>User ID</div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.75rem", wordBreak: "break-all" }}>{data.user.id}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", marginBottom: "0.2rem" }}>Email</div>
                    <div>{data.user.email}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", marginBottom: "0.2rem" }}>Account Created</div>
                    <div>{data.user.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : "—"}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--text-secondary)", marginBottom: "0.2rem" }}>Last Sign In</div>
                    <div>{data.user.lastSignIn ? timeAgo(data.user.lastSignIn) : "—"}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* === Helper Components === */
function StatCard({ emoji, label, value, color }: { emoji: string; label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "0.75rem",
      padding: "1rem 1.25rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "1rem" }}>{emoji}</span>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, color: color || "var(--text-primary)" }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
      {label}: <strong>{value}</strong>
    </div>
  );
}

function ActionLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <a href={href} style={styles.actionBtn as React.CSSProperties}>
      <span>{emoji}</span> <span>{label}</span> <span style={{ marginLeft: "auto", color: "var(--text-secondary)" }}>→</span>
    </a>
  );
}

/* === Time Ago Helper === */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* === Styles === */
const styles: Record<string, React.CSSProperties> = {
  centeredFull: {
    minHeight: "100vh",
    background: "var(--bg-primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  card: {
    background: "var(--bg-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    padding: "1.25rem",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    margin: "0 0 1rem 0",
  },
  primaryBtn: {
    display: "inline-block",
    padding: "0.5rem 1.5rem",
    borderRadius: "0.5rem",
    background: "var(--accent)",
    color: "white",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem",
    borderRadius: "0.5rem",
    background: "var(--bg-primary)",
    border: "1px solid var(--border)",
    textDecoration: "none",
    color: "var(--text-primary)",
    fontSize: "0.9rem",
    fontWeight: 500,
    cursor: "pointer",
    width: "100%",
    textAlign: "left" as const,
  },
};
