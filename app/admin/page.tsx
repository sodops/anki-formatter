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
  };
  recentLogs: Array<{
    id: string;
    level: string;
    message: string;
    created_at: string;
  }>;
  user: { id: string; email: string | null };
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<OverviewData | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      try {
        const response = await fetch("/api/admin/overview");
        if (response.status === 403) {
          setIsForbidden(true);
          setData(null);
          return;
        }
        if (response.ok) {
          const json = await response.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load admin overview:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [user]);

  if (loading || !user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "2rem",
            maxWidth: "520px",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🚫</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            Access denied
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            This dashboard is restricted to admins. Contact the owner if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>🛡️ Admin Control Center</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            System overview and quick access to key tools.
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>Loading overview...</div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
                <div style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Decks</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{data?.counts.decks ?? 0}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
                <div style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Cards</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{data?.counts.cards ?? 0}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
                <div style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Web Vitals</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{data?.counts.webVitals ?? 0}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
                <div style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>System Logs</div>
                <div style={{ fontSize: "2rem", fontWeight: 700 }}>{data?.counts.logs ?? 0}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Quick Links</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <a className="action-btn secondary" href="/admin/metrics">📊 Web Vitals Dashboard</a>
                  <a className="action-btn secondary" href="/app">🗂️ App Workspace</a>
                  <a className="action-btn secondary" href="/login">🔐 Auth / Login</a>
                </div>
              </div>

              <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Recent System Logs</h2>
                {data?.recentLogs?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {data.recentLogs.map((log) => (
                      <div key={log.id} style={{ padding: "0.75rem", borderRadius: "0.75rem", border: "1px solid var(--border)", background: "var(--bg-primary)" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{log.level?.toUpperCase?.() || "INFO"}</div>
                        <div>{log.message}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: "var(--text-secondary)" }}>No logs available.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}